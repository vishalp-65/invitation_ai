import { presignUploadSchema, type PresignUploadInput } from '@cardai/shared';
import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, HttpCode, Inject, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, Public, RateLimit, type AuthUser } from '../../common/auth.decorators.js';
import { UuidParam, ZBody } from '../../common/zod.js';
import { ENV, type Env } from '../../config/env.js';
import { STORAGE, type S3Storage } from '../../infra/infra.module.js';
import { MediaService } from './media.service.js';
import { verifyUpload } from './upload-signer.js';

@Controller()
export class MediaController {
  constructor(
    private readonly media: MediaService,
    @Inject(STORAGE) private readonly storage: S3Storage,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /**
   * Receives the file bytes for a presigned upload and writes them to storage. Authorised by the
   * signature alone (the key, type and exact size were fixed when the user was allowed to upload).
   */
  @Public()
  @Put('storage/upload')
  @HttpCode(204)
  @RateLimit({ limit: 120, windowSec: 3600 })
  async upload(@Query() q: { k?: string; t?: string; b?: string; e?: string; s?: string }, @Body() body: unknown): Promise<void> {
    const ok = verifyUpload(this.env.JWT_ACCESS_SECRET, q);
    if (!ok) throw new ForbiddenException('This upload link is invalid or has expired. Try again.');
    if (!Buffer.isBuffer(body) || body.byteLength !== ok.bytes) throw new BadRequestException('The file did not arrive in full. Try again.');
    await this.storage.put(ok.key, body, ok.contentType);
  }

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
