import { analyticsEvents, and, eq, isNull, lt, or, sql, users, type Database } from '@cardai/db';
import type { TrackBatchInput, TrackEventName } from '@cardai/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB } from '../../infra/infra.module.js';

export interface TrackContext {
  visitorId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  userAgent?: string | null;
}

export function deviceOf(ua: string | null | undefined): string {
  if (!ua) return 'unknown';
  if (/bot|crawl|spider|slurp|preview/i.test(ua)) return 'bot';
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobi|iphone|android/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** Strips query strings (they can carry guest names or tokens) and caps length. */
function cleanPath(p?: string | null): string | null {
  if (!p) return null;
  return p.split(/[?#]/)[0]!.slice(0, 200);
}

function cleanReferrer(r?: string | null): string | null {
  if (!r) return null;
  try {
    return new URL(r).hostname.slice(0, 120);
  } catch {
    return null;
  }
}

/**
 * First-party analytics. Writes never fail the request that caused them: tracking is best-effort.
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(@Inject(DB) private readonly db: Database) {}

  async ingest(batch: TrackBatchInput, ctx: TrackContext): Promise<void> {
    const device = deviceOf(ctx.userAgent);
    if (device === 'bot') return;
    await this.db
      .insert(analyticsEvents)
      .values(
        batch.events.map((e) => ({
          name: e.name,
          visitorId: batch.visitorId,
          sessionId: batch.sessionId ?? null,
          userId: ctx.userId ?? null,
          path: cleanPath(e.path),
          referrer: cleanReferrer(e.referrer),
          device,
          templateId: e.templateId ?? null,
          props: e.props ?? null,
        })),
      )
      .catch((err: Error) => this.logger.warn(`track failed: ${err.message}`));
    if (ctx.userId) void this.touch(ctx.userId);
  }

  /** Server-side event (signup, login, purchase). */
  record(name: TrackEventName, ctx: TrackContext, extra: { templateId?: string | null; props?: Record<string, unknown> } = {}): void {
    void this.db
      .insert(analyticsEvents)
      .values({
        name,
        visitorId: ctx.visitorId ?? `u_${ctx.userId ?? 'anon'}`,
        sessionId: ctx.sessionId ?? null,
        userId: ctx.userId ?? null,
        device: deviceOf(ctx.userAgent),
        templateId: extra.templateId ?? null,
        props: extra.props ?? null,
      })
      .catch((err: Error) => this.logger.warn(`record ${name} failed: ${err.message}`));
  }

  /** After sign-in: attribute the visitor's earlier anonymous activity to the account. */
  identify(visitorId: string | null | undefined, userId: string): void {
    if (!visitorId) return;
    void this.db
      .update(analyticsEvents)
      .set({ userId })
      .where(and(eq(analyticsEvents.visitorId, visitorId), isNull(analyticsEvents.userId)))
      .catch((err: Error) => this.logger.warn(`identify failed: ${err.message}`));
  }

  /** "Last active" for the users table, written at most every 5 minutes. */
  private async touch(userId: string) {
    await this.db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(and(eq(users.id, userId), or(isNull(users.lastSeenAt), lt(users.lastSeenAt, sql`now() - interval '5 minutes'`))))
      .catch(() => undefined);
  }
}
