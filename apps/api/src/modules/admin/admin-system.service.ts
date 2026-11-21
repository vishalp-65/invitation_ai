import {
  activityDaily,
  adminAlerts,
  analyticsEvents,
  dataRequests,
  desc,
  eq,
  events,
  featureFlags,
  inArray,

  mediaAssets,
  musicTracks,
  orders,
  sessions,
  siteMedia,
  sql,
  users,
  visitorAttribution,
  type Database,
} from '@cardai/db';
import {
  ADMIN_SCOPES,
  BUILTIN_FLAGS,
  MEDIA_SLOT_KEYS,
  MEDIA_SLOTS,
  type AdminScope,
  type FlagDto,
  type MediaSlot,
  type flagInputSchema,
  type musicTrackSchema,
} from '@cardai/shared';
import type { z } from 'zod';
import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { AuthUser } from '../../common/auth.decorators.js';
import { disabledKey } from '../../common/guards.js';
import { DB, REDIS, STORAGE, type Redis, type S3Storage } from '../../infra/infra.module.js';
import { ACCESS_TTL_SEC, TokenService } from '../auth/token.service.js';
import { FlagsService } from '../flags/flags.service.js';
import { OffersService } from '../offers/offers.service.js';
import { OpsService } from '../ops/ops.service.js';
import { effectiveScopes } from './admin-access.js';

type FlagData = z.output<typeof flagInputSchema>;
type TrackData = z.output<typeof musicTrackSchema>;

const EXT: Record<string, string> = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/ogg': 'ogg' };
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg'];
/** "View as user" lasts one access-token lifetime; refresh brings the admin back. */
export const IMPERSONATION_TTL_SEC = ACCESS_TTL_SEC;

@Injectable()
export class AdminSystemService {
  private readonly logger = new Logger(AdminSystemService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(STORAGE) private readonly storage: S3Storage,
    private readonly flags: FlagsService,
    private readonly offers: OffersService,
    private readonly tokens: TokenService,
    private readonly ops: OpsService,
  ) {}

  private audit(admin: AuthUser, action: string, target?: string, details?: Record<string, unknown>) {
    void this.db.execute(sql`insert into admin_audit_log (admin_id, action, target, details) values (${admin.id}, ${action}, ${target ?? null}, ${details ? JSON.stringify(details) : null}::jsonb)`).catch(() => undefined);
  }

  // ---------------- Switches ----------------

  async listFlags(): Promise<FlagDto[]> {
    const all = [...(await this.flags.all()).values()];
    const order = Object.keys(BUILTIN_FLAGS);
    return all.sort((a, b) => (a.builtin === b.builtin ? (order.indexOf(a.key) - order.indexOf(b.key) || a.key.localeCompare(b.key)) : a.builtin ? -1 : 1));
  }

  async setFlag(admin: AuthUser, key: string, input: FlagData) {
    const values = { enabled: input.enabled, rolloutPct: input.rolloutPct, description: input.description ?? null, message: input.message ?? null, updatedBy: admin.id };
    await this.db.insert(featureFlags).values({ key, ...values }).onConflictDoUpdate({ target: featureFlags.key, set: { ...values, updatedAt: new Date() } });
    this.flags.invalidate();
    this.offers.invalidate();
    this.audit(admin, input.enabled ? 'flag.on' : 'flag.off', key, { name: key, rolloutPct: input.rolloutPct, message: input.message ?? undefined });
    return this.listFlags();
  }

  async deleteFlag(admin: AuthUser, key: string) {
    if (key in BUILTIN_FLAGS) throw new BadRequestException('Built-in switches cannot be deleted; turn them on or off instead.');
    await this.db.delete(featureFlags).where(eq(featureFlags.key, key));
    this.flags.invalidate();
    this.audit(admin, 'flag.delete', key, { name: key });
    return this.listFlags();
  }

  // ---------------- Alerts & digest ----------------

  alerts() {
    return this.db.select().from(adminAlerts).orderBy(desc(adminAlerts.createdAt)).limit(60);
  }

  async resolveAlert(admin: AuthUser, id: string) {
    await this.db.update(adminAlerts).set({ resolvedAt: new Date() }).where(eq(adminAlerts.id, id));
    this.audit(admin, 'alert.resolve', id);
    return { ok: true };
  }

