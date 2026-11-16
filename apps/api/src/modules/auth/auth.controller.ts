import {
  googleSignInSchema,
  loginSchema,
  requestOtpSchema,
  resetPasswordSchema,
  signupSchema,
  updateProfileSchema,
  type GoogleSignInInput,
  type LoginInput,
  type RequestOtpInput,
  type ResetPasswordInput,
  type SignupInput,
  type UpdateProfileInput,
} from '@cardai/shared';
import { ConflictException, Controller, Get, HttpCode, Inject, Logger, Patch, Post, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ENV, type Env } from '../../config/env.js';
import { CurrentUser, Public, RateLimit, type AuthUser } from '../../common/auth.decorators.js';
import { ACCESS_COOKIE } from '../../common/guards.js';
import { ZBody } from '../../common/zod.js';
import { VISITOR_COOKIE } from '@cardai/shared';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { AuthService } from './auth.service.js';
import { safeEqual } from '../../common/crypto.js';
import { GoogleService, safeNext } from './google.service.js';
import { ACCESS_TTL_SEC, REFRESH_TTL_SEC, TokenService, type IssuedTokens } from './token.service.js';

const REFRESH_COOKIE = 'cai_rt';
const REFRESH_PATH = '/api/auth';
/** Binds the Google round trip to this browser (login-CSRF protection). */
const GOOGLE_STATE_COOKIE = 'cai_gs';
const GOOGLE_PATH = '/api/auth/google';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly auth: AuthService,
    private readonly google: GoogleService,
    private readonly tokens: TokenService,
    private readonly analytics: AnalyticsService,
  ) {}

  /** Which sign-in methods this deployment offers (the Google client ID is public by design). */
  @Public()
  @Get('providers')
  providers() {
    return {
      google: this.google.clientId ? { clientId: this.google.clientId, redirect: this.google.redirectEnabled } : null,
      email: true,
    };
  }

  /** Sign-up step 1: email a verification code (rejects addresses that already have an account). */
  @Public()
  @Post('signup/request')
  @HttpCode(200)
  @RateLimit({ limit: 10, windowSec: 3600, by: 'ip' })
  requestSignup(@ZBody(requestOtpSchema) body: RequestOtpInput) {
    return this.auth.requestSignupOtp(body.email);
  }

  /** Sign-up step 2: verify the code and create the account with its password. */
  @Public()
  @Post('signup')
  @HttpCode(200)
  @RateLimit({ limit: 30, windowSec: 600, by: 'ip' })
  async signup(@ZBody(signupSchema) body: SignupInput, @Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const { tokens, user, isNew } = await this.auth.signup(body.email, body.code, body.name, body.password, req.headers['user-agent']);
    this.setCookies(reply, tokens);
    this.trackSignIn(req, user.id, isNew, 'email');
    return { user, isNew };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @RateLimit({ limit: 30, windowSec: 600, by: 'ip' })
  async login(@ZBody(loginSchema) body: LoginInput, @Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const { tokens, user, isNew } = await this.auth.login(body.email, body.password, req.headers['user-agent']);
    this.setCookies(reply, tokens);
    this.trackSignIn(req, user.id, isNew, 'email');
    return { user, isNew };
  }

  /** Forgot password step 1: the only login-side use of an emailed code. */
  @Public()
  @Post('password/forgot')
  @HttpCode(200)
  @RateLimit({ limit: 10, windowSec: 3600, by: 'ip' })
  forgotPassword(@ZBody(requestOtpSchema) body: RequestOtpInput) {
    return this.auth.requestPasswordReset(body.email);
  }

  /** Forgot password step 2: code + new password, then signed in. */
  @Public()
  @Post('password/reset')
  @HttpCode(200)
  @RateLimit({ limit: 30, windowSec: 600, by: 'ip' })
  async resetPassword(@ZBody(resetPasswordSchema) body: ResetPasswordInput, @Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const { tokens, user, isNew } = await this.auth.resetPassword(body.email, body.code, body.password, req.headers['user-agent']);
    this.setCookies(reply, tokens);
    this.trackSignIn(req, user.id, isNew, 'email');
    return { user, isNew };
  }

  /** Redirect flow, step 1: send the browser to Google's consent screen. */
  @Public()
  @Get('google/start')
  @RateLimit({ limit: 30, windowSec: 600, by: 'ip' })
  async googleStart(@Query('next') next: string | undefined, @Res() reply: FastifyReply) {
    if (!this.google.redirectEnabled) return this.redirect(reply, this.loginErrorUrl('unavailable', next));
    const { url, state } = await this.google.startRedirect(next);
    reply.setCookie(GOOGLE_STATE_COOKIE, state, {
      httpOnly: true,
      secure: this.env.NODE_ENV === 'production',
      sameSite: 'lax', // sent on Google's top-level redirect back to us
      path: GOOGLE_PATH,
      domain: this.env.COOKIE_DOMAIN,
      maxAge: 600,
    });
    return this.redirect(reply, url);
  }

  /** Redirect flow, step 2: Google sends the user back here with a one-time code. */
  @Public()
  @Get('google/callback')
  @RateLimit({ limit: 30, windowSec: 600, by: 'ip' })
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const cookieState = req.cookies[GOOGLE_STATE_COOKIE];
    reply.clearCookie(GOOGLE_STATE_COOKIE, { path: GOOGLE_PATH, domain: this.env.COOKIE_DOMAIN });

    if (error) return this.redirect(reply, this.loginErrorUrl(error === 'access_denied' ? 'cancelled' : 'failed'));
    if (
      typeof code !== 'string' || typeof state !== 'string' || !cookieState ||
      code.length > 2048 || state.length > 128 || !safeEqual(cookieState, state)
    ) {
      return this.redirect(reply, this.loginErrorUrl('expired'));
    }

    try {
      const { profile, next } = await this.google.finishRedirect(code, state);
      const { tokens, user, isNew } = await this.auth.signInWithGoogleProfile(profile, req.headers['user-agent']);
      this.setCookies(reply, tokens);
      this.trackSignIn(req, user.id, isNew, 'google');
      return this.redirect(reply, new URL(safeNext(next), this.env.APP_URL).toString());
    } catch (err) {
      if (!(err instanceof UnauthorizedException || err instanceof ConflictException)) {
        this.logger.error(`Google callback failed: ${(err as Error).message}`);
      }
      return this.redirect(reply, this.loginErrorUrl(err instanceof ConflictException ? 'conflict' : 'failed'));
    }
  }

  private loginErrorUrl(code: 'unavailable' | 'cancelled' | 'expired' | 'failed' | 'conflict', next?: string) {
    const url = new URL('/login', this.env.APP_URL);
    url.searchParams.set('error', `google_${code}`);
    if (next) url.searchParams.set('next', safeNext(next));
    return url.toString();
  }

  private redirect(reply: FastifyReply, url: string) {
    return reply.code(302).header('Cache-Control', 'no-store').header('Location', url).send();
  }

  @Public()
  @Post('google/nonce')
  @HttpCode(200)
  @RateLimit({ limit: 30, windowSec: 600, by: 'ip' })
  async googleNonce() {
    return { nonce: await this.google.issueNonce() };
  }

  @Public()
  @Post('google')
  @HttpCode(200)
  @RateLimit({ limit: 30, windowSec: 600, by: 'ip' })
  async googleSignIn(
    @ZBody(googleSignInSchema) body: GoogleSignInInput,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const { tokens, user, isNew } = await this.auth.signInWithGoogle(body.credential, req.headers['user-agent']);
    this.setCookies(reply, tokens);
    this.trackSignIn(req, user.id, isNew, 'google');
    return { user, isNew };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @RateLimit({ limit: 60, windowSec: 600, by: 'ip' })
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const token = req.cookies[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('Not signed in');
    const tokens = await this.auth.refresh(token, req.headers['user-agent']);
    this.setCookies(reply, tokens);
    return { ok: true };
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const token = req.cookies[REFRESH_COOKIE];
    if (token) await this.tokens.revoke(token);
    reply.clearCookie(ACCESS_COOKIE, { path: '/', domain: this.env.COOKIE_DOMAIN });
    reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH, domain: this.env.COOKIE_DOMAIN });
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @ZBody(updateProfileSchema) body: UpdateProfileInput) {
    return this.auth.updateProfile(user.id, body);
  }

  private trackSignIn(req: FastifyRequest, userId: string, isNew: boolean, method: 'email' | 'google') {
    const visitorId = req.cookies[VISITOR_COOKIE];
    this.analytics.identify(visitorId, userId);
    this.analytics.record(isNew ? 'signup' : 'login', { visitorId, userId, userAgent: req.headers['user-agent'] }, { props: { method } });
  }

  private setCookies(reply: FastifyReply, tokens: IssuedTokens) {
    const base = {
      httpOnly: true,
      secure: this.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      domain: this.env.COOKIE_DOMAIN,
    };
    reply.setCookie(ACCESS_COOKIE, tokens.accessToken, { ...base, path: '/', maxAge: ACCESS_TTL_SEC });
    reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, { ...base, path: REFRESH_PATH, maxAge: REFRESH_TTL_SEC });
  }
}
