import { and, eq, isNotNull, sql, users, type Database } from '@cardai/db';
import type { MeResponse, OtpTarget, UpdateProfileInput, UserRole } from '@cardai/shared';
import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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
  ) {}

  requestLoginOtp(target: OtpTarget) {
    return this.otp.request('login', target);
  }

  /** Sign in (or sign up) by proving control of a phone number or email address. */
  async verifyLoginOtp(target: OtpTarget, code: string, userAgent?: string): Promise<SignInResult> {
    await this.otp.verify('login', target, code);
    const { user, isNew } = target.channel === 'phone' ? await this.upsertUserByPhone(target.phone) : await this.upsertUserByEmail(target.email);
    return this.finish(user, isNew, userAgent);
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

  /** Signed-in user adds (and proves) a second contact: step 1, send the code. */
  async requestContactOtp(userId: string, target: OtpTarget) {
    await this.assertContactFree(userId, target);
    return this.otp.request('link', target);
  }

  /** Step 2: verify the code, then attach the contact to the account. */
  async verifyContactOtp(userId: string, target: OtpTarget, code: string): Promise<MeResponse> {
    await this.assertContactFree(userId, target);
    await this.otp.verify('link', target, code);
    try {
      const patch = target.channel === 'phone' ? { phone: target.phone } : { email: target.email, emailVerifiedAt: new Date() };
      const [user] = await this.db.update(users).set(patch).where(eq(users.id, userId)).returning();
      if (!user) throw new NotFoundException('User not found');
      return toMe(user);
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException(contactTakenMessage(target));
      throw err;
    }
  }

  private async assertContactFree(userId: string, target: OtpTarget) {
    const [other] =
      target.channel === 'phone'
        ? await this.db.select({ id: users.id }).from(users).where(eq(users.phone, target.phone))
        : await this.db
            .select({ id: users.id })
            .from(users)
            .where(and(sql`lower(${users.email}) = ${target.email}`, isNotNull(users.emailVerifiedAt)));
    if (other && other.id !== userId) throw new ConflictException(contactTakenMessage(target));
  }

  /** Also used by the WhatsApp bot: Meta has already verified the sender's number. */
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
    const tokens = await this.tokens.issue({ id: user.id, role: user.role }, userAgent);
    return { tokens, user, isNew };
  }

  async refresh(refreshToken: string, userAgent?: string): Promise<IssuedTokens> {
    const userId = await this.tokens.consumeRefresh(refreshToken);
    const me = await this.me(userId);
    return this.tokens.issue({ id: me.id, role: me.role }, userAgent);
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

function contactTakenMessage(t: OtpTarget) {
  return t.channel === 'phone' ? 'This mobile number is already linked to another account.' : 'This email is already linked to another account.';
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
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
