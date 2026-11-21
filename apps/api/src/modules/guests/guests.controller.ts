import {
  checkInSchema,
  guestInputSchema,
  importGuestsSchema,
  SEND_KINDS,
  SEND_QUEUE_FILTERS,
  sendInviteSchema,
  updateGuestSchema,
  type CheckInInput,
  type GuestInput,
  type SendInviteInput,
  type UpdateGuestInput,
} from '@cardai/shared';
import { BadRequestException, Controller, Delete, Get, Header, HttpCode, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, RateLimit, type AuthUser } from '../../common/auth.decorators.js';
import { UuidParam, ZBody } from '../../common/zod.js';
import { GuestsService } from './guests.service.js';

const markSentSchema = z.object({ guestIds: z.array(z.uuid()).min(1).max(500), kind: z.enum(SEND_KINDS) });

@Controller('events/:eventId')
export class GuestsController {
  constructor(private readonly guests: GuestsService) {}

  @Get('guests')
  list(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string) {
    return this.guests.list(user, eventId);
  }

  @Post('guests')
  create(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @ZBody(guestInputSchema) body: GuestInput) {
    return this.guests.create(user, eventId, body);
  }

  @Post('guests/import')
  @RateLimit({ limit: 10, windowSec: 600 })
  import(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @ZBody(importGuestsSchema) body: z.infer<typeof importGuestsSchema>) {
    return this.guests.import(user, eventId, body.guests);
  }

  @Patch('guests/:guestId')
  update(
    @CurrentUser() user: AuthUser,
    @UuidParam('eventId') eventId: string,
    @UuidParam('guestId') guestId: string,
    @ZBody(updateGuestSchema) body: UpdateGuestInput,
  ) {
    return this.guests.update(user, eventId, guestId, body);
  }

  @Delete('guests/:guestId')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @UuidParam('guestId') guestId: string) {
    return this.guests.remove(user, eventId, guestId);
  }

  @Post('guests/:guestId/send')
  @HttpCode(200)
  @RateLimit({ limit: 300, windowSec: 3600 })
  send(
    @CurrentUser() user: AuthUser,
    @UuidParam('eventId') eventId: string,
    @UuidParam('guestId') guestId: string,
    @ZBody(sendInviteSchema) body: SendInviteInput,
  ) {
    return this.guests.sendInvite(user, eventId, guestId, body.viaApi, body.kind);
  }

  /** Prepared WhatsApp messages for a group of guests (unsent, not opened, no RSVP, day before...). */
  @Get('send-queue')
  queue(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @Query('filter') filter = 'unsent') {
    if (!(SEND_QUEUE_FILTERS as readonly string[]).includes(filter)) throw new BadRequestException('Unknown filter');
    return this.guests.sendQueue(user, eventId, filter as (typeof SEND_QUEUE_FILTERS)[number]);
  }

  @Post('send-queue/sent')
  @HttpCode(200)
  @RateLimit({ limit: 600, windowSec: 3600 })
  markSent(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @ZBody(markSentSchema) body: z.infer<typeof markSentSchema>) {
    return this.guests.markQueueSent(user, eventId, body.guestIds, body.kind);
  }

  /** Event-day gate: scan a guest's pass (personal link QR) or tap them in the list. */
  @Post('checkin')
  @HttpCode(200)
  @RateLimit({ limit: 3000, windowSec: 3600 })
  checkIn(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @ZBody(checkInSchema) body: CheckInInput) {
    return this.guests.checkIn(user, eventId, body);
  }

  @Get('rsvps')
  rsvps(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string) {
    return this.guests.rsvpList(user, eventId);
  }

  @Get('rsvps/summary')
  summary(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string) {
    return this.guests.rsvpSummary(user, eventId);
  }

  @Get('rsvps/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="rsvps.csv"')
  export(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string) {
    return this.guests.exportCsv(user, eventId);
  }
}
