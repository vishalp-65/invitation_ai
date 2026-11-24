import {
  googleSignInSchema,
  otpRequestSchema,
  otpVerifySchema,
  updateProfileSchema,
  type GoogleSignInInput,
  type OtpChannel,
  type OtpRequestInput,
  type OtpVerifyInput,
  type UpdateProfileInput,
} from '@cardai/shared';
import { ConflictException, Controller, Delete, Get, HttpCode, Inject, Logger, NotFoundException, Patch, Post, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ENV, type Env } from '../../config/env.js';
import { CurrentUser, Public, RateLimit, type AuthUser } from '../../common/auth.decorators.js';
import { ACCESS_COOKIE } from '../../common/guards.js';
import { UuidParam, ZBody } from '../../common/zod.js';
import { VISITOR_COOKIE } from '@cardai/shared';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { AuthService } from './auth.service.js';
import type { OtpTarget } from './otp.service.js';
import { safeEqual } from '../../common/crypto.js';
import { GoogleService, safeNext } from './google.service.js';
import { ACCESS_TTL_SEC, REFRESH_TTL_SEC, TokenService, type IssuedTokens } from './token.service.js';

const REFRESH_COOKIE = 'cai_rt';
const REFRESH_PATH = '/api/auth';
/** Readable by the web proxy (path /); keep the name in sync with apps/web/src/proxy.ts. */
const SESSION_MARKER_COOKIE = 'cai_s';
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
      whatsapp: this.auth.whatsappAvailable,
    };
  }

  /**
   * Sign in or sign up, step 1: send a 6-digit code by email or WhatsApp. Same answer whether or
   * not an account exists; the per-address limits live in OtpService.
   */
  @Public()
  @Post('otp/request')
  @HttpCode(200)
  @RateLimit({ limit: 10, windowSec: 3600, by: 'ip' })
  requestCode(@ZBody(otpRequestSchema) body: OtpRequestInput, @Req() req: FastifyRequest) {
    return this.auth.requestSignInCode(targetOf(body), uiLocale(req));
  }

  /** Step 2: the code signs the person in, creating the account on first use. */
  @Public()
  @Post('otp/verify')
  @HttpCode(200)
  @RateLimit({ limit: 30, windowSec: 600, by: 'ip' })
  async verifyCode(@ZBody(otpVerifySchema) body: OtpVerifyInput, @Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const { tokens, user, isNew } = await this.auth.verifySignInCode(targetOf(body), body.code, req.headers['user-agent'], uiLocale(req));
    this.setCookies(reply, tokens);
    this.trackSignIn(req, user.id, isNew, body.channel);
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
    if (req.cookies.cai_imp) reply.clearCookie('cai_imp', { path: '/', domain: this.env.COOKIE_DOMAIN });
    return { ok: true };
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const token = req.cookies[REFRESH_COOKIE];
    if (token) await this.tokens.revoke(token);
    // The access token would otherwise keep working until it expires (up to 15 minutes).
    const access = req.cookies[ACCESS_COOKIE];
    if (access) await this.tokens.revokeAccess(access);
    this.clearSessionCookies(reply);
    return { ok: true };
  }

  /** Signs this account out on every device, this one included. */
  @Post('logout-all')
  @HttpCode(200)
  @RateLimit({ limit: 10, windowSec: 600 })
  async logoutAll(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.tokens.revokeAll(user.id);
    this.clearSessionCookies(reply);
    return { ok: true };
  }

  /** Devices signed in to this account. */
  @Get('sessions')
  sessions(@CurrentUser() user: AuthUser, @Req() req: FastifyRequest) {
    return this.tokens.list(user.id, req.cookies[REFRESH_COOKIE]);
  }

  /** Signs one device out (it loses access within 15 minutes, when its access token lapses). */
  @Delete('sessions/:id')
  @HttpCode(200)
  @RateLimit({ limit: 30, windowSec: 600 })
  async endSession(@CurrentUser() user: AuthUser, @UuidParam('id') id: string) {
    if (!(await this.tokens.revokeById(user.id, id))) throw new NotFoundException('That session has already ended.');
    return { ok: true };
  }

  private clearSessionCookies(reply: FastifyReply) {
    const domains = new Set([this.env.COOKIE_DOMAIN, this.legacyCookieDomain]);
    for (const domain of domains) {
      reply.clearCookie(ACCESS_COOKIE, { path: '/', domain });
      reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH, domain });
      reply.clearCookie(SESSION_MARKER_COOKIE, { path: '/', domain });
    }
  }

  /**
   * Session cookies used to be set for the whole parent domain (`.noyta.in`), which also sends
   * them to every subdomain. With COOKIE_DOMAIN unset they are host-only; this is the old domain,
   * cleared on every sign-in and refresh so a browser never holds both copies.
   */
  private get legacyCookieDomain(): string | undefined {
    if (this.env.COOKIE_DOMAIN || this.env.NODE_ENV !== 'production') return undefined;
    const host = new URL(this.env.APP_URL).hostname;
    return /^[\d.]+$/.test(host) || !host.includes('.') ? undefined : `.${host.replace(/^www\./, '')}`;
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const me = await this.auth.me(user.id);
    return user.imp ? { ...me, impersonatedBy: user.imp } : me;
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @ZBody(updateProfileSchema) body: UpdateProfileInput) {
    return this.auth.updateProfile(user.id, body);
  }

  private trackSignIn(req: FastifyRequest, userId: string, isNew: boolean, method: OtpChannel | 'google') {
    const visitorId = req.cookies[VISITOR_COOKIE];
    this.analytics.identify(visitorId, userId);
    const ref = req.cookies.cai_ref;
    if (isNew && ref && /^[0-9a-f-]{36}$/i.test(ref)) this.analytics.referred(userId, ref);
    this.analytics.record(isNew ? 'signup' : 'login', { visitorId, userId, userAgent: req.headers['user-agent'] }, { props: { method } });
  }

  private setCookies(reply: FastifyReply, tokens: IssuedTokens) {
    const base = {
      httpOnly: true,
      secure: this.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      domain: this.env.COOKIE_DOMAIN,
    };
    const legacy = this.legacyCookieDomain;
    if (legacy) {
      reply.clearCookie(ACCESS_COOKIE, { path: '/', domain: legacy });
      reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH, domain: legacy });
    }
    reply.setCookie(ACCESS_COOKIE, tokens.accessToken, { ...base, path: '/', maxAge: ACCESS_TTL_SEC });
    reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, { ...base, path: REFRESH_PATH, maxAge: REFRESH_TTL_SEC });
    // Holds no secret: tells the edge proxy a refreshable session exists (cai_rt is invisible to it),
    // so an expired access token is renewed in the background instead of bouncing to /login.
    reply.setCookie(SESSION_MARKER_COOKIE, '1', { ...base, path: '/', maxAge: REFRESH_TTL_SEC });
  }
}

function targetOf(body: OtpRequestInput | OtpVerifyInput): OtpTarget {
  return body.channel === 'email' ? { channel: 'email', to: body.email } : { channel: 'whatsapp', to: body.phone };
}

/** The web app's language cookie (same origin through the /api proxy); used for emails sent before an account exists. */
function uiLocale(req: FastifyRequest): 'en' | 'hi' {
  return (req.cookies as Record<string, string | undefined> | undefined)?.locale === 'hi' ? 'hi' : 'en';
}
