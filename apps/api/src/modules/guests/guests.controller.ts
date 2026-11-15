import { guestInputSchema, importGuestsSchema, updateGuestSchema, type GuestInput, type UpdateGuestInput } from '@cardai/shared';
import { Controller, Delete, Get, Header, HttpCode, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, RateLimit, type AuthUser } from '../../common/auth.decorators.js';
import { UuidParam, ZBody } from '../../common/zod.js';
import { GuestsService } from './guests.service.js';

const sendSchema = z.object({ viaApi: z.boolean().default(false) });

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
    @ZBody(sendSchema) body: z.infer<typeof sendSchema>,
  ) {
    return this.guests.sendInvite(user, eventId, guestId, body.viaApi);
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
