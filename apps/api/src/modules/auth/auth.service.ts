import { and, eq, isNotNull, sql, users, type Database } from '@cardai/db';
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
import { hashPassword, verifyPassword } from '../../common/crypto.js';
import { DB, REDIS, type Redis } from '../../infra/infra.module.js';
import { GoogleService, type GoogleProfile } from './google.service.js';
import { OtpService, OTP_TTL_SEC } from './otp.service.js';
import { TokenService, type IssuedTokens } from './token.service.js';

const MAX_LOGIN_FAILS = 10;
const LOGIN_FAIL_WINDOW_SEC = 15 * 60;
const EXISTS_MSG = 'An account with this email already exists. Log in instead, or use "Forgot password".';
/** Hash of a throwaway password; verified against for unknown accounts to equalise response time. */
const DUMMY_HASH = hashPassword('timing-equaliser-not-a-real-password');

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
  ) {}

  /** Sign-up step 1: refuse addresses that already have an account, otherwise email a code. */
  async requestSignupOtp(email: string) {
    if (await this.findVerifiedByEmail(email)) throw new ConflictException(EXISTS_MSG);
    return this.otp.request(email);
  }

  /** Sign-up step 2: the code proves the address, then the account is created with its password. */
  async signup(email: string, code: string, name: string, password: string, userAgent?: string): Promise<SignInResult> {
    if (await this.findVerifiedByEmail(email)) throw new ConflictException(EXISTS_MSG);
    await this.otp.verify(email, code);
    const [created] = await this.db
      .insert(users)
      .values({ email, emailVerifiedAt: new Date(), name, passwordHash: hashPassword(password) })
      .onConflictDoNothing()
      .returning();
    if (!created) throw new ConflictException(EXISTS_MSG);
    return this.finish(toMe(created), true, userAgent);
  }

  /**
   * Email + password. Failures are deliberately uniform (unknown email, Google-only account and
   * wrong password look the same) and capped per address to stop password guessing.
   */
  async login(email: string, password: string, userAgent?: string): Promise<SignInResult> {
    const failKey = `login:fail:${email}`;
    if (Number((await this.redis.get(failKey)) ?? 0) >= MAX_LOGIN_FAILS) {
      throw new HttpException('Too many failed attempts. Try again in 15 minutes, or reset your password.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const row = await this.findVerifiedByEmail(email);
    // Always spend one scrypt run so response time doesn't reveal whether the account exists.
    const matches = verifyPassword(password, row?.passwordHash ?? DUMMY_HASH);
    if (!row || !row.passwordHash || !matches) {
      const fails = await this.redis.incr(failKey);
      if (fails === 1) await this.redis.expire(failKey, LOGIN_FAIL_WINDOW_SEC);
      throw new UnauthorizedException('Incorrect email or password.');
    }
    await this.redis.del(failKey);
    return this.finish(toMe(row), false, userAgent);
  }

  /** Forgot password step 1. Silent for unknown emails so the form can't be used to probe accounts. */
  async requestPasswordReset(email: string) {
    if (!(await this.findVerifiedByEmail(email))) {
      if (this.env.NODE_ENV === 'development') {
        this.logger.warn(`Password reset OTP not generated: no verified account found for ${email}`);
      }
      return { expiresInSec: OTP_TTL_SEC, resendInSec: 30 };
    }
    return this.otp.request(email, 'password reset');
  }

  /** Forgot password step 2: the emailed code authorises a new password; every old session is revoked. */
  async resetPassword(email: string, code: string, password: string, userAgent?: string): Promise<SignInResult> {
    await this.otp.verify(email, code);
    const row = await this.findVerifiedByEmail(email);
    if (!row) throw new BadRequestException('This code has expired. Please request a new one.');
    await this.db.update(users).set({ passwordHash: hashPassword(password) }).where(eq(users.id, row.id));
    await this.tokens.revokeAll(row.id);
    await this.redis.del(`login:fail:${email}`);
    return this.finish(toMe(row), false, userAgent);
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
    if (bySub) return this.finish(toMe(bySub), false, userAgent);

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
      return this.finish(toMe(linked!), false, userAgent);
    }

    const [created] = await this.db
      .insert(users)
      .values({ googleSub: g.sub, email: g.email, emailVerifiedAt: new Date(), name: g.name, avatarUrl: g.picture })
      .onConflictDoNothing()
      .returning();
    if (created) return this.finish(toMe(created), true, userAgent);
    // Lost a race with a parallel sign-in of the same person.
    const [raced] = await this.db.select().from(users).where(eq(users.googleSub, g.sub));
    if (!raced) throw new ConflictException('Could not complete sign-in. Please try again.');
    return this.finish(toMe(raced), false, userAgent);
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

  private async finish(user: MeResponse, isNew: boolean, userAgent?: string): Promise<SignInResult> {
    user = await this.checkAccess(user.id);
    const tokens = await this.tokens.issue({ id: user.id, role: user.role }, userAgent);
    return { tokens, user, isNew };
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
    if (email && this.env.ADMIN_EMAILS.includes(email) && row.role !== 'admin') {
      const [promoted] = await this.db.update(users).set({ role: 'admin' }).where(eq(users.id, row.id)).returning();
      return toMe(promoted!);
    }
    return toMe(row);
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
  };
}
