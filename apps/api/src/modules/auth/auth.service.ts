import { adminAuditLog, and, desc, eq, inArray, isNotNull, sql, users, type Database } from '@cardai/db';
import type { MeResponse, UpdateProfileInput, UserRole } from '@cardai/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ENV, type Env } from '../../config/env.js';
import { hashPassword, sha256, verifyPassword } from '../../common/crypto.js';
import { bumpCounter } from '../../common/redis.js';
import { DB, REDIS, type Redis } from '../../infra/infra.module.js';
import { FlagsService } from '../flags/flags.service.js';
import { MailService } from '../mail/mail.service.js';
import { toLocale } from '../mail/templates/index.js';
import { GoogleService, type GoogleProfile } from './google.service.js';
import { OtpService } from './otp.service.js';
import { isPwnedPassword } from './pwned.js';
import { TokenService, type IssuedTokens } from './token.service.js';

/** Wrong passwords per address from one IP, and from all IPs together, per window. */
const MAX_LOGIN_FAILS = 10;
const MAX_LOGIN_FAILS_ALL_IPS = 100;
const LOGIN_FAIL_WINDOW_SEC = 15 * 60;
const LOCKED_MSG = 'Too many failed attempts. Try again in 15 minutes, or reset your password.';
const PWNED_MSG = 'This password has appeared in a known data breach. Please choose a different one.';
/** Audit action written when ADMIN_EMAILS (not a person) grants the admin role. */
const ENV_GRANT = 'admin.env-grant';
const EXISTS_MSG = 'An account with this email already exists. Log in instead, or use "Forgot password".';
/** Hash of a throwaway password; verified against for unknown accounts to equalise response time. */
/** Devices seen per user, for the new sign-in alert. */
const DEVICE_TTL_SEC = 180 * 24 * 3600;
const DUMMY_HASH = hashPassword('timing-equaliser-not-a-real-password');
// Settled once at boot; awaited only by a login for an unknown account.