  async runChecks(admin: AuthUser) {
    const raised = await this.ops.check();
    this.audit(admin, 'ops.check', undefined, { raised: raised.length });
    return { raised: raised.map((a) => ({ kind: a.kind, title: a.title, severity: a.severity })) };
  }

  async sendDigest(admin: AuthUser) {
    const r = await this.ops.digest();
    this.audit(admin, 'ops.digest', undefined, { sentTo: r.sentTo });
    return r;
  }

  async nightly(admin: AuthUser) {
    const r = await this.ops.nightly();
    this.audit(admin, 'ops.nightly', undefined, { backfilled: r.backfilled });
    return r;
  }

  // ---------------- Admins & roles ----------------

  async admins() {
    const rows = await this.db
      .select({ id: users.id, name: users.name, email: users.email, scopes: users.adminScopes, digest: users.adminDigest, lastSeenAt: users.lastSeenAt, disabledAt: users.disabledAt })
      .from(users)
      .where(eq(users.role, 'admin'))
      .orderBy(users.createdAt);
    return rows.map((r) => ({ ...r, scopes: effectiveScopes(r.scopes) }));
  }

  async setScopes(admin: AuthUser, userId: string, scopes: AdminScope[]) {
    const list = [...new Set(scopes)].filter((s) => (ADMIN_SCOPES as readonly string[]).includes(s));
    const all = await this.admins();
    const target = all.find((a) => a.id === userId);
    if (!target) throw new NotFoundException('That person is not an admin. Make them an admin from Users first.');
    const ownersAfter = all.filter((a) => !a.disabledAt && (a.id === userId ? list.includes('owner') : a.scopes.includes('owner')));
    if (!ownersAfter.length) throw new ConflictException('Keep at least one owner.');
    await this.db.update(users).set({ adminScopes: list }).where(eq(users.id, userId));
    this.audit(admin, 'admin.scopes', userId, { scopes: list });
    return this.admins();
  }

  async setDigest(admin: AuthUser, userId: string, on: boolean, isOwner: boolean) {
    if (userId !== admin.id && !isOwner) throw new ForbiddenException('You can only change your own summary email.');
    await this.db.update(users).set({ adminDigest: on }).where(eq(users.id, userId));
    return this.admins();
  }

  // ---------------- View as user ----------------

  /** A 15-minute, read-only access token for the customer, carrying the admin's id. */
  async impersonate(admin: AuthUser, userId: string) {
    const [u] = await this.db.select({ id: users.id, role: users.role, name: users.name, email: users.email, disabledAt: users.disabledAt }).from(users).where(eq(users.id, userId));
    if (!u) throw new NotFoundException('User not found');
    if (u.role === 'admin') throw new ForbiddenException('You cannot view as another admin.');
    if (u.disabledAt) throw new BadRequestException('This account is disabled.');
    const token = await this.tokens.signAccess({ id: u.id, role: u.role, imp: admin.id }, IMPERSONATION_TTL_SEC);
    this.audit(admin, 'user.impersonate', userId, { name: u.name ?? u.email });
    return { token, label: u.name ?? u.email ?? 'customer' };
  }

  // ---------------- Landing media ----------------

  async media() {
    const rows = await this.db.select().from(siteMedia);
    const by = new Map(rows.map((r) => [r.slot, r]));
    return MEDIA_SLOT_KEYS.map((slot) => {
      const r = by.get(slot);
      const def = MEDIA_SLOTS[slot];
      return { slot, label: def.label, accept: def.accept, maxMb: def.maxMb, url: r ? this.storage.publicUrl(r.storageKey) : def.fallback, custom: Boolean(r), bytes: r?.bytes ?? null, updatedAt: r?.updatedAt ?? null };
    });
  }

  async presignMedia(slot: MediaSlot, contentType: string, bytes: number) {
    const def = MEDIA_SLOTS[slot];
    if (!(def.accept as readonly string[]).includes(contentType)) throw new BadRequestException(`Use ${def.accept.join(', ')}`);
    if (bytes > def.maxMb * 1024 * 1024) throw new BadRequestException(`Keep it under ${def.maxMb} MB so it loads fast on mobile data.`);
    const key = `site/${slot.replace('.', '-')}/${randomBytes(6).toString('hex')}.${EXT[contentType] ?? 'bin'}`;
    return { key, uploadUrl: await this.storage.presignPut(key, contentType, bytes), headers: this.storage.uploadHeaders(contentType) };
  }

