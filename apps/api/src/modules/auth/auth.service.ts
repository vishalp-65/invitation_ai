import { adminAuditLog, and, desc, eq, inArray, isNotNull, sql, users, type Database } from '@cardai/db';
import type { MeResponse, OtpChannel, OtpReceipt, UpdateProfileInput, UserRole } from '@cardai/shared';
import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ENV, type Env } from '../../config/env.js';
import { sha256 } from '../../common/crypto.js';
import { DB, REDIS, type Redis } from '../../infra/infra.module.js';
import { FlagsService } from '../flags/flags.service.js';
import { MailService } from '../mail/mail.service.js';
import { toLocale } from '../mail/templates/index.js';
import { GoogleService, type GoogleProfile } from './google.service.js';
import { OtpService, type OtpTarget } from './otp.service.js';
import { TokenService, type IssuedTokens } from './token.service.js';

/** Audit action written when ADMIN_EMAILS (not a person) grants the admin role. */
const ENV_GRANT = 'admin.env-grant';
/** Devices seen per user, for the new sign-in alert. */
const DEVICE_TTL_SEC = 180 * 24 * 3600;
const SIGNUPS_PAUSED = 'New sign-ups are paused for a short while. Please try again later.';
const METHOD = { email: 'Email code', whatsapp: 'WhatsApp code' } as const;

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

  /** Which code channels the sign-in form may offer. */
  get whatsappAvailable(): boolean {
    return this.otp.whatsappAvailable;
  }

  /**
   * Sign in or sign up, step 1: one code to one address. Sign-up and sign-in are the same request
   * and the same answer, so the form cannot be used to find out who has an account.
   */
  async requestSignInCode(target: OtpTarget, uiLocale: 'en' | 'hi' = 'en'): Promise<OtpReceipt> {
    const existing = target.channel === 'email' ? await this.findVerifiedByEmail(target.to) : undefined;
    return this.otp.request(target, 'signin', existing?.locale === 'hi' ? 'hi' : uiLocale);
  }

  /**
   * Step 2: the code proves the address; the account is found, or created on first use. The code
   * is checked first, so only the owner of the address learns anything from the answer.
   */
  async verifySignInCode(target: OtpTarget, code: string, userAgent?: string, locale: 'en' | 'hi' = 'en'): Promise<SignInResult> {
    await this.otp.verify(target, code, 'signin');
    const method = METHOD[target.channel];
    const find = () => (target.channel === 'email' ? this.findVerifiedByEmail(target.to) : this.findByPhone(target.to));
    const existing = await find();
    if (existing) return this.finish(toMe(existing), false, userAgent, method);

    await this.flags.require('signups', SIGNUPS_PAUSED);
    const values = target.channel === 'email' ? { email: target.to, emailVerifiedAt: new Date(), locale } : { phone: target.to, locale };
    const [created] = await this.db.insert(users).values(values).onConflictDoNothing().returning();
    if (created) return this.finish(toMe(created), true, userAgent, method);
    // Lost a race with a parallel sign-in from the same person.
    const raced = await find();
    if (!raced) throw new ConflictException('Could not complete sign-in. Please try again.');
    return this.finish(toMe(raced), false, userAgent, method);
  }

  // ---------------------------------------------------------------- self-service deletion

  /**
   * Sends a code that confirms "delete my account": by email when the account has a verified
   * address (Google accounts included), otherwise on WhatsApp to its verified number.
   */
  async requestDeletionCode(userId: string): Promise<OtpReceipt & { channel: OtpChannel; to: string }> {
    const { target, locale } = await this.deletionTarget(userId);
    const receipt = await this.otp.request(target, 'delete', locale);
    return { ...receipt, channel: target.channel, to: target.channel === 'email' ? maskEmail(target.to) : maskPhone(target.to) };
  }

  async verifyDeletionCode(userId: string, code: string): Promise<void> {
    const { target } = await this.deletionTarget(userId);
    await this.otp.verify(target, code, 'delete');
  }

  private async deletionTarget(userId: string): Promise<{ target: OtpTarget; locale: 'en' | 'hi' }> {
    const [row] = await this.db
      .select({ email: users.email, verified: users.emailVerifiedAt, phone: users.phone, locale: users.locale })
      .from(users)
      .where(eq(users.id, userId));
    const locale = row?.locale === 'hi' ? 'hi' : 'en';
    if (row?.email && row.verified) return { target: { channel: 'email', to: row.email.toLowerCase() }, locale };
    if (row?.phone && this.otp.whatsappAvailable) return { target: { channel: 'whatsapp', to: row.phone }, locale };
    throw new BadRequestException('We have no verified email or WhatsApp number to send a code to. Contact support to delete your account.');
  }

  /** `users.phone` is only ever set once a number was proven (WhatsApp code, or a message to the bot). */
  private async findByPhone(phone: string): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.phone, phone));
    return row;
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

    await this.flags.require('signups', SIGNUPS_PAUSED);
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

  /** WhatsApp bot (Meta has already verified the sender's number). The website uses WhatsApp codes. */
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

function maskEmail(email: string): string {
  const [l = '', d = ''] = email.split('@');
  return `${l.slice(0, 2)}${'•'.repeat(Math.max(1, l.length - 2))}@${d}`;
}

/** `+919876543210` → `+91 •••••• 3210`. */
function maskPhone(e164: string): string {
  return `${e164.slice(0, e164.startsWith('+91') ? 3 : 2)} ${'•'.repeat(6)} ${e164.slice(-4)}`;
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
