import { BadRequestException, Inject, Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { createHash } from 'node:crypto';
import { ENV, type Env } from '../../config/env.js';
import { randomToken } from '../../common/crypto.js';
import { REDIS, type Redis } from '../../infra/infra.module.js';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const NONCE_TTL_SEC = 5 * 60;
const FLOW_TTL_SEC = 10 * 60;

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
}

interface FlowState {
  nonce: string;
  verifier: string;
  next: string;
}

/** Same-site relative paths only, so the OAuth round trip can't become an open redirect. */
export function safeNext(next: unknown): string {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') && next.length <= 512
    ? next
    : '/dashboard';
}

/**
 * Google sign-in, two ways, both verified server-side (the browser never tells us who the user is):
 *  1. OAuth 2.0 authorization code + PKCE (redirect flow, our own button) — needs the client secret.
 *  2. Google Identity Services ID token (popup / One Tap) — needs only the client ID.
 */
@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  get clientId(): string | null {
    return this.env.GOOGLE_CLIENT_ID ?? null;
  }

  /** The redirect flow is available only when the client secret is configured too. */
  get redirectEnabled(): boolean {
    return Boolean(this.env.GOOGLE_CLIENT_ID && this.env.GOOGLE_CLIENT_SECRET);
  }

  /** Callback goes through the web app's /api rewrite, so session cookies stay first-party. */
  get redirectUri(): string {
    return new URL('/api/auth/google/callback', this.env.APP_URL).toString();
  }

  // ---------------------------------------------------------------- redirect flow

  /** Step 1: returns Google's consent URL and the `state` the browser must echo back. */
  async startRedirect(next: unknown): Promise<{ url: string; state: string }> {
    if (!this.redirectEnabled) throw new ServiceUnavailableException('Google sign-in is not available');
    const state = randomToken(24);
    const nonce = randomToken(24);
    const verifier = randomToken(48);
    const flow: FlowState = { nonce, verifier, next: safeNext(next) };
    await this.redis.set(`goauth:${state}`, JSON.stringify(flow), 'EX', FLOW_TTL_SEC);

    const url = new URL(AUTHORIZE_URL);
    url.search = new URLSearchParams({
      client_id: this.env.GOOGLE_CLIENT_ID!,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
      prompt: 'select_account',
      include_granted_scopes: 'true',
    }).toString();
    return { url: url.toString(), state };
  }

  /** Step 2: one-time use of `state`, code exchange with PKCE, then ID-token verification. */
  async finishRedirect(code: string, state: string): Promise<{ profile: GoogleProfile; next: string }> {
    if (!this.redirectEnabled) throw new ServiceUnavailableException('Google sign-in is not available');
    const raw = await this.redis.getdel(`goauth:${state}`);
    if (!raw) throw new UnauthorizedException('Google sign-in expired. Please try again.');
    const flow = JSON.parse(raw) as FlowState;

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.env.GOOGLE_CLIENT_ID!,
        client_secret: this.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: flow.verifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      this.logger.warn(`Google token exchange failed: ${res.status}`);
      throw new UnauthorizedException('Google sign-in could not be completed. Please try again.');
    }
    const body = (await res.json()) as { id_token?: string };
    if (!body.id_token) throw new UnauthorizedException('Google sign-in could not be completed. Please try again.');

    const payload = await this.verifyIdToken(body.id_token);
    if (payload.nonce !== flow.nonce) throw new UnauthorizedException('Google sign-in could not be verified. Please try again.');
    return { profile: toProfile(payload), next: flow.next };
  }

  // ---------------------------------------------------------------- ID-token flow

  /** One-time nonce the browser embeds in the ID request, so a stolen token cannot be replayed. */
  async issueNonce(): Promise<string> {
    if (!this.clientId) throw new ServiceUnavailableException('Google sign-in is not available');
    const nonce = randomToken(24);
    await this.redis.set(`gnonce:${nonce}`, '1', 'EX', NONCE_TTL_SEC);
    return nonce;
  }

  async verify(credential: string): Promise<GoogleProfile> {
    if (!this.clientId) throw new ServiceUnavailableException('Google sign-in is not available');
    const payload = await this.verifyIdToken(credential);
    const nonce = typeof payload.nonce === 'string' ? payload.nonce : '';
    if (!nonce || (await this.redis.getdel(`gnonce:${nonce}`)) === null) {
      throw new UnauthorizedException('Google sign-in expired. Please try again.');
    }
    return toProfile(payload);
  }

  private async verifyIdToken(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, GOOGLE_JWKS, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: this.clientId!,
        algorithms: ['RS256'],
        clockTolerance: 5,
      });
      return payload;
    } catch {
      throw new UnauthorizedException('Google sign-in could not be verified. Please try again.');
    }
  }
}

function toProfile(payload: JWTPayload): GoogleProfile {
  if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
    throw new BadRequestException('Your Google account did not share an email address.');
  }
  if (payload.email_verified !== true) throw new BadRequestException('Your Google email address is not verified.');
  return {
    sub: payload.sub,
    email: payload.email.trim().toLowerCase(),
    name: typeof payload.name === 'string' ? payload.name.slice(0, 80) : null,
    picture: typeof payload.picture === 'string' && payload.picture.startsWith('https://') ? payload.picture.slice(0, 500) : null,
  };
}
