import {
  adminAuditLog,
  analyticsEvents,
  announcements,
  catalogTemplates,
  coupons,
  desc,
  eq,
  events,
  inArray,
  orders,
  productOverrides,
  sales,
  siteDesignOverrides,
  sql,
  templateOverrides,
  users,
  type Database,
} from '@cardai/db';
import {
  PRODUCT_CODES,
  PRODUCTS,
  SITE_DESIGNS,
  type announcementInputSchema,
  type couponBulkSchema,
  type couponInputSchema,
  type ProductCode,
  type ProductOverride,
  type publishTemplateSchema,
  type saleInputSchema,
  type UserRole,
} from '@cardai/shared';
import type { z } from 'zod';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { AuthUser } from '../../common/auth.decorators.js';
import { disabledKey } from '../../common/guards.js';
import { DB, REDIS, type Redis } from '../../infra/infra.module.js';
import { ACCESS_TTL_SEC } from '../auth/token.service.js';
import { TokenService } from '../auth/token.service.js';
import { EntitlementsService } from '../entitlements/entitlements.service.js';
import { OffersService } from '../offers/offers.service.js';
import { TemplatesService } from '../templates/templates.service.js';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import { toCsv } from './csv.js';

export { toCsv };

const PAGE = 25;
/** CSV exports stop here; beyond that, query the database directly. */
const EXPORT_LIMIT = 50_000;
const TZ = sql.raw(`'Asia/Kolkata'`);
const TODAY = sql`(now() at time zone ${TZ})::date`;

type CouponData = z.output<typeof couponInputSchema>;
type BulkCouponData = z.output<typeof couponBulkSchema>;
type SaleData = z.output<typeof saleInputSchema>;
type AnnouncementData = z.output<typeof announcementInputSchema>;
type PublishData = z.output<typeof publishTemplateSchema>;

