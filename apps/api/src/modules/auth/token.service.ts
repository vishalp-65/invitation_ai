import { and, eq, gt, isNull, sessions, type Database } from '@cardai/db';
import type { UserRole } from '@cardai/shared';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify, SignJWT } from 'jose';
import { ENV, type Env } from '../../config/env.js';
import { DB } from '../../infra/infra.module.js';
import type { AuthUser } from '../../common/auth.decorators.js';
import { randomToken, sha256 } from '../../common/crypto.js';

export const ACCESS_TTL_SEC = 15 * 60;
export const REFRESH_TTL_SEC = 30 * 24 * 3600;

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Short-lived stateless JWT access token + long-lived opaque refresh token stored hashed in DB.
 * Refresh tokens rotate on every use; reuse of a revoked token revokes the whole family.
 */
@Injectable()
export class TokenService {
  private readonly accessKey: Uint8Array;

  constructor(
    @Inject(ENV) env: Env,
    @Inject(DB) private readonly db: Database,
  ) {
    this.accessKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
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

  signAccess(user: AuthUser): Promise<string> {
    return new SignJWT({ role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TTL_SEC}s`)
      .sign(this.accessKey);
  }

  async verifyAccess(token: string): Promise<AuthUser> {
    const { payload } = await jwtVerify(token, this.accessKey, { algorithms: ['HS256'] });
    if (!payload.sub) throw new UnauthorizedException();
    return { id: payload.sub, role: (payload.role as UserRole) ?? 'user' };
  }

  /** Returns the session's userId and revokes the old token (rotation). */
  async consumeRefresh(refreshToken: string): Promise<string> {
    const hash = sha256(refreshToken);
    const [session] = await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.refreshTokenHash, hash), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
      .returning({ userId: sessions.userId });

    if (!session) {
      // Possible token theft: if this token existed but was already revoked, kill all sessions of that user.
      const [stale] = await this.db.select({ userId: sessions.userId }).from(sessions).where(eq(sessions.refreshTokenHash, hash));
      if (stale) await this.revokeAll(stale.userId);
      throw new UnauthorizedException('Session expired, please sign in again');
    }
    return session.userId;
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.refreshTokenHash, sha256(refreshToken)));
  }

  async revokeAll(userId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  }
}
