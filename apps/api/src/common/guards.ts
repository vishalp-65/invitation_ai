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
import { IS_PUBLIC, RATE_LIMIT, ROLES, type AuthedRequest, type RateLimitOptions } from './auth.decorators.js';

export const ACCESS_COOKIE = 'cai_at';
/** Redis marker for accounts an admin disabled, so live access tokens stop working at once. */
export const disabledKey = (userId: string) => `user:disabled:${userId}`;

/** Global guard: every route requires a valid access token unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);

    const header = req.headers.authorization;
    const token =
      (header?.startsWith('Bearer ') ? header.slice(7) : undefined) ??
      (req.cookies as Record<string, string | undefined> | undefined)?.[ACCESS_COOKIE];

    if (token) {
      const user = await this.tokens.verifyAccess(token).catch(() => null);
      if (user && !(await this.redis.exists(disabledKey(user.id)))) req.user = user;
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

/** Fixed-window rate limit in Redis, opt-in per route via @RateLimit(). Works across instances. */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.get<RateLimitOptions | undefined>(RATE_LIMIT, ctx.getHandler());
    if (!opts) return true;
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const who = opts.by !== 'ip' && req.user ? `u:${req.user.id}` : `ip:${req.clientIp ?? req.ip}`;
    const window = Math.floor(Date.now() / 1000 / opts.windowSec);
    const key = `rl:${ctx.getClass().name}.${ctx.getHandler().name}:${who}:${window}`;
    const hits = await bumpCounter(this.redis, key, opts.windowSec);
    if (hits > opts.limit) {
      throw new HttpException('Too many requests, please try again shortly', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
