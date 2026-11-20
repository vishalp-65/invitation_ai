import {
  adminAlerts,
  dataRequests,
  entitlements,
  eq,
  events,
  inArray,
  musicTracks,
  orders,
  renders,
  siteWishes,
  sql,
  users,
  type Database,
} from '@cardai/db';
import { QUEUES, type RenderJobData } from '@cardai/shared';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { AuthUser } from '../../common/auth.decorators.js';
import { disabledKey } from '../../common/guards.js';
import { DB, REDIS, STORAGE, type Redis, type S3Storage } from '../../infra/infra.module.js';
import { ACCESS_TTL_SEC, TokenService } from '../auth/token.service.js';
import { effectiveScopes } from './scopes.js';

type Q = <T>(s: ReturnType<typeof sql>) => Promise<T[]>;

/**
 * Admin "manage" actions: open any record, edit it, take it out of sight, or delete it, with the
 * same rules everywhere: anything tied to money is kept (archived / blanked), everything else can
 * go for good, and every change lands in the admin log.
 */
@Injectable()
export class AdminManageService {
  private readonly logger = new Logger(AdminManageService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(STORAGE) private readonly storage: S3Storage,
    private readonly tokens: TokenService,
    @InjectQueue(QUEUES.render) private readonly renderQueue: Queue<RenderJobData>,
  ) {}

  private q: Q = async <T>(s: ReturnType<typeof sql>) => (await this.db.execute(s)).rows as T[];

  private audit(admin: AuthUser, action: string, target?: string, details?: Record<string, unknown>) {
    void this.db
      .execute(sql`insert into admin_audit_log (admin_id, action, target, details) values (${admin.id}, ${action}, ${target ?? null}, ${details ? JSON.stringify(details) : null}::jsonb)`)
      .catch(() => undefined);
  }

  // ---------------- Invitations ----------------

  /** Everything about one invitation on one screen. */
  async invitation(id: string) {
    const [ev] = await this.q<Record<string, unknown>>(sql`
      select e.id, e.title, e.slug, e.status, e.type, e.language, e.secondary_language as "secondaryLanguage", e.community,
             e.template_id as "templateId", e.site->>'design' as "siteDesign", e.short_code as "shortCode", e.view_count as "viewCount",
             e.created_at as "createdAt", e.updated_at as "updatedAt", e.published_at as "publishedAt",
             e.suspended_at as "suspendedAt", e.suspended_reason as "suspendedReason", (e.site_password_hash is not null) as "passwordProtected",
             u.id as "userId", u.name as "userName", u.email as "userEmail"
      from events e join users u on u.id = e.user_id where e.id = ${id}`);
    if (!ev) throw new NotFoundException('Invitation not found');
    const [functions, counts, ords, ents, rends, wishes, views] = await Promise.all([
      this.q(sql`select id, name, starts_at as "startsAt", venue_name as "venueName" from event_functions where event_id = ${id} order by sort_order`),
      this.q<Record<string, number>>(sql`
        select (select count(*)::int from guests where event_id = ${id}) as guests,
               (select count(*)::int from guests where event_id = ${id} and view_count > 0) as "guestsOpened",
               (select count(*)::int from rsvps where event_id = ${id} and status = 'yes') as yes,
               (select count(*)::int from rsvps where event_id = ${id} and status = 'no') as no,
               (select count(*)::int from rsvps where event_id = ${id} and status = 'maybe') as maybe,
               (select coalesce(sum(headcount), 0)::int from rsvps where event_id = ${id} and status <> 'no') as headcount,
               (select count(*)::int from media_assets where event_id = ${id}) as files,
               (select count(*)::int from print_orders where event_id = ${id}) as "printOrders"`),
      this.q(sql`
        select id, product_code as "productCode", amount_paise as "amountPaise", refunded_paise as "refundedPaise", status,
               coupon_code as "couponCode", payment_method as "paymentMethod", created_at as "createdAt", paid_at as "paidAt"
        from orders where event_id = ${id} order by created_at desc`),
      this.q(sql`select feature, credits, order_id as "orderId", created_at as "createdAt" from entitlements where event_id = ${id} order by feature`),
      this.q(sql`
        select id, format, status, progress, watermark, left(error, 200) as error, created_at as "createdAt", completed_at as "completedAt"
        from renders where event_id = ${id} order by created_at desc limit 12`),
      this.q(sql`select id, name, message, hidden, created_at as "createdAt" from site_wishes where event_id = ${id} order by created_at desc limit 100`),
      this.q(sql`
        select to_char(day, 'YYYY-MM-DD') as day, views, guest_views as "guestViews", whatsapp_views as "whatsappViews"
        from invitation_daily where event_id = ${id} and day > (now() at time zone 'Asia/Kolkata')::date - 30 order by day`),
    ]);
    return { ...ev, functions, counts: counts[0], orders: ords, entitlements: ents, renders: rends, wishes, views };
  }

