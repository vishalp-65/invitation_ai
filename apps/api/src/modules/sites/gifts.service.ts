import { and, desc, eq, guests, siteGifts, type Database } from '@cardai/db';
import { guestMessage, whatsappShareUrl, type GiftDto, type GiftMethod, type RecordGiftInput } from '@cardai/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../common/auth.decorators.js';
import { DB } from '../../infra/infra.module.js';
import { EventsService } from '../events/events.service.js';

type GiftRow = typeof siteGifts.$inferSelect;

/** The family's shagun / gift list and thank-you notes. */
@Injectable()
export class GiftsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  async list(user: AuthUser, eventId: string): Promise<{ items: GiftDto[]; totalAmount: number; thanked: number }> {
    await this.events.getOwned(user, eventId, 'view');
    const rows = await this.db.select().from(siteGifts).where(eq(siteGifts.eventId, eventId)).orderBy(desc(siteGifts.createdAt));
    return {
      items: rows.map(toDto),
      totalAmount: rows.reduce((s, r) => s + (r.amountPaise ?? 0), 0) / 100,
      thanked: rows.filter((r) => r.thankedAt).length,
    };
  }

  /** Written down by the family (cash envelopes, gifts at the venue). */
  async record(user: AuthUser, eventId: string, input: RecordGiftInput): Promise<GiftDto> {
    await this.events.getOwned(user, eventId, 'guests');
    if (input.guestId) {
      const [g] = await this.db.select({ id: guests.id }).from(guests).where(and(eq(guests.id, input.guestId), eq(guests.eventId, eventId)));
      if (!g) throw new NotFoundException('Guest not found');
    }
    const [row] = await this.db
      .insert(siteGifts)
      .values({
        eventId,
        guestId: input.guestId ?? null,
        name: input.name,
        phone: input.phone ?? null,
        amountPaise: input.amount ? input.amount * 100 : null,
        method: input.method,
        note: input.note ?? null,
        source: 'host',
      })
      .returning();
    return toDto(row!);
  }

  /** Marks a gift thanked and returns a ready WhatsApp thank-you in the invitation's language. */
  async thank(user: AuthUser, eventId: string, giftId: string) {
    const event = await this.events.getOwned(user, eventId, 'guests');
    const [row] = await this.db
      .update(siteGifts)
      .set({ thankedAt: new Date() })
      .where(and(eq(siteGifts.id, giftId), eq(siteGifts.eventId, eventId)))
      .returning();
    if (!row) throw new NotFoundException('Gift not found');
    let phone = row.phone;
    let name = row.name;
    if (row.guestId) {
      const [g] = await this.db.select({ phone: guests.phone, salutation: guests.salutation }).from(guests).where(eq(guests.id, row.guestId));
      phone ??= g?.phone ?? null;
      name = g?.salutation || name;
    }
    const message = guestMessage('giftThanks', event.language, { name, title: event.title });
    return { gift: toDto(row), message, shareUrl: whatsappShareUrl(message, phone) };
  }

  async remove(user: AuthUser, eventId: string, giftId: string): Promise<void> {
    await this.events.getOwned(user, eventId, 'guests');
    await this.db.delete(siteGifts).where(and(eq(siteGifts.id, giftId), eq(siteGifts.eventId, eventId)));
  }

  async exportCsv(user: AuthUser, eventId: string): Promise<string> {
    const { items } = await this.list(user, eventId);
    const cell = (v: unknown) => {
      const t = String(v ?? '');
      return `"${(/^[=+\-@\t\r]/.test(t) ? `'${t}` : t).replace(/"/g, '""')}"`;
    };
    const header = ['Name', 'Phone', 'Amount (₹)', 'Method', 'Note', 'Added by', 'Thanked', 'Date'];
    const lines = items.map((g) => [g.name, g.phone, g.amount ?? '', g.method, g.note, g.source, g.thankedAt ? 'yes' : '', g.createdAt].map(cell).join(','));
    return '\uFEFF' + [header.join(','), ...lines].join('\n');
  }
}

function toDto(r: GiftRow): GiftDto {
  return {
    id: r.id,
    guestId: r.guestId,
    name: r.name,
    phone: r.phone,
    amount: r.amountPaise === null ? null : r.amountPaise / 100,
    method: r.method as GiftMethod,
    note: r.note,
    source: r.source === 'host' ? 'host' : 'guest',
    thankedAt: r.thankedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}
