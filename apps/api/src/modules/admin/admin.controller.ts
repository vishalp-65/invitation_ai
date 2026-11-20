import {
  adminGrantSchema,
  adminMfaVerifySchema,
  adminScopesSchema,
  adminUserUpdateSchema,
  ANALYTICS_RANGES,
  announcementInputSchema,
  bulkTemplateSchema,
  couponBulkSchema,
  couponInputSchema,
  dataRequestSchema,
  designOverrideSchema,
  erasureConfirmSchema,
  EVENT_TYPE_IDS,
  eventModerationSchema,
  flagInputSchema,
  flagKeySchema,
  MEDIA_SLOT_KEYS,
  mediaPresignSchema,
  musicTrackSchema,
  PRODUCT_CODES,
  productOverrideSchema,
  publishTemplateSchema,
  saleInputSchema,
  SITE_DESIGN_IDS,
  templateOverrideSchema,
  type AdminScope,
  type MediaSlot,
  type ProductCode,
} from '@cardai/shared';
import { BadRequestException, Controller, Delete, Get, Header, HttpCode, Inject, Param, Patch, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { z } from 'zod';
import { CurrentUser, RateLimit, Roles, type AuthedRequest, type AuthUser } from '../../common/auth.decorators.js';
import { UuidParam, ZBody, ZQuery } from '../../common/zod.js';
import { ENV, type Env } from '../../config/env.js';
import { ACCESS_COOKIE } from '../../common/guards.js';
import { AdminGuard, AdminMfaExempt, AdminMfaService, AdminScopes, MFA_COOKIE } from './admin-access.js';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import { AdminInsightsService } from './admin-insights.service.js';
import { AdminService } from './admin.service.js';
import { AdminSystemService, IMPERSONATION_TTL_SEC } from './admin-system.service.js';

export { AdminGuard } from './admin-access.js';

type AdminReq = AuthedRequest & { adminScopes?: AdminScope[] };

const rangeQuery = z.object({ range: z.enum(ANALYTICS_RANGES).default('30d') });
const page = z.coerce.number().int().min(1).max(10_000).default(1);
const usersQuery = z.object({
  q: z.string().trim().max(80).optional(),
  role: z.enum(['user', 'designer', 'agent', 'admin']).optional(),
  status: z.enum(['active', 'disabled', 'paying']).optional(),
  sort: z.enum(['new', 'active', 'spend', 'seen']).optional(),
  page,
});
const ordersQuery = z.object({ status: z.enum(['created', 'paid', 'failed', 'refunded']).optional(), page });
const invitationsQuery = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(['draft', 'published', 'archived', 'suspended']).optional(),
  page,
});
const auditQuery = z.object({ action: z.string().regex(/^[a-z-]{2,20}$/).optional(), page });
const designBulk = designOverrideSchema.extend({ ids: z.array(z.enum(SITE_DESIGN_IDS)).min(1).max(SITE_DESIGN_IDS.length) });
const couponBulkAction = z.object({ ids: z.array(z.uuid()).min(1).max(1000), action: z.enum(['pause', 'activate', 'delete']) });
const templateIdParam = z.string().regex(/^[a-z0-9-]{3,64}$/);
const slotParam = z.enum(MEDIA_SLOT_KEYS as [MediaSlot, ...MediaSlot[]]);
const catalogEdit = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  eventTypes: z.array(z.enum(EVENT_TYPE_IDS)).min(1).optional(),
  tags: z.array(z.string().trim().min(1).max(24)).max(12).optional(),
  premium: z.boolean().optional(),
});

/**
 * Admin console API. AdminGuard re-checks the admin in the database, the device's email-code
 * proof, and the route's scope. Routes without @AdminScopes are read-only dashboards any admin sees.
 */