  async updateInvitation(admin: AuthUser, id: string, input: { title?: string; slug?: string; status?: 'draft' | 'published' | 'archived' }) {
    const [ev] = await this.db.select({ id: events.id, slug: events.slug, title: events.title, suspendedAt: events.suspendedAt }).from(events).where(eq(events.id, id));
    if (!ev) throw new NotFoundException('Invitation not found');
    if (input.status === 'published' && ev.suspendedAt) throw new BadRequestException('Restore it from the take-down first, then publish.');
    if (input.slug && input.slug !== ev.slug) {
      const [taken] = await this.db.select({ id: events.id }).from(events).where(eq(events.slug, input.slug));
      if (taken) throw new ConflictException('That link is already used by another invitation.');
    }
    const patch: Partial<typeof events.$inferInsert> = { updatedAt: new Date() };
    if (input.title) patch.title = input.title;
    if (input.slug) patch.slug = input.slug;
    if (input.status) {
      patch.status = input.status;
      if (input.status === 'published') patch.publishedAt = new Date();
    }
    await this.db.update(events).set(patch).where(eq(events.id, id));
    this.audit(admin, 'invitation.edit', id, { name: input.title ?? ev.title, ...input, oldSlug: input.slug ? ev.slug : undefined });
    return this.invitation(id);
  }

  /**
   * Deletes an invitation for good (guests, RSVPs, files, renders go with it). Invitations with
   * paid or print orders cannot be deleted: archive or take them down instead.
   */
  async deleteInvitation(admin: AuthUser, id: string) {
    const [ev] = await this.db.select({ title: events.title, userId: events.userId }).from(events).where(eq(events.id, id));
    if (!ev) throw new NotFoundException('Invitation not found');
    const [{ n }] = (await this.q<{ n: number }>(sql`
      select ((select count(*) from orders where event_id = ${id}) + (select count(*) from print_orders where event_id = ${id}))::int as n`)) as [{ n: number }];
    if (n) throw new ConflictException('This invitation has orders, which must be kept for accounts. Archive it or take it down instead.');
    const files = await this.q<{ key: string }>(sql`
      select storage_key as key from media_assets where event_id = ${id}
      union all select o->>'key' from renders r, jsonb_array_elements(r.outputs) o where r.event_id = ${id}`);
    await this.db.delete(events).where(eq(events.id, id));
    void Promise.allSettled(files.filter((f) => f.key).map((f) => this.storage.delete(f.key)));
    this.audit(admin, 'invitation.delete', id, { name: ev.title, owner: ev.userId, files: files.length });
    return { ok: true, files: files.length };
  }

  /** Guest messages on the invitation website: hide (kept, not shown), show again, or delete. */
  async wish(admin: AuthUser, eventId: string, wishId: string, action: 'hide' | 'show' | 'delete') {
    const where = sql`${siteWishes.id} = ${wishId} and ${siteWishes.eventId} = ${eventId}`;
    const rows =
      action === 'delete'
        ? await this.db.delete(siteWishes).where(where).returning({ id: siteWishes.id, name: siteWishes.name })
        : await this.db.update(siteWishes).set({ hidden: action === 'hide' }).where(where).returning({ id: siteWishes.id, name: siteWishes.name });
    if (!rows.length) throw new NotFoundException('Message not found');
    this.audit(admin, `wish.${action}`, eventId, { name: rows[0]!.name });
    return { ok: true };
  }

