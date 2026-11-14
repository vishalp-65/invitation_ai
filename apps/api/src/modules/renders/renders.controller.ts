import { createRenderSchema, type CreateRenderInput } from '@cardai/shared';
import { Controller, Get, Post } from '@nestjs/common';
import { CurrentUser, RateLimit, type AuthUser } from '../../common/auth.decorators.js';
import { UuidParam, ZBody } from '../../common/zod.js';
import { RendersService } from './renders.service.js';

@Controller()
export class RendersController {
  constructor(private readonly renders: RendersService) {}

  @Post('renders')
  @RateLimit({ limit: 30, windowSec: 600 })
  create(@CurrentUser() user: AuthUser, @ZBody(createRenderSchema) body: CreateRenderInput) {
    return this.renders.create(user, body);
  }

  @Get('renders/:id')
  get(@CurrentUser() user: AuthUser, @UuidParam('id') id: string) {
    return this.renders.get(user, id);
  }

  @Get('events/:id/renders')
  latest(@CurrentUser() user: AuthUser, @UuidParam('id') id: string) {
    return this.renders.latestForEvent(user, id);
  }
}
