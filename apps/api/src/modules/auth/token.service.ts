import { and, eq, gt, isNull, sessions, type Database } from '@cardai/db';
import type { UserRole } from '@cardai/shared';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { decodeJwt, jwtVerify, SignJWT } from 'jose';
import { ENV, type Env } from '../../config/env.js';
import { DB, REDIS, type Redis } from '../../infra/infra.module.js';
import type { AuthUser } from '../../common/auth.decorators.js';
import { deriveKey, randomToken, sha256 } from '../../common/crypto.js';

export const ACCESS_TTL_SEC = 15 * 60;
export const REFRESH_TTL_SEC = 30 * 24 * 3600;
/**
 * A refresh token stays usable this long after it was rotated, so two tabs refreshing at the same
 * moment (cookies are shared, the in-page de-dupe is not) don't look like token theft.
 */
export const REFRESH_GRACE_SEC = 30;
const JWT_ISSUER = 'noyta';
const JWT_AUDIENCE = 'noyta-web';

/** Redis marker for accounts an admin disabled, so live access tokens stop working at once. */
export const disabledKey = (userId: string) => `user:disabled:${userId}`;
/** Unix ms after which a user's earlier tokens are void (sign-out everywhere, password reset, disable). */
export const tokensAfterKey = (userId: string) => `auth:tokens-after:${userId}`;
/** A single access token that was signed out before it expired. */
export const deniedAccessKey = (token: string) => `auth:deny:${sha256(token).slice(0, 32)}`;
const graceKey = (hash: string) => `auth:rt-grace:${hash}`;

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AccessClaims extends AuthUser {
  /** Issued-at, unix seconds. */
  iat: number;
}

/**
 * Short-lived stateless JWT access token + long-lived opaque refresh token stored hashed in DB.
 * Refresh tokens rotate on every use; reuse of a revoked token (after a short grace window)
 * revokes the whole family. Access tokens are checked against a per-user "valid after" time and
 * a small deny list in Redis, so sign-out and password resets take effect at once.
 */
@Injectable()
export class TokenService {
  private readonly accessKey: Uint8Array;
  /** Pre-HKDF key: tokens signed with it are still accepted until they expire (one access TTL after deploy). */
  private readonly legacyKey: Uint8Array;

  constructor(
    @Inject(ENV) env: Env,
    @Inject(DB) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
  ) {
    this.accessKey = new Uint8Array(deriveKey(env.JWT_ACCESS_SECRET, 'access-jwt'));
    this.legacyKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
  }

  async issue(user: AuthUser, userAgent?: string): Promise<IssuedTokens> {
    const accessToken = await this.signAccess(user);
    const refreshToken = randomToken(48);
    await this.db.insert(sessions).values({
      userId: user.id,
      refreshTokenHash: sha256(refreshToken),
      userAgent: userAgent?.slice(0, 300),
      expiresAt: new Date(Date.now() + REFRESH_TTL_SEC * 1000),
    });
    return { accessToken, refreshToken };
  }

  signAccess(user: AuthUser, ttlSec = ACCESS_TTL_SEC): Promise<string> {
    return new SignJWT(user.imp ? { role: user.role, imp: user.imp } : { role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${ttlSec}s`)
      .sign(this.accessKey);
  }

  async verifyAccess(token: string): Promise<AccessClaims> {
    const { payload } = await jwtVerify(token, this.accessKey, { algorithms: ['HS256'], issuer: JWT_ISSUER, audience: JWT_AUDIENCE }).catch(() =>
      // Tokens minted before the key derivation shipped carry no iss/aud; they expire within 15 minutes.
      jwtVerify(token, this.legacyKey, { algorithms: ['HS256'], maxTokenAge: ACCESS_TTL_SEC }),
    );
    if (!payload.sub || typeof payload.iat !== 'number') throw new UnauthorizedException();
    return {
      id: payload.sub,
      role: (payload.role as UserRole) ?? 'user',
      iat: payload.iat,
      ...(typeof payload.imp === 'string' ? { imp: payload.imp } : {}),
    };
  }

  /** True when the account is disabled, this token was signed out, or it predates a sign-out everywhere. */
  async isRevoked(token: string, claims: AccessClaims): Promise<boolean> {
    const [disabled, after, denied] = await this.redis.mget(disabledKey(claims.id), tokensAfterKey(claims.id), deniedAccessKey(token));
    if (disabled || denied) return true;
    // Second precision on purpose: the token issued right after a reset (same second) stays valid.
    return Boolean(after && claims.iat < Math.floor(Number(after) / 1000));
  }

  /** Signs one access token out until it would have expired anyway. */
  async revokeAccess(token: string): Promise<void> {
    try {
      const exp = decodeJwt(token).exp;
      const ttl = exp ? exp - Math.floor(Date.now() / 1000) : ACCESS_TTL_SEC;
      if (ttl > 0) await this.redis.set(deniedAccessKey(token), '1', 'EX', ttl);
    } catch {
      // Not a JWT: nothing to deny.
    }
  }

  /** Returns the session's userId and revokes the old token (rotation). */
  async consumeRefresh(refreshToken: string): Promise<string> {
    const hash = sha256(refreshToken);
    const [session] = await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.refreshTokenHash, hash), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
      .returning({ userId: sessions.userId });

    if (session) {
      await this.redis.set(graceKey(hash), `${session.userId}:${Date.now()}`, 'EX', REFRESH_GRACE_SEC);
      return session.userId;
    }

    // Rotated moments ago by a parallel request from the same browser: let it through, unless the
    // user signed out everywhere since.
    const grace = await this.redis.get(graceKey(hash));
    if (grace) {
      const [userId = '', rotatedAt = '0'] = grace.split(':');
      const after = Number((await this.redis.get(tokensAfterKey(userId))) ?? 0);
      if (userId && after < Number(rotatedAt)) return userId;
      throw new UnauthorizedException('Session expired, please sign in again');
    }

    // Possible token theft: if this token existed but was already revoked, kill all sessions of that user.
    const [stale] = await this.db.select({ userId: sessions.userId }).from(sessions).where(eq(sessions.refreshTokenHash, hash));
    if (stale) await this.revokeAll(stale.userId);
    throw new UnauthorizedException('Session expired, please sign in again');
  }

  async revoke(refreshToken: string): Promise<void> {
    const hash = sha256(refreshToken);
    await this.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.refreshTokenHash, hash));
    await this.redis.del(graceKey(hash));
  }

  /** Signs the user out everywhere: every refresh token, and every access token issued so far. */
  async revokeAll(userId: string): Promise<void> {
    await this.redis.set(tokensAfterKey(userId), String(Date.now()), 'EX', ACCESS_TTL_SEC + REFRESH_GRACE_SEC + 60);
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  }

  /** The user's signed-in devices (live refresh tokens), newest first. */
  async list(userId: string, currentRefreshToken?: string) {
    const current = currentRefreshToken ? sha256(currentRefreshToken) : null;
    const rows = await this.db
      .select({ id: sessions.id, userAgent: sessions.userAgent, createdAt: sessions.createdAt, expiresAt: sessions.expiresAt, hash: sessions.refreshTokenHash })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())));
    return rows
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(({ hash, ...r }) => ({ ...r, current: hash === current }));
  }

  /** Ends one of the user's sessions. Its access token lapses within one access TTL. */
  async revokeById(userId: string, sessionId: string): Promise<boolean> {
    const res = await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId), isNull(sessions.revokedAt)))
      .returning({ id: sessions.id });
    return res.length > 0;
  }
}
