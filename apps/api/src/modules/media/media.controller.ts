import { presignUploadSchema, type PresignUploadInput } from '@cardai/shared';
import { Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import { CurrentUser, Public, RateLimit, type AuthUser } from '../../common/auth.decorators.js';
import { UuidParam, ZBody } from '../../common/zod.js';
import { MediaService } from './media.service.js';

@Controller()
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('media/presign')
  @RateLimit({ limit: 60, windowSec: 3600 })
  presign(@CurrentUser() user: AuthUser, @ZBody(presignUploadSchema) body: PresignUploadInput) {
    return this.media.presign(user, body);
  }

  @Post('media/:id/complete')
  complete(@CurrentUser() user: AuthUser, @UuidParam('id') id: string) {
    return this.media.complete(user, id);
  }

  @Delete('media/:id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @UuidParam('id') id: string) {
    return this.media.remove(user, id);
  }

  @Get('events/:id/media')
  list(@CurrentUser() user: AuthUser, @UuidParam('id') id: string) {
    return this.media.listForEvent(user, id);
  }

  @Public()
  @Get('music')
  music() {
    return this.media.musicLibrary();
  }
}
