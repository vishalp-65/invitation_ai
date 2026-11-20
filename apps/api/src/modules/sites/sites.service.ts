import {
  and,
  desc,
  eq,
  events,
  guests,
  inArray,
  invitationDaily,
  mediaAssets,
  renders,
  rsvps,
  siteUpdates,
  siteWishes,
  sql,
  type Database,
} from '@cardai/db';
import {
  applySiteTier,
  BRAND,
  defaultSiteDoc,
  siteDocSchema,
  siteExpiresAt,
  siteTier,
  type AlbumUploadInput,
  type Feature,
  type LockedSiteDto,
  type PublicSiteDto,
  type PublicSiteResponse,
  type SiteDoc,
  type SiteTier,
  type SubmitRsvpInput,
  type WishInput,
} from '@cardai/shared';
import { BadRequestException, ForbiddenException, GoneException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import { hmacSha256Hex, safeEqual, verifyPassword } from '../../common/crypto.js';
import { ENV, type Env } from '../../config/env.js';
import { DB, REDIS, STORAGE, type Redis, type S3Storage } from '../../infra/infra.module.js';
import { EntitlementsService } from '../entitlements/entitlements.service.js';
import { EventsService, fromFunctionRow, type FunctionRow } from '../events/events.service.js';
import { MediaService } from '../media/media.service.js';
import { RendersService } from '../renders/renders.service.js';
import { ShortLinksService } from '../short-links/short-links.service.js';
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
  }
  if (doc.music?.assetId) ids.push(doc.music.assetId);
  return ids;
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
  ) {}

  // ---------------- helpers shared with the builder ----------------

  docOf(event: EventRow): SiteDoc {
    if (!event.site) return defaultSiteDoc({ eventType: event.type, community: event.community, primaryNames: event.content.primaryNames });
    // Fill fields added since the doc was saved (design, music...) with their defaults.
    const parsed = siteDocSchema.safeParse(event.site);
    return parsed.success ? parsed.data : event.site;
  }

  async planOf(eventId: string): Promise<{ tier: SiteTier; features: Set<Feature>; extraYears: number }> {
    const ent = await this.entitlements.forEvent(eventId);
    // `site_extra_year` credits are never spent: each one bought is one more year.
    return { tier: siteTier(ent.features), features: ent.features, extraYears: ent.credits.site_extra_year ?? 0 };
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
  async build(event: EventRow, opts: { guest: GuestRow | null; owner?: boolean; doc?: SiteDoc }): Promise<PublicSiteDto> {
    const { guest, owner = false } = opts;
    const [fns, template, plan] = await Promise.all([
      this.eventsService.functionsOf(event.id),
      this.templates.resolve(event.templateId),
      this.planOf(event.id),
    ]);
    const premium = plan.features.has('website_premium');
    const royale = plan.tier === 'royale';

    const full = opts.doc ?? this.docOf(event);
    const planned = owner ? full : applySiteTier(full, plan.tier);
    const group = guest?.groupLabel?.trim().toLowerCase() ?? null;
    // Guests invited to some functions only must not learn about the others (dress code, venue).
    const invited = (id: string | undefined) => !id || !guest?.functionIds || guest.functionIds.includes(id);
    const site: SiteDoc = {
      ...planned,
      sections: planned.sections
        .filter((s) => {
          if (s.hidden) return false;
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
    const [urls, musicUrl, musicLibrary, coverUrl, videoUrl, updates, wishes, album, shortUrl] = await Promise.all([
      this.media.urlsFor(ids),
      this.media.musicUrl(s.musicTrackId),
      premium || owner ? this.media.musicLibrary().then((l) => Object.fromEntries(l.items.map((t) => [t.id, t.url]))) : {},
      this.renders.coverUrl(event.id),
      this.latestVideoUrl(event.id),
      has('updates') ? this.listUpdates(event.id) : [],
      has('wishes') ? this.listWishes(event.id, false) : [],
      has('album') ? this.albumUrls(event.id) : [],
      this.shortUrlOf(event, guest),
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
      features: { rsvp: (plan.features.has('rsvp') || owner) && s.rsvpEnabled, showBranding: !premium },
      site,
      tier: plan.tier,
      shortUrl,
      updates,
      wishes,
      album,
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
  private async liveSite(slug: string) {
    const event = await this.publishedBySlug(slug);
    const [fns, plan] = await Promise.all([this.eventsService.functionsOf(event.id), this.planOf(event.id)]);
    const expires = this.expiry(fns, plan.tier, plan.extraYears);
    if (expires && expires < new Date()) throw new GoneException('This invitation website is no longer online');
    const doc = applySiteTier(this.docOf(event), plan.tier);
    return { event, plan, doc };
  }

  private async guestByToken(eventId: string, token?: string) {
    if (!token) return null;
    const [guest] = await this.db.select().from(guests).where(and(eq(guests.token, token), eq(guests.eventId, eventId)));
    return guest ?? null;
  }

  async getSite(slug: string, guestToken?: string, key?: string): Promise<PublicSiteResponse> {
    const { event, doc } = await this.liveSite(slug);
    const guest = await this.guestByToken(event.id, guestToken);

    // Personal links always open; otherwise private modes need a guest link or the password.
    if (!guest && doc.access.mode !== 'link') {
      const expected = this.unlockKey(event);
      const unlocked = doc.access.mode === 'password' && expected && key && safeEqual(key, expected);
      if (!unlocked) {
        const locked: LockedSiteDto = {
          locked: doc.access.mode === 'password' && expected ? 'password' : 'guests',
          title: event.title,
          coverUrl: await this.renders.coverUrl(event.id),
          language: event.language,
        };
        return locked;
      }
    }
    return this.build(event, { guest });
  }

  async unlock(slug: string, password: string): Promise<{ key: string }> {
    const event = await this.publishedBySlug(slug);
    if (!event.sitePasswordHash || !verifyPassword(password, event.sitePasswordHash)) {
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

  private albumWhere(eventId: string) {
    return and(eq(mediaAssets.eventId, eventId), eq(mediaAssets.ready, true), sql`${mediaAssets.meta}->>'source' = ${ALBUM_SOURCE}`);
  }

  private async albumUrls(eventId: string): Promise<string[]> {
    const rows = await this.db
      .select({ key: mediaAssets.storageKey })
      .from(mediaAssets)
      .where(this.albumWhere(eventId))
      .orderBy(desc(mediaAssets.createdAt))
      .limit(200);
    return rows.map((r) => this.storage.publicUrl(r.key));
  }

  async albumOf(eventId: string) {
    const rows = await this.db.select().from(mediaAssets).where(this.albumWhere(eventId)).orderBy(desc(mediaAssets.createdAt)).limit(ALBUM_LIMIT);
    return rows.map((r) => ({ ...this.media.toDto(r), uploader: String(r.meta.uploader ?? '') }));
  }

  /** Live updates poll (cheap, no full page rebuild). */
  async getUpdates(slug: string) {
    const { event, doc } = await this.liveSite(slug);
    if (!doc.sections.some((s) => s.type === 'updates' && !s.hidden)) return { items: [] };
    return { items: await this.listUpdates(event.id) };
  }

  async addWish(slug: string, input: WishInput) {
    const { event, doc } = await this.liveSite(slug);
    if (!doc.sections.some((s) => s.type === 'wishes' && !s.hidden)) throw new ForbiddenException('Wishes are not open on this invitation');
    const guest = await this.guestByToken(event.id, input.guestToken);
    const [row] = await this.db
      .insert(siteWishes)
      .values({ eventId: event.id, guestId: guest?.id ?? null, name: input.name, message: input.message })
      .returning();
    return { id: row!.id, name: row!.name, message: row!.message, createdAt: row!.createdAt.toISOString() };
  }

  /** Guest album step 1: presigned upload, stored under the host's account. */
  async albumUpload(slug: string, input: AlbumUploadInput) {
    const { event, doc } = await this.liveSite(slug);
    if (!doc.sections.some((s) => s.type === 'album' && !s.hidden)) throw new ForbiddenException('The guest album is not open');
    const [n] = await this.db.select({ n: sql<number>`count(*)::int` }).from(mediaAssets).where(this.albumWhere(event.id));
    if ((n?.n ?? 0) >= ALBUM_LIMIT) throw new ForbiddenException('The album is full');
    const guest = await this.guestByToken(event.id, input.guestToken);
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
      meta: { source: ALBUM_SOURCE, uploader: input.name, guestId: guest?.id ?? null },
    });
    const uploadUrl = await this.storage.presignPut(key, input.contentType, input.bytes);
    return { assetId: id, uploadUrl, headers: this.storage.uploadHeaders(input.contentType) };
  }

  /** Guest album step 2: confirm the object exists, then show it. */
  async albumComplete(slug: string, assetId: string) {
    const event = await this.publishedBySlug(slug);
    const [asset] = await this.db.select().from(mediaAssets).where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.eventId, event.id)));
    if (!asset || asset.meta.source !== ALBUM_SOURCE) throw new NotFoundException('Upload not found');
    const head = await this.storage.head(asset.storageKey);
    if (!head) throw new BadRequestException('Upload not found, please try again');
    if (asset.bytes && head.bytes > asset.bytes) throw new BadRequestException('Uploaded file is larger than declared');
    await this.db.update(mediaAssets).set({ ready: true, bytes: head.bytes }).where(eq(mediaAssets.id, assetId));
    return { url: this.storage.publicUrl(asset.storageKey) };
  }

  /** Shagun QR: a standard UPI pay link for the host's own UPI id (we never touch the money). */
  async upiQr(slug: string): Promise<string> {
    const { event, doc } = await this.liveSite(slug);
    const gifts = doc.sections.find((s) => s.type === 'gifts' && !s.hidden);
    if (!gifts || gifts.type !== 'gifts' || !gifts.upiId) throw new NotFoundException('No UPI id on this invitation');
    const payee = gifts.payeeName || event.title;
    const link = `upi://pay?pa=${encodeURIComponent(gifts.upiId)}&pn=${encodeURIComponent(payee)}&cu=INR&tn=Shagun`;
    return QRCode.toString(link, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  }

  /** Counts a view at most once per IP per hour per event/guest to keep numbers honest. */
  async trackView(slug: string, ip: string, guestToken?: string, userAgent?: string): Promise<{ ok: true; eventId: string }> {
    const event = await this.publishedBySlug(slug);
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
    const event = await this.publishedBySlug(slug);
    if (!event.settings.rsvpEnabled || !(await this.entitlements.has(event.id, 'rsvp'))) {
      throw new ForbiddenException('RSVP is not enabled for this invitation');
    }
    if (event.settings.rsvpDeadline && new Date(event.settings.rsvpDeadline) < new Date()) {
      throw new BadRequestException('The RSVP deadline has passed');
    }
    const guest = await this.guestByToken(event.id, input.guestToken);
    if (!guest && !input.phone) throw new BadRequestException('Please enter your mobile number');

    const fnIds = input.responses.map((r) => r.functionId);
    const valid = await this.eventsService.functionsOf(event.id);
    const allowed = new Set(valid.filter((f) => !guest?.functionIds || guest.functionIds.includes(f.id)).map((f) => f.id));
    if (fnIds.some((id) => !allowed.has(id))) throw new BadRequestException('Invalid function');
    const maxPax = guest?.maxPax ?? 10;
    if (input.responses.some((r) => r.headcount > maxPax)) throw new BadRequestException(`At most ${maxPax} guests per invitation`);

    await this.db.transaction(async (tx) => {
      // Replace previous answers from the same guest (or same phone for anonymous RSVPs).
      if (guest) {
        await tx.delete(rsvps).where(and(eq(rsvps.guestId, guest.id), inArray(rsvps.functionId, fnIds)));
      } else {
        await tx.delete(rsvps).where(and(eq(rsvps.eventId, event.id), eq(rsvps.phone, input.phone!), inArray(rsvps.functionId, fnIds)));
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

  async calendar(slug: string, functionId?: string): Promise<string> {
    const event = await this.publishedBySlug(slug);
    const fns = (await this.eventsService.functionsOf(event.id)).filter((f) => !functionId || f.id === functionId);
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