  async saveMedia(admin: AuthUser, slot: MediaSlot, key: string) {
    if (!key.startsWith(`site/${slot.replace('.', '-')}/`)) throw new BadRequestException('That upload is for a different slot.');
    const head = await this.storage.head(key);
    if (!head) throw new BadRequestException('Upload not found. Try again.');
    const def = MEDIA_SLOTS[slot];
    if (head.bytes > def.maxMb * 1024 * 1024) throw new BadRequestException('File is too large.');
    const [old] = await this.db.select().from(siteMedia).where(eq(siteMedia.slot, slot));
    const values = { storageKey: key, contentType: head.contentType ?? def.accept[0], bytes: head.bytes, updatedBy: admin.id };
    await this.db.insert(siteMedia).values({ slot, ...values }).onConflictDoUpdate({ target: siteMedia.slot, set: { ...values, updatedAt: new Date() } });
    if (old && old.storageKey !== key) void this.storage.delete(old.storageKey).catch(() => undefined);
    this.offers.invalidate();
    this.audit(admin, 'media.update', slot, { name: def.label, bytes: head.bytes });
    return this.media();
  }

  async resetMedia(admin: AuthUser, slot: MediaSlot) {
    const [old] = await this.db.delete(siteMedia).where(eq(siteMedia.slot, slot)).returning();
    if (old) void this.storage.delete(old.storageKey).catch(() => undefined);
    this.offers.invalidate();
    this.audit(admin, 'media.reset', slot, { name: MEDIA_SLOTS[slot].label });
    return this.media();
  }

  // ---------------- Music library ----------------

  async music() {
    const [rows, usage] = await Promise.all([
      this.db.select().from(musicTracks).orderBy(musicTracks.mood, musicTracks.title),
      this.db.execute(sql`select site->'music'->>'track' as id, count(*)::int as n from events where site->'music'->>'track' is not null group by 1`),
    ]);
    const used = new Map((usage.rows as Array<{ id: string; n: number }>).map((u) => [u.id, u.n]));
    return rows.map((t) => ({ ...t, url: this.storage.publicUrl(t.storageKey), uses: used.get(t.id) ?? 0 }));
  }

  async presignMusic(contentType: string, bytes: number) {
    if (!AUDIO_TYPES.includes(contentType)) throw new BadRequestException('Use MP3, M4A, AAC or OGG audio.');
    if (bytes > 15 * 1024 * 1024) throw new BadRequestException('Keep songs under 15 MB.');
    const key = `music/${randomBytes(6).toString('hex')}.${EXT[contentType] ?? 'mp3'}`;
    return { key, uploadUrl: await this.storage.presignPut(key, contentType, bytes), headers: this.storage.uploadHeaders(contentType) };
  }

  async saveTrack(admin: AuthUser, input: TrackData) {
    const [existing] = await this.db.select().from(musicTracks).where(eq(musicTracks.id, input.id));
    if (!existing && !input.storageKey) throw new BadRequestException('Upload the audio file first.');
    if (input.storageKey) {
      if (!input.storageKey.startsWith('music/')) throw new BadRequestException('Invalid upload.');
      if (!(await this.storage.head(input.storageKey))) throw new BadRequestException('Upload not found. Try again.');
    }
    const values = { title: input.title, mood: input.mood, durationSec: input.durationSec, license: input.license, active: input.active, storageKey: input.storageKey ?? existing!.storageKey };
    await this.db.insert(musicTracks).values({ id: input.id, ...values }).onConflictDoUpdate({ target: musicTracks.id, set: values });
    this.audit(admin, existing ? 'music.update' : 'music.create', input.id, { name: input.title, active: input.active });
    return this.music();
  }

  // ---------------- Data protection (DPDP Act 2023) ----------------

  async dataRequests() {
    const rows = await this.db.execute(sql`
      select r.*, u.name, u.email, h.name as "handledByName"
      from data_requests r left join users u on u.id = r.user_id left join users h on h.id = r.handled_by
      order by r.created_at desc limit 100`);
    return rows.rows;
  }

