import { and, desc, eq, events, guests, inArray, renders, rsvps, sql, type Database } from '@cardai/db';
import { BRAND, type PublicSiteDto, type SubmitRsvpInput } from '@cardai/shared';
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DB, REDIS, STORAGE, type Redis, type S3Storage } from '../../infra/infra.module.js';
import { EntitlementsService } from '../entitlements/entitlements.service.js';
import { EventsService, fromFunctionRow } from '../events/events.service.js';
import { MediaService } from '../media/media.service.js';
import { RendersService } from '../renders/renders.service.js';
import { TemplatesService } from '../templates/templates.service.js';

type EventRow = typeof events.$inferSelect;

/** Public, unauthenticated surface: the invitation website, RSVP and view tracking. */
@Injectable()
export class SitesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(STORAGE) private readonly storage: S3Storage,
    private readonly eventsService: EventsService,
    private readonly templates: TemplatesService,
    private readonly media: MediaService,
    private readonly renders: RendersService,
    private readonly entitlements: EntitlementsService,
  ) {}

  private async publishedBySlug(slug: string): Promise<EventRow> {
    const [event] = await this.db.select().from(events).where(eq(events.slug, slug));
    if (!event || event.status !== 'published') throw new NotFoundException('Invitation not found');
    return event;
  }

  private async guestByToken(eventId: string, token?: string) {
    if (!token) return null;
    const [guest] = await this.db.select().from(guests).where(and(eq(guests.token, token), eq(guests.eventId, eventId)));
    return guest ?? null;
  }

  async getSite(slug: string, guestToken?: string): Promise<PublicSiteDto> {
    const event = await this.publishedBySlug(slug);
    const [fns, template, ent, guest] = await Promise.all([
      this.eventsService.functionsOf(event.id),
      this.templates.resolve(event.templateId),
      this.entitlements.forEvent(event.id),
      this.guestByToken(event.id, guestToken),
    ]);
    const s = event.settings;
    const ids = [...s.photoAssetIds, ...s.galleryAssetIds, ...(s.backgroundAssetId ? [s.backgroundAssetId] : [])];
    const [urls, musicUrl, coverUrl, videoUrl] = await Promise.all([
      this.media.urlsFor(ids),
      this.media.musicUrl(s.musicTrackId),
      this.renders.coverUrl(event.id),
      this.latestVideoUrl(event.id),
    ]);
    const pick = (list: string[]) => list.map((id) => urls.get(id)).filter((u): u is string => Boolean(u));
    const premium = ent.features.has('website_premium');

    return {
      event: {
        id: event.id,
        slug: event.slug,
        type: event.type,
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
      functions: fns
        .map(fromFunctionRow)
        .filter((f) => !guest?.functionIds || guest.functionIds.includes(f.id)),
      media: {
        photos: pick(s.photoAssetIds),
        gallery: premium ? pick(s.galleryAssetIds) : [],
        backgroundUrl: s.backgroundAssetId ? (urls.get(s.backgroundAssetId) ?? null) : null,
        musicUrl: premium ? musicUrl : null,
        coverUrl,
        videoUrl,
      },
      guest: guest ? { name: guest.name, salutation: guest.salutation, functionIds: guest.functionIds, maxPax: guest.maxPax } : null,
      features: { rsvp: ent.features.has('rsvp') && s.rsvpEnabled, showBranding: !premium },
    };
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

  /** Counts a view at most once per IP per hour per event/guest to keep numbers honest. */
  async trackView(slug: string, ip: string, guestToken?: string) {
    const event = await this.publishedBySlug(slug);
    const dedupeKey = `view:${event.id}:${guestToken ?? '-'}:${ip}`;
    if (!(await this.redis.set(dedupeKey, '1', 'EX', 3600, 'NX'))) return { ok: true };

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
    return { ok: true };
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
