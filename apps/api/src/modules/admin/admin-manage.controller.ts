import {
  adminInvitationUpdateSchema,
  adminProfileSchema,
  adminUsersBulkSchema,
  adminWishActionSchema,
  FEATURES,
} from '@cardai/shared';
import { Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, RateLimit, Roles, type AuthUser } from '../../common/auth.decorators.js';
import { UuidParam, ZBody } from '../../common/zod.js';
import { AdminGuard, AdminScopes } from './admin-access.js';
import { AdminManageService } from './admin-manage.service.js';

const featureParam = z.enum(FEATURES);
const trackParam = z.string().regex(/^[a-z0-9-]{3,40}$/);
const requestStatus = z.object({ status: z.enum(['open', 'done', 'rejected']) });

/** Open, edit, hide and delete: the per-record actions behind the console's detail panels. */
@Roles('admin')
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminManageController {
  constructor(private readonly manage: AdminManageService) {}

  // ---- Invitations ----

  @Get('invitations/:id')
  @AdminScopes('support')
  invitation(@UuidParam('id') id: string) {
    return this.manage.invitation(id);
  }

  @Patch('invitations/:id/details')
  @AdminScopes('support')
  updateInvitation(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @ZBody(adminInvitationUpdateSchema) body: z.output<typeof adminInvitationUpdateSchema>) {
    return this.manage.updateInvitation(me, id, body);
  }

  @Delete('invitations/:id')
  @AdminScopes('owner')
  @RateLimit({ limit: 30, windowSec: 600, by: 'user' })
  deleteInvitation(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.manage.deleteInvitation(me, id);
  }

  @Post('invitations/:id/wishes/:wishId')
  @HttpCode(200)
  @AdminScopes('support')
  wish(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @UuidParam('wishId') wishId: string, @ZBody(adminWishActionSchema) body: z.infer<typeof adminWishActionSchema>) {
    return this.manage.wish(me, id, wishId, body.action);
  }

  @Delete('invitations/:id/features/:feature')
  @AdminScopes('support')
  revokeFeature(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @Param('feature') feature: string) {
    return this.manage.revokeFeature(me, id, featureParam.parse(feature));
  }

  // ---- Users ----

  @Patch('users/:id/profile')
  @AdminScopes('support')
  profile(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @ZBody(adminProfileSchema) body: z.infer<typeof adminProfileSchema>) {
    return this.manage.updateProfile(me, id, body);
  }

  @Post('users/:id/sign-out')
  @HttpCode(200)
  @AdminScopes('support')
  signOut(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.manage.signOut(me, id);
  }

  @Post('users/bulk')
  @HttpCode(200)
  @AdminScopes('support')
  bulkUsers(@CurrentUser() me: AuthUser, @ZBody(adminUsersBulkSchema) body: z.infer<typeof adminUsersBulkSchema>) {
    return this.manage.bulkUsers(me, body.ids, body.action);
  }

  @Delete('admins/:id')
  @AdminScopes('owner')
  removeAdmin(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.manage.removeAdmin(me, id);
  }

  // ---- Orders & renders ----

  @Get('orders/:id')
  @AdminScopes('support', 'marketing')
  order(@UuidParam('id') id: string) {
    return this.manage.order(id);
  }

  @Post('orders/:id/cancel')
  @HttpCode(200)
  @AdminScopes('support')
  cancelOrder(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.manage.cancelOrder(me, id);
  }

  @Post('renders/:id/retry')
  @HttpCode(200)
  @AdminScopes('support')
  @RateLimit({ limit: 60, windowSec: 600, by: 'user' })
  retryRender(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.manage.retryRender(me, id);
  }

  @Delete('renders/:id')
  @AdminScopes('support')
  deleteRender(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.manage.deleteRender(me, id);
  }

  // ---- Music, alerts, data requests ----

  @Delete('music/:id')
  @AdminScopes('content')
  deleteTrack(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.manage.deleteTrack(me, trackParam.parse(id));
  }

  @Delete('alerts/resolved')
  @AdminScopes('owner', 'support')
  clearAlerts(@CurrentUser() me: AuthUser) {
    return this.manage.clearResolvedAlerts(me);
  }

  @Post('alerts/resolve-all')
  @HttpCode(200)
  @AdminScopes('owner', 'support')
  resolveAll(@CurrentUser() me: AuthUser) {
    return this.manage.resolveAllAlerts(me);
  }

  @Delete('alerts/:id')
  @AdminScopes('owner', 'support')
  deleteAlert(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.manage.deleteAlert(me, id);
  }

  @Patch('data-requests/:id')
  @AdminScopes('owner')
  requestStatus(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @ZBody(requestStatus) body: z.infer<typeof requestStatus>) {
    return this.manage.setRequestStatus(me, id, body.status);
  }

  @Delete('data-requests/:id')
  @AdminScopes('owner')
  deleteRequest(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.manage.deleteRequest(me, id);
  }
}