  async logRequest(admin: AuthUser, userId: string, kind: 'export' | 'erasure', note?: string | null) {
    const [row] = await this.db.insert(dataRequests).values({ userId, kind, note: note ?? null, handledBy: admin.id }).returning();
    this.audit(admin, `dpdp.${kind}-request`, userId, { note: note ?? undefined });
    return row;
  }

  /** Everything we hold about a person, as one JSON file (right to access). */
  async exportData(admin: AuthUser, userId: string) {
    const data = await this.collectData(userId);
    this.audit(admin, 'dpdp.export', userId, { name: data.profile.name ?? data.profile.email });
    await this.db.update(dataRequests).set({ status: 'done', completedAt: new Date() }).where(sql`${dataRequests.userId} = ${userId} and ${dataRequests.kind} = 'export' and ${dataRequests.status} = 'open'`);
    return data;
  }

  /** The person's own download (Settings → Your data). */
  async exportOwnData(userId: string) {
    const data = await this.collectData(userId);
    void this.db.insert(dataRequests).values({ userId, kind: 'export', status: 'done', note: 'Self-service download', completedAt: new Date() }).catch(() => undefined);
    return data;
  }

  private async collectData(userId: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new NotFoundException('User not found');
    const q = async <T>(s: ReturnType<typeof sql>) => (await this.db.execute(s)).rows as T[];
    const [evs, fns, guests, rsvps, ords, media, activity, attribution, analytics] = await Promise.all([
      q(sql`select id, slug, status, type, language, community, template_id, title, content, settings, site, created_at, published_at from events where user_id = ${userId}`),
      q(sql`select f.* from event_functions f join events e on e.id = f.event_id where e.user_id = ${userId}`),
      q(sql`select g.event_id, g.name, g.phone, g.email, g.group_label, g.max_pax, g.view_count, g.created_at from guests g join events e on e.id = g.event_id where e.user_id = ${userId}`),
      q(sql`select r.event_id, r.name, r.phone, r.status, r.headcount, r.meal_preference, r.note, r.created_at from rsvps r join events e on e.id = r.event_id where e.user_id = ${userId}`),
      q(sql`select id, event_id, product_code, amount_paise, discount_paise, coupon_code, status, payment_method, refunded_paise, created_at, paid_at from orders where user_id = ${userId}`),
      q(sql`select id, event_id, kind, storage_key, content_type, bytes, created_at from media_assets where user_id = ${userId}`),
      q(sql`select day, active_seconds, page_views, device from activity_daily where user_id = ${userId} order by day`),
      q(sql`select channel, utm_source, utm_medium, utm_campaign, landing_path, country, state, city, language, network, device, first_seen_at from visitor_attribution where user_id = ${userId}`),
      q(sql`select name, path, device, template_id, created_at from analytics_events where user_id = ${userId} order by created_at desc limit 5000`),
    ]);
    const { passwordHash: _p, adminNote: _n, googleSub: _g, ...profile } = user;
    return {
      exportedAt: new Date().toISOString(),
      note: 'Personal data held by Noyta for this account (Digital Personal Data Protection Act, 2023). Guest names and numbers were added by the account holder for their invitations.',
      profile,
      invitations: evs,
      functions: fns,
      guests,
      rsvps,
      orders: ords,
      files: (media as Array<{ storage_key: string }>).map((m) => ({ ...m, url: this.storage.publicUrl(m.storage_key) })),
      usage: { days: activity, firstVisit: attribution, recentActions: analytics },
    };
  }

  /**
   * Right to erasure. Deletes invitations, guests, RSVPs, files, sessions and analytics; scrubs the
   * profile. Paid orders stay (amounts and dates only) because tax law requires invoices to be kept,
   * and their invitations are blanked instead of deleted.
   */
  async eraseUser(admin: AuthUser, userId: string) {
    if (userId === admin.id) throw new ForbiddenException('You cannot erase your own account here.');
    const result = await this.erase(userId);
    this.audit(admin, 'dpdp.erase', userId, { invitationsDeleted: result.invitationsDeleted, invitationsBlanked: result.invitationsBlanked, files: result.files });
    return result;
  }

  /** The person deleting their own account (Settings → Delete account, confirmed by an emailed code). */
  async eraseOwnAccount(userId: string) {
    await this.db.insert(dataRequests).values({ userId, kind: 'erasure', note: 'Self-service deletion' });
    const result = await this.erase(userId);
    void this.db.execute(sql`insert into admin_audit_log (admin_id, action, target, details) values (null, 'dpdp.self-erase', ${userId}, ${JSON.stringify({ invitationsDeleted: result.invitationsDeleted, invitationsBlanked: result.invitationsBlanked, files: result.files })}::jsonb)`).catch(() => undefined);
    return result;
  }

