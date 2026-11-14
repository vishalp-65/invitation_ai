import { createEventSchema, saveDesignSchema, updateEventSchema, type CreateEventInput, type SaveDesignInput, type UpdateEventInput } from '@cardai/shared';
import { Controller, Delete, Get, Patch, Post, Put } from '@nestjs/common';
import { CurrentUser, RateLimit, type AuthUser } from '../../common/auth.decorators.js';
import { UuidParam, ZBody } from '../../common/zod.js';
import { EventsService } from './events.service.js';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  @RateLimit({ limit: 30, windowSec: 3600 })
  create(@CurrentUser() user: AuthUser, @ZBody(createEventSchema) body: CreateEventInput) {
    return this.events.create(user, body);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.events.list(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @UuidParam('id') id: string) {
    return this.events.getDto(user, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @UuidParam('id') id: string, @ZBody(updateEventSchema) body: UpdateEventInput) {
    return this.events.update(user, id, body);
  }

  /** Editor autosave (debounced on the client). */
  @Put(':id/design')
  @RateLimit({ limit: 600, windowSec: 3600 })
  saveDesign(@CurrentUser() user: AuthUser, @UuidParam('id') id: string, @ZBody(saveDesignSchema) body: SaveDesignInput) {
    return this.events.saveDesign(user, id, body.design);
  }

  @Post(':id/publish')
  publish(@CurrentUser() user: AuthUser, @UuidParam('id') id: string) {
    return this.events.setStatus(user, id, 'published');
  }

  @Post(':id/unpublish')
  unpublish(@CurrentUser() user: AuthUser, @UuidParam('id') id: string) {
    return this.events.setStatus(user, id, 'draft');
  }

  @Post(':id/duplicate')
  duplicate(@CurrentUser() user: AuthUser, @UuidParam('id') id: string) {
    return this.events.duplicate(user, id);
  }

  @Delete(':id')
  archive(@CurrentUser() user: AuthUser, @UuidParam('id') id: string) {
    return this.events.setStatus(user, id, 'archived');
  }
}
