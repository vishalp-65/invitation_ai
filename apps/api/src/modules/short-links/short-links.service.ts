import { and, eq, events, guests, inArray, isNull, shortAliases, sql, type Database } from '@cardai/db';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { ENV, type Env } from '../../config/env.js';
import { onUniqueViolation } from '../../common/db.js';
import { DB, REDIS, type Redis } from '../../infra/infra.module.js';

// No look-alikes (0/O, 1/l/I) so codes survive being read out over the phone.
const ALPHABET = '23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
/** Event codes: short and shareable (57^5 ≈ 600M). */
const eventCode = customAlphabet(ALPHABET, 5);
/** Guest codes: personal links must not be guessable (57^7 ≈ 2T). */
const guestCode = customAlphabet(ALPHABET, 7);

/** Words a vanity alias may not take (they are app routes on the short domain). */
const RESERVED = new Set(['api', 'i', 's', 'login', 'signup', 'dashboard', 'pricing', 'templates', 'create', 'editor', 'admin', 'designer', 'auth', 'dev', 'og']);

export interface ResolvedLink {
  slug: string;
  guestToken: string | null;
}

/**
 * Our own short links: `<base>/<code>` for an event, `<base>/<7-char code>` for one guest and
 * `<base>/<alias>` for a vanity name. The base is configurable so the short domain can be
 * chosen at launch (SHORT_LINK_BASE), falling back to `<APP_URL>/s`.
 */
@Injectable()
export class ShortLinksService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(DB) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  get base(): string {
    return this.env.SHORT_LINK_BASE ?? `${this.env.APP_URL}/s`;
  }

  url(code: string): string {
    return `${this.base}/${code}`;
  }

  /** The event's short code, created on first use. */
  async eventCode(eventId: string, existing?: string | null): Promise<string> {
    if (existing) return existing;
    for (let i = 0; i < 5; i++) {
      const code = eventCode();
      // A code collision returns no row, so the loop tries a fresh code.
      const [row] = await onUniqueViolation(
        this.db.update(events).set({ shortCode: code }).where(and(eq(events.id, eventId), isNull(events.shortCode))).returning({ code: events.shortCode }),
        [],
      );
      if (row?.code) return row.code;
      const [current] = await this.db.select({ code: events.shortCode }).from(events).where(eq(events.id, eventId));
      if (current?.code) return current.code; // someone else set it first
    }
    throw new ConflictException('Could not create a short link, please retry');
  }

  /** Makes sure every listed guest has a short code; returns id → code. */
  async guestCodes(rows: Array<{ id: string; shortCode: string | null }>): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    for (const r of rows) {
      if (r.shortCode) {
        out.set(r.id, r.shortCode);
        continue;
      }
      for (let i = 0; i < 5 && !out.has(r.id); i++) {
        const code = guestCode();
        const [row] = await onUniqueViolation(
          this.db.update(guests).set({ shortCode: code }).where(and(eq(guests.id, r.id), isNull(guests.shortCode))).returning({ code: guests.shortCode }),
          [],
        );
        if (row?.code) out.set(r.id, row.code);
        else {
          const [current] = await this.db.select({ code: guests.shortCode }).from(guests).where(eq(guests.id, r.id));
          if (current?.code) out.set(r.id, current.code);
        }
      }
    }
    return out;
  }

  /** Fresh code for a new guest row (insert-time). */
  newGuestCode(): string {
    return guestCode();
  }

  async aliasOf(eventId: string): Promise<string | null> {
    const [row] = await this.db.select({ alias: shortAliases.alias }).from(shortAliases).where(eq(shortAliases.eventId, eventId)).limit(1);
    return row?.alias ?? null;
  }

  /** One vanity alias per event; setting a new one replaces the old. */
  async setAlias(eventId: string, alias: string): Promise<string> {
    if (RESERVED.has(alias) || alias.length <= 7) {
      // ≤7 chars could clash with generated event/guest codes.
      throw new ConflictException(RESERVED.has(alias) ? 'That name is reserved' : 'Use at least 8 characters, e.g. rahul-weds-priya');
    }
    const [taken] = await this.db.select({ eventId: shortAliases.eventId }).from(shortAliases).where(eq(shortAliases.alias, alias));
    if (taken && taken.eventId !== eventId) throw new ConflictException('That link is already taken');
    await this.db.transaction(async (tx) => {
      await tx.delete(shortAliases).where(eq(shortAliases.eventId, eventId));
      await tx.insert(shortAliases).values({ alias, eventId });
    });
    return alias;
  }

  async removeAlias(eventId: string): Promise<void> {
    await this.db.delete(shortAliases).where(eq(shortAliases.eventId, eventId));
  }

  /** Code → where it points. Counts the click (best effort). */
  async resolve(code: string): Promise<ResolvedLink> {
    const cacheKey = `sl:${code}`;
    const hit = await this.redis.get(cacheKey);
    if (hit) {
      void this.countClick(code);
      return JSON.parse(hit) as ResolvedLink;
    }

    let found: ResolvedLink | null = null;
    if (code.length === 7) {
      const [g] = await this.db
        .select({ token: guests.token, slug: events.slug })
        .from(guests)
        .innerJoin(events, eq(events.id, guests.eventId))
        .where(eq(guests.shortCode, code));
      if (g) found = { slug: g.slug, guestToken: g.token };
    }
    if (!found && code.length === 5) {
      const [e] = await this.db.select({ slug: events.slug }).from(events).where(eq(events.shortCode, code));
      if (e) found = { slug: e.slug, guestToken: null };
    }
    if (!found) {
      const alias = code.toLowerCase();
      const [a] = await this.db
        .select({ slug: events.slug })
        .from(shortAliases)
        .innerJoin(events, eq(events.id, shortAliases.eventId))
        .where(eq(shortAliases.alias, alias));
      if (a) {
        found = { slug: a.slug, guestToken: null };
        void this.db.update(shortAliases).set({ clicks: sql`${shortAliases.clicks} + 1` }).where(eq(shortAliases.alias, alias)).catch(() => undefined);
      }
    }
    if (!found) throw new NotFoundException('Link not found');
    // Short cache: slugs can change when the host edits the link.
    await this.redis.set(cacheKey, JSON.stringify(found), 'EX', 120);
    return found;
  }

  private async countClick(code: string) {
    if (code.length > 7) {
      await this.db.update(shortAliases).set({ clicks: sql`${shortAliases.clicks} + 1` }).where(eq(shortAliases.alias, code.toLowerCase())).catch(() => undefined);
    }
  }

  async forgetCodes(codes: string[]) {
    if (codes.length) await this.redis.del(...codes.map((c) => `sl:${c}`));
  }

  /** Guests' codes for one event (for cache busting on slug change). */
  async codesOfEvent(eventId: string): Promise<string[]> {
    const [ev] = await this.db.select({ code: events.shortCode }).from(events).where(eq(events.id, eventId));
    const gs = await this.db.select({ code: guests.shortCode }).from(guests).where(eq(guests.eventId, eventId));
    const aliases = await this.db.select({ alias: shortAliases.alias }).from(shortAliases).where(inArray(shortAliases.eventId, [eventId]));
    return [ev?.code, ...gs.map((g) => g.code), ...aliases.map((a) => a.alias)].filter((c): c is string => Boolean(c));
  }
}