@Injectable()
export class AdminService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly templates: TemplatesService,
    private readonly offers: OffersService,
    private readonly tokens: TokenService,
    private readonly entitlements: EntitlementsService,
    private readonly stats: AdminAnalyticsService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  private audit(admin: AuthUser, action: string, target?: string, details?: Record<string, unknown>) {
    void this.db
      .insert(adminAuditLog)
      .values({ adminId: admin.id, action, target, details })
      .catch(() => undefined);
  }

  // ---------------- Users ----------------

  async listUsers(q: { q?: string; role?: UserRole; status?: 'active' | 'disabled' | 'paying'; sort?: 'new' | 'active' | 'spend' | 'seen'; page: number }) {
    const where = [sql`true`];
    if (q.q) {
      const like = `%${q.q.toLowerCase()}%`;
      where.push(sql`(lower(coalesce(u.name, '')) like ${like} or lower(coalesce(u.email, '')) like ${like} or coalesce(u.phone, '') like ${like})`);
    }
    if (q.role) where.push(sql`u.role = ${q.role}`);
    if (q.status === 'disabled') where.push(sql`u.disabled_at is not null`);
    if (q.status === 'active') where.push(sql`u.disabled_at is null`);
    if (q.status === 'paying') where.push(sql`exists (select 1 from orders o where o.user_id = u.id and o.status = 'paid')`);
    const cond = sql.join(where, sql` and `);
    const order =
      q.sort === 'active'
        ? sql`"activeSeconds30" desc, u.created_at desc`
        : q.sort === 'spend'
          ? sql`"spentPaise" desc, u.created_at desc`
          : q.sort === 'seen'
            ? sql`u.last_seen_at desc nulls last`
            : sql`u.created_at desc`;
    const [rows, total] = await Promise.all([
      this.db.execute(sql`
        select * from (
          select u.id, u.name, u.email, u.phone, u.role, u.avatar_url as "avatarUrl", u.created_at, u.created_at as "createdAt",
                 u.last_seen_at, u.last_seen_at as "lastSeenAt", u.disabled_at as "disabledAt",
                 (u.google_sub is not null) as "google", (u.admin_note is not null) as "hasNote",
                 (select count(*)::int from events e where e.user_id = u.id) as "events",
                 (select count(*)::int from orders o where o.user_id = u.id and o.status = 'paid') as "orders",
                 (select coalesce(sum(amount_paise), 0)::int from orders o where o.user_id = u.id and o.status = 'paid') as "spentPaise",
                 (select coalesce(sum(active_seconds), 0)::int from activity_daily a where a.user_id = u.id and a.day > ${TODAY} - 30) as "activeSeconds30"
          from users u where ${cond}
        ) u
        order by ${order} limit ${PAGE} offset ${(q.page - 1) * PAGE}`),
      this.db.execute(sql`select count(*)::int as n from users u where ${cond}`),
    ]);
    const items = (rows.rows as Array<Record<string, unknown>>).map(({ created_at: _c, last_seen_at: _l, ...r }) => r);
    return { items, total: (total.rows[0] as { n: number }).n, pageSize: PAGE };
  }

  async userDetail(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    if (!user) throw new NotFoundException('User not found');
    const [evs, ords, activity, time, daily] = await Promise.all([
      this.db
        .select({
          id: events.id,
          title: events.title,
          type: events.type,
          templateId: events.templateId,
          status: events.status,
          slug: events.slug,
          viewCount: events.viewCount,
          suspendedAt: events.suspendedAt,
          createdAt: events.createdAt,
        })
        .from(events)
        .where(eq(events.userId, id))
        .orderBy(desc(events.createdAt))
        .limit(50),
      this.db.select().from(orders).where(eq(orders.userId, id)).orderBy(desc(orders.createdAt)).limit(50),
      this.db
        .select({ name: analyticsEvents.name, path: analyticsEvents.path, templateId: analyticsEvents.templateId, device: analyticsEvents.device, props: analyticsEvents.props, createdAt: analyticsEvents.createdAt })
        .from(analyticsEvents)
        .where(eq(analyticsEvents.userId, id))
        .orderBy(desc(analyticsEvents.createdAt))
        .limit(60),
      this.db.execute(sql`
        select
          coalesce(sum(active_seconds) filter (where day = ${TODAY}), 0)::int as "today",
          coalesce(sum(active_seconds) filter (where day > ${TODAY} - 7), 0)::int as "week",
          coalesce(sum(active_seconds) filter (where day > ${TODAY} - 30), 0)::int as "month",
          coalesce(sum(active_seconds) filter (where day > ${TODAY} - 365), 0)::int as "year",
          coalesce(sum(active_seconds), 0)::int as "allTime",
          count(distinct day)::int as "activeDays",
          (count(distinct day) filter (where day > ${TODAY} - 30))::int as "activeDays30",
          coalesce(sum(page_views), 0)::int as "pageViews"
        from activity_daily where user_id = ${id}`),
      this.db.execute(sql`
        select to_char(day, 'YYYY-MM-DD') as day, sum(active_seconds)::int as seconds
        from activity_daily where user_id = ${id} and day > ${TODAY} - 30
        group by day order by day`),
    ]);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        google: !!user.googleSub,
        marketingEmails: user.marketingEmails,
        note: user.adminNote,
        createdAt: user.createdAt,
        lastSeenAt: user.lastSeenAt,
        disabledAt: user.disabledAt,
      },
      events: evs,
      orders: ords,
      activity,
      time: time.rows[0] as Record<string, number>,
      daily: daily.rows as Array<{ day: string; seconds: number }>,
      spentPaise: ords.filter((o) => o.status === 'paid').reduce((s, o) => s + o.amountPaise, 0),
    };
  }

  async updateUser(admin: AuthUser, id: string, input: { role?: UserRole; disabled?: boolean; note?: string | null }) {
    if (id === admin.id && (input.disabled || (input.role && input.role !== 'admin'))) {
      throw new BadRequestException('You cannot disable or demote your own account.');
    }
    const patch: Partial<typeof users.$inferInsert> = {};
    if (input.role) patch.role = input.role;
    if (input.disabled !== undefined) patch.disabledAt = input.disabled ? new Date() : null;
    if (input.note !== undefined) patch.adminNote = input.note || null;
    if (!Object.keys(patch).length) return this.userDetail(id);
    const [row] = await this.db.update(users).set(patch).where(eq(users.id, id)).returning({ id: users.id });
    if (!row) throw new NotFoundException('User not found');
    const accessChanged = input.disabled !== undefined || input.role !== undefined;
    // Role is baked into access tokens: force a fresh sign-in so the change applies right away.
    if (accessChanged && (input.disabled || input.role)) await this.tokens.revokeAll(id);
    // Access tokens live up to 15 min; this marker blocks them right away (refresh is already revoked).
    if (input.disabled) await this.redis.set(disabledKey(id), '1', 'EX', ACCESS_TTL_SEC + 60);
    if (input.disabled === false) await this.redis.del(disabledKey(id));
    if (accessChanged) this.audit(admin, input.disabled !== undefined ? (input.disabled ? 'user.disable' : 'user.enable') : 'user.role', id, { role: input.role, disabled: input.disabled });
    if (input.note !== undefined) this.audit(admin, 'user.note', id);
    return this.userDetail(id);
  }

  /**
   * Gives a product to one of the user's invitations for free (support, goodwill, partners). No
   * order or revenue is recorded; the admin log keeps who granted what and why.
   */
  async grant(admin: AuthUser, userId: string, input: { eventId: string; productCode: ProductCode; reason: string }) {
    const [ev] = await this.db.select({ userId: events.userId, title: events.title }).from(events).where(eq(events.id, input.eventId));
    if (!ev || ev.userId !== userId) throw new NotFoundException('That invitation does not belong to this user.');
    await this.db.transaction((tx) => this.entitlements.grantProduct(tx, input.eventId, input.productCode, null));
    this.audit(admin, 'user.grant', userId, { name: ev.title, eventId: input.eventId, productCode: input.productCode, product: PRODUCTS[input.productCode].name, reason: input.reason });
    return this.userDetail(userId);
  }

  async exportUsers(admin: AuthUser) {
    const rows = await this.db.execute(sql`
      select u.id, u.name, u.email, u.phone, u.role, u.created_at, u.last_seen_at, u.disabled_at, u.marketing_emails,
             (select count(*) from events e where e.user_id = u.id) as invitations,
             (select count(*) from orders o where o.user_id = u.id and o.status = 'paid') as paid_orders,
             (select coalesce(sum(amount_paise), 0) / 100.0 from orders o where o.user_id = u.id and o.status = 'paid') as spent_inr,
             (select round(coalesce(sum(active_seconds), 0) / 60.0) from activity_daily a where a.user_id = u.id) as active_minutes
      from users u order by u.created_at desc limit ${EXPORT_LIMIT}`);
    this.audit(admin, 'export.users', undefined, { rows: rows.rows.length });
    return toCsv(rows.rows as Array<Record<string, unknown>>, [
      'id',
      'name',
      'email',
      'phone',
      'role',
      'created_at',
      'last_seen_at',
      'disabled_at',
      'marketing_emails',
      'invitations',
      'paid_orders',
      'spent_inr',
      'active_minutes',
    ]);
  }

  async exportOrders(admin: AuthUser, status?: string) {
    const cond = status ? sql`o.status = ${status}` : sql`true`;
    const rows = await this.db.execute(sql`
      select o.id, o.created_at, o.paid_at, o.status, o.product_code, o.amount_paise / 100.0 as amount_inr,
             o.list_price_paise / 100.0 as list_price_inr, o.discount_paise / 100.0 as discount_inr, o.coupon_code,
             o.provider, o.provider_payment_id, u.email, u.name, e.title as invitation
      from orders o join users u on u.id = o.user_id left join events e on e.id = o.event_id
      where ${cond} order by o.created_at desc limit ${EXPORT_LIMIT}`);
    this.audit(admin, 'export.orders', undefined, { rows: rows.rows.length, status });
    return toCsv(rows.rows as Array<Record<string, unknown>>, [
      'id',
      'created_at',
      'paid_at',
      'status',
      'product_code',
      'amount_inr',
      'list_price_inr',
      'discount_inr',
      'coupon_code',
      'provider',
      'provider_payment_id',
      'email',
      'name',
      'invitation',
    ]);
  }

  // ---------------- Invitations (moderation) ----------------

  async listInvitations(q: { q?: string; status?: 'draft' | 'published' | 'archived' | 'suspended'; page: number }) {
    const where = [sql`true`];
    if (q.q) {
      const like = `%${q.q.toLowerCase()}%`;
      where.push(sql`(lower(e.title) like ${like} or lower(e.slug) like ${like} or lower(coalesce(u.email, '')) like ${like} or e.short_code = ${q.q})`);
    }
    if (q.status === 'suspended') where.push(sql`e.suspended_at is not null`);
    else if (q.status) where.push(sql`e.status = ${q.status} and e.suspended_at is null`);
    const cond = sql.join(where, sql` and `);
    const [rows, total, counts] = await Promise.all([
      this.db.execute(sql`
        select e.id, e.title, e.slug, e.type, e.status, e.template_id as "templateId", e.view_count as "viewCount",
               e.created_at as "createdAt", e.published_at as "publishedAt", e.suspended_at as "suspendedAt", e.suspended_reason as "suspendedReason",
               e.site->>'design' as "siteDesign", u.id as "userId", u.name as "userName", u.email as "userEmail",
               (select count(*)::int from guests g where g.event_id = e.id) as guests,
               (select count(*)::int from orders o where o.event_id = e.id and o.status = 'paid') as "paidOrders"
        from events e join users u on u.id = e.user_id
        where ${cond} order by e.created_at desc limit ${PAGE} offset ${(q.page - 1) * PAGE}`),
      this.db.execute(sql`select count(*)::int as n from events e join users u on u.id = e.user_id where ${cond}`),
      this.db.execute(sql`
        select count(*)::int as "all",
               (count(*) filter (where status = 'published' and suspended_at is null))::int as published,
               (count(*) filter (where status = 'draft' and suspended_at is null))::int as draft,
               (count(*) filter (where status = 'archived' and suspended_at is null))::int as archived,
               (count(*) filter (where suspended_at is not null))::int as suspended
        from events`),
    ]);
    return { items: rows.rows, total: (total.rows[0] as { n: number }).n, pageSize: PAGE, counts: counts.rows[0] };
  }

  async moderateInvitation(admin: AuthUser, id: string, input: { suspended: boolean; reason?: string | null }) {
    const [row] = await this.db
      .update(events)
      .set(input.suspended ? { suspendedAt: new Date(), suspendedReason: input.reason ?? null } : { suspendedAt: null, suspendedReason: null })
      .where(eq(events.id, id))
      .returning({ id: events.id, title: events.title, slug: events.slug });
    if (!row) throw new NotFoundException('Invitation not found');
    this.audit(admin, input.suspended ? 'invitation.suspend' : 'invitation.restore', id, { name: row.title, slug: row.slug, reason: input.reason ?? undefined });
    return { ok: true };
  }

  // ---------------- Video & website design packs ----------------

  async listDesigns() {
    const [overrides, usage] = await Promise.all([this.db.select().from(siteDesignOverrides), this.stats.designStats()]);
    const ov = new Map(overrides.map((o) => [o.designId, o]));
    return SITE_DESIGNS.map((d) => {
      const o = ov.get(d.id);
      return {
        id: d.id,
        name: d.name,
        blurb: d.blurb,
        region: d.region,
        faith: d.faith,
        isNew: d.isNew ?? false,
        palette: d.palette,
        night: d.scene.night,
        opening: d.opening,
        music: d.music,
        hidden: o?.hidden ?? false,
        hideShowcase: o?.hideShowcase ?? false,
        featured: o?.featured ?? false,
        usage: usage[d.id] ?? { events: 0, published: 0, recent: 0, films: 0 },
      };
    });
  }

  async overrideDesigns(admin: AuthUser, ids: string[], input: { hidden?: boolean; hideShowcase?: boolean; featured?: boolean }) {
    const known = new Set<string>(SITE_DESIGNS.map((d) => d.id));
    const bad = ids.find((id) => !known.has(id));
    if (bad) throw new NotFoundException(`Design "${bad}" not found`);
    if (!Object.keys(input).length) return this.listDesigns();
    await this.db
      .insert(siteDesignOverrides)
      .values(ids.map((designId) => ({ designId, updatedBy: admin.id, ...input })))
      .onConflictDoUpdate({ target: siteDesignOverrides.designId, set: { ...input, updatedBy: admin.id, updatedAt: new Date() } });
    this.offers.invalidate();
    for (const id of ids) this.audit(admin, 'design.update', id, { name: SITE_DESIGNS.find((d) => d.id === id)?.name, ...input });
    return this.listDesigns();
  }

  // ---------------- Templates ----------------

  async overrideTemplate(admin: AuthUser, id: string, input: { hidden?: boolean; featured?: boolean; premium?: boolean | null }) {
    await this.templates.resolve(id); // 404 for unknown ids
    await this.db
      .insert(templateOverrides)
      .values({ templateId: id, updatedBy: admin.id, ...input })
      .onConflictDoUpdate({ target: templateOverrides.templateId, set: { ...input, updatedBy: admin.id } });
    this.templates.invalidate();
    this.offers.invalidate();
    this.audit(admin, 'template.update', id, input);
    return { ok: true };
  }

  /** Hide / restore / feature many templates at once (one statement). */
  async bulkTemplates(admin: AuthUser, ids: string[], input: { hidden?: boolean; featured?: boolean }) {
    const known = new Set((await this.templates.everything()).map((t) => t.id));
    const valid = [...new Set(ids)].filter((id) => known.has(id));
    if (!valid.length) throw new NotFoundException('None of those templates exist.');
    if (!Object.keys(input).length) return { updated: 0 };
    await this.db
      .insert(templateOverrides)
      .values(valid.map((templateId) => ({ templateId, updatedBy: admin.id, ...input })))
      .onConflictDoUpdate({ target: templateOverrides.templateId, set: { ...input, updatedBy: admin.id } });
    this.templates.invalidate();
    this.offers.invalidate();
    this.audit(admin, 'template.bulk', undefined, { count: valid.length, ...input, ids: valid.slice(0, 50) });
    return { updated: valid.length };
  }

  /**
   * "Delete": hides any template from the catalogue (restorable). Admin-published templates that no
   * invitation uses can also be removed for good with `permanent`.
   */
  async deleteTemplate(admin: AuthUser, id: string, permanent: boolean) {
    if (permanent) {
      if (!id.startsWith('adm-')) throw new BadRequestException('Built-in templates can only be hidden, not removed for good.');
      const inUse = await this.db.$count(events, eq(events.templateId, id));
      if (inUse) throw new ConflictException(`${inUse} invitation(s) use this template. Hide it instead.`);
      await this.db.delete(catalogTemplates).where(eq(catalogTemplates.templateKey, id));
      await this.db.delete(templateOverrides).where(eq(templateOverrides.templateId, id));
      this.templates.invalidate();
      this.offers.invalidate();
      this.audit(admin, 'template.delete', id);
      return { ok: true };
    }
    return this.overrideTemplate(admin, id, { hidden: true });
  }

  async publishTemplate(admin: AuthUser, input: PublishData) {
    // A design started from another admin template keeps that template's built-in base.
    let baseTemplateId = input.baseTemplateId;
    if (baseTemplateId.startsWith('adm-')) {
      const [parent] = await this.db.select({ base: catalogTemplates.baseTemplateId }).from(catalogTemplates).where(eq(catalogTemplates.templateKey, baseTemplateId));
      if (parent) baseTemplateId = parent.base;
    }
    await this.templates.resolve(baseTemplateId);
    const key = `adm-${randomBytes(4).toString('hex')}`;
    // Photos belong to the invitation it was designed in: keep frames, drop pictures.
    const design = { ...input.design, templateId: key, pages: input.design.pages.map((p) => ({ ...p, elements: p.elements.map((e) => (e.type === 'image' ? { ...e, src: null } : e)) })) };
    const [row] = await this.db
      .insert(catalogTemplates)
      .values({
        templateKey: key,
        name: input.name,
        baseTemplateId,
        eventTypes: input.eventTypes,
        communities: input.communities,
        tags: input.tags.map((t) => t.toLowerCase()),
        premium: input.premium,
        design,
        createdBy: admin.id,
      })
      .returning();
    this.templates.invalidate();
    this.audit(admin, 'template.publish', key, { name: input.name });
    return { id: row!.templateKey, name: row!.name };
  }

  async updateCatalogTemplate(admin: AuthUser, key: string, input: { name?: string; eventTypes?: string[]; tags?: string[]; communities?: string[]; premium?: boolean }) {
    const [row] = await this.db.update(catalogTemplates).set(input).where(eq(catalogTemplates.templateKey, key)).returning({ id: catalogTemplates.id });
    if (!row) throw new NotFoundException('Only templates published from the editor can be edited here.');
    this.templates.invalidate();
    this.audit(admin, 'template.edit', key, input);
    return { ok: true };
  }

  // ---------------- Offers ----------------

  /** Coupons with what they actually did: paid redemptions, revenue brought in, discount given. */
  async listCoupons() {
    const [list, stats] = await Promise.all([
      this.db.select().from(coupons).orderBy(desc(coupons.createdAt)).limit(2000),
      this.db.execute(sql`
        select coupon_code as code, count(*)::int as redemptions, count(distinct user_id)::int as customers,
               coalesce(sum(amount_paise), 0)::int as "revenuePaise", coalesce(sum(discount_paise), 0)::int as "discountPaise",
               max(paid_at) as "lastUsedAt"
        from orders where status = 'paid' and coupon_code is not null group by coupon_code`),
    ]);
    const by = new Map((stats.rows as Array<{ code: string }>).map((r) => [r.code, r]));
    const empty = { redemptions: 0, customers: 0, revenuePaise: 0, discountPaise: 0, lastUsedAt: null };
    return list.map((c) => ({ ...c, stats: by.get(c.code) ?? empty }));
  }

  async saveCoupon(admin: AuthUser, input: CouponData, id?: string) {
    const values = { ...input, description: input.description ?? null, maxUses: input.maxUses ?? null } as typeof coupons.$inferInsert;
    try {
      const [row] = id
        ? await this.db.update(coupons).set(values).where(eq(coupons.id, id)).returning()
        : await this.db.insert(coupons).values(values).returning();
      if (!row) throw new NotFoundException('Coupon not found');
      this.audit(admin, id ? 'coupon.update' : 'coupon.create', row.code, { kind: row.kind, value: row.value });
      return row;
    } catch (err) {
      if ((err as { cause?: { code?: string } }).cause?.code === '23505' || (err as { code?: string }).code === '23505') {
        throw new ConflictException('A coupon with this code already exists.');
      }
      throw err;
    }
  }

  /** Many unique codes like DIWALI-7KQ2M9 in one insert; returns the codes for download. */
  async bulkCoupons(admin: AuthUser, input: BulkCouponData) {
    // No 0/O/1/I: codes get read aloud and typed on phones.
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const make = () => `${input.prefix}-${Array.from(randomBytes(6), (b) => alphabet[b % alphabet.length]).join('')}`;
    const codes = new Set<string>();
    while (codes.size < input.count) codes.add(make());
    const rows = await this.db
      .insert(coupons)
      .values(
        [...codes].map((code) => ({
          code,
          description: input.description ?? null,
          kind: input.kind,
          value: input.value,
          productCodes: input.productCodes,
          endsAt: input.endsAt,
          maxUses: input.maxUses,
          perUserLimit: 1,
          active: true,
        })),
      )
      .onConflictDoNothing({ target: coupons.code })
      .returning({ code: coupons.code });
    this.audit(admin, 'coupon.bulk', input.prefix, { count: rows.length, kind: input.kind, value: input.value });
    return { codes: rows.map((r) => r.code) };
  }

  /** Pause, activate or delete many coupons at once (e.g. a finished campaign batch). */
  async bulkCouponAction(admin: AuthUser, ids: string[], action: 'pause' | 'activate' | 'delete') {
    const rows =
      action === 'delete'
        ? await this.db.delete(coupons).where(inArray(coupons.id, ids)).returning({ id: coupons.id })
        : await this.db.update(coupons).set({ active: action === 'activate' }).where(inArray(coupons.id, ids)).returning({ id: coupons.id });
    this.audit(admin, `coupon.bulk-${action}`, undefined, { count: rows.length });
    return { updated: rows.length };
  }

  async deleteCoupon(admin: AuthUser, id: string) {
    const [row] = await this.db.delete(coupons).where(eq(coupons.id, id)).returning({ code: coupons.code });
    if (!row) throw new NotFoundException('Coupon not found');
    this.audit(admin, 'coupon.delete', row.code);
  }

  listSales() {
    return this.db.select().from(sales).orderBy(desc(sales.startsAt));
  }

  async saveSale(admin: AuthUser, input: SaleData, id?: string) {
    if (input.endsAt <= input.startsAt) throw new BadRequestException('The sale must end after it starts.');
    const values = input as typeof sales.$inferInsert;
    const [row] = id ? await this.db.update(sales).set(values).where(eq(sales.id, id)).returning() : await this.db.insert(sales).values(values).returning();
    if (!row) throw new NotFoundException('Sale not found');
    this.offers.invalidate();
    this.audit(admin, id ? 'sale.update' : 'sale.create', row.id, { name: row.name, percentOff: row.percentOff });
    return row;
  }

  async deleteSale(admin: AuthUser, id: string) {
    await this.db.delete(sales).where(eq(sales.id, id));
    this.offers.invalidate();
    this.audit(admin, 'sale.delete', id);
  }

  listAnnouncements() {
    return this.db.select().from(announcements).orderBy(desc(announcements.createdAt));
  }

  async saveAnnouncement(admin: AuthUser, input: AnnouncementData, id?: string) {
    const values = { ...input, ctaLabel: input.ctaLabel ?? null, ctaUrl: input.ctaUrl ?? null } as typeof announcements.$inferInsert;
    const [row] = id
      ? await this.db.update(announcements).set(values).where(eq(announcements.id, id)).returning()
      : await this.db.insert(announcements).values(values).returning();
    if (!row) throw new NotFoundException('Banner not found');
    this.offers.invalidate();
    this.audit(admin, id ? 'banner.update' : 'banner.create', row.id, { message: row.message });
    return row;
  }

  async deleteAnnouncement(admin: AuthUser, id: string) {
    await this.db.delete(announcements).where(eq(announcements.id, id));
    this.offers.invalidate();
    this.audit(admin, 'banner.delete', id);
  }

  // ---------------- Plans ----------------

  /** Every plan as customers see it now, the admin edits behind it, and how it sells. */
  async prices() {
    const [active, overrides, sold] = await Promise.all([
      this.offers.active(),
      this.db.select().from(productOverrides),
      this.db.execute(sql`
        select product_code as code, count(*)::int as orders, coalesce(sum(amount_paise), 0)::int as "revenuePaise",
               (count(*) filter (where paid_at >= now() - interval '30 days'))::int as "orders30"
        from orders where status = 'paid' group by product_code`),
    ]);
    const ov = new Map(overrides.map((o) => [o.code, o]));
    const st = new Map((sold.rows as Array<{ code: string }>).map((r) => [r.code, r]));
    return PRODUCT_CODES.map((code) => ({
      ...active.products[code],
      defaults: {
        name: PRODUCTS[code].name,
        description: PRODUCTS[code].description,
        pricePaise: PRODUCTS[code].pricePaise,
        mrpPaise: PRODUCTS[code].mrpPaise ?? null,
        highlight: PRODUCTS[code].highlight ?? false,
      },
      override: ov.get(code) ?? null,
      stats: st.get(code) ?? { orders: 0, revenuePaise: 0, orders30: 0 },
    }));
  }

  async setPrice(admin: AuthUser, code: ProductCode, input: ProductOverride) {
    const def = PRODUCTS[code];
    const price = input.pricePaise ?? def.pricePaise;
    if (input.mrpPaise && input.mrpPaise < price) throw new BadRequestException('MRP should be at least the selling price.');
    // Values equal to the code default are stored as "no override", so later code changes still apply.
    const values = {
      pricePaise: input.pricePaise === def.pricePaise ? null : input.pricePaise,
      mrpPaise: input.mrpPaise === (def.mrpPaise ?? null) ? null : input.mrpPaise,
      name: input.name === def.name ? null : input.name,
      description: input.description === def.description ? null : input.description,
      highlight: input.highlight === (def.highlight ?? false) ? null : input.highlight,
      disabled: input.disabled,
    };
    const untouched = values.pricePaise === null && values.mrpPaise === null && values.name === null && values.description === null && values.highlight === null && !values.disabled;
    if (untouched) await this.db.delete(productOverrides).where(eq(productOverrides.code, code));
    else
      await this.db
        .insert(productOverrides)
        .values({ code, ...values, updatedBy: admin.id })
        .onConflictDoUpdate({ target: productOverrides.code, set: { ...values, updatedBy: admin.id } });
    this.offers.invalidate();
    this.audit(admin, 'plan.update', code, { ...values, name: input.name ?? def.name });
    return this.prices();
  }

  // ---------------- Orders & audit ----------------

  async listOrders(q: { status?: string; page: number }) {
    const cond = q.status ? sql`o.status = ${q.status}` : sql`true`;
    const [rows, total] = await Promise.all([
      this.db.execute(sql`
        select o.id, o.product_code as "productCode", o.amount_paise as "amountPaise", o.list_price_paise as "listPricePaise",
               o.discount_paise as "discountPaise", o.coupon_code as "couponCode", o.status, o.provider, o.provider_payment_id as "paymentId",
               o.created_at as "createdAt", o.paid_at as "paidAt", o.template_id as "templateId",
               o.refunded_paise as "refundedPaise", o.refund_reason as "refundReason", o.payment_method as "paymentMethod",
               u.id as "userId", u.name as "userName", u.email as "userEmail", e.title as "eventTitle"
        from orders o join users u on u.id = o.user_id left join events e on e.id = o.event_id
        where ${cond} order by o.created_at desc limit ${PAGE} offset ${(q.page - 1) * PAGE}`),
      this.db.execute(sql`select count(*)::int as n, coalesce(sum(amount_paise) filter (where status = 'paid'), 0)::int as paid from orders o where ${cond}`),
    ]);
    const t = total.rows[0] as { n: number; paid: number };
    return { items: rows.rows, total: t.n, paidPaise: t.paid, pageSize: PAGE };
  }

  /** Admin changes, newest first, filterable by action group; `targetLabel` names the user / sale / banner instead of a raw id. */
  async audits(q: { action?: string; page: number } = { page: 1 }) {
    const cond = q.action ? sql`l.action like ${`${q.action}.%`}` : sql`true`;
    const rows = await this.db.execute(sql`
      select l.id, l.action, l.target, l.details, l.created_at as "createdAt", a.name as admin, a.email as "adminEmail",
        coalesce(
          (select coalesce(u.name, u.email) from users u where u.id::text = l.target),
          (select s.name from sales s where s.id::text = l.target),
          (select left(b.message, 40) from announcements b where b.id::text = l.target),
          (select c.name from catalog_templates c where c.template_key = l.target),
          (select e.title from events e where e.id::text = l.target),
          l.details->>'name', l.details->>'message', l.target
        ) as "targetLabel"
      from admin_audit_log l left join users a on a.id = l.admin_id
      where ${cond}
      order by l.created_at desc limit 100 offset ${(q.page - 1) * 100}`);
    return rows.rows;
  }
}