type UserRow = typeof users.$inferSelect;
export interface SignInResult {
  tokens: IssuedTokens;
  user: MeResponse;
  isNew: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly otp: OtpService,
    private readonly google: GoogleService,
    private readonly tokens: TokenService,
    @Inject(ENV) private readonly env: Env,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly mail: MailService,
    private readonly flags: FlagsService,
  ) {}

  /**
   * Sign-up step 1. The answer is the same whether or not the address is registered, so the form
   * can't be used to find out who has an account: an existing owner gets a "you already have an
   * account" email instead of a code (same per-address send limits).
   */
  async requestSignupOtp(email: string, locale: 'en' | 'hi' = 'en') {
    const existing = await this.findVerifiedByEmail(email);
    if (!existing) return this.otp.request(email, 'signup', locale);
    await this.otp.throttle(email);
    await this.mail
      .sendNow('account.exists', email, {}, existing.locale === 'hi' ? 'hi' : locale)
      .catch((err: Error) => this.logger.warn(`Account-exists mail failed: ${err.message}`));
    return this.otp.receipt;
  }

  /** Sign-up step 2: the code proves the address, then the account is created with its password. */
  async signup(
    { email, code, name, password, marketingOptIn }: { email: string; code: string; name: string; password: string; marketingOptIn?: boolean },
    userAgent?: string,
    locale: 'en' | 'hi' = 'en',
  ): Promise<SignInResult> {
    await this.assertNotPwned(password);
    // The code comes first: only someone who received a sign-up code (never sent for registered
    // addresses) learns anything from the answer.
    await this.otp.verify(email, code, 'signup');
    if (await this.findVerifiedByEmail(email)) throw new ConflictException(EXISTS_MSG);
    const [created] = await this.db
      .insert(users)
      .values({ email, emailVerifiedAt: new Date(), name, passwordHash: await hashPassword(password), locale, marketingEmails: marketingOptIn === true })
      .onConflictDoNothing()
      .returning();
    if (!created) throw new ConflictException(EXISTS_MSG);
    return this.finish(toMe(created), true, userAgent, 'Email sign-up');
  }

  /**
   * Email + password. Failures are deliberately uniform (unknown email, Google-only account and
   * wrong password look the same) and capped per address to stop password guessing.
   */
  async login(email: string, password: string, userAgent?: string, ip = 'unknown'): Promise<SignInResult> {
    // Counted before the check (atomic), so parallel guesses can't slip past the limit. The per-IP
    // bucket stops guessing; the much larger all-IP bucket stops a botnet without letting one
    // stranger lock the owner out.
    const ipKey = `login:fail:${email}:${ip}`;
    const allKey = `login:fail:${email}`;
    const [fromIp, fromAll] = await Promise.all([
      bumpCounter(this.redis, ipKey, LOGIN_FAIL_WINDOW_SEC),
      bumpCounter(this.redis, allKey, LOGIN_FAIL_WINDOW_SEC),
    ]);
    if (fromIp > MAX_LOGIN_FAILS || fromAll > MAX_LOGIN_FAILS_ALL_IPS) {
      throw new HttpException(LOCKED_MSG, HttpStatus.TOO_MANY_REQUESTS);
    }
    const row = await this.findVerifiedByEmail(email);
    // Always spend one scrypt run so response time doesn't reveal whether the account exists.
    const matches = await verifyPassword(password, row?.passwordHash ?? (await DUMMY_HASH));
    if (!row || !row.passwordHash || !matches) throw new UnauthorizedException('Incorrect email or password.');
    await this.redis.multi().del(ipKey).decr(allKey).exec();
    return this.finish(toMe(row), false, userAgent, 'Email and password');
  }

  /** Forgot password step 1. Silent for unknown emails so the form can't be used to probe accounts. */
  async requestPasswordReset(email: string, uiLocale: 'en' | 'hi' = 'en') {
    const row = await this.findVerifiedByEmail(email);
    if (!row) {
      if (this.env.NODE_ENV === 'development') {
        this.logger.warn(`Password reset OTP not generated: no verified account found for ${email}`);
      }
      // Same limits as a real send, so a 429 doesn't reveal that the account exists either.
      await this.otp.throttle(email);
      return this.otp.receipt;
    }
    return this.otp.request(email, 'reset', row.locale === 'hi' ? 'hi' : uiLocale);
  }

  /** Forgot password step 2: the emailed code authorises a new password; every old session is revoked. */
  async resetPassword(email: string, code: string, password: string, userAgent?: string, ip = 'unknown'): Promise<SignInResult> {
    await this.assertNotPwned(password);
    await this.otp.verify(email, code, 'reset');
    const row = await this.findVerifiedByEmail(email);
    if (!row) throw new BadRequestException('This code has expired. Please request a new one.');
    await this.db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, row.id));
    await this.tokens.revokeAll(row.id);
    await this.redis.del(`login:fail:${email}`, `login:fail:${email}:${ip}`);
    const at = new Date().toISOString();
    void this.mail.toUser(row.id, 'security.password_changed', (u) => ({ name: u.name, at }));
    // The reset itself proves the address, so this device is trusted from now on (no extra alert).
    return this.finish(toMe(row), false, userAgent, null);
  }

  private async assertNotPwned(password: string) {
    if (this.env.PWNED_PASSWORD_CHECK && this.env.NODE_ENV !== 'test' && (await isPwnedPassword(password))) {
      throw new BadRequestException(PWNED_MSG);
    }
  }

  // ---------------------------------------------------------------- self-service deletion

  /** Emails a code that confirms "delete my account" (works for Google-only accounts too). */
  async requestDeletionCode(userId: string) {
    const row = await this.verifiedEmailOf(userId);
    return this.otp.request(row.email, 'delete', row.locale === 'hi' ? 'hi' : 'en');
  }

  async verifyDeletionCode(userId: string, code: string): Promise<void> {
    const row = await this.verifiedEmailOf(userId);
    await this.otp.verify(row.email, code, 'delete');
  }

  private async verifiedEmailOf(userId: string): Promise<{ email: string; locale: string }> {
    const [row] = await this.db.select({ email: users.email, verified: users.emailVerifiedAt, locale: users.locale }).from(users).where(eq(users.id, userId));
    if (!row?.email || !row.verified) throw new BadRequestException('Your account has no verified email. Contact support to delete it.');
    return { email: row.email.toLowerCase(), locale: row.locale };
  }

  private async findVerifiedByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(sql`lower(${users.email}) = ${email}`, isNotNull(users.emailVerifiedAt)));
    return row;
  }

  /**
   * Google sign-in. Accounts are matched on the stable Google `sub`, then on an email we already
   * verified ourselves. Unverified emails are never stored, so an attacker cannot pre-register a
   * victim's address and inherit their Google login.
   */
  async signInWithGoogle(credential: string, userAgent?: string): Promise<SignInResult> {
    return this.signInWithGoogleProfile(await this.google.verify(credential), userAgent);
  }

  /** Shared by the ID-token and the redirect (authorization code) flows. */
  async signInWithGoogleProfile(g: GoogleProfile, userAgent?: string): Promise<SignInResult> {
    const [bySub] = await this.db.select().from(users).where(eq(users.googleSub, g.sub));
    if (bySub) return this.finish(toMe(bySub), false, userAgent, 'Google');

    const [byEmail] = await this.db
      .select()
      .from(users)
      .where(and(sql`lower(${users.email}) = ${g.email}`, isNotNull(users.emailVerifiedAt)));
    if (byEmail) {
      if (byEmail.googleSub && byEmail.googleSub !== g.sub) throw new ConflictException('This email is linked to a different Google account.');
      const [linked] = await this.db
        .update(users)
        .set({ googleSub: g.sub, avatarUrl: byEmail.avatarUrl ?? g.picture, name: byEmail.name ?? g.name })
        .where(eq(users.id, byEmail.id))
        .returning();
      return this.finish(toMe(linked!), false, userAgent, 'Google');
    }

    await this.flags.require('signups', 'New sign-ups are paused for a short while. Please try again later.');
    const [created] = await this.db
      .insert(users)
      .values({ googleSub: g.sub, email: g.email, emailVerifiedAt: new Date(), name: g.name, avatarUrl: g.picture })
      .onConflictDoNothing()
      .returning();
    if (created) return this.finish(toMe(created), true, userAgent, 'Google');
    // Lost a race with a parallel sign-in of the same person.
    const [raced] = await this.db.select().from(users).where(eq(users.googleSub, g.sub));
    if (!raced) throw new ConflictException('Could not complete sign-in. Please try again.');
    return this.finish(toMe(raced), false, userAgent, 'Google');
  }

  /** WhatsApp bot only (Meta has already verified the sender's number); the website signs in by email. */
  async upsertUserByPhone(phone: string): Promise<{ user: MeResponse; isNew: boolean }> {
    const [existing] = await this.db.select().from(users).where(eq(users.phone, phone));
    if (existing) return { user: toMe(existing), isNew: false };
    const [created] = await this.db.insert(users).values({ phone }).onConflictDoNothing().returning();
    if (created) return { user: toMe(created), isNew: true };
    const [raced] = await this.db.select().from(users).where(eq(users.phone, phone));
    return { user: toMe(raced!), isNew: false };
  }

  /** `method` names the sign-in for the new-device alert; null = trusted (no alert). */
  private async finish(user: MeResponse, isNew: boolean, userAgent: string | undefined, method: string | null): Promise<SignInResult> {
    user = await this.checkAccess(user.id);
    const tokens = await this.tokens.issue({ id: user.id, role: user.role }, userAgent);
    void this.afterSignIn(user, isNew, userAgent, method).catch((err: Error) => this.logger.warn(`Sign-in mail hook failed: ${err.message}`));
    return { tokens, user, isNew };
  }

  /**
   * Welcome mail for new accounts; otherwise a security alert when an account signs in from a
   * browser/OS we have not seen for it. The very first tracked sign-in of an existing account
   * only records the device, so the rollout does not alert everyone at once.
   */
  private async afterSignIn(user: MeResponse, isNew: boolean, userAgent: string | undefined, method: string | null) {
    const device = describeDevice(userAgent);
    const key = `auth:devices:${user.id}`;
    const [[, added], [, size]] = (await this.redis
      .multi()
      .sadd(key, sha256(device).slice(0, 16))
      .scard(key)
      .expire(key, DEVICE_TTL_SEC)
      .exec()) as [[null, number], [null, number], unknown];
    if (isNew) {
      if (user.email) await this.mail.send('account.welcome', user.email, { name: user.name }, { userId: user.id, key: user.id, locale: toLocale(user.locale) });
      return;
    }
    if (added === 1 && size > 1 && method && user.email) {
      await this.mail.send('security.new_login', user.email, { name: user.name, device, method, at: new Date().toISOString() }, { userId: user.id, locale: toLocale(user.locale) });
    }
  }

  async refresh(refreshToken: string, userAgent?: string): Promise<IssuedTokens> {
    const userId = await this.tokens.consumeRefresh(refreshToken);
    const me = await this.checkAccess(userId);
    return this.tokens.issue({ id: me.id, role: me.role }, userAgent);
  }

  /**
   * Runs on every sign-in and token refresh: blocks disabled accounts and grants the admin role to
   * addresses listed in ADMIN_EMAILS (same login flow, no separate admin password).
   */
  private async checkAccess(userId: string): Promise<MeResponse> {
    const [row] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!row) throw new NotFoundException('User not found');
    if (row.disabledAt) {
      await this.tokens.revokeAll(row.id);
      throw new ForbiddenException('This account has been disabled. Please contact support.');
    }
    const email = row.emailVerifiedAt ? row.email?.toLowerCase() : undefined;
    const listed = Boolean(email && this.env.ADMIN_EMAILS.includes(email));
    if (listed && row.role !== 'admin') {
      const [promoted] = await this.db.update(users).set({ role: 'admin' }).where(eq(users.id, row.id)).returning();
      void this.db.insert(adminAuditLog).values({ adminId: null, action: ENV_GRANT, target: row.id, details: { email } }).catch(() => undefined);
      return toMe(promoted!);
    }
    if (!listed && row.role === 'admin' && (await this.grantedOnlyByEnv(row.id))) {
      const [demoted] = await this.db.update(users).set({ role: 'user', adminScopes: [] }).where(eq(users.id, row.id)).returning();
      void this.db.insert(adminAuditLog).values({ adminId: null, action: 'admin.env-revoke', target: row.id, details: { email } }).catch(() => undefined);
      this.logger.warn(`Admin role removed from ${row.id}: no longer listed in ADMIN_EMAILS`);
      return toMe(demoted!);
    }
    return toMe(row);
  }

  /**
   * True when this admin's role came from ADMIN_EMAILS and no person has granted it since, so
   * taking the address off the list takes the access away. Admins made by hand are left alone.
   */
  private async grantedOnlyByEnv(userId: string): Promise<boolean> {
    const [last] = await this.db
      .select({ action: adminAuditLog.action })
      .from(adminAuditLog)
      .where(and(eq(adminAuditLog.target, userId), inArray(adminAuditLog.action, [ENV_GRANT, 'user.role'])))
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(1);
    return last?.action === ENV_GRANT;
  }

  async me(userId: string): Promise<MeResponse> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new NotFoundException('User not found');
    return toMe(user);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<MeResponse> {
    if (Object.keys(input).length === 0) return this.me(userId);
    const [user] = await this.db.update(users).set(input).where(eq(users.id, userId)).returning();
    if (!user) throw new ForbiddenException();
    return toMe(user);
  }
}

function toMe(u: UserRow): MeResponse {
  return {
    id: u.id,
    phone: u.phone,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl,
    role: u.role as UserRole,
    locale: u.locale,
    marketingEmails: u.marketingEmails,
    ...(u.role === 'admin' ? { adminScopes: (u.adminScopes as string[] | null)?.length ? (u.adminScopes as string[]) : ['owner'] } : {}),
  };
}

/** "Chrome on Windows": coarse on purpose, so browser updates don't look like a new device. */
function describeDevice(ua?: string): string {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /SamsungBrowser/.test(ua)
        ? 'Samsung Internet'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Chrome\/|CriOS/.test(ua)
            ? 'Chrome'
            : /Safari\//.test(ua)
              ? 'Safari'
              : 'A browser';
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X|Macintosh/.test(ua)
          ? 'macOS'
          : /CrOS/.test(ua)
            ? 'ChromeOS'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'an unknown system';
  return `${browser} on ${os}`;
}
