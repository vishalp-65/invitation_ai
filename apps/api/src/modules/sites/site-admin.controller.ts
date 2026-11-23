import {
  saveSiteSchema,
  siteDraftSchema,
  sitePasswordSchema,
  siteUpdateInputSchema,
  vanityLinkSchema,
  type SaveSiteInput,
  type SiteDraftInput,
  type SiteUpdateInput,
} from '@cardai/shared';
import { Controller, Delete, Get, HttpCode, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, RateLimit, type AuthUser } from '../../common/auth.decorators.js';
import { UuidParam, ZBody, ZQuery } from '../../common/zod.js';
import { SiteAdminService } from './site-admin.service.js';

const hideSchema = z.object({ hidden: z.boolean() });
const approveSchema = z.object({ ids: z.array(z.uuid()).max(200).default([]), all: z.boolean().default(false) });
const aliasCheckSchema = z.object({ alias: z.string().max(64) });

@Controller('events/:eventId/site')
export class SiteAdminController {
  constructor(private readonly admin: SiteAdminService) {}

  @Get()
  settings(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string) {
    return this.admin.settings(user, eventId);
  }

  /** Builder autosave (debounced on the client). */
  @Put()
  @RateLimit({ limit: 600, windowSec: 3600 })
  save(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @ZBody(saveSiteSchema) body: SaveSiteInput) {
    return this.admin.save(user, eventId, body.site);
  }

  @Get('preview')
  preview(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string) {
    return this.admin.preview(user, eventId);
  }

  @Post('draft')
  @HttpCode(200)
  @RateLimit({ limit: 6, windowSec: 60 })
  draft(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @ZBody(siteDraftSchema) body: SiteDraftInput) {
    return this.admin.draft(user, eventId, body);
  }

  @Put('password')
  @RateLimit({ limit: 20, windowSec: 3600 })
  password(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @ZBody(sitePasswordSchema) body: z.infer<typeof sitePasswordSchema>) {
    return this.admin.setPassword(user, eventId, body.password);
  }

  /** Is this custom link free? Called as the host types (debounced). */
  @Get('alias/check')
  @RateLimit({ limit: 240, windowSec: 3600 })
  checkAlias(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @ZQuery(aliasCheckSchema) q: z.infer<typeof aliasCheckSchema>) {
    return this.admin.checkAlias(user, eventId, q.alias);
  }

  @Put('alias')
  @RateLimit({ limit: 20, windowSec: 3600 })
  alias(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @ZBody(vanityLinkSchema) body: z.infer<typeof vanityLinkSchema>) {
    return this.admin.setAlias(user, eventId, body.alias);
  }

  @Delete('alias')
  @HttpCode(204)
  removeAlias(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string) {
    return this.admin.removeAlias(user, eventId);
  }

  @Get('updates')
  updates(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string) {
    return this.admin.listUpdates(user, eventId);
  }

  @Post('updates')
  @RateLimit({ limit: 60, windowSec: 3600 })
  addUpdate(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @ZBody(siteUpdateInputSchema) body: SiteUpdateInput) {
    return this.admin.addUpdate(user, eventId, body);
  }

  @Delete('updates/:updateId')
  @HttpCode(204)
  removeUpdate(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @UuidParam('updateId') updateId: string) {
    return this.admin.removeUpdate(user, eventId, updateId);
  }

  @Get('wishes')
  wishes(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string) {
    return this.admin.listWishes(user, eventId);
  }

  @Put('wishes/:wishId')
  hideWish(
    @CurrentUser() user: AuthUser,
    @UuidParam('eventId') eventId: string,
    @UuidParam('wishId') wishId: string,
    @ZBody(hideSchema) body: z.infer<typeof hideSchema>,
  ) {
    return this.admin.setWishHidden(user, eventId, wishId, body.hidden);
  }

  @Delete('album/:assetId')
  @HttpCode(204)
  removeAlbumPhoto(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @UuidParam('assetId') assetId: string) {
    return this.admin.removeAlbumPhoto(user, eventId, assetId);
  }

  @Post('album/approve')
  @HttpCode(200)
  approveAlbum(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @ZBody(approveSchema) body: z.infer<typeof approveSchema>) {
    return this.admin.approveAlbum(user, eventId, body.all ? 'all' : body.ids);
  }

  @Get('album')
  album(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string) {
    return this.admin.album(user, eventId);
  }
}
