import {
  albumUploadSchema,
  submitRsvpSchema,
  trackViewSchema,
  unlockSiteSchema,
  wishInputSchema,
  type AlbumUploadInput,
  type SubmitRsvpInput,
  type WishInput,
} from '@cardai/shared';
import { Controller, Get, Header, HttpCode, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { Public, RateLimit } from '../../common/auth.decorators.js';
import { UuidParam, ZBody } from '../../common/zod.js';
import { SitesService } from './sites.service.js';

@Public()
@Controller('public/events')
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  /**
   * Shared caches may keep the open page for 30 s; personal (?g) and unlocked (?k) pages, and
   * the lock screen of private sites, are never stored by shared caches.
   */
  @Get(':slug')
  async get(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Query('g') guestToken?: string,
    @Query('k') key?: string,
  ) {
    const site = await this.sites.getSite(slug, guestToken, key);
    const personal = Boolean(guestToken || key) || 'locked' in site || site.site.access.mode !== 'link';
    reply.header('Cache-Control', personal ? 'private, no-store' : 'public, max-age=30, stale-while-revalidate=300');
    return site;
  }

  @Post(':slug/unlock')
  @HttpCode(200)
  @RateLimit({ limit: 10, windowSec: 600, by: 'ip' })
  unlock(@Param('slug') slug: string, @ZBody(unlockSiteSchema) body: z.infer<typeof unlockSiteSchema>) {
    return this.sites.unlock(slug, body.password);
  }

  /** Live updates, polled by open pages. */
  @Get(':slug/updates')
  @Header('Cache-Control', 'public, max-age=15')
  updates(@Param('slug') slug: string) {
    return this.sites.getUpdates(slug);
  }

  // Guests at the venue often share one Wi-Fi IP, so limits are per IP but generous.
  @Post(':slug/wishes')
  @RateLimit({ limit: 30, windowSec: 600, by: 'ip' })
  wish(@Param('slug') slug: string, @ZBody(wishInputSchema) body: WishInput) {
    return this.sites.addWish(slug, body);
  }

  @Post(':slug/album/uploads')
  @RateLimit({ limit: 200, windowSec: 3600, by: 'ip' })
  albumUpload(@Param('slug') slug: string, @ZBody(albumUploadSchema) body: AlbumUploadInput) {
    return this.sites.albumUpload(slug, body);
  }

  @Post(':slug/album/uploads/:assetId/complete')
  @HttpCode(200)
  @RateLimit({ limit: 200, windowSec: 3600, by: 'ip' })
  albumComplete(@Param('slug') slug: string, @UuidParam('assetId') assetId: string) {
    return this.sites.albumComplete(slug, assetId);
  }

  @Post(':slug/view')
  @HttpCode(200)
  @RateLimit({ limit: 60, windowSec: 60, by: 'ip' })
  async view(@Param('slug') slug: string, @Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply, @ZBody(trackViewSchema) body: z.infer<typeof trackViewSchema>) {
    const r = await this.sites.trackView(slug, req.ip, body.g, req.headers['user-agent']);
    // Remembers (30 days, first-party) that this browser was a guest of this invitation, so a
    // guest who later makes their own invitation is counted as word of mouth.
    if (!(req.cookies as Record<string, string | undefined>)?.cai_ref) {
      reply.setCookie('cai_ref', r.eventId, { path: '/', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 3600 });
    }
    return { ok: true };
  }

  @Post(':slug/rsvp')
  @HttpCode(200)
  @RateLimit({ limit: 30, windowSec: 600, by: 'ip' })
  rsvp(@Param('slug') slug: string, @ZBody(submitRsvpSchema) body: SubmitRsvpInput) {
    return this.sites.submitRsvp(slug, body);
  }

  @Get(':slug/upi-qr.svg')
  @Header('Content-Type', 'image/svg+xml')
  @Header('Cache-Control', 'public, max-age=300')
  upiQr(@Param('slug') slug: string) {
    return this.sites.upiQr(slug);
  }

  @Get(':slug/calendar.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="invite.ics"')
  calendar(@Param('slug') slug: string, @Query('fn') functionId?: string) {
    return this.sites.calendar(slug, functionId);
  }
}
