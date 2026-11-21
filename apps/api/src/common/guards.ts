import type { UserRole } from '@cardai/shared';
import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REDIS, type Redis } from '../infra/infra.module.js';
import { TokenService } from '../modules/auth/token.service.js';
import { bumpCounter } from './redis.js';
import { IS_PUBLIC, RATE_LIMIT, ROLES, SKIP_RATE_LIMIT, type AuthedRequest, type RateLimitOptions } from './auth.decorators.js';

export const ACCESS_COOKIE = 'cai_at';
export { disabledKey } from '../modules/auth/token.service.js';

/** Global guard: every route requires a valid access token unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);

    const header = req.headers.authorization;
    const token =
      (header?.startsWith('Bearer ') ? header.slice(7) : undefined) ??
      (req.cookies as Record<string, string | undefined> | undefined)?.[ACCESS_COOKIE];

    if (token) {
      const claims = await this.tokens.verifyAccess(token).catch(() => null);
      if (claims && !(await this.tokens.isRevoked(token, claims))) {
        const { iat: _iat, ...user } = claims;
        req.user = user;
      }
    }
    // An admin viewing as a customer can look, never change anything on their behalf.
    if (req.user?.imp && !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !/^\/api\/(auth\/(refresh|logout)|track|flags)(\/|$)/.test(req.url)) {
      throw new ForbiddenException({ message: 'You are viewing as this customer (read-only). Exit to make changes.', details: { impersonating: true } });
    }
    if (isPublic) return true;
    if (!req.user) throw new UnauthorizedException('Please sign in');
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES, [ctx.getHandler(), ctx.getClass()]);
    if (!roles?.length) return true;
    const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
    if (!user || (!roles.includes(user.role) && user.role !== 'admin')) {
      throw new ForbiddenException('You do not have access to this');
    }
    return true;
  }
}

/**
 * Applied to every state-changing route without its own @RateLimit (reads stay unlimited: guests on
 * one venue Wi-Fi poll live pages). Generous: it only stops scripted floods.
 */
export const DEFAULT_WRITE_LIMIT: RateLimitOptions = { limit: 120, windowSec: 60 };

/**
 * Fixed-window rate limit in Redis, per route via @RateLimit(), with DEFAULT_WRITE_LIMIT for writes
 * that set none (opt out with @SkipRateLimit for signed webhooks). Works across instances.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT, [ctx.getHandler(), ctx.getClass()])) return true;
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const own = this.reflector.get<RateLimitOptions | undefined>(RATE_LIMIT, ctx.getHandler());
    const opts = own ?? (['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : DEFAULT_WRITE_LIMIT);
    if (!opts) return true;
    const who = opts.by !== 'ip' && req.user ? `u:${req.user.id}` : `ip:${req.clientIp ?? req.ip}`;
    const window = Math.floor(Date.now() / 1000 / opts.windowSec);
    // The default is one shared bucket per caller, so it can't be multiplied by spreading over routes.
    const scope = own ? `${ctx.getClass().name}.${ctx.getHandler().name}` : 'default-write';
    const key = `rl:${scope}:${who}:${window}`;
    const hits = await bumpCounter(this.redis, key, opts.windowSec);
    if (hits > opts.limit) {
      throw new HttpException('Too many requests, please try again shortly', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
