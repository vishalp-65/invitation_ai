import { EVENT_TYPE_IDS, saveUserTemplateSchema, type SaveUserTemplateInput } from '@cardai/shared';
import { Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, RateLimit, type AuthUser } from '../../common/auth.decorators.js';
import { UuidParam, ZBody } from '../../common/zod.js';
import { UserTemplatesService } from './user-templates.service.js';

const createSchema = saveUserTemplateSchema.extend({ eventType: z.enum(EVENT_TYPE_IDS).optional() });

@Controller('me/templates')
export class UserTemplatesController {
  constructor(private readonly templates: UserTemplatesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.templates.list(user);
  }

  @Post()
  @RateLimit({ limit: 20, windowSec: 600 })
  create(@CurrentUser() user: AuthUser, @ZBody(createSchema) body: SaveUserTemplateInput & { eventType?: string }) {
    return this.templates.create(user, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @UuidParam('id') id: string) {
    return this.templates.remove(user, id);
  }
}