@Roles('admin')
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly stats: AdminAnalyticsService,
    private readonly insights: AdminInsightsService,
    private readonly system: AdminSystemService,
    private readonly mfa: AdminMfaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  // ---- Access: email-code check, who am I ----

  @Get('mfa')
  @AdminMfaExempt()
  mfaStatus(@CurrentUser() me: AuthUser, @Req() req: AdminReq) {
    const cookie = (req.cookies as Record<string, string | undefined>)?.[MFA_COOKIE];
    return { required: this.mfa.required, verified: this.mfa.verified(me.id, cookie), scopes: req.adminScopes ?? [] };
  }

  @Post('mfa/request')
  @HttpCode(200)
  @AdminMfaExempt()
  @RateLimit({ limit: 6, windowSec: 600, by: 'user' })
  mfaRequest(@CurrentUser() me: AuthUser, @Req() req: AdminReq) {
    return this.mfa.request(me, req.headers['user-agent']);
  }

  @Post('mfa/verify')
  @HttpCode(200)
  @AdminMfaExempt()
  @RateLimit({ limit: 10, windowSec: 600, by: 'user' })
  async mfaVerify(@CurrentUser() me: AuthUser, @ZBody(adminMfaVerifySchema) body: z.infer<typeof adminMfaVerifySchema>, @Res({ passthrough: true }) reply: FastifyReply) {
    if (!(await this.mfa.verify(me, body.code))) throw new BadRequestException('That code is not right. Check the latest email.');
    const c = this.mfa.cookieFor(me.id);
    reply.setCookie(MFA_COOKIE, c.value, { path: '/', httpOnly: true, sameSite: 'strict', secure: this.env.NODE_ENV === 'production', maxAge: c.maxAge, domain: this.env.COOKIE_DOMAIN });
    return { ok: true };
  }

  // ---- Analytics (any admin) ----

  @Get('overview')
  overview(@ZQuery(rangeQuery) q: z.infer<typeof rangeQuery>) {
    return this.stats.overview(q.range);
  }

  @Get('analytics/behaviour')
  behaviour(@ZQuery(rangeQuery) q: z.infer<typeof rangeQuery>) {
    return this.stats.behaviour(q.range);
  }

  @Get('analytics/growth')
  growth(@ZQuery(rangeQuery) q: z.infer<typeof rangeQuery>) {
    return this.stats.growth(q.range);
  }

  @Get('analytics/acquisition')
  acquisition(@ZQuery(rangeQuery) q: z.infer<typeof rangeQuery>) {
    return this.insights.acquisition(q.range);
  }

  @Get('analytics/guests')
  guests(@ZQuery(rangeQuery) q: z.infer<typeof rangeQuery>) {
    return this.insights.guests(q.range);
  }

  @Get('analytics/revenue')
  @AdminScopes('marketing', 'support')
  revenue(@ZQuery(rangeQuery) q: z.infer<typeof rangeQuery>) {
    return this.insights.revenue(q.range);
  }

  @Get('operations')
  operations(@ZQuery(rangeQuery) q: z.infer<typeof rangeQuery>) {
    return this.stats.operations(q.range);
  }

  @Get('trust')
  @AdminScopes('support')
  trust() {
    return this.insights.abuse();
  }

  // ---- Templates & designs (content) ----

  @Get('catalog')
  async catalog(@ZQuery(rangeQuery) q: z.infer<typeof rangeQuery>) {
    const [items, eventTypes] = await Promise.all([this.stats.templateStats(q.range), this.stats.eventTypeStats(q.range)]);
    return { items, eventTypes };
  }

  @Post('catalog')
  @AdminScopes('content')
  publish(@CurrentUser() user: AuthUser, @ZBody(publishTemplateSchema) body: z.output<typeof publishTemplateSchema>) {
    return this.admin.publishTemplate(user, body);
  }

  @Post('catalog/bulk')
  @HttpCode(200)
  @AdminScopes('content')
  bulkTemplates(@CurrentUser() user: AuthUser, @ZBody(bulkTemplateSchema) body: z.infer<typeof bulkTemplateSchema>) {
    const { ids, ...patch } = body;
    return this.admin.bulkTemplates(user, ids, patch);
  }

  @Patch('catalog/:id')
  @AdminScopes('content')
  override(@CurrentUser() user: AuthUser, @Param('id') id: string, @ZBody(templateOverrideSchema) body: z.infer<typeof templateOverrideSchema>) {
    return this.admin.overrideTemplate(user, templateIdParam.parse(id), body);
  }

  @Put('catalog/:id/details')
  @AdminScopes('content')
  editCatalog(@CurrentUser() user: AuthUser, @Param('id') id: string, @ZBody(catalogEdit) body: z.infer<typeof catalogEdit>) {
    return this.admin.updateCatalogTemplate(user, templateIdParam.parse(id), body);
  }

  @Delete('catalog/:id')
  @AdminScopes('content')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string, @ZQuery(z.object({ permanent: z.enum(['true', 'false']).optional() })) q: { permanent?: 'true' | 'false' }) {
    return this.admin.deleteTemplate(user, templateIdParam.parse(id), q.permanent === 'true');
  }

  @Get('designs')
  designs() {
    return this.admin.listDesigns();
  }

  @Patch('designs')
  @AdminScopes('content')
  updateDesigns(@CurrentUser() user: AuthUser, @ZBody(designBulk) body: z.infer<typeof designBulk>) {
    const { ids, ...patch } = body;
    return this.admin.overrideDesigns(user, ids, patch);
  }

  @Get('media')
  @AdminScopes('content')
  media() {
    return this.system.media();
  }

  @Post('media/:slot/presign')
  @AdminScopes('content')
  presignMedia(@Param('slot') slot: string, @ZBody(mediaPresignSchema) body: z.infer<typeof mediaPresignSchema>) {
    return this.system.presignMedia(slotParam.parse(slot), body.contentType, body.bytes);
  }

  @Put('media/:slot')
  @AdminScopes('content')
  saveMedia(@CurrentUser() me: AuthUser, @Param('slot') slot: string, @ZBody(z.object({ key: z.string().max(300) })) body: { key: string }) {
    return this.system.saveMedia(me, slotParam.parse(slot), body.key);
  }

  @Delete('media/:slot')
  @AdminScopes('content')
  resetMedia(@CurrentUser() me: AuthUser, @Param('slot') slot: string) {
    return this.system.resetMedia(me, slotParam.parse(slot));
  }

  @Get('music')
  @AdminScopes('content')
  music() {
    return this.system.music();
  }

  @Post('music/presign')
  @AdminScopes('content')
  presignMusic(@ZBody(mediaPresignSchema) body: z.infer<typeof mediaPresignSchema>) {
    return this.system.presignMusic(body.contentType, body.bytes);
  }

  @Put('music')
  @AdminScopes('content')
  saveTrack(@CurrentUser() me: AuthUser, @ZBody(musicTrackSchema) body: z.output<typeof musicTrackSchema>) {
    return this.system.saveTrack(me, body);
  }

  // ---- Invitations & users (support) ----

  @Get('invitations')
  @AdminScopes('support')
  invitations(@ZQuery(invitationsQuery) q: z.infer<typeof invitationsQuery>) {
    return this.admin.listInvitations(q);
  }

  @Patch('invitations/:id')
  @AdminScopes('support')
  moderate(@CurrentUser() user: AuthUser, @UuidParam('id') id: string, @ZBody(eventModerationSchema) body: z.infer<typeof eventModerationSchema>) {
    return this.admin.moderateInvitation(user, id, body);
  }

  @Get('users')
  @AdminScopes('support', 'marketing')
  users(@ZQuery(usersQuery) q: z.infer<typeof usersQuery>) {
    return this.admin.listUsers(q);
  }

  @Get('users/export')
  @AdminScopes('owner')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  @Header('Content-Disposition', 'attachment; filename="noyta-users.csv"')
  exportUsers(@CurrentUser() me: AuthUser) {
    return this.admin.exportUsers(me);
  }

  @Get('users/:id')
  @AdminScopes('support', 'marketing')
  user(@UuidParam('id') id: string) {
    return this.admin.userDetail(id);
  }

  @Patch('users/:id')
  @AdminScopes('support')
  updateUser(@CurrentUser() me: AuthUser, @Req() req: AdminReq, @UuidParam('id') id: string, @ZBody(adminUserUpdateSchema) body: z.infer<typeof adminUserUpdateSchema>) {
    // Making or removing admins is an owner decision.
    if (body.role !== undefined && !req.adminScopes?.includes('owner')) throw new BadRequestException('Only an owner can change roles.');
    return this.admin.updateUser(me, id, body);
  }

  @Post('users/:id/grant')
  @HttpCode(200)
  @AdminScopes('support')
  grant(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @ZBody(adminGrantSchema) body: z.infer<typeof adminGrantSchema>) {
    return this.admin.grant(me, id, body);
  }

  /** Read-only "view as this customer" for 15 minutes; any refresh returns to the admin's session. */
  @Post('users/:id/impersonate')
  @HttpCode(200)
  @AdminScopes('support')
  @RateLimit({ limit: 20, windowSec: 600, by: 'user' })
  async impersonate(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @Res({ passthrough: true }) reply: FastifyReply) {
    const { token, label } = await this.system.impersonate(me, id);
    const base = { path: '/', sameSite: 'lax' as const, secure: this.env.NODE_ENV === 'production', domain: this.env.COOKIE_DOMAIN, maxAge: IMPERSONATION_TTL_SEC };
    reply.setCookie(ACCESS_COOKIE, token, { ...base, httpOnly: true });
    // Readable by the web app so it can show the "viewing as" bar.
    reply.setCookie('cai_imp', encodeURIComponent(label.slice(0, 60)), { ...base, httpOnly: false });
    return { ok: true, redirect: '/dashboard' };
  }

  // ---- Data protection (owner) ----

  @Get('data-requests')
  @AdminScopes('owner')
  dataRequests() {
    return this.system.dataRequests();
  }

  @Post('users/:id/data-requests')
  @AdminScopes('owner')
  logRequest(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @ZBody(dataRequestSchema) body: z.infer<typeof dataRequestSchema>) {
    return this.system.logRequest(me, id, body.kind, body.note);
  }

  @Get('users/:id/data-export')
  @AdminScopes('owner')
  @Header('Cache-Control', 'no-store')
  @Header('Content-Disposition', 'attachment; filename="noyta-personal-data.json"')
  exportData(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.system.exportData(me, id);
  }

  @Post('users/:id/erase')
  @HttpCode(200)
  @AdminScopes('owner')
  @RateLimit({ limit: 10, windowSec: 3600, by: 'user' })
  erase(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @ZBody(erasureConfirmSchema) _body: z.infer<typeof erasureConfirmSchema>) {
    return this.system.eraseUser(me, id);
  }

  // ---- Offers & plans (marketing) ----

  @Get('coupons')
  @AdminScopes('marketing')
  coupons() {
    return this.admin.listCoupons();
  }

  @Post('coupons')
  @AdminScopes('marketing')
  createCoupon(@CurrentUser() me: AuthUser, @ZBody(couponInputSchema) body: z.output<typeof couponInputSchema>) {
    return this.admin.saveCoupon(me, body);
  }

  @Post('coupons/bulk')
  @AdminScopes('marketing')
  bulkCoupons(@CurrentUser() me: AuthUser, @ZBody(couponBulkSchema) body: z.output<typeof couponBulkSchema>) {
    return this.admin.bulkCoupons(me, body);
  }

  @Post('coupons/bulk-action')
  @HttpCode(200)
  @AdminScopes('marketing')
  bulkCouponAction(@CurrentUser() me: AuthUser, @ZBody(couponBulkAction) body: z.infer<typeof couponBulkAction>) {
    return this.admin.bulkCouponAction(me, body.ids, body.action);
  }

  @Put('coupons/:id')
  @AdminScopes('marketing')
  updateCoupon(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @ZBody(couponInputSchema) body: z.output<typeof couponInputSchema>) {
    return this.admin.saveCoupon(me, body, id);
  }

  @Delete('coupons/:id')
  @HttpCode(204)
  @AdminScopes('marketing')
  deleteCoupon(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.admin.deleteCoupon(me, id);
  }

  @Get('sales')
  @AdminScopes('marketing')
  sales() {
    return this.admin.listSales();
  }

  @Post('sales')
  @AdminScopes('marketing')
  createSale(@CurrentUser() me: AuthUser, @ZBody(saleInputSchema) body: z.output<typeof saleInputSchema>) {
    return this.admin.saveSale(me, body);
  }

  @Put('sales/:id')
  @AdminScopes('marketing')
  updateSale(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @ZBody(saleInputSchema) body: z.output<typeof saleInputSchema>) {
    return this.admin.saveSale(me, body, id);
  }

  @Delete('sales/:id')
  @HttpCode(204)
  @AdminScopes('marketing')
  deleteSale(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.admin.deleteSale(me, id);
  }

  @Get('announcements')
  @AdminScopes('marketing')
  announcements() {
    return this.admin.listAnnouncements();
  }

  @Post('announcements')
  @AdminScopes('marketing')
  createAnnouncement(@CurrentUser() me: AuthUser, @ZBody(announcementInputSchema) body: z.output<typeof announcementInputSchema>) {
    return this.admin.saveAnnouncement(me, body);
  }

  @Put('announcements/:id')
  @AdminScopes('marketing')
  updateAnnouncement(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @ZBody(announcementInputSchema) body: z.output<typeof announcementInputSchema>) {
    return this.admin.saveAnnouncement(me, body, id);
  }

  @Delete('announcements/:id')
  @HttpCode(204)
  @AdminScopes('marketing')
  deleteAnnouncement(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.admin.deleteAnnouncement(me, id);
  }

  @Get('prices')
  @AdminScopes('marketing')
  prices() {
    return this.admin.prices();
  }

  @Put('prices/:code')
  @AdminScopes('marketing')
  setPrice(@CurrentUser() me: AuthUser, @Param('code') code: string, @ZBody(productOverrideSchema) body: z.output<typeof productOverrideSchema>) {
    return this.admin.setPrice(me, z.enum(PRODUCT_CODES).parse(code) as ProductCode, body);
  }

  // ---- Orders ----

  @Get('orders')
  @AdminScopes('support', 'marketing')
  orders(@ZQuery(ordersQuery) q: z.infer<typeof ordersQuery>) {
    return this.admin.listOrders(q);
  }

  @Get('orders/export')
  @AdminScopes('owner')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  @Header('Content-Disposition', 'attachment; filename="noyta-orders.csv"')
  exportOrders(@CurrentUser() me: AuthUser, @ZQuery(ordersQuery) q: z.infer<typeof ordersQuery>) {
    return this.admin.exportOrders(me, q.status);
  }

  // ---- System (owner) ----

  @Get('flags')
  flagsList() {
    return this.system.listFlags();
  }

  @Put('flags/:key')
  @AdminScopes('owner')
  setFlag(@CurrentUser() me: AuthUser, @Param('key') key: string, @ZBody(flagInputSchema) body: z.output<typeof flagInputSchema>) {
    return this.system.setFlag(me, flagKeySchema.parse(key), body);
  }

  @Delete('flags/:key')
  @AdminScopes('owner')
  deleteFlag(@CurrentUser() me: AuthUser, @Param('key') key: string) {
    return this.system.deleteFlag(me, flagKeySchema.parse(key));
  }

  @Get('alerts')
  alerts() {
    return this.system.alerts();
  }

  @Post('alerts/:id/resolve')
  @HttpCode(200)
  @AdminScopes('owner', 'support')
  resolveAlert(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.system.resolveAlert(me, id);
  }

  @Post('ops/check')
  @HttpCode(200)
  @AdminScopes('owner')
  @RateLimit({ limit: 10, windowSec: 600, by: 'user' })
  runChecks(@CurrentUser() me: AuthUser) {
    return this.system.runChecks(me);
  }

  @Post('ops/digest')
  @HttpCode(200)
  @AdminScopes('owner')
  @RateLimit({ limit: 5, windowSec: 3600, by: 'user' })
  sendDigest(@CurrentUser() me: AuthUser) {
    return this.system.sendDigest(me);
  }

  @Post('ops/nightly')
  @HttpCode(200)
  @AdminScopes('owner')
  @RateLimit({ limit: 3, windowSec: 3600, by: 'user' })
  nightly(@CurrentUser() me: AuthUser) {
    return this.system.nightly(me);
  }

  @Get('admins')
  admins() {
    return this.system.admins();
  }

  @Put('admins/:id/scopes')
  @AdminScopes('owner')
  setScopes(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @ZBody(adminScopesSchema) body: z.infer<typeof adminScopesSchema>) {
    return this.system.setScopes(me, id, body.scopes);
  }

  @Put('admins/:id/digest')
  setDigest(@CurrentUser() me: AuthUser, @Req() req: AdminReq, @UuidParam('id') id: string, @ZBody(z.object({ on: z.boolean() })) body: { on: boolean }) {
    return this.system.setDigest(me, id, body.on, Boolean(req.adminScopes?.includes('owner')));
  }

  @Get('audit')
  @AdminScopes('owner')
  audit(@ZQuery(auditQuery) q: z.infer<typeof auditQuery>) {
    return this.admin.audits(q);
  }
}
