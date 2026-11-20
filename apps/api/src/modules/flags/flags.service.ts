import { featureFlags, type Database } from '@cardai/db';
import { BUILTIN_FLAG_KEYS, BUILTIN_FLAGS, flagOn, type BuiltinFlag, type FlagDto, type PublicFlagsDto } from '@cardai/shared';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DB } from '../../infra/infra.module.js';

/** Read on almost every request (maintenance guard), changed rarely: a 10 s in-process cache. */
const CACHE_MS = 10_000;

/**
 * Feature switches and gradual roll-outs. Built-in kill switches default to "on" so a missing row,
 * or a database hiccup, never switches the product off by accident.
 */
@Injectable()
export class FlagsService {
  private cache: { at: number; map: Map<string, FlagDto> } | null = null;
  private loading: Promise<Map<string, FlagDto>> | null = null;

  constructor(@Inject(DB) private readonly db: Database) {}

  invalidate() {
    this.cache = null;
  }

  async all(): Promise<Map<string, FlagDto>> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.map;
    // One query even when many requests arrive at once after the cache expires.
    this.loading ??= this.load().finally(() => (this.loading = null));
    return this.loading;
  }

  private async load(): Promise<Map<string, FlagDto>> {
    const map = new Map<string, FlagDto>();
    for (const key of BUILTIN_FLAG_KEYS) {
      const def = BUILTIN_FLAGS[key];
      map.set(key, { key, enabled: def.default, rolloutPct: 100, description: def.description, message: null, builtin: true, updatedAt: null });
    }
    try {
      for (const r of await this.db.select().from(featureFlags)) {
        const builtin = r.key in BUILTIN_FLAGS;
        map.set(r.key, {
          key: r.key,
          enabled: r.enabled,
          rolloutPct: r.rolloutPct,
          description: r.description ?? (builtin ? BUILTIN_FLAGS[r.key as BuiltinFlag].description : null),
          message: r.message,
          builtin,
          updatedAt: r.updatedAt.toISOString(),
        });
      }
    } catch {
      // Keep defaults (everything working) if the table cannot be read.
      if (this.cache) return this.cache.map;
    }
    this.cache = { at: Date.now(), map };
    return map;
  }

  async isOn(key: string, subject?: string | null): Promise<boolean> {
    const f = (await this.all()).get(key);
    const fallback = key in BUILTIN_FLAGS ? BUILTIN_FLAGS[key as BuiltinFlag].default : false;
    return flagOn(f, subject, key, fallback);
  }

  /** Throws a friendly 503 when a kill switch is off. */
  async require(key: BuiltinFlag, fallbackMessage: string): Promise<void> {
    const f = (await this.all()).get(key);
    if (f && !f.enabled) throw new HttpException({ message: f.message || fallbackMessage, details: { flag: key } }, HttpStatus.SERVICE_UNAVAILABLE);
  }

  /** Evaluated for one person (account id, else anonymous visitor id). */
  async evaluate(subject: string | null): Promise<Record<string, boolean>> {
    const out: Record<string, boolean> = {};
    for (const [key, f] of await this.all()) out[key] = flagOn(f, subject, key, f.enabled);
    return out;
  }

  async publicFlags(): Promise<PublicFlagsDto> {
    const map = await this.all();
    const m = map.get('maintenance');
    return {
      maintenance: { on: Boolean(m?.enabled), message: m?.message ?? null },
      off: [...map.values()].filter((f) => f.builtin && f.key !== 'maintenance' && !f.enabled).map((f) => f.key),
    };
  }
}
