import { and, asc, count, eq, eventFunctions, guests, inArray, rsvps, sql, type Database } from '@cardai/db';
import {
  getLanguage,
  composeGuestMessage,
  SEND_QUEUE_FILTERS,
  whatsappShareUrl,
  type CheckInInput,
  type GuestDto,
  type GuestInput,
  type RsvpSummaryDto,
  type SendKind,
  type SendQueueFilter,
  type SendQueueItem,
  type UpdateGuestInput,
} from '@cardai/shared';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import type { AuthUser } from '../../common/auth.decorators.js';
import { ENV, type Env } from '../../config/env.js';
import { DB } from '../../infra/infra.module.js';
import { EntitlementsService } from '../entitlements/entitlements.service.js';
import { EventsService, type EventRow, type FunctionRow } from '../events/events.service.js';
import { ShortLinksService } from '../short-links/short-links.service.js';
import { WhatsAppClient } from '../whatsapp/whatsapp.client.js';

const token = customAlphabet('abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', 12);
const FREE_GUEST_LIMIT = 25;

type GuestRow = typeof guests.$inferSelect;

@Injectable()
export class GuestsService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(DB) private readonly db: Database,
    private readonly events: EventsService,
    private readonly entitlements: EntitlementsService,
    private readonly whatsapp: WhatsAppClient,
    private readonly links: ShortLinksService,
  ) {}

  private inviteUrl(slug: string, guestToken: string) {
    return `${this.env.APP_URL}/i/${slug}?g=${guestToken}`;
  }

  private async assertCapacity(eventId: string, adding: number) {
    if (await this.entitlements.has(eventId, 'personalized_links')) return;
    const [row] = await this.db.select({ n: count() }).from(guests).where(eq(guests.eventId, eventId));
    if ((row?.n ?? 0) + adding > FREE_GUEST_LIMIT) {
      throw new ForbiddenException({
        message: `Free plan supports ${FREE_GUEST_LIMIT} guests. Upgrade to the Website plan for unlimited personalised invites.`,
        details: { feature: 'personalized_links' },
      });
    }
  }

  async list(user: AuthUser, eventId: string): Promise<{ items: GuestDto[] }> {
    const event = await this.events.getOwned(user, eventId, 'view');
    const rows = await this.db.select().from(guests).where(eq(guests.eventId, eventId)).orderBy(asc(guests.name));
    const answers = rows.length
      ? await this.db.select().from(rsvps).where(and(eq(rsvps.eventId, eventId), inArray(rsvps.guestId, rows.map((r) => r.id))))
      : [];
    const byGuest = new Map<string, GuestDto['rsvp']>();
    for (const a of answers) {
      const m = byGuest.get(a.guestId!) ?? {};
      m[a.functionId] = { status: a.status, headcount: a.headcount };
      byGuest.set(a.guestId!, m);
    }
    const codes = await this.links.guestCodes(rows);
    return { items: rows.map((g) => this.toDto({ ...g, shortCode: codes.get(g.id) ?? g.shortCode }, event.slug, byGuest.get(g.id) ?? {})) };
  }

  async create(user: AuthUser, eventId: string, input: GuestInput): Promise<GuestDto> {
    const event = await this.events.getOwned(user, eventId, 'guests');
    await this.assertCapacity(eventId, 1);
    if (input.stay) await this.entitlements.require(eventId, 'website_royale', 'Travel & stay per guest is part of Site Royale');
    const [row] = await this.db.insert(guests).values({ ...input, eventId, token: token(), shortCode: this.links.newGuestCode() }).returning();
    return this.toDto(row!, event.slug, {});
  }

  async import(user: AuthUser, eventId: string, list: GuestInput[]): Promise<{ created: number; skipped: number }> {
    await this.events.getOwned(user, eventId, 'guests');
    await this.assertCapacity(eventId, list.length);
    const existing = await this.db.select({ phone: guests.phone }).from(guests).where(eq(guests.eventId, eventId));
    const seen = new Set(existing.map((e) => e.phone).filter(Boolean));
    const fresh: GuestInput[] = [];
    for (const g of list) {
      if (g.phone) {
        if (seen.has(g.phone)) continue; // skip duplicates by phone
        seen.add(g.phone);
      }
      fresh.push({ ...g, stay: undefined }); // stay details are set per guest (Royale)
    }
    for (let i = 0; i < fresh.length; i += 500) {
      await this.db.insert(guests).values(fresh.slice(i, i + 500).map((g) => ({ ...g, eventId, token: token(), shortCode: this.links.newGuestCode() })));
    }
    return { created: fresh.length, skipped: list.length - fresh.length };
  }

  async update(user: AuthUser, eventId: string, guestId: string, input: UpdateGuestInput): Promise<GuestDto> {
    const event = await this.events.getOwned(user, eventId, 'guests');
    if (input.stay) await this.entitlements.require(eventId, 'website_royale', 'Travel & stay per guest is part of Site Royale');
    const [row] = await this.db.update(guests).set(input).where(and(eq(guests.id, guestId), eq(guests.eventId, eventId))).returning();
    if (!row) throw new NotFoundException('Guest not found');
    return this.toDto(row, event.slug, {});
  }

  async remove(user: AuthUser, eventId: string, guestId: string): Promise<void> {
    await this.events.getOwned(user, eventId, 'guests');
    await this.db.delete(guests).where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)));
  }

  /** The message for one guest in the invitation's language, with the function that matters for it. */
  compose(event: EventRow, fns: FunctionRow[], guest: GuestRow, kind: SendKind, url: string): string {
    return composeGuestMessage({
      event: { language: event.language, title: event.title, timezone: event.settings.timezone },
      functions: fns,
      guest,
      kind,
      url,
      locale: getLanguage(event.language).locale,
    });
  }

  /** Default message: an invite, or a gentle reminder when it was sent and never opened. */
  private defaultKind(guest: GuestRow): SendKind {
    return guest.invitedAt && guest.viewCount === 0 ? 'unopened' : 'invite';
  }

  /** Records that a message went out (each follow-up at most once). */
  async markSent(guestId: string, kind: SendKind, at = new Date()) {
    if (kind === 'invite') {
      await this.db.update(guests).set({ invitedAt: at }).where(eq(guests.id, guestId));
      return;
    }
    await this.db
      .update(guests)
      .set({
        lastNudgeAt: at,
        nudges: sql`(select coalesce(jsonb_agg(distinct v), '[]'::jsonb) from jsonb_array_elements_text(${guests.nudges} || ${JSON.stringify([kind])}::jsonb) v)`,
        ...(kind === 'thanks' ? { thankedAt: at } : {}),
        // A save-the-date is not the invite itself, so it does not count as "sent".
        ...(kind === 'saveTheDate' ? {} : { invitedAt: sql`coalesce(${guests.invitedAt}, ${at.toISOString()}::timestamptz)` }),
      })
      .where(eq(guests.id, guestId));
  }

  /**
   * Returns a wa.me deep link (free, opens the host's own WhatsApp) and, when the Cloud API is
   * configured and the plan allows, also sends via the approved template.
   */
  async sendInvite(user: AuthUser, eventId: string, guestId: string, viaApi: boolean, kindIn?: SendKind) {
    const event = await this.events.getOwned(user, eventId, 'guests');
    const [guest] = await this.db.select().from(guests).where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)));
    if (!guest) throw new NotFoundException('Guest not found');
    const [code] = (await this.links.guestCodes([guest])).values();
    const url = code ? this.links.url(code) : this.inviteUrl(event.slug, guest.token);
    const kind = kindIn ?? this.defaultKind(guest);
    const message = this.compose(event, await this.events.functionsOf(eventId), guest, kind, url);

    let sent = false;
    if (viaApi && guest.phone && this.whatsapp.configured) {
      await this.entitlements.require(eventId, 'personalized_links', 'Sending via WhatsApp Business is part of the Website plan');
      await this.whatsapp.sendInviteTemplate(guest.phone, { guestName: guest.salutation || guest.name, eventTitle: event.title, url }, event.language);
      sent = true;
    }
    await this.markSent(guest.id, kind);
    return {
      sent,
      kind,
      shareUrl: whatsappShareUrl(message, guest.phone),
      smsUrl: guest.phone ? `sms:${guest.phone}?body=${encodeURIComponent(message)}` : null,
      message,
      inviteUrl: url,
    };
  }

  /** Guests a filter picks out, in send order (people with a mobile number first). */
  pick(rows: GuestRow[], answered: Set<string>, filter: SendQueueFilter): Array<{ g: GuestRow; kind: SendKind }> {
    const has = (g: GuestRow, k: string) => (g.nudges ?? []).includes(k);
    const out: Array<{ g: GuestRow; kind: SendKind }> = [];
    for (const g of rows) {
      switch (filter) {
        case 'unsent':
          if (!g.invitedAt) out.push({ g, kind: 'invite' });
          break;
        case 'unopened':
          if (g.invitedAt && g.viewCount === 0 && !has(g, 'unopened')) out.push({ g, kind: 'unopened' });
          break;
        case 'noRsvp':
          if (g.invitedAt && !answered.has(g.id) && !has(g, 'rsvp')) out.push({ g, kind: 'rsvp' });
          break;
        case 'dayBefore':
          if (g.invitedAt && !has(g, 'dayBefore')) out.push({ g, kind: 'dayBefore' });
          break;
        case 'thanks':
          if (g.invitedAt && !has(g, 'thanks')) out.push({ g, kind: 'thanks' });
          break;
        case 'saveTheDate':
          if (!has(g, 'saveTheDate')) out.push({ g, kind: 'saveTheDate' });
          break;
        case 'all':
          out.push({ g, kind: this.defaultKind(g) });
          break;
      }
    }
    return out.sort((a, b) => Number(!a.g.phone) - Number(!b.g.phone));
  }

  /** The host's tap-through send queue: one prepared WhatsApp message per guest. */
  async sendQueue(user: AuthUser, eventId: string, filter: SendQueueFilter): Promise<{ items: SendQueueItem[]; counts: Record<SendQueueFilter, number> }> {
    const event = await this.events.getOwned(user, eventId, 'guests');
    const [rows, fns, answers] = await Promise.all([
      this.db.select().from(guests).where(eq(guests.eventId, eventId)).orderBy(asc(guests.name)),
      this.events.functionsOf(eventId),
      this.db.selectDistinct({ guestId: rsvps.guestId }).from(rsvps).where(eq(rsvps.eventId, eventId)),
    ]);
    const answered = new Set(answers.map((a) => a.guestId).filter((x): x is string => Boolean(x)));
    const codes = await this.links.guestCodes(rows);
    const counts = Object.fromEntries(SEND_QUEUE_FILTERS.map((f) => [f, this.pick(rows, answered, f).length])) as Record<SendQueueFilter, number>;
    const items = this.pick(rows, answered, filter).map(({ g, kind }) => {
      const code = codes.get(g.id) ?? g.shortCode;
      const url = code ? this.links.url(code) : this.inviteUrl(event.slug, g.token);
      const message = this.compose(event, fns, g, kind, url);
      return {
        guestId: g.id,
        name: g.name,
        phone: g.phone,
        kind,
        message,
        shareUrl: whatsappShareUrl(message, g.phone),
        smsUrl: g.phone ? `sms:${g.phone}?body=${encodeURIComponent(message)}` : null,
      };
    });
    return { items, counts };
  }

  /** Marks queue items as sent once the host has opened them in WhatsApp. */
  async markQueueSent(user: AuthUser, eventId: string, guestIds: string[], kind: SendKind) {
    await this.events.getOwned(user, eventId, 'guests');
    const own = await this.db.select({ id: guests.id }).from(guests).where(and(eq(guests.eventId, eventId), inArray(guests.id, guestIds)));
    for (const g of own) await this.markSent(g.id, kind);
    return { marked: own.length };
  }

  // ---------------- Event day ----------------

  /** Gate check-in by scanned personal link (token or short code) or from the list (guest id). */
  async checkIn(user: AuthUser, eventId: string, input: CheckInInput) {
    await this.events.getOwned(user, eventId, 'guests');
    const raw = input.token?.trim();
    const token = raw?.match(/[?&]g=([\w-]+)/)?.[1] ?? raw?.split('/').pop()?.split('?')[0];
    let guest: GuestRow | undefined;
    if (input.guestId) [guest] = await this.db.select().from(guests).where(and(eq(guests.eventId, eventId), eq(guests.id, input.guestId)));
    else if (token) {
      [guest] = await this.db.select().from(guests).where(and(eq(guests.eventId, eventId), eq(guests.token, token)));
      // Short personal links (inv.to/abc) carry the code, not the token.
      if (!guest) [guest] = await this.db.select().from(guests).where(and(eq(guests.eventId, eventId), eq(guests.shortCode, token)));
    }
    if (!guest) throw new NotFoundException('This pass is not on the guest list for this invitation.');
    const answers = await this.db.select({ status: rsvps.status, headcount: rsvps.headcount }).from(rsvps).where(eq(rsvps.guestId, guest.id));
    const confirmed = Math.max(0, ...answers.filter((a) => a.status !== 'no').map((a) => a.headcount));
    const already = Boolean(guest.checkedInAt);
    if (input.undo) {
      await this.db.update(guests).set({ checkedInAt: null, checkedInPax: null }).where(eq(guests.id, guest.id));
    } else if (!already || input.pax !== undefined) {
      const pax = input.pax ?? (confirmed || 1);
      await this.db.update(guests).set({ checkedInAt: guest.checkedInAt ?? new Date(), checkedInPax: pax }).where(eq(guests.id, guest.id));
    }
    const [after] = await this.db.select().from(guests).where(eq(guests.id, guest.id));
    return {
      guestId: after!.id,
      name: after!.name,
      groupLabel: after!.groupLabel,
      maxPax: after!.maxPax,
      confirmedPax: confirmed,
      alreadyCheckedIn: already && !input.undo,
      checkedInAt: after!.checkedInAt?.toISOString() ?? null,
      checkedInPax: after!.checkedInPax,
    };
  }

  async rsvpSummary(user: AuthUser, eventId: string): Promise<RsvpSummaryDto> {
    await this.events.getOwned(user, eventId, 'view');
    const [fns, answers, guestRows] = await Promise.all([
      this.db.select().from(eventFunctions).where(eq(eventFunctions.eventId, eventId)).orderBy(asc(eventFunctions.sortOrder)),
      this.db.select().from(rsvps).where(eq(rsvps.eventId, eventId)),
      this.db
        .select({ id: guests.id, viewCount: guests.viewCount, invitedAt: guests.invitedAt, checkedInAt: guests.checkedInAt, checkedInPax: guests.checkedInPax })
        .from(guests)
        .where(eq(guests.eventId, eventId)),
    ]);
    const going = answers.filter((a) => a.status !== 'no');
    const respondents = new Set(answers.map((a) => a.guestId ?? `p:${a.phone}`));
    return {
      functions: fns.map((f) => {
        const mine = answers.filter((a) => a.functionId === f.id);
        return {
          functionId: f.id,
          name: f.name,
          yes: mine.filter((a) => a.status === 'yes').length,
          no: mine.filter((a) => a.status === 'no').length,
          maybe: mine.filter((a) => a.status === 'maybe').length,
          headcount: mine.filter((a) => a.status !== 'no').reduce((s, a) => s + a.headcount, 0),
        };
      }),
      totals: {
        invited: guestRows.length,
        viewed: guestRows.filter((g) => g.viewCount > 0).length,
        responded: respondents.size,
        sent: guestRows.filter((g) => g.invitedAt).length,
        checkedIn: guestRows.filter((g) => g.checkedInAt).length,
        checkedInPax: guestRows.reduce((sum, g) => sum + (g.checkedInAt ? (g.checkedInPax ?? 0) : 0), 0),
      },
      meals: fns.map((f) => {
        const m = { functionId: f.id, veg: 0, non_veg: 0, jain: 0, vegan: 0, unknown: 0 };
        for (const a of going) {
          if (a.functionId !== f.id) continue;
          const k = a.mealPreference;
          if (k === 'veg' || k === 'non_veg' || k === 'jain' || k === 'vegan') m[k] += a.headcount;
          else m.unknown += a.headcount;
        }
        return m;
      }),
      needsStay: new Set(answers.filter((a) => a.needsAccommodation).map((a) => a.guestId ?? `p:${a.phone}`)).size,
    };
  }

  async rsvpList(user: AuthUser, eventId: string) {
    await this.events.getOwned(user, eventId, 'view');
    const rows = await this.db
      .select({ r: rsvps, fn: eventFunctions.name })
      .from(rsvps)
      .innerJoin(eventFunctions, eq(eventFunctions.id, rsvps.functionId))
      .where(eq(rsvps.eventId, eventId))
      .orderBy(asc(rsvps.createdAt));
    return rows.map(({ r, fn }) => ({
      id: r.id,
      function: fn,
      functionId: r.functionId,
      name: r.name,
      phone: r.phone,
      status: r.status,
      headcount: r.headcount,
      mealPreference: r.mealPreference,
      needsAccommodation: r.needsAccommodation,
      note: r.note,
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async exportCsv(user: AuthUser, eventId: string): Promise<string> {
    const rows = await this.rsvpList(user, eventId);
    const header = ['Function', 'Name', 'Phone', 'Status', 'Headcount', 'Meal', 'Accommodation', 'Note', 'Updated'];
    const cell = (v: unknown) => `"${csvSafe(String(v ?? '')).replace(/"/g, '""')}"`;
    const lines = rows.map((r) =>
      [r.function, r.name, r.phone, r.status, r.headcount, r.mealPreference, r.needsAccommodation ? 'yes' : '', r.note, r.updatedAt].map(cell).join(','),
    );
    // BOM so Excel opens Hindi/Tamil names correctly.
    return '﻿' + [header.join(','), ...lines].join('\n');
  }

  private toDto(g: GuestRow, slug: string, rsvp: GuestDto['rsvp']): GuestDto {
    return {
      id: g.id,
      name: g.name,
      phone: g.phone,
      email: g.email,
      groupLabel: g.groupLabel,
      salutation: g.salutation,
      maxPax: g.maxPax,
      functionIds: g.functionIds,
      token: g.token,
      inviteUrl: this.inviteUrl(slug, g.token),
      shortUrl: g.shortCode ? this.links.url(g.shortCode) : this.inviteUrl(slug, g.token),
      stay: g.stay ?? null,
      invitedAt: g.invitedAt?.toISOString() ?? null,
      viewCount: g.viewCount,
      firstViewedAt: g.firstViewedAt?.toISOString() ?? null,
      lastViewedAt: g.lastViewedAt?.toISOString() ?? null,
      nudges: g.nudges ?? [],
      checkedInAt: g.checkedInAt?.toISOString() ?? null,
      checkedInPax: g.checkedInPax ?? null,
      thankedAt: g.thankedAt?.toISOString() ?? null,
      rsvp,
    };
  }
}

/**
 * Names and notes come from the public RSVP form. Excel and Sheets run a cell starting with
 * = + - @ (or a tab / carriage return before one) as a formula, so such cells get a leading
 * apostrophe and open as plain text.
 */
export function csvSafe(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}
