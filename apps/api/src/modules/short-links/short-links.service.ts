import { and, eq, events, guests, inArray, isNull, shortAliases, sql, type Database } from '@cardai/db';
import { aliasProblem, ALIAS_MAX, ALIAS_PROBLEM_TEXT, isReservedLink, normaliseAlias } from '@cardai/shared';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { ENV, type Env } from '../../config/env.js';
import { isUniqueViolation, onUniqueViolation } from '../../common/db.js';
import { DB, REDIS, type Redis } from '../../infra/infra.module.js';

// No look-alikes (0/O, 1/l/I) so codes survive being read out over the phone.
const ALPHABET = '23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const rawEventCode = customAlphabet(ALPHABET, 5);
const rawGuestCode = customAlphabet(ALPHABET, 7);

/**
 * Generated codes always carry a capital letter, while custom names are lowercase only, so a
 * code and a name can never be the same string. Codes that spell a reserved word in any case
 * (`Admin`) are skipped: the web proxy would not route them.
 */
export function strongCode(make: () => string): string {
  for (;;) {
    const c = make();
    if (/[A-Z]/.test(c) && !isReservedLink(c)) return c;
  }
}

/** Event codes: short and shareable (57^5 ≈ 600M). */
const eventCode = () => strongCode(rawEventCode);
/** Guest codes: personal links must not be guessable (57^7 ≈ 2T). */
const guestCode = () => strongCode(rawGuestCode);

export interface ResolvedLink {
  slug: string;
  guestToken: string | null;
}

export interface AliasCheck {
  alias: string;
  available: boolean;
  /** Why it can't be used (already normalised for display). */
  reason: string | null;
  /** Free names close to the one asked for (only when it is taken). */
  suggestions: string[];
}

/**
 * Our own short links, all at the root of one domain:
 *   `<base>/<5-char code>` an event · `<base>/<7-char code>` one guest · `<base>/<name>` a custom name.
 * The base is SHORT_LINK_BASE (a separate short domain) or the main site itself; old
 * `<APP_URL>/s/<code>` links keep working.
 *
 * Collisions are ruled out both ways:
 *  - codes contain a capital, names are lowercase (different strings by construction);
 *  - a name may not equal any existing code case-insensitively (someone typing a code in
 *    lowercase must not land on a stranger's page), and new event codes skip existing names;
 *  - two hosts racing for one name: the primary key decides, the loser gets suggestions.
 */
