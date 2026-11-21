import { eq, users, type Database } from '@cardai/db';
import type { AdminScope } from '@cardai/shared';
import {
  ForbiddenException,
  Global,
  Inject,
  Injectable,
  Module,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomInt } from 'node:crypto';
import type { AuthedRequest, AuthUser } from '../../common/auth.decorators.js';
import { deriveKey, hmacSha256Hex, safeEqual } from '../../common/crypto.js';
import { ENV, type Env } from '../../config/env.js';
import { bumpCounter } from '../../common/redis.js';
import { DB, REDIS, type Redis } from '../../infra/infra.module.js';
import { MailService } from '../mail/mail.service.js';
import { effectiveScopes, hasScope } from './scopes.js';

export { effectiveScopes, hasScope };

export const ADMIN_SCOPE_KEY = 'admin:scopes';
export const ADMIN_MFA_EXEMPT = 'admin:mfa-exempt';
export const MFA_COOKIE = 'cai_amfa';
export const MFA_TTL_SEC = 12 * 3600;
const CODE_TTL_SEC = 600;
/** Wrong codes per admin per hour. Not reset by asking for a new code, so resends can't buy guesses. */
const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_SEC = 3600;

/** Which admin scopes may call this route (owner always can). No decorator = any admin (read-only dashboards). */
export const AdminScopes = (...scopes: AdminScope[]) => SetMetadata(ADMIN_SCOPE_KEY, scopes);
/** Routes an admin needs before the email-code check (the check itself). */
export const AdminMfaExempt = () => SetMetadata(ADMIN_MFA_EXEMPT, true);

/**
 * Admin second step: a 6-digit code emailed to the admin, once per device every 12 hours. The
 * proof is an HMAC-signed, httpOnly cookie bound to the admin's id and its expiry.
 */
@Injectable()
export class AdminMfaService {
  private readonly cookieKey: Buffer;
  private readonly codeKey: Buffer;

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(DB) private readonly db: Database,
    private readonly mail: MailService,
  ) {
    this.cookieKey = deriveKey(env.JWT_ACCESS_SECRET, 'admin-mfa-cookie');
    this.codeKey = deriveKey(env.JWT_ACCESS_SECRET, 'admin-mfa-code');
  }

  private hashCode(userId: string, code: string) {
    return hmacSha256Hex(this.codeKey, `${userId}:${code}`);
  }

  get required(): boolean {
    return this.env.ADMIN_MFA ?? this.env.NODE_ENV === 'production';
  }

  private sign(userId: string, exp: number) {
    return hmacSha256Hex(this.cookieKey, `admin-mfa:${userId}:${exp}`);
  }

  cookieFor(userId: string): { value: string; maxAge: number } {
    const exp = Math.floor(Date.now() / 1000) + MFA_TTL_SEC;
    return { value: `${exp}.${this.sign(userId, exp)}`, maxAge: MFA_TTL_SEC };
  }

  verified(userId: string, cookie: string | undefined): boolean {
    if (!this.required) return true;
    if (!cookie) return false;
    const [expRaw, sig] = cookie.split('.');
    const exp = Number(expRaw);
    if (!exp || !sig || exp < Date.now() / 1000) return false;
    return safeEqual(this.sign(userId, exp), sig);
  }

  async request(user: AuthUser, userAgent: string | undefined) {
    const [row] = await this.db.select({ email: users.email }).from(users).where(eq(users.id, user.id));
    if (!row?.email) throw new ForbiddenException('Your admin account needs an email address.');
    const sent = await this.redis.set(`admin:mfa:sent:${user.id}`, '1', 'EX', 30, 'NX');
    if (!sent) return { sent: true, to: maskEmail(row.email) };
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.redis.set(`admin:mfa:code:${user.id}`, this.hashCode(user.id, code), 'EX', CODE_TTL_SEC);
    await this.mail.sendNow('admin.otp', row.email, { code, ttlMinutes: CODE_TTL_SEC / 60, device: describeDevice(userAgent) });
    return { sent: true, to: maskEmail(row.email) };
  }

  async verify(user: AuthUser, code: string): Promise<boolean> {
    const tries = await bumpCounter(this.redis, `admin:mfa:tries:${user.id}`, ATTEMPT_WINDOW_SEC);
    if (tries > MAX_ATTEMPTS) {
      await this.redis.del(`admin:mfa:code:${user.id}`);
      throw new ForbiddenException('Too many wrong codes. Try again in an hour.');
    }
    const stored = await this.redis.get(`admin:mfa:code:${user.id}`);
    if (!stored || !safeEqual(stored, this.hashCode(user.id, code))) return false;
    await this.redis.del(`admin:mfa:code:${user.id}`, `admin:mfa:tries:${user.id}`);
    return true;
  }
}

function maskEmail(email: string) {
  const [l = '', d = ''] = email.split('@');
  return `${l.slice(0, 2)}${'•'.repeat(Math.max(1, l.length - 2))}@${d}`;
}

function describeDevice(ua: string | undefined) {
  if (!ua) return 'an unknown device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'a browser';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'a computer';
  return `${browser} on ${os}`;
}

/**
 * Every admin call re-checks the database (a removed or disabled admin loses access at once),
 * then the email-code proof for this device, then the route's scope.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly reflector: Reflector,
    private readonly mfa: AdminMfaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest & { adminScopes?: AdminScope[] }>();
    const user = req.user;
    if (!user || user.imp) throw new ForbiddenException('You do not have access to this');
    const [row] = await this.db.select({ role: users.role, disabledAt: users.disabledAt, scopes: users.adminScopes }).from(users).where(eq(users.id, user.id));
    if (row?.role !== 'admin' || row.disabledAt) throw new ForbiddenException('You do not have access to this');

    const exempt = this.reflector.getAllAndOverride<boolean>(ADMIN_MFA_EXEMPT, [ctx.getHandler(), ctx.getClass()]);
    const cookie = (req.cookies as Record<string, string | undefined> | undefined)?.[MFA_COOKIE];
    if (!exempt && !this.mfa.verified(user.id, cookie)) {
      throw new ForbiddenException({ message: 'Confirm it is you with the code we email you.', details: { mfa: 'required' } });
    }

    const scopes = effectiveScopes(row.scopes);
    req.adminScopes = scopes;
    const needed = this.reflector.getAllAndOverride<AdminScope[] | undefined>(ADMIN_SCOPE_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (needed?.length && !hasScope(scopes, needed)) {
      throw new ForbiddenException({ message: 'Your admin role does not include this. Ask an owner.', details: { scopes: needed } });
    }
    return true;
  }
}

@Global()
@Module({ providers: [AdminMfaService, AdminGuard], exports: [AdminMfaService, AdminGuard] })
export class AdminAccessModule {}
