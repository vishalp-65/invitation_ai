import {
  and,
  desc,
  eventMembers,
  eq,
  events,
  guests,
  inArray,
  invitationDaily,
  isNull,
  mediaAssets,
  renders,
  rsvps,
  siteGifts,
  siteUpdates,
  siteVisitors,
  siteWishes,
  sql,
  type Database,
} from '@cardai/db';
import {
  applySiteTier,
  BRAND,
  CAPPED_SITE_SECTIONS,
  defaultSiteDoc,
  ensureDesign,
  findBuiltinTemplate,
  FREE_PLAN,
  siteBranding,
  siteDocSchema,
  siteExpiresAt,
  siteTier,
  type AlbumUploadInput,
  type ClaimWishInput,
  type Feature,
  type LockedSiteDto,
  type PublicSiteDto,
  type PublicSiteResponse,
  type SiteDoc,
  type SiteTier,
  type SubmitGiftInput,
  type SubmitRsvpInput,
  type WishInput,
} from '@cardai/shared';
import { BadRequestException, ConflictException, ForbiddenException, GoneException, HttpException, HttpStatus, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import { hmacSha256Hex, safeEqual, verifyPassword } from '../../common/crypto.js';
import { bumpCounter } from '../../common/redis.js';
import { ENV, type Env } from '../../config/env.js';
import { DB, REDIS, STORAGE, type Redis, type S3Storage } from '../../infra/infra.module.js';
import { EntitlementsService } from '../entitlements/entitlements.service.js';
import { EventsService, fromFunctionRow, type FunctionRow } from '../events/events.service.js';
import { MediaService } from '../media/media.service.js';
import { presignUpload } from '../media/upload-signer.js';
import { RendersService } from '../renders/renders.service.js';
import { ShortLinksService } from '../short-links/short-links.service.js';
import { MailService } from '../mail/mail.service.js';
import { TemplatesService } from '../templates/templates.service.js';

export type EventRow = typeof events.$inferSelect;
type GuestRow = typeof guests.$inferSelect;

const ALBUM_SOURCE = 'guest_album';
const ALBUM_LIMIT = 500;

/** Collects every photo asset id referenced inside the page sections. */
export function sectionAssetIds(doc: SiteDoc): string[] {
  const ids: string[] = [];
  for (const s of doc.sections) {
    if (s.type === 'couple') ids.push(...s.people.map((p) => p.photoAssetId).filter((x): x is string => Boolean(x)));
    if (s.type === 'story') ids.push(...s.chapters.map((c) => c.photoAssetId).filter((x): x is string => Boolean(x)));
    if (s.type === 'custom' && s.photoAssetId) ids.push(s.photoAssetId);
    if (s.type === 'gallery') ids.push(...s.assetIds);
    if (s.type === 'familytree') for (const side of s.sides) ids.push(...side.members.map((m) => m.photoAssetId).filter((x): x is string => Boolean(x)));
  }
  if (doc.music?.assetId) ids.push(doc.music.assetId);
  return ids;
}

/** Wrong site passwords allowed per invitation per hour, across all IPs. */
const MAX_UNLOCK_FAILS_PER_HOUR = 50;

/** What a guest presents to open a private site: their personal link token, or the unlock key. */
export interface SiteAccess {
  guestToken?: string;
  key?: string;
}

/** Public, unauthenticated surface: the invitation website, RSVP, wishes, album and view tracking. */
@Injectable()
export class SitesService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(DB) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(STORAGE) private readonly storage: S3Storage,
    private readonly eventsService: EventsService,
    private readonly templates: TemplatesService,
    private readonly media: MediaService,
    private readonly renders: RendersService,
    private readonly entitlements: EntitlementsService,
    private readonly links: ShortLinksService,
    private readonly mail: MailService,
  ) {}

  // ---------------- helpers shared with the builder ----------------

  docOf(event: EventRow): SiteDoc {
    const opts = { eventType: event.type, community: event.community, cardDesign: findBuiltinTemplate(event.templateId)?.design ?? null };
    if (!event.site) return defaultSiteDoc({ ...opts, primaryNames: event.content.primaryNames });
    // Fill fields added since the doc was saved (design, music...) with their defaults; pages
    // saved with the retired plain look get the event's best design.
    const parsed = siteDocSchema.safeParse(event.site);
    return ensureDesign(parsed.success ? parsed.data : event.site, opts);
  }

  async planOf(eventId: string): Promise<{ tier: SiteTier; features: Set<Feature>; extraYears: number; premiumSince: Date | null }> {
    const ent = await this.entitlements.forEvent(eventId);
    // `site_extra_year` credits are never spent: each one bought is one more year.
    return { tier: siteTier(ent.features), features: ent.features, extraYears: ent.credits.site_extra_year ?? 0, premiumSince: ent.since.website_premium ?? null };
  }

  expiry(fns: FunctionRow[], tier: SiteTier, extraYears: number): Date | null {
    const last = fns.reduce<Date | null>((m, f) => {
      const end = f.endsAt ?? f.startsAt;
      return !m || end > m ? end : m;
    }, null);
    return siteExpiresAt(last, tier, extraYears);
  }

  /** Stateless unlock key for password sites; changing the password invalidates old keys. */
  unlockKey(event: EventRow): string | null {
    if (!event.sitePasswordHash) return null;
    return hmacSha256Hex(this.env.JWT_ACCESS_SECRET, `site:${event.id}:${event.sitePasswordHash}`).slice(0, 32);
  }

  async shortUrlOf(event: EventRow, guest?: GuestRow | null): Promise<string> {
    if (guest) {
      const code = (await this.links.guestCodes([guest])).get(guest.id);
      if (code) return this.links.url(code);
    }
    const alias = await this.links.aliasOf(event.id);
    return this.links.url(alias ?? (await this.links.eventCode(event.id, event.shortCode)));
  }

  /**
   * Builds the page payload. `owner` mode (builder preview) skips the plan filter and access
   * checks so the host can see every section before buying.
   */
  async build(
    event: EventRow,
    opts: { guest: GuestRow | null; owner?: boolean; doc?: SiteDoc; fns?: FunctionRow[]; plan?: Awaited<ReturnType<SitesService['planOf']>> },
  ): Promise<PublicSiteDto> {
    const { guest, owner = false } = opts;
    const [fns, template, plan] = await Promise.all([
      opts.fns ?? this.eventsService.functionsOf(event.id),
      this.templates.resolve(event.templateId),
      opts.plan ?? this.planOf(event.id),
    ]);
    const premium = plan.features.has('website_premium');
    const royale = plan.tier === 'royale';

    const full = opts.doc ?? this.docOf(event);
    const planned = owner ? full : applySiteTier(full, plan.tier);
    const group = guest?.groupLabel?.trim().toLowerCase() ?? null;
    // Guests invited to some functions only must not learn about the others (dress code, venue).
    const invited = (id: string | undefined) => !id || !guest?.functionIds || guest.functionIds.includes(id);
    // Save-the-date: guests see only the teaser until the family releases the full invitation.
    const teaser = event.settings.saveTheDate && !owner;
    const TEASER = new Set(['hero', 'countdown', 'welcome', 'closing']);
    const site: SiteDoc = {
      ...planned,
      sections: planned.sections
        .filter((s) => {
          if (s.hidden) return false;
          if (teaser && !TEASER.has(s.type)) return false;
          if (owner || !s.audience.length) return true;
          return group !== null && s.audience.some((a) => a.trim().toLowerCase() === group);
        })
        .map((s) => {
          if (s.type === 'dresscode') return { ...s, items: s.items.filter((d) => invited(d.functionId)) };
          if (s.type === 'venue' && !invited(s.functionId)) return { ...s, functionId: undefined };
          return s;
        }),
    };
    const has = (t: SiteDoc['sections'][number]['type']) => site.sections.some((s) => s.type === t);

    const s = event.settings;
    const sectionIds = sectionAssetIds(site);
    const ids = [...s.photoAssetIds, ...s.galleryAssetIds, ...(s.backgroundAssetId ? [s.backgroundAssetId] : []), ...sectionIds];
    const [urls, musicUrl, musicLibrary, coverUrl, videoUrl, updates, wishes, album, shortUrl, claimedWishes] = await Promise.all([
      this.media.urlsFor(ids),
      this.media.musicUrl(s.musicTrackId),
      premium || owner ? this.media.musicLibrary().then((l) => Object.fromEntries(l.items.map((t) => [t.id, t.url]))) : {},
      this.renders.coverUrl(event.id),
      this.latestVideoUrl(event.id),
      has('updates') ? this.listUpdates(event.id) : [],
      has('wishes') ? this.listWishes(event.id, false) : [],
      has('album') ? this.albumUrls(event.id) : [],
      this.shortUrlOf(event, guest),
      site.sections.some((x) => x.type === 'gifts' && x.wishlist.length) ? this.claimedWishes(event.id) : [],
    ]);
    const pick = (list: string[]) => list.map((id) => urls.get(id)).filter((u): u is string => Boolean(u));
    const showGallery = premium || owner;
    const travel = site.sections.find((x) => x.type === 'travel');

    return {
      event: {
        id: event.id,
        slug: event.slug,
        type: event.type,
        community: event.community ?? null,
        language: event.language,
        title: event.title,
        content: event.content,
        settings: {
          timezone: s.timezone,
          showCountdown: s.showCountdown,
          rsvpEnabled: s.rsvpEnabled,
          rsvpDeadline: s.rsvpDeadline,
          askMealPreference: s.askMealPreference,
          askAccommodation: s.askAccommodation,
          saveTheDate: teaser,
          qr: event.settings.qr,
        },
      },
      template: { id: template.id, layout: template.layout, theme: template.theme },
      functions: fns.map(fromFunctionRow).filter((f) => !guest?.functionIds || guest.functionIds.includes(f.id)),
      media: {
        photos: pick(s.photoAssetIds),
        gallery: showGallery ? pick(s.galleryAssetIds) : [],
        backgroundUrl: s.backgroundAssetId ? (urls.get(s.backgroundAssetId) ?? null) : null,
        musicUrl: premium || owner ? musicUrl : null,
        musicLibrary,
        coverUrl,
        videoUrl,
        assets: Object.fromEntries(sectionIds.map((id) => [id, urls.get(id)]).filter((e): e is [string, string] => Boolean(e[1]))),
      },
      guest: guest
        ? {
            name: guest.name,
            salutation: guest.salutation,
            functionIds: guest.functionIds,
            maxPax: guest.maxPax,
            groupLabel: guest.groupLabel,
            stay: (royale || owner) && travel?.type === 'travel' && travel.showGuestStay ? (guest.stay ?? null) : null,
          }
        : null,
      features: { rsvp: (plan.features.has('rsvp') || owner) && s.rsvpEnabled && !teaser, branding: siteBranding(plan.tier, plan.premiumSince), gifts: has('gifts') },
      site,
      tier: plan.tier,
      shortUrl,
      updates,
      wishes,
      album,
      claimedWishes,
      expiresAt: this.expiry(fns, plan.tier, plan.extraYears)?.toISOString() ?? null,
    };
  }

  // ---------------- public ----------------

  private async publishedBySlug(slug: string): Promise<EventRow> {
    const [event] = await this.db.select().from(events).where(eq(events.slug, slug));
    if (!event || event.status !== 'published' || event.suspendedAt) throw new NotFoundException('Invitation not found');
    return event;
  }

  /** Published, not expired, and the plan allows the section type. */
  private async liveSite(slug: string, guestToken?: string) {
    const event = await this.publishedBySlug(slug);
    // The guest (personal links) loads in the same batch: one round trip fewer per open.
    const [fns, plan, guest] = await Promise.all([this.eventsService.functionsOf(event.id), this.planOf(event.id), this.guestByToken(event.id, guestToken)]);
    const expires = this.expiry(fns, plan.tier, plan.extraYears);
    if (expires && expires < new Date()) throw new GoneException('This invitation website is no longer online');
    const doc = applySiteTier(this.docOf(event), plan.tier);
    return { event, plan, doc, fns, guest };
  }

  /** Private sites (password / guests only) open for a personal guest link or a valid unlock key. */
  private canOpen(event: EventRow, doc: SiteDoc, guest: GuestRow | null, key?: string): boolean {
    if (guest || doc.access.mode === 'link') return true;
    const expected = this.unlockKey(event);
    return doc.access.mode === 'password' && Boolean(expected && key && safeEqual(key, expected));
  }

  /**
   * A live site the caller is allowed to see. Every public side endpoint (updates, wishes, album,
   * RSVP, UPI QR, calendar) goes through this, so a private site never leaks venues or content.
   */
  private async openSite(slug: string, access: SiteAccess = {}) {
    const live = await this.liveSite(slug, access.guestToken);
    if (!this.canOpen(live.event, live.doc, live.guest, access.key)) throw new ForbiddenException('This invitation is private');
    return live;
  }

  private async guestByToken(eventId: string, token?: string) {
    if (!token) return null;
    const [guest] = await this.db.select().from(guests).where(and(eq(guests.token, token), eq(guests.eventId, eventId)));
    return guest ?? null;
  }

  /** Built open pages (no guest link, no key), cached briefly: the hottest public read on wedding days. */
  static cacheKey(slug: string) {
    return `site:v1:${slug}`;
  }

  async forgetSite(slug: string) {
    await this.redis.del(SitesService.cacheKey(slug)).catch(() => undefined);
  }

  /**
   * `visitor` is the browser's first-party id (cookie set by the view call), so the first people
   * of a free website keep the full page after its visitor limit.
   */
  async getSite(slug: string, guestToken?: string, key?: string, visitor?: string): Promise<PublicSiteResponse> {
    const anonymous = !guestToken && !key;
    let built: PublicSiteResponse | null = null;
    if (anonymous) {
      const hit = await this.redis.get(SitesService.cacheKey(slug)).catch(() => null);
      if (hit) built = JSON.parse(hit) as PublicSiteResponse;
    }
    if (!built) {
      built = await this.buildSite(slug, guestToken, key);
      // Only open pages are shared; locked screens and private modes are never cached here.
      if (anonymous && !('locked' in built) && built.site.access.mode === 'link') {
        await this.redis.set(SitesService.cacheKey(slug), JSON.stringify(built), 'EX', 30).catch(() => undefined);
      }
    }
    if ('locked' in built || built.tier !== 'free') return built;
    return (await this.overVisitorLimit(built.event.id, guestToken ? `g:${guestToken}` : visitor ? `b:${visitor}` : null)) ? capSite(built) : built;
  }

  /**
   * Free website past its limit, for this visitor: true unless they were among the first
   * FREE_PLAN.siteVisitors people. One small read, and only for free sites.
   */
  private async overVisitorLimit(eventId: string, visitorId: string | null): Promise<boolean> {
    const [row] = await this.db
      .select({
        count: events.visitorCount,
        n: visitorId
          ? sql<number | null>`(select ${siteVisitors.n} from ${siteVisitors} where ${siteVisitors.eventId} = ${events.id} and ${siteVisitors.visitorId} = ${visitorId})`
          : sql<number | null>`null`,
      })
      .from(events)
      .where(eq(events.id, eventId));
    if (!row || row.count < FREE_PLAN.siteVisitors) return false;
    return row.n === null || Number(row.n) > FREE_PLAN.siteVisitors;
  }

  /**
   * Counts one person (once ever) per website. Personal links count by guest; everyone else by
   * the browser id. The family's own previews never count. Emails the owner of a free site as
   * it nears and reaches the limit.
   */
  private async countVisitor(event: EventRow, visitorId: string, userId?: string): Promise<void> {
    if (userId && (userId === event.userId || (await this.isMember(event.id, userId)))) return;
    // Bumps the counter only for a new person and records their arrival order, in one statement.
    const { rows } = await this.db.execute<{ n: number }>(sql`
      with bump as (
        update events set visitor_count = visitor_count + 1
        where id = ${event.id}
          and not exists (select 1 from site_visitors where event_id = ${event.id} and visitor_id = ${visitorId})
        returning visitor_count
      )
      insert into site_visitors (event_id, visitor_id, n)
      select ${event.id}, ${visitorId}, visitor_count from bump
      on conflict do nothing
      returning n`);
    const n = Number(rows[0]?.n ?? 0);
    if (n !== FREE_PLAN.siteVisitorsWarnAt && n !== FREE_PLAN.siteVisitors) return;
    const plan = await this.planOf(event.id);
    if (plan.tier !== 'free') return;
    const reached = n === FREE_PLAN.siteVisitors;
    await this.mail.toUser(
      event.userId,
      'site.visitor_limit',
      (u) => ({ name: u.name, eventTitle: event.title, eventId: event.id, visitors: n, limit: FREE_PLAN.siteVisitors, reached }),
      { key: `${event.id}-${reached ? 'reached' : 'warn'}` },
    );
  }

  private async isMember(eventId: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: eventMembers.id })
      .from(eventMembers)
      .where(and(eq(eventMembers.eventId, eventId), eq(eventMembers.userId, userId)))
      .limit(1);
    return Boolean(row);
  }

  private async buildSite(slug: string, guestToken?: string, key?: string): Promise<PublicSiteResponse> {
    const { event, doc, fns, plan, guest } = await this.liveSite(slug, guestToken);

    // Personal links always open; otherwise private modes need a guest link or the password.
    if (!this.canOpen(event, doc, guest, key)) {
      const locked: LockedSiteDto = {
        locked: doc.access.mode === 'password' && this.unlockKey(event) ? 'password' : 'guests',
        title: event.title,
        coverUrl: await this.renders.coverUrl(event.id),
        language: event.language,
      };
      return locked;
    }
    return this.build(event, { guest, fns, plan });
  }

  /**
   * Password unlock. Besides the per-IP route limit, wrong guesses are capped per site, so a
   * brute force can't get around the limit by rotating (or spoofing) IP addresses.
   */
  async unlock(slug: string, password: string): Promise<{ key: string }> {
    const event = await this.publishedBySlug(slug);
    const failKey = `site:unlock-fail:${event.id}`;
    if (Number((await this.redis.get(failKey)) ?? 0) >= MAX_UNLOCK_FAILS_PER_HOUR) {
      throw new HttpException('Too many wrong passwords for this invitation. Please try again in an hour.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!event.sitePasswordHash || !(await verifyPassword(password, event.sitePasswordHash))) {
      await bumpCounter(this.redis, failKey, 3600);
      throw new UnauthorizedException('That password is not right');
    }
    return { key: this.unlockKey(event)! };
  }

  private async latestVideoUrl(eventId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ outputs: renders.outputs })
      .from(renders)
      .where(and(eq(renders.eventId, eventId), eq(renders.format, 'video'), eq(renders.status, 'completed')))
      .orderBy(desc(renders.createdAt))
      .limit(1);
    const out = row?.outputs[0];
    return out ? this.storage.publicUrl(out.key) : null;
  }

  async listUpdates(eventId: string) {
    const rows = await this.db
      .select()
      .from(siteUpdates)
      .where(eq(siteUpdates.eventId, eventId))
      .orderBy(desc(siteUpdates.pinned), desc(siteUpdates.createdAt))
      .limit(50);
    return rows.map((r) => ({ id: r.id, text: r.text, pinned: r.pinned, createdAt: r.createdAt.toISOString() }));
  }

  async listWishes(eventId: string, includeHidden: boolean) {
    const rows = await this.db
      .select()
      .from(siteWishes)
      .where(includeHidden ? eq(siteWishes.eventId, eventId) : and(eq(siteWishes.eventId, eventId), eq(siteWishes.hidden, false)))
      .orderBy(desc(siteWishes.createdAt))
      .limit(includeHidden ? 500 : 100);
    return rows.map((r) => ({ id: r.id, name: r.name, message: r.message, createdAt: r.createdAt.toISOString(), hidden: r.hidden }));
  }

  /** Guest photo-wall uploads; `approved` keeps only the ones the family approved (older uploads had no approval step). */
  private albumWhere(eventId: string, approvedOnly = false) {
    return and(
      eq(mediaAssets.eventId, eventId),
      eq(mediaAssets.ready, true),
      sql`${mediaAssets.meta}->>'source' = ${ALBUM_SOURCE}`,
      approvedOnly ? sql`coalesce(${mediaAssets.meta}->>'approved', 'true') = 'true'` : undefined,
    );
  }

  private async albumUrls(eventId: string): Promise<string[]> {
    const rows = await this.db
      .select({ key: mediaAssets.storageKey })
      .from(mediaAssets)
      .where(this.albumWhere(eventId, true))
      .orderBy(desc(mediaAssets.createdAt))
      .limit(200);
    return rows.map((r) => this.storage.publicUrl(r.key));
  }

  async albumOf(eventId: string) {
    const rows = await this.db.select().from(mediaAssets).where(this.albumWhere(eventId)).orderBy(desc(mediaAssets.createdAt)).limit(ALBUM_LIMIT);
    return rows.map((r) => ({ ...this.media.toDto(r), uploader: String(r.meta.uploader ?? ''), approved: r.meta.approved !== false }));
  }

  /** Live updates poll (cheap, no full page rebuild). */
  async getUpdates(slug: string, access?: SiteAccess) {
    const { event, doc } = await this.openSite(slug, access);
    if (!doc.sections.some((s) => s.type === 'updates' && !s.hidden)) return { items: [] };
    return { items: await this.listUpdates(event.id) };
  }

  async addWish(slug: string, input: WishInput) {
    const { event, doc, guest } = await this.openSite(slug, input);
    if (!doc.sections.some((s) => s.type === 'wishes' && !s.hidden)) throw new ForbiddenException('Wishes are not open on this invitation');
    const [row] = await this.db
      .insert(siteWishes)
      .values({ eventId: event.id, guestId: guest?.id ?? null, name: input.name, message: input.message })
      .returning();
    await this.forgetSite(event.slug);
    return { id: row!.id, name: row!.name, message: row!.message, createdAt: row!.createdAt.toISOString() };
  }

  /** Guest album step 1: presigned upload, stored under the host's account. */
  async albumUpload(slug: string, input: AlbumUploadInput) {
    const { event, doc, guest } = await this.openSite(slug, input);
    if (!doc.sections.some((s) => s.type === 'album' && !s.hidden)) throw new ForbiddenException('The guest album is not open');
    // Unfinished uploads from the last hour count too, so presigned slots cannot pile up unbounded.
    const [n] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.eventId, event.id),
          sql`${mediaAssets.meta}->>'source' = ${ALBUM_SOURCE}`,
          sql`(${mediaAssets.ready} or ${mediaAssets.createdAt} > now() - interval '1 hour')`,
        ),
      );
    if ((n?.n ?? 0) >= ALBUM_LIMIT) throw new ForbiddenException('The album is full');
    const id = randomUUID();
    const ext = input.contentType === 'image/png' ? 'png' : input.contentType === 'image/webp' ? 'webp' : 'jpg';
    const key = `u/${event.userId}/album/${event.id}/${id}.${ext}`;
    await this.db.insert(mediaAssets).values({
      id,
      userId: event.userId,
      eventId: event.id,
      kind: 'photo',
      storageKey: key,
      contentType: input.contentType,
      bytes: input.bytes,
      // Waits for the family's approval before it shows on the photo wall.
      meta: { source: ALBUM_SOURCE, uploader: input.name, guestId: guest?.id ?? null, approved: false },
    });
    return { assetId: id, ...(await presignUpload(this.storage, this.env, key, input.contentType, input.bytes)) };
  }

  /** Guest album step 2: confirm the object exists; it shows once the family approves it. */
  async albumComplete(slug: string, assetId: string) {
    const event = await this.publishedBySlug(slug);
    const [asset] = await this.db.select().from(mediaAssets).where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.eventId, event.id)));
    if (!asset || asset.meta.source !== ALBUM_SOURCE) throw new NotFoundException('Upload not found');
    const head = await this.storage.head(asset.storageKey);
    if (!head) throw new BadRequestException('Upload not found, please try again');
    if (asset.bytes && head.bytes > asset.bytes) throw new BadRequestException('Uploaded file is larger than declared');
    await this.db.update(mediaAssets).set({ ready: true, bytes: head.bytes }).where(eq(mediaAssets.id, assetId));
    return { url: this.storage.publicUrl(asset.storageKey), pending: asset.meta.approved === false };
  }

  /** A guest tells the family what shagun they sent (self-reported; money never passes through us). */
  async submitGift(slug: string, input: SubmitGiftInput) {
    const { event, doc, guest } = await this.openSite(slug, input);
    if (!doc.sections.some((x) => x.type === 'gifts' && !x.hidden)) throw new ForbiddenException('Gifts are not open on this invitation');
    await this.db.insert(siteGifts).values({
      eventId: event.id,
      guestId: guest?.id ?? null,
      name: input.name,
      phone: input.phone ?? guest?.phone ?? null,
      amountPaise: input.amount ? input.amount * 100 : null,
      method: input.method,
      note: input.note ?? null,
      source: 'guest',
    });
    return { ok: true };
  }

  /** Ids of wishlist items a guest has reserved. */
  private async claimedWishes(eventId: string): Promise<string[]> {
    const rows = await this.db
      .select({ wishId: siteGifts.wishId })
      .from(siteGifts)
      .where(and(eq(siteGifts.eventId, eventId), sql`${siteGifts.wishId} IS NOT NULL`));
    return rows.map((r) => r.wishId!).filter(Boolean);
  }

  /**
   * A guest reserves a wishlist item. It lands in the family's gift list (method `gift`) so
   * the thank-you tracker covers it too. The unique index makes double booking impossible.
   */
  async claimWish(slug: string, wishId: string, input: ClaimWishInput) {
    const { event, doc, guest } = await this.openSite(slug, input);
    const gifts = doc.sections.find((x) => x.type === 'gifts' && !x.hidden);
    const item = gifts?.type === 'gifts' ? gifts.wishlist.find((w) => w.id === wishId) : undefined;
    if (!item) throw new NotFoundException('This gift is no longer on the list');
    const rows = await this.db
      .insert(siteGifts)
      .values({ eventId: event.id, guestId: guest?.id ?? null, name: input.name, phone: input.phone ?? guest?.phone ?? null, method: 'gift', note: item.title, source: 'guest', wishId })
      .onConflictDoNothing()
      .returning({ id: siteGifts.id });
    if (!rows.length) throw new ConflictException('Someone has already picked this gift. Please choose another.');
    await this.forgetSite(event.slug);
    return { ok: true };
  }

  /** The guest's entry pass: a QR of their personal link, scanned at the gate (check-in). */
  async passQr(slug: string, guestToken?: string): Promise<string> {
    const { event, guest } = await this.openSite(slug, { guestToken });
    if (!guest) throw new NotFoundException('Passes are for personal invitation links');
    return QRCode.toString(`${this.env.APP_URL}/i/${event.slug}?g=${guest.token}`, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  }

  /** Shagun QR: a standard UPI pay link for the host's own UPI id (we never touch the money). */
  async upiQr(slug: string, access?: SiteAccess): Promise<string> {
    const { event, doc } = await this.openSite(slug, access);
    const gifts = doc.sections.find((s) => s.type === 'gifts' && !s.hidden);
    if (!gifts || gifts.type !== 'gifts' || !gifts.upiId) throw new NotFoundException('No UPI id on this invitation');
    const payee = gifts.payeeName || event.title;
    const link = `upi://pay?pa=${encodeURIComponent(gifts.upiId)}&pn=${encodeURIComponent(payee)}&cu=INR&tn=Shagun`;
    return QRCode.toString(link, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  }

  /** Counts a view at most once per IP per hour per event/guest to keep numbers honest. */
  async trackView(
    slug: string,
    ip: string,
    guestToken?: string,
    userAgent?: string,
    who: { visitor?: string; userId?: string } = {},
  ): Promise<{ ok: true; eventId: string }> {
    const event = await this.publishedBySlug(slug);
    // Unique people first: friends on one wedding Wi-Fi share an IP, so this can't wait for the IP dedupe below.
    const visitorId = guestToken ? `g:${guestToken}` : who.visitor ? `b:${who.visitor}` : null;
    if (visitorId) await this.countVisitor(event, visitorId, who.userId).catch(() => undefined);
    const dedupeKey = `view:${event.id}:${guestToken ?? '-'}:${ip}`;
    if (!(await this.redis.set(dedupeKey, '1', 'EX', 3600, 'NX'))) return { ok: true, eventId: event.id };

    // Guest-side numbers per day (India time): opens, personal-link opens, from WhatsApp, on phones.
    const ua = userAgent ?? '';
    const whatsapp = /WhatsApp/i.test(ua) ? 1 : 0;
    const mobile = /mobi|iphone|android/i.test(ua) ? 1 : 0;
    void this.db
      .insert(invitationDaily)
      .values({ eventId: event.id, day: sql`(now() at time zone 'Asia/Kolkata')::date`, views: 1, guestViews: guestToken ? 1 : 0, whatsappViews: whatsapp, mobileViews: mobile })
      .onConflictDoUpdate({
        target: [invitationDaily.eventId, invitationDaily.day],
        set: {
          views: sql`${invitationDaily.views} + 1`,
          guestViews: sql`${invitationDaily.guestViews} + excluded.guest_views`,
          whatsappViews: sql`${invitationDaily.whatsappViews} + excluded.whatsapp_views`,
          mobileViews: sql`${invitationDaily.mobileViews} + excluded.mobile_views`,
        },
      })
      .catch(() => undefined);

    await this.db.update(events).set({ viewCount: sql`${events.viewCount} + 1` }).where(eq(events.id, event.id));
    if (guestToken) {
      await this.db
        .update(guests)
        .set({
          viewCount: sql`${guests.viewCount} + 1`,
          firstViewedAt: sql`COALESCE(${guests.firstViewedAt}, now())`,
          lastViewedAt: new Date(),
        })
        .where(and(eq(guests.token, guestToken), eq(guests.eventId, event.id)));
    }
    return { ok: true, eventId: event.id };
  }

  async submitRsvp(slug: string, input: SubmitRsvpInput) {
    const { event, plan, fns: valid, guest } = await this.openSite(slug, input);
    if (!event.settings.rsvpEnabled || !plan.features.has('rsvp')) {
      throw new ForbiddenException('RSVP is not enabled for this invitation');
    }
    if (event.settings.rsvpDeadline && new Date(event.settings.rsvpDeadline) < new Date()) {
      throw new BadRequestException('The RSVP deadline has passed');
    }
    if (!guest && !input.phone) throw new BadRequestException('Please enter your mobile number');

    const fnIds = input.responses.map((r) => r.functionId);
    const allowed = new Set(valid.filter((f) => !guest?.functionIds || guest.functionIds.includes(f.id)).map((f) => f.id));
    if (fnIds.some((id) => !allowed.has(id))) throw new BadRequestException('Invalid function');
    const maxPax = guest?.maxPax ?? 10;
    if (input.responses.some((r) => r.headcount > maxPax)) throw new BadRequestException(`At most ${maxPax} guests per invitation`);

    await this.db.transaction(async (tx) => {
      // Replace previous answers from the same guest (or same phone for anonymous RSVPs).
      if (guest) {
        await tx.delete(rsvps).where(and(eq(rsvps.guestId, guest.id), inArray(rsvps.functionId, fnIds)));
      } else {
        // Anonymous answers are keyed by phone, but only the same person may change them: a
        // matching name is required, and answers made from a personal link are never touched here.
        const mine = and(eq(rsvps.eventId, event.id), eq(rsvps.phone, input.phone!), isNull(rsvps.guestId), inArray(rsvps.functionId, fnIds));
        const earlier = await tx.select({ name: rsvps.name }).from(rsvps).where(mine);
        const norm = (v: string) => v.trim().toLowerCase();
        if (earlier.some((r) => norm(r.name) !== norm(input.name))) {
          throw new ConflictException('This number already replied under another name. Use your personal invite link to change it.');
        }
        await tx.delete(rsvps).where(mine);
      }
      await tx.insert(rsvps).values(
        input.responses.map((r) => ({
          eventId: event.id,
          functionId: r.functionId,
          guestId: guest?.id ?? null,
          name: input.name,
          phone: input.phone ?? guest?.phone ?? null,
          status: r.status,
          headcount: r.status === 'no' ? 0 : r.headcount,
          mealPreference: input.mealPreference,
          needsAccommodation: input.needsAccommodation,
          note: input.note,
        })),
      );
    });
    return { ok: true };
  }

  async calendar(slug: string, functionId?: string, access?: SiteAccess): Promise<string> {
    const { event, fns: all, guest } = await this.openSite(slug, access);
    const fns = all.filter((f) => (!functionId || f.id === functionId) && (!guest?.functionIds || guest.functionIds.includes(f.id)));
    const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const esc = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${BRAND.name}//Invite//EN`, 'CALSCALE:GREGORIAN'];
    for (const f of fns) {
      const end = f.endsAt ?? new Date(f.startsAt.getTime() + 3 * 3600_000);
      lines.push(
        'BEGIN:VEVENT',
        `UID:${f.id}@cardai`,
        `DTSTAMP:${stamp(new Date())}`,
        `DTSTART:${stamp(f.startsAt)}`,
        `DTEND:${stamp(end)}`,
        `SUMMARY:${esc(`${f.name} — ${event.title}`)}`,
        `LOCATION:${esc([f.venueName, f.venueAddress].filter(Boolean).join(', '))}`,
        'END:VEVENT',
      );
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
}

/** The basics of a free website past its visitor limit: who, when and where, nothing else. */
export function capSite(site: PublicSiteDto): PublicSiteDto {
  return {
    ...site,
    capped: true,
    site: { ...site.site, sections: site.site.sections.filter((x) => CAPPED_SITE_SECTIONS.has(x.type)) },
    media: { ...site.media, gallery: [], videoUrl: null, musicUrl: null },
    features: { ...site.features, rsvp: false, gifts: false },
    updates: [],
    wishes: [],
    album: [],
  };
}