  /** Removes one unlocked feature (e.g. a plan given by mistake). Payments are not touched. */
  async revokeFeature(admin: AuthUser, eventId: string, feature: string) {
    const rows = await this.db
      .delete(entitlements)
      .where(sql`${entitlements.eventId} = ${eventId} and ${entitlements.feature} = ${feature}`)
      .returning({ f: entitlements.feature });
    if (!rows.length) throw new NotFoundException('That feature is not unlocked on this invitation.');
    this.audit(admin, 'invitation.revoke-feature', eventId, { feature });
    return this.invitation(eventId);
  }

  // ---------------- Users ----------------

  async updateProfile(admin: AuthUser, id: string, input: { name?: string | null; locale?: 'en' | 'hi'; marketingEmails?: boolean }) {
    if (!Object.keys(input).length) return { ok: true };
    const rows = await this.db.update(users).set(input).where(eq(users.id, id)).returning({ id: users.id });
    if (!rows.length) throw new NotFoundException('User not found');
    this.audit(admin, 'user.profile', id, input);
    return { ok: true };
  }

  /** Ends every session. Open tabs stop working when their 15-minute access token runs out. */
  async signOut(admin: AuthUser, id: string) {
    await this.tokens.revokeAll(id);
    this.audit(admin, 'user.sign-out', id);
    return { ok: true };
  }

  async bulkUsers(admin: AuthUser, ids: string[], action: 'disable' | 'enable' | 'sign-out') {
    // Never touches the acting admin or other admins (those go through Settings → Admins).
    const targets = (await this.db.select({ id: users.id, role: users.role }).from(users).where(inArray(users.id, ids))).filter((u) => u.id !== admin.id && u.role !== 'admin').map((u) => u.id);
    if (!targets.length) return { updated: 0 };
    if (action !== 'sign-out') await this.db.update(users).set({ disabledAt: action === 'disable' ? new Date() : null }).where(inArray(users.id, targets));
    for (const id of targets) {
      if (action !== 'enable') await this.tokens.revokeAll(id);
      if (action === 'disable') await this.redis.set(disabledKey(id), '1', 'EX', ACCESS_TTL_SEC + 60);
      if (action === 'enable') await this.redis.del(disabledKey(id));
    }
    this.audit(admin, `user.bulk-${action}`, undefined, { count: targets.length });
    return { updated: targets.length, skipped: ids.length - targets.length };
  }

  /** Takes admin access away (back to a customer account). The last owner cannot be removed. */
  async removeAdmin(admin: AuthUser, id: string) {
    if (id === admin.id) throw new ForbiddenException('You cannot remove your own admin access.');
    const admins = await this.db.select({ id: users.id, scopes: users.adminScopes, disabledAt: users.disabledAt }).from(users).where(eq(users.role, 'admin'));
    const target = admins.find((a) => a.id === id);
    if (!target) throw new NotFoundException('That person is not an admin.');
    if (!admins.some((a) => a.id !== id && !a.disabledAt && effectiveScopes(a.scopes).includes('owner'))) throw new ConflictException('Keep at least one owner.');
    await this.db.update(users).set({ role: 'user', adminScopes: [] }).where(eq(users.id, id));
    await this.tokens.revokeAll(id);
    this.audit(admin, 'admin.remove', id);
    return { ok: true };
  }

  // ---------------- Orders ----------------

  async order(id: string) {
    const [o] = await this.q<Record<string, unknown>>(sql`
      select o.*, u.name as "userName", u.email as "userEmail", e.title as "eventTitle", e.slug as "eventSlug"
      from orders o join users u on u.id = o.user_id left join events e on e.id = o.event_id where o.id = ${id}`);
    if (!o) throw new NotFoundException('Order not found');
    const [ents, earning] = await Promise.all([
      this.q(sql`select feature, credits from entitlements where order_id = ${id}`),
      this.q(sql`select amount_paise as "amountPaise", status from designer_earnings where order_id = ${id}`),
    ]);
    return { order: o, unlocked: ents, designerEarning: earning[0] ?? null };
  }

