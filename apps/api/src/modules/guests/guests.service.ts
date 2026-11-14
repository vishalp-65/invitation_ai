import { and, asc, count, eq, eventFunctions, guests, inArray, rsvps, type Database } from '@cardai/db';
import { whatsappShareUrl, type GuestDto, type GuestInput, type RsvpSummaryDto } from '@cardai/shared';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import type { AuthUser } from '../../common/auth.decorators.js';
import { ENV, type Env } from '../../config/env.js';
import { DB } from '../../infra/infra.module.js';
import { EntitlementsService } from '../entitlements/entitlements.service.js';
import { EventsService } from '../events/events.service.js';
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
    const event = await this.events.getOwned(user, eventId);
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
    return { items: rows.map((g) => this.toDto(g, event.slug, byGuest.get(g.id) ?? {})) };
  }

  async create(user: AuthUser, eventId: string, input: GuestInput): Promise<GuestDto> {
    const event = await this.events.getOwned(user, eventId);
    await this.assertCapacity(eventId, 1);
    const [row] = await this.db.insert(guests).values({ ...input, eventId, token: token() }).returning();
    return this.toDto(row!, event.slug, {});
  }

  async import(user: AuthUser, eventId: string, list: GuestInput[]): Promise<{ created: number; skipped: number }> {
    await this.events.getOwned(user, eventId);
    await this.assertCapacity(eventId, list.length);
    const existing = await this.db.select({ phone: guests.phone }).from(guests).where(eq(guests.eventId, eventId));
    const seen = new Set(existing.map((e) => e.phone).filter(Boolean));
    const fresh: GuestInput[] = [];
    for (const g of list) {
      if (g.phone) {
        if (seen.has(g.phone)) continue; // skip duplicates by phone
        seen.add(g.phone);
      }
      fresh.push(g);
    }
    for (let i = 0; i < fresh.length; i += 500) {
      await this.db.insert(guests).values(fresh.slice(i, i + 500).map((g) => ({ ...g, eventId, token: token() })));
    }
    return { created: fresh.length, skipped: list.length - fresh.length };
  }

  async update(user: AuthUser, eventId: string, guestId: string, input: Partial<GuestInput>): Promise<GuestDto> {
    const event = await this.events.getOwned(user, eventId);
    const [row] = await this.db.update(guests).set(input).where(and(eq(guests.id, guestId), eq(guests.eventId, eventId))).returning();
    if (!row) throw new NotFoundException('Guest not found');
    return this.toDto(row, event.slug, {});
  }

  async remove(user: AuthUser, eventId: string, guestId: string): Promise<void> {
    await this.events.getOwned(user, eventId);
    await this.db.delete(guests).where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)));
  }

  /**
   * Returns a wa.me deep link (free, opens the host's own WhatsApp) and, when the Cloud API is
   * configured and the plan allows, also sends via the approved template.
   */
  async sendInvite(user: AuthUser, eventId: string, guestId: string, viaApi: boolean) {
    const event = await this.events.getOwned(user, eventId);
    const [guest] = await this.db.select().from(guests).where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)));
    if (!guest) throw new NotFoundException('Guest not found');
    const url = this.inviteUrl(event.slug, guest.token);
    const greeting = guest.salutation || guest.name;
    const message = `${greeting}, you are warmly invited to ${event.title}. Please open your invitation: ${url}`;

    let sent = false;
    if (viaApi && guest.phone && this.whatsapp.configured) {
      await this.entitlements.require(eventId, 'personalized_links', 'Sending via WhatsApp Business is part of the Website plan');
      await this.whatsapp.sendInviteTemplate(guest.phone, { guestName: greeting, eventTitle: event.title, url });
      sent = true;
    }
    await this.db.update(guests).set({ invitedAt: new Date() }).where(eq(guests.id, guest.id));
    return { sent, shareUrl: whatsappShareUrl(message, guest.phone), inviteUrl: url };
  }

  async rsvpSummary(user: AuthUser, eventId: string): Promise<RsvpSummaryDto> {
    await this.events.getOwned(user, eventId);
    const [fns, answers, guestRows] = await Promise.all([
      this.db.select().from(eventFunctions).where(eq(eventFunctions.eventId, eventId)).orderBy(asc(eventFunctions.sortOrder)),
      this.db.select().from(rsvps).where(eq(rsvps.eventId, eventId)),
      this.db.select({ id: guests.id, viewCount: guests.viewCount }).from(guests).where(eq(guests.eventId, eventId)),
    ]);
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
      totals: { invited: guestRows.length, viewed: guestRows.filter((g) => g.viewCount > 0).length, responded: respondents.size },
    };
  }

  async rsvpList(user: AuthUser, eventId: string) {
    await this.events.getOwned(user, eventId);
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
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
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
      viewCount: g.viewCount,
      firstViewedAt: g.firstViewedAt?.toISOString() ?? null,
      rsvp,
    };
  }
}
