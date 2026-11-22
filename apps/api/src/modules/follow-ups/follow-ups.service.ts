import { and, entitlements, eq, events, guests, isNotNull, rsvps, sql, type Database } from '@cardai/db';
import { followUpsSchema, type FollowUps, type NudgeKind } from '@cardai/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB } from '../../infra/infra.module.js';
import type { EventRow, FunctionRow } from '../events/events.service.js';
import { EventsService } from '../events/events.service.js';
import { GuestsService } from '../guests/guests.service.js';
import { ShortLinksService } from '../short-links/short-links.service.js';
import { WhatsAppClient } from '../whatsapp/whatsapp.client.js';
import { ENV, type Env } from '../../config/env.js';

const DAY = 86_400_000;
const HOUR = 3_600_000;
/** Per run (hourly, 9 am–8 pm India time): keeps one run short and spreads sends out. */
const MAX_PER_EVENT = 200;
const MAX_PER_RUN = 2000;

type GuestRow = typeof guests.$inferSelect;

/** Which follow-up (if any) is due for a guest right now. Pure, so it is unit tested. */
export function dueNudge(
  g: Pick<GuestRow, 'invitedAt' | 'viewCount' | 'nudges' | 'functionIds' | 'checkedInAt'>,
  fns: Array<Pick<FunctionRow, 'id' | 'startsAt' | 'endsAt'>>,
  rules: FollowUps,
  ctx: { now: number; answered: boolean; rsvpEnabled: boolean },
): NudgeKind | null {
  if (!g.invitedAt) return null;
  const sent = new Set(g.nudges ?? []);
  const mine = g.functionIds?.length ? fns.filter((f) => g.functionIds!.includes(f.id)) : fns;
  if (!mine.length) return null;
  const starts = mine.map((f) => f.startsAt.getTime()).sort((a, b) => a - b);
  const first = starts[0]!;
  const lastEnd = Math.max(...mine.map((f) => (f.endsAt ?? new Date(f.startsAt.getTime() + 6 * HOUR)).getTime()));
  const { now } = ctx;

  // After the event: one thank-you, 18 h to 7 days after the last function.
  if (now > lastEnd) {
    if (rules.thanks && !sent.has('thanks') && now - lastEnd > 18 * HOUR && now - lastEnd < 7 * DAY) return 'thanks';
    return null;
  }
  // Day before any of their functions.
  if (rules.dayBefore && !sent.has('dayBefore') && starts.some((t) => t - now > 12 * HOUR && t - now < 36 * HOUR)) return 'dayBefore';
  // Never opened, some days after it went out (and not in the last day before the event).
  if (rules.unopenedDays > 0 && !sent.has('unopened') && g.viewCount === 0 && now - g.invitedAt.getTime() > rules.unopenedDays * DAY && first - now > DAY) {
    return 'unopened';
  }
  // No answer yet, within the window before the first function.
  if (ctx.rsvpEnabled && rules.rsvpDaysBefore > 0 && !ctx.answered && !sent.has('rsvp') && first - now < rules.rsvpDaysBefore * DAY && first - now > DAY) {
    return 'rsvp';
  }
  return null;
}

/**
 * Automatic follow-ups for invitations that switched them on and pay for WhatsApp sending.
 * Everything else (free plans, no template configured) uses the host's tap-through send queue,
 * which lists the same due guests.
 */
@Injectable()
export class FollowUpsService {
  private readonly logger = new Logger(FollowUpsService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(DB) private readonly db: Database,
    private readonly events: EventsService,
    private readonly guestsService: GuestsService,
    private readonly links: ShortLinksService,
    private readonly whatsapp: WhatsAppClient,
  ) {}

  async run(now = Date.now()): Promise<{ events: number; sent: number; failed: number }> {
    if (!this.whatsapp.followUpsReady) return { events: 0, sent: 0, failed: 0 };
    const list = await this.db
      .select({ e: events })
      .from(events)
      .where(and(
        sql`(exists (select 1 from ${entitlements} where ${entitlements.eventId} = ${events.id} and ${entitlements.feature} = 'personalized_links')
          or exists (select 1 from users where users.id = ${events.userId} and users.role = 'admin'))`,
        eq(events.status, 'published'), sql`(${events.settings} -> 'followUps' ->> 'auto')::boolean is true`, sql`${events.suspendedAt} is null`));
    let sent = 0;
    let failed = 0;
    for (const { e } of list) {
      if (sent >= MAX_PER_RUN) break;
      const r = await this.runEvent(e, now, MAX_PER_RUN - sent).catch((err: Error) => {
        this.logger.warn(`follow-ups for ${e.id} failed: ${err.message}`);
        return { sent: 0, failed: 1 };
      });
      sent += r.sent;
      failed += r.failed;
    }
    if (list.length) this.logger.log(`Follow-ups: ${sent} sent, ${failed} failed across ${list.length} invitations`);
    return { events: list.length, sent, failed };
  }

  private async runEvent(event: EventRow, now: number, budget: number) {
    const rules = followUpsSchema.parse(event.settings.followUps ?? {});
    const [fns, rows, answered] = await Promise.all([
      this.events.functionsOf(event.id),
      this.db.select().from(guests).where(and(eq(guests.eventId, event.id), isNotNull(guests.phone), isNotNull(guests.invitedAt))),
      this.db.selectDistinct({ id: rsvps.guestId }).from(rsvps).where(eq(rsvps.eventId, event.id)),
    ]);
    const done = new Set(answered.map((a) => a.id));
    const codes = await this.links.guestCodes(rows);
    let sent = 0;
    let failed = 0;
    for (const g of rows) {
      if (sent >= Math.min(MAX_PER_EVENT, budget)) break;
      const kind = dueNudge(g, fns, rules, { now, answered: done.has(g.id), rsvpEnabled: event.settings.rsvpEnabled });
      if (!kind) continue;
      const code = codes.get(g.id) ?? g.shortCode;
      const url = code ? this.links.url(code) : `${this.env.APP_URL}/i/${event.slug}?g=${g.token}`;
      const text = this.guestsService.compose(event, fns, g, kind, url);
      try {
        await this.whatsapp.sendFollowUpTemplate(g.phone!, text, event.language);
        await this.guestsService.markSent(g.id, kind);
        sent++;
      } catch (err) {
        failed++;
        this.logger.warn(`follow-up ${kind} to guest ${g.id} failed: ${(err as Error).message}`);
      }
    }
    return { sent, failed };
  }
}
