import { inviteMemberSchema, updateMemberSchema, type InviteMemberInput } from '@cardai/shared';
import { Controller, Delete, Get, HttpCode, Patch, Post } from '@nestjs/common';
import type { z } from 'zod';
import { CurrentUser, RateLimit, type AuthUser } from '../../common/auth.decorators.js';
import { UuidParam, ZBody } from '../../common/zod.js';
import { MembersService } from './members.service.js';

@Controller('events/:eventId/members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string) {
    return this.members.list(user, eventId);
  }

  @Post()
  @RateLimit({ limit: 30, windowSec: 3600 })
  invite(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @ZBody(inviteMemberSchema) body: InviteMemberInput) {
    return this.members.invite(user, eventId, body);
  }

  @Patch(':memberId')
  setRole(
    @CurrentUser() user: AuthUser,
    @UuidParam('eventId') eventId: string,
    @UuidParam('memberId') memberId: string,
    @ZBody(updateMemberSchema) body: z.infer<typeof updateMemberSchema>,
  ) {
    return this.members.setRole(user, eventId, memberId, body.role);
  }

  @Delete(':memberId')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @UuidParam('eventId') eventId: string, @UuidParam('memberId') memberId: string) {
    return this.members.remove(user, eventId, memberId);
  }
}
