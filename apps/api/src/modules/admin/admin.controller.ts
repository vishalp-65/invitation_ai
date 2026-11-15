import { eq, users, type Database } from '@cardai/db';
import {
  adminUserUpdateSchema,
  ANALYTICS_RANGES,
  announcementInputSchema,
  couponInputSchema,
  EVENT_TYPE_IDS,
  PRODUCT_CODES,
  productOverrideSchema,
  publishTemplateSchema,
  saleInputSchema,
  templateOverrideSchema,
  type ProductCode,
} from '@cardai/shared';
import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Injectable,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, Roles, type AuthedRequest, type AuthUser } from '../../common/auth.decorators.js';
import { UuidParam, ZBody, ZQuery } from '../../common/zod.js';
import { DB } from '../../infra/infra.module.js';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import { AdminService } from './admin.service.js';

/**
 * The access token says "admin", but tokens live a few minutes after a demotion. Every admin call
 * re-checks the database so a removed or disabled admin loses access immediately.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject(DB) private readonly db: Database) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
    if (!user) return false;
    const [row] = await this.db.select({ role: users.role, disabledAt: users.disabledAt }).from(users).where(eq(users.id, user.id));
    if (row?.role !== 'admin' || row.disabledAt) throw new ForbiddenException('You do not have access to this');
    return true;
  }
}

const rangeQuery = z.object({ range: z.enum(ANALYTICS_RANGES).default('30d') });
const page = z.coerce.number().int().min(1).max(10_000).default(1);
const usersQuery = z.object({
  q: z.string().trim().max(80).optional(),
  role: z.enum(['user', 'designer', 'agent', 'admin']).optional(),
  status: z.enum(['active', 'disabled', 'paying']).optional(),
  page,
});
const ordersQuery = z.object({ status: z.enum(['created', 'paid', 'failed', 'refunded']).optional(), page });
const templateIdParam = z.string().regex(/^[a-z0-9-]{3,64}$/);
const catalogEdit = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  eventTypes: z.array(z.enum(EVENT_TYPE_IDS)).min(1).optional(),
  tags: z.array(z.string().trim().min(1).max(24)).max(12).optional(),
  premium: z.boolean().optional(),
});

@Roles('admin')
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly stats: AdminAnalyticsService,
  ) {}

  // ---- Analytics ----

  @Get('overview')
  overview(@ZQuery(rangeQuery) q: z.infer<typeof rangeQuery>) {
    return this.stats.overview(q.range);
  }

  @Get('analytics/behaviour')
  behaviour(@ZQuery(rangeQuery) q: z.infer<typeof rangeQuery>) {
    return this.stats.behaviour(q.range);
  }

  // ---- Templates ----

  @Get('catalog')
  async catalog(@ZQuery(rangeQuery) q: z.infer<typeof rangeQuery>) {
    return { items: await this.stats.templateStats(q.range) };
  }

  @Post('catalog')
  publish(@CurrentUser() user: AuthUser, @ZBody(publishTemplateSchema) body: z.output<typeof publishTemplateSchema>) {
    return this.admin.publishTemplate(user, body);
  }

  @Patch('catalog/:id')
  override(@CurrentUser() user: AuthUser, @Param('id') id: string, @ZBody(templateOverrideSchema) body: z.infer<typeof templateOverrideSchema>) {
    return this.admin.overrideTemplate(user, templateIdParam.parse(id), body);
  }

  @Put('catalog/:id/details')
  editCatalog(@CurrentUser() user: AuthUser, @Param('id') id: string, @ZBody(catalogEdit) body: z.infer<typeof catalogEdit>) {
    return this.admin.updateCatalogTemplate(user, templateIdParam.parse(id), body);
  }

  @Delete('catalog/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string, @ZQuery(z.object({ permanent: z.enum(['true', 'false']).optional() })) q: { permanent?: 'true' | 'false' }) {
    return this.admin.deleteTemplate(user, templateIdParam.parse(id), q.permanent === 'true');
  }

  // ---- Users ----

  @Get('users')
  users(@ZQuery(usersQuery) q: z.infer<typeof usersQuery>) {
    return this.admin.listUsers(q);
  }

  @Get('users/:id')
  user(@UuidParam('id') id: string) {
    return this.admin.userDetail(id);
  }

  @Patch('users/:id')
  updateUser(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @ZBody(adminUserUpdateSchema) body: z.infer<typeof adminUserUpdateSchema>) {
    return this.admin.updateUser(me, id, body);
  }

  // ---- Offers ----

  @Get('coupons')
  coupons() {
    return this.admin.listCoupons();
  }

  @Post('coupons')
  createCoupon(@CurrentUser() me: AuthUser, @ZBody(couponInputSchema) body: z.output<typeof couponInputSchema>) {
    return this.admin.saveCoupon(me, body);
  }

  @Put('coupons/:id')
  updateCoupon(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @ZBody(couponInputSchema) body: z.output<typeof couponInputSchema>) {
    return this.admin.saveCoupon(me, body, id);
  }

  @Delete('coupons/:id')
  @HttpCode(204)
  deleteCoupon(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.admin.deleteCoupon(me, id);
  }

  @Get('sales')
  sales() {
    return this.admin.listSales();
  }

  @Post('sales')
  createSale(@CurrentUser() me: AuthUser, @ZBody(saleInputSchema) body: z.output<typeof saleInputSchema>) {
    return this.admin.saveSale(me, body);
  }

  @Put('sales/:id')
  updateSale(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @ZBody(saleInputSchema) body: z.output<typeof saleInputSchema>) {
    return this.admin.saveSale(me, body, id);
  }

  @Delete('sales/:id')
  @HttpCode(204)
  deleteSale(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.admin.deleteSale(me, id);
  }

  @Get('announcements')
  announcements() {
    return this.admin.listAnnouncements();
  }

  @Post('announcements')
  createAnnouncement(@CurrentUser() me: AuthUser, @ZBody(announcementInputSchema) body: z.output<typeof announcementInputSchema>) {
    return this.admin.saveAnnouncement(me, body);
  }

  @Put('announcements/:id')
  updateAnnouncement(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @ZBody(announcementInputSchema) body: z.output<typeof announcementInputSchema>) {
    return this.admin.saveAnnouncement(me, body, id);
  }

  @Delete('announcements/:id')
  @HttpCode(204)
  deleteAnnouncement(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.admin.deleteAnnouncement(me, id);
  }

  @Get('prices')
  prices() {
    return this.admin.prices();
  }

  @Put('prices/:code')
  setPrice(@CurrentUser() me: AuthUser, @Param('code') code: string, @ZBody(productOverrideSchema) body: z.infer<typeof productOverrideSchema>) {
    return this.admin.setPrice(me, z.enum(PRODUCT_CODES).parse(code) as ProductCode, body);
  }

  // ---- Orders & audit ----

  @Get('orders')
  orders(@ZQuery(ordersQuery) q: z.infer<typeof ordersQuery>) {
    return this.admin.listOrders(q);
  }

  @Get('audit')
  audit() {
    return this.admin.audits();
  }
}
