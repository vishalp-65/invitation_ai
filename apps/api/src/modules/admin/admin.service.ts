import {
  adminAuditLog,
  analyticsEvents,
  announcements,
  catalogTemplates,
  coupons,
  desc,
  eq,
  events,
  orders,
  productOverrides,
  sales,
  sql,
  templateOverrides,
  users,
  type Database,
} from '@cardai/db';
import {
  PRODUCT_CODES,
  type announcementInputSchema,
  type couponInputSchema,
  type ProductCode,
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
import { OffersService } from '../offers/offers.service.js';
import { TemplatesService } from '../templates/templates.service.js';

const PAGE = 25;

type CouponData = z.output<typeof couponInputSchema>;
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
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  private audit(admin: AuthUser, action: string, target?: string, details?: Record<string, unknown>) {
    void this.db
      .insert(adminAuditLog)
      .values({ adminId: admin.id, action, target, details })
      .catch(() => undefined);
  }

  // ---------------- Users ----------------

  async listUsers(q: { q?: string; role?: UserRole; status?: 'active' | 'disabled' | 'paying'; page: number }) {
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
    const [rows, total] = await Promise.all([
      this.db.execute(sql`
        select u.id, u.name, u.email, u.phone, u.role, u.avatar_url as "avatarUrl", u.created_at as "createdAt",
               u.last_seen_at as "lastSeenAt", u.disabled_at as "disabledAt",
               (u.google_sub is not null) as "google",
               (select count(*)::int from events e where e.user_id = u.id) as "events",
               (select count(*)::int from orders o where o.user_id = u.id and o.status = 'paid') as "orders",
               (select coalesce(sum(amount_paise), 0)::int from orders o where o.user_id = u.id and o.status = 'paid') as "spentPaise"
        from users u where ${cond}
        order by u.created_at desc limit ${PAGE} offset ${(q.page - 1) * PAGE}`),
      this.db.execute(sql`select count(*)::int as n from users u where ${cond}`),
    ]);
    return { items: rows.rows, total: (total.rows[0] as { n: number }).n, pageSize: PAGE };
  }

  async userDetail(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    if (!user) throw new NotFoundException('User not found');
    const [evs, ords, activity] = await Promise.all([
      this.db
        .select({ id: events.id, title: events.title, type: events.type, templateId: events.templateId, status: events.status, viewCount: events.viewCount, createdAt: events.createdAt })
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
        createdAt: user.createdAt,
        lastSeenAt: user.lastSeenAt,
        disabledAt: user.disabledAt,
      },
      events: evs,
      orders: ords,
      activity,
      spentPaise: ords.filter((o) => o.status === 'paid').reduce((s, o) => s + o.amountPaise, 0),
    };
  }

  async updateUser(admin: AuthUser, id: string, input: { role?: UserRole; disabled?: boolean }) {
    if (id === admin.id && (input.disabled || (input.role && input.role !== 'admin'))) {
      throw new BadRequestException('You cannot disable or demote your own account.');
    }
    const patch: Partial<typeof users.$inferInsert> = {};
    if (input.role) patch.role = input.role;
    if (input.disabled !== undefined) patch.disabledAt = input.disabled ? new Date() : null;
    if (!Object.keys(patch).length) return this.userDetail(id);
    const [row] = await this.db.update(users).set(patch).where(eq(users.id, id)).returning({ id: users.id });
    if (!row) throw new NotFoundException('User not found');
    // Role is baked into access tokens: force a fresh sign-in so the change applies right away.
    if (input.disabled || input.role) await this.tokens.revokeAll(id);
    // Access tokens live up to 15 min; this marker blocks them right away (refresh is already revoked).
    if (input.disabled) await this.redis.set(disabledKey(id), '1', 'EX', ACCESS_TTL_SEC + 60);
    if (input.disabled === false) await this.redis.del(disabledKey(id));
    this.audit(admin, input.disabled !== undefined ? (input.disabled ? 'user.disable' : 'user.enable') : 'user.role', id, input);
    return this.userDetail(id);
  }

  // ---------------- Templates ----------------

  async overrideTemplate(admin: AuthUser, id: string, input: { hidden?: boolean; featured?: boolean; premium?: boolean | null }) {
    await this.templates.resolve(id); // 404 for unknown ids
    await this.db
      .insert(templateOverrides)
      .values({ templateId: id, updatedBy: admin.id, ...input })
      .onConflictDoUpdate({ target: templateOverrides.templateId, set: { ...input, updatedBy: admin.id } });
    this.templates.invalidate();
    this.audit(admin, 'template.update', id, input);
    return { ok: true };
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

  listCoupons() {
    return this.db.select().from(coupons).orderBy(desc(coupons.createdAt));
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

  async prices() {
    const [active, overrides] = await Promise.all([this.offers.active(), this.db.select().from(productOverrides)]);
    const ov = new Map(overrides.map((o) => [o.code, o]));
    return PRODUCT_CODES.map((code) => ({ ...active.products[code], override: ov.get(code) ?? null }));
  }

  async setPrice(admin: AuthUser, code: ProductCode, input: { pricePaise: number | null; mrpPaise: number | null }) {
    if (input.pricePaise && input.mrpPaise && input.mrpPaise < input.pricePaise) throw new BadRequestException('MRP should be at least the selling price.');
    if (input.pricePaise === null && input.mrpPaise === null) await this.db.delete(productOverrides).where(eq(productOverrides.code, code));
    else
      await this.db
        .insert(productOverrides)
        .values({ code, ...input, updatedBy: admin.id })
        .onConflictDoUpdate({ target: productOverrides.code, set: { ...input, updatedBy: admin.id } });
    this.offers.invalidate();
    this.audit(admin, 'price.update', code, input);
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
               u.id as "userId", u.name as "userName", u.email as "userEmail", e.title as "eventTitle"
        from orders o join users u on u.id = o.user_id left join events e on e.id = o.event_id
        where ${cond} order by o.created_at desc limit ${PAGE} offset ${(q.page - 1) * PAGE}`),
      this.db.execute(sql`select count(*)::int as n, coalesce(sum(amount_paise) filter (where status = 'paid'), 0)::int as paid from orders o where ${cond}`),
    ]);
    const t = total.rows[0] as { n: number; paid: number };
    return { items: rows.rows, total: t.n, paidPaise: t.paid, pageSize: PAGE };
  }

  /** Newest 100 admin changes; `targetLabel` names the user / sale / banner instead of a raw id. */
  async audits() {
    const rows = await this.db.execute(sql`
      select l.id, l.action, l.target, l.details, l.created_at as "createdAt", a.name as admin, a.email as "adminEmail",
        coalesce(
          (select coalesce(u.name, u.email) from users u where u.id::text = l.target),
          (select s.name from sales s where s.id::text = l.target),
          (select left(b.message, 40) from announcements b where b.id::text = l.target),
          (select c.name from catalog_templates c where c.template_key = l.target),
          l.details->>'name', l.details->>'message', l.target
        ) as "targetLabel"
      from admin_audit_log l left join users a on a.id = l.admin_id
      order by l.created_at desc limit 100`);
    return rows.rows;
  }
}