  /** Closes a checkout that was never paid, so it stops counting as open and gets no reminder email. */
  async cancelOrder(admin: AuthUser, id: string) {
    const rows = await this.db
      .update(orders)
      .set({ status: 'failed', reminderSentAt: new Date() })
      .where(sql`${orders.id} = ${id} and ${orders.status} = 'created'`)
      .returning({ id: orders.id });
    if (!rows.length) throw new BadRequestException('Only unpaid checkouts can be cancelled.');
    this.audit(admin, 'order.cancel', id);
    return { ok: true };
  }

  // ---------------- Renders ----------------

  /** Puts a failed render back in the queue (same inputs, fresh attempt). */
  async retryRender(admin: AuthUser, id: string) {
    const [r] = await this.db
      .update(renders)
      .set({ status: 'queued', progress: 0, error: null, completedAt: null })
      .where(sql`${renders.id} = ${id} and ${renders.status} in ('failed', 'queued', 'processing')`)
      .returning({ id: renders.id, format: renders.format, watermark: renders.watermark });
    if (!r) throw new BadRequestException('Only failed or stuck renders can be retried.');
    await this.renderQueue.add(r.format, { renderId: r.id }, { jobId: `${r.id}-retry-${Date.now()}`, priority: 1 });
    this.audit(admin, 'render.retry', id, { format: r.format });
    return { ok: true };
  }

  async deleteRender(admin: AuthUser, id: string) {
    const [r] = await this.db.delete(renders).where(eq(renders.id, id)).returning();
    if (!r) throw new NotFoundException('Render not found');
    void Promise.allSettled(r.outputs.map((o) => this.storage.delete(o.key)));
    this.audit(admin, 'render.delete', id, { format: r.format });
    return { ok: true };
  }

  // ---------------- Music, alerts, data requests ----------------

  async deleteTrack(admin: AuthUser, id: string) {
    const [{ n }] = (await this.q<{ n: number }>(sql`select count(*)::int as n from events where site->'music'->>'track' = ${id}`)) as [{ n: number }];
    if (n) throw new ConflictException(`${n} invitation(s) use this song. Turn it off instead so they keep playing it.`);
    const [t] = await this.db.delete(musicTracks).where(eq(musicTracks.id, id)).returning();
    if (!t) throw new NotFoundException('Song not found');
    void this.storage.delete(t.storageKey).catch(() => undefined);
    this.audit(admin, 'music.delete', id, { name: t.title });
    return { ok: true };
  }

  async deleteAlert(admin: AuthUser, id: string) {
    await this.db.delete(adminAlerts).where(eq(adminAlerts.id, id));
    this.audit(admin, 'alert.delete', id);
    return { ok: true };
  }

  async clearResolvedAlerts(admin: AuthUser) {
    const rows = await this.db.delete(adminAlerts).where(sql`${adminAlerts.resolvedAt} is not null`).returning({ id: adminAlerts.id });
    this.audit(admin, 'alert.clear', undefined, { count: rows.length });
    return { deleted: rows.length };
  }

  async resolveAllAlerts(admin: AuthUser) {
    const rows = await this.db.update(adminAlerts).set({ resolvedAt: new Date() }).where(sql`${adminAlerts.resolvedAt} is null`).returning({ id: adminAlerts.id });
    this.audit(admin, 'alert.resolve-all', undefined, { count: rows.length });
    return { resolved: rows.length };
  }

  async setRequestStatus(admin: AuthUser, id: string, status: 'open' | 'done' | 'rejected') {
    const rows = await this.db
      .update(dataRequests)
      .set({ status, completedAt: status === 'open' ? null : new Date(), handledBy: admin.id })
      .where(eq(dataRequests.id, id))
      .returning({ id: dataRequests.id });
    if (!rows.length) throw new NotFoundException('Request not found');
    this.audit(admin, `dpdp.request-${status}`, id);
    return { ok: true };
  }

  async deleteRequest(admin: AuthUser, id: string) {
    await this.db.delete(dataRequests).where(eq(dataRequests.id, id));
    this.audit(admin, 'dpdp.request-delete', id);
    return { ok: true };
  }
}
