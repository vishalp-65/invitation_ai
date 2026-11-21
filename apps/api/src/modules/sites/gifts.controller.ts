import { recordGiftSchema, type RecordGiftInput } from '@cardai/shared';
import { Controller, Delete, Get, Header, HttpCode, Post } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/auth.decorators.js';
import { UuidParam, ZBody } from '../../common/zod.js';
import { GiftsService } from './gifts.service.js';

@Controller('events/:eventId/gifts')
export class GiftsController {
  constructor(private readonly gifts: GiftsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string) {
    return this.gifts.list(user, eventId);
  }

  @Post()
  record(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @ZBody(recordGiftSchema) body: RecordGiftInput) {
    return this.gifts.record(user, eventId, body);
  }

  @Post(':giftId/thank')
  @HttpCode(200)
  thank(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @UuidParam('giftId') giftId: string) {
    return this.gifts.thank(user, eventId, giftId);
  }

  @Delete(':giftId')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @UuidParam('giftId') giftId: string) {
    return this.gifts.remove(user, eventId, giftId);
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="shagun.csv"')
  export(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string) {
    return this.gifts.exportCsv(user, eventId);
  }
}