@Injectable()
export class ShortLinksService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(DB) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  get base(): string {
    return this.env.SHORT_LINK_BASE ?? this.env.APP_URL.replace(/\/+$/, '');
  }

  url(code: string): string {
    return `${this.base}/${code}`;
  }

  /** The event's short code, created on first use. */
  async eventCode(eventId: string, existing?: string | null): Promise<string> {
    if (existing) return existing;
    for (let i = 0; i < 8; i++) {
      const code = eventCode();
      if (await this.aliasExists(code.toLowerCase())) continue;
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

  /** Fresh code for a new guest row (insert-time). Always has a capital, so never equals a name. */
  newGuestCode(): string {
    return guestCode();
  }

  async aliasOf(eventId: string): Promise<string | null> {
    const [row] = await this.db.select({ alias: shortAliases.alias }).from(shortAliases).where(eq(shortAliases.eventId, eventId)).limit(1);
    return row?.alias ?? null;
  }

  private async aliasExists(alias: string): Promise<boolean> {
    const [row] = await this.db.select({ a: shortAliases.alias }).from(shortAliases).where(eq(shortAliases.alias, alias)).limit(1);
    return Boolean(row);
  }

  /** True when an event or guest code reads the same as `alias` (ignoring case). */
  private async clashesWithCode(alias: string): Promise<boolean> {
    if (alias.length === 5) {
      const [e] = await this.db.select({ id: events.id }).from(events).where(sql`lower(${events.shortCode}) = ${alias}`).limit(1);
      if (e) return true;
    }
    if (alias.length === 7) {
      const [g] = await this.db.select({ id: guests.id }).from(guests).where(sql`lower(${guests.shortCode}) = ${alias}`).limit(1);
      if (g) return true;
    }
    return false;
  }

  /** Can this event use `alias`? `reason` is the text shown under the field. */
  async checkAlias(eventId: string, input: string): Promise<AliasCheck> {
    const alias = normaliseAlias(input).replace(/-+$/, '');
    const problem = aliasProblem(alias);
    if (problem) return { alias, available: false, reason: ALIAS_PROBLEM_TEXT[problem], suggestions: problem === 'reserved' ? await this.suggest(eventId, alias) : [] };
    const [owner] = await this.db.select({ eventId: shortAliases.eventId }).from(shortAliases).where(eq(shortAliases.alias, alias));
    if (owner?.eventId === eventId) return { alias, available: true, reason: null, suggestions: [] };
    if (owner || (await this.clashesWithCode(alias))) {
      return { alias, available: false, reason: 'Someone already has this link', suggestions: await this.suggest(eventId, alias) };
    }
    return { alias, available: true, reason: null, suggestions: [] };
  }

  /** Up to 4 free names built from `alias` (alias2, alias-26, …). */
  async suggest(eventId: string, alias: string): Promise<string[]> {
    const stem = alias.slice(0, ALIAS_MAX - 5).replace(/-+$/, '') || 'invite';
    const yy = String(new Date().getFullYear()).slice(2);
    const candidates = [...new Set([`${stem}${yy}`, `${stem}-${yy}`, `${stem}2`, `${stem}-invite`, `${stem}-family`, `the-${stem}`, `${stem}3`, `${stem}-${new Date().getFullYear()}`])].filter(
      (c) => c.length <= ALIAS_MAX && !aliasProblem(c),
    );
    const taken = await this.db.select({ alias: shortAliases.alias, eventId: shortAliases.eventId }).from(shortAliases).where(inArray(shortAliases.alias, candidates));
    const blocked = new Set(taken.filter((t) => t.eventId !== eventId).map((t) => t.alias));
    const out: string[] = [];
    for (const c of candidates) {
      if (out.length >= 4) break;
      if (!blocked.has(c) && !(await this.clashesWithCode(c))) out.push(c);
    }
    return out;
  }

  /** One custom name per event; setting a new one replaces the old. Safe against two hosts racing. */
  async setAlias(eventId: string, input: string): Promise<string> {
    const check = await this.checkAlias(eventId, input);
    if (!check.available) throw new ConflictException({ message: check.reason ?? 'That link is not available', details: { suggestions: check.suggestions } });
    const alias = check.alias;
    try {
      await this.db.transaction(async (tx) => {
        await tx.delete(shortAliases).where(eq(shortAliases.eventId, eventId));
        await tx.insert(shortAliases).values({ alias, eventId });
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // Another event took the name between the check and the insert.
      throw new ConflictException({ message: 'Someone just took this link', details: { suggestions: await this.suggest(eventId, alias) } });
    }
    await this.forgetCodes([alias]);
    return alias;
  }

  async removeAlias(eventId: string): Promise<void> {
    await this.db.delete(shortAliases).where(eq(shortAliases.eventId, eventId));
  }

  /** Code → where it points. Counts the click (best effort). */
  async resolve(code: string): Promise<ResolvedLink> {
    const hit = (await this.redis.get(`sl:${code}`)) ?? (await this.redis.get(`sl:a:${code.toLowerCase()}`));
    if (hit) {
      void this.countClick(code);
      return JSON.parse(hit) as ResolvedLink;
    }

    // 1. Exact generated code (case-sensitive).
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
    if (found) {
      await this.redis.set(`sl:${code}`, JSON.stringify(found), 'EX', 120);
      return found;
    }

    // 2. Custom name (any case: "RP" and "rp" are the same link).
    const alias = code.toLowerCase();
    const [a] = await this.db
      .select({ slug: events.slug })
      .from(shortAliases)
      .innerJoin(events, eq(events.id, shortAliases.eventId))
      .where(eq(shortAliases.alias, alias));
    if (!a) throw new NotFoundException('Link not found');
    found = { slug: a.slug, guestToken: null };
    void this.countClick(alias);
    // Short cache: slugs can change when the host edits the link.
    await this.redis.set(`sl:a:${alias}`, JSON.stringify(found), 'EX', 120);
    return found;
  }

  private async countClick(code: string) {
    if (code.length === 5 || code.length === 7) {
      if (/[A-Z]/.test(code)) return; // generated code, not a name
    }
    await this.db.update(shortAliases).set({ clicks: sql`${shortAliases.clicks} + 1` }).where(eq(shortAliases.alias, code.toLowerCase())).catch(() => undefined);
  }

  async forgetCodes(codes: string[]) {
    if (codes.length) await this.redis.del(...codes.flatMap((c) => [`sl:${c}`, `sl:a:${c.toLowerCase()}`]));
  }

  /** Guests' codes for one event (for cache busting on slug change). */
  async codesOfEvent(eventId: string): Promise<string[]> {
    const [ev] = await this.db.select({ code: events.shortCode }).from(events).where(eq(events.id, eventId));
    const gs = await this.db.select({ code: guests.shortCode }).from(guests).where(eq(guests.eventId, eventId));
    const aliases = await this.db.select({ alias: shortAliases.alias }).from(shortAliases).where(inArray(shortAliases.eventId, [eventId]));
    return [ev?.code, ...gs.map((g) => g.code), ...aliases.map((a) => a.alias)].filter((c): c is string => Boolean(c));
  }
}