  private async erase(userId: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'admin') throw new ForbiddenException('Remove admin access before erasing this account.');

    const files = await this.db.select({ key: mediaAssets.storageKey }).from(mediaAssets).where(eq(mediaAssets.userId, userId));
    // Invitations with orders or print orders are kept (blanked): those records must stay.
    const withOrders = new Set([
      ...(await this.db.selectDistinct({ id: orders.eventId }).from(orders).where(eq(orders.userId, userId))).map((r) => r.id),
      ...((await this.db.execute(sql`select distinct event_id as id from print_orders where user_id = ${userId}`)).rows as Array<{ id: string }>).map((r) => r.id),
    ]);
    const own = await this.db.select({ id: events.id }).from(events).where(eq(events.userId, userId));
    const deletable = own.map((e) => e.id).filter((id) => !withOrders.has(id));
    const keep = own.map((e) => e.id).filter((id) => withOrders.has(id));

    await this.db.transaction(async (tx) => {
      if (keep.length) {
        await tx.execute(sql`delete from rsvps where event_id = any(${keep}::uuid[])`);
        await tx.execute(sql`delete from guests where event_id = any(${keep}::uuid[])`);
        await tx.execute(sql`delete from site_wishes where event_id = any(${keep}::uuid[])`);
        await tx.execute(sql`delete from site_updates where event_id = any(${keep}::uuid[])`);
        await tx.execute(sql`delete from short_aliases where event_id = any(${keep}::uuid[])`);
        await tx.execute(sql`
          update events set title = 'Erased invitation', content = '{}'::jsonb, site = null, design = null, status = 'archived',
                 suspended_at = coalesce(suspended_at, now()), suspended_reason = 'Erased on request', short_code = null,
                 slug = 'erased-' || replace(id::text, '-', ''), site_password_hash = null
          where id = any(${keep}::uuid[])`);
      }
      if (deletable.length) await tx.delete(events).where(inArray(events.id, deletable));
      await tx.delete(mediaAssets).where(eq(mediaAssets.userId, userId));
      await tx.delete(sessions).where(eq(sessions.userId, userId));
      await tx.delete(analyticsEvents).where(eq(analyticsEvents.userId, userId));
      await tx.delete(activityDaily).where(eq(activityDaily.userId, userId));
      await tx.delete(visitorAttribution).where(eq(visitorAttribution.userId, userId));
      await tx.execute(sql`delete from user_templates where user_id = ${userId}`);
      await tx
        .update(users)
        .set({
          name: null,
          email: `erased-${userId.slice(0, 8)}@erased.invalid`,
          emailVerifiedAt: null,
          phone: null,
          googleSub: null,
          passwordHash: null,
          avatarUrl: null,
          adminNote: null,
          marketingEmails: false,
          referredEventId: null,
          disabledAt: new Date(),
          role: 'user',
          adminScopes: [],
        })
        .where(eq(users.id, userId));
      await tx.update(dataRequests).set({ status: 'done', completedAt: new Date() }).where(sql`${dataRequests.userId} = ${userId} and ${dataRequests.kind} = 'erasure' and ${dataRequests.status} = 'open'`);
    });
    await this.redis.set(disabledKey(userId), '1', 'EX', ACCESS_TTL_SEC + 60);
    // Files go after the database commit; a failed delete only leaves an orphaned object.
    void Promise.allSettled(files.map((f) => this.storage.delete(f.key))).then((r) => {
      const failed = r.filter((x) => x.status === 'rejected').length;
      if (failed) this.logger.warn(`Erasure ${userId}: ${failed} file(s) could not be deleted`);
    });
    await this.tokens.revokeAll(userId);
    return { ok: true, invitationsDeleted: deletable.length, invitationsBlanked: keep.length, files: files.length };
  }

  /** Requests still open for longer than 25 days (the Act expects prompt handling). */
  overdueRequests() {
    return this.db.select().from(dataRequests).where(sql`${dataRequests.status} = 'open' and ${dataRequests.createdAt} < now() - interval '25 days'`);
  }
}


