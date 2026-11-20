import { designerApplySchema, marketplaceTemplateSchema, reviewTemplateSchema, type MarketplaceTemplateInput } from '@cardai/shared';
import { Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, Roles, type AuthUser } from '../../common/auth.decorators.js';
import { UuidParam, ZBody } from '../../common/zod.js';
import { MarketplaceService } from './marketplace.service.js';
import { RequireFlag } from '../flags/flags.module.js';

@Controller()
export class MarketplaceController {
  constructor(private readonly market: MarketplaceService) {}

  @RequireFlag('marketplace', 'Designer submissions are paused for a short while.')
  @Post('designers/apply')
  apply(@CurrentUser() user: AuthUser, @ZBody(designerApplySchema) body: z.infer<typeof designerApplySchema>) {
    return this.market.apply(user, body);
  }

  @Get('designers/me')
  me(@CurrentUser() user: AuthUser) {
    return this.market.profile(user);
  }

  @Get('designer/templates')
  myTemplates(@CurrentUser() user: AuthUser) {
    return this.market.myTemplates(user);
  }

  @RequireFlag('marketplace', 'Designer submissions are paused for a short while.')
  @Post('designer/templates')
  create(@CurrentUser() user: AuthUser, @ZBody(marketplaceTemplateSchema) body: MarketplaceTemplateInput) {
    return this.market.createTemplate(user, body);
  }

  @Patch('designer/templates/:id')
  update(@CurrentUser() user: AuthUser, @UuidParam('id') id: string, @ZBody(marketplaceTemplateSchema.partial()) body: Partial<MarketplaceTemplateInput>) {
    return this.market.updateTemplate(user, id, body);
  }

  @RequireFlag('marketplace', 'Designer submissions are paused for a short while.')
  @Post('designer/templates/:id/submit')
  @HttpCode(200)
  submit(@CurrentUser() user: AuthUser, @UuidParam('id') id: string) {
    return this.market.submit(user, id);
  }

  @Get('designer/earnings')
  earnings(@CurrentUser() user: AuthUser) {
    return this.market.earnings(user);
  }

  @Roles('admin')
  @Get('admin/templates/review')
  queue() {
    return this.market.reviewQueue();
  }

  @Roles('admin')
  @Post('admin/templates/:id/review')
  @HttpCode(200)
  review(@UuidParam('id') id: string, @ZBody(reviewTemplateSchema) body: z.infer<typeof reviewTemplateSchema>) {
    return this.market.review(id, body.decision, body.note);
  }

  @Roles('admin')
  @Get('admin/designers/pending')
  designers() {
    return this.market.designerQueue();
  }

  @Roles('admin')
  @Post('admin/designers/:userId/review')
  @HttpCode(200)
  reviewDesigner(@UuidParam('userId') userId: string, @ZBody(z.object({ decision: z.enum(['approved', 'rejected']) })) body: { decision: 'approved' | 'rejected' }) {
    return this.market.reviewDesigner(userId, body.decision);
  }
}
