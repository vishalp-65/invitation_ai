import type { UserRole } from '@cardai/shared';
import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

export interface AuthUser {
  id: string;
  role: UserRole;
  /** Set while an admin views the product as this user (read-only): the admin's id. */
  imp?: string;
}

/** `clientIp`: the caller's real IP (signed by the web proxy, else the connection address), set in main.ts. */
export type AuthedRequest = FastifyRequest & { user?: AuthUser; clientIp?: string };

export const IS_PUBLIC = 'auth:public';
export const ROLES = 'auth:roles';
export const RATE_LIMIT = 'rate:limit';

/** Route is reachable without a session (still parses one if present). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES, roles);

export interface RateLimitOptions {
  /** Max hits per window. */
  limit: number;
  windowSec: number;
  /** Bucket key: per user (falls back to IP) or per IP. */
  by?: 'user' | 'ip';
}
export const RateLimit = (opts: RateLimitOptions) => SetMetadata(RATE_LIMIT, opts);

export const SKIP_RATE_LIMIT = 'rate:skip';
/** Signed provider webhooks only: they arrive in bursts from a few shared IPs and are verified by signature. */
export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT, true);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest<AuthedRequest>();
  if (!req.user) throw new Error('CurrentUser used on a public route without a session');
  return req.user;
});
