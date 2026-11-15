import { and, eq, isNotNull, sql, users, type Database } from '@cardai/db';
import type { MeResponse, UpdateProfileInput, UserRole } from '@cardai/shared';
import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ENV, type Env } from '../../config/env.js';
import { DB } from '../../infra/infra.module.js';
import { GoogleService, type GoogleProfile } from './google.service.js';
import { OtpService } from './otp.service.js';
import { TokenService, type IssuedTokens } from './token.service.js';

type UserRow = typeof users.$inferSelect;
export interface SignInResult {
  tokens: IssuedTokens;
  user: MeResponse;
  isNew: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly otp: OtpService,
    private readonly google: GoogleService,
    private readonly tokens: TokenService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  requestLoginOtp(email: string) {
    return this.otp.request(email);
  }

  /**
   * Sign in, or sign up on first use, by proving control of an email address. `name` is applied
   * only to brand-new accounts (or ones that never had a name), never overwriting an existing one.
   */
  async verifyLoginOtp(email: string, code: string, name?: string, userAgent?: string): Promise<SignInResult> {
    await this.otp.verify(email, code);
    const found = await this.upsertUserByEmail(email);
    let user = found.user;
    if (name && !user.name) {
      const [named] = await this.db.update(users).set({ name }).where(eq(users.id, user.id)).returning();
      if (named) user = toMe(named);
    }
    return this.finish(user, found.isNew, userAgent);
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

  private async upsertUserByEmail(email: string): Promise<{ user: MeResponse; isNew: boolean }> {
    const verified = and(sql`lower(${users.email}) = ${email}`, isNotNull(users.emailVerifiedAt));
    const [existing] = await this.db.select().from(users).where(verified);
    if (existing) return { user: toMe(existing), isNew: false };
    const [created] = await this.db.insert(users).values({ email, emailVerifiedAt: new Date() }).onConflictDoNothing().returning();
    if (created) return { user: toMe(created), isNew: true };
    const [raced] = await this.db.select().from(users).where(verified);
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
