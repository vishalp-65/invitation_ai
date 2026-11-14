import { submitRsvpSchema, trackViewSchema, type SubmitRsvpInput } from '@cardai/shared';
import { Controller, Get, Header, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { Public, RateLimit } from '../../common/auth.decorators.js';
import { ZBody } from '../../common/zod.js';
import { SitesService } from './sites.service.js';

@Public()
@Controller('public/events')
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Get(':slug')
  @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=300')
  get(@Param('slug') slug: string, @Query('g') guestToken?: string) {
    return this.sites.getSite(slug, guestToken);
  }

  @Post(':slug/view')
  @HttpCode(200)
  @RateLimit({ limit: 60, windowSec: 60, by: 'ip' })
  view(@Param('slug') slug: string, @Req() req: FastifyRequest, @ZBody(trackViewSchema) body: z.infer<typeof trackViewSchema>) {
    return this.sites.trackView(slug, req.ip, body.g);
  }

  @Post(':slug/rsvp')
  @HttpCode(200)
  @RateLimit({ limit: 10, windowSec: 600, by: 'ip' })
  rsvp(@Param('slug') slug: string, @ZBody(submitRsvpSchema) body: SubmitRsvpInput) {
    return this.sites.submitRsvp(slug, body);
  }

  @Get(':slug/calendar.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="invite.ics"')
  calendar(@Param('slug') slug: string, @Query('fn') functionId?: string) {
    return this.sites.calendar(slug, functionId);
  }
}
