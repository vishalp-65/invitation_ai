import { activityDaily, analyticsEvents, and, coupons, eq, events, isNull, lt, or, orders, sql, users, visitorAttribution, type Database } from '@cardai/db';
import { createHash } from 'node:crypto';
import { cityTier, classifyChannel, inAppBrowser, normaliseNetwork, type TrackBatchInput, type TrackEventName } from '@cardai/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB } from '../../infra/infra.module.js';
import { MailService } from '../mail/mail.service.js';
import { parseGeo, type Geo } from './geo.js';

export { parseGeo };

/** Analytics day boundaries follow Indian time. */
const TZ = 'Asia/Kolkata';
/** A heartbeat covers at most this many engaged seconds (the client sends one every 30 s). */
const MAX_HEARTBEAT_SEC = 120;
const MAX_BATCH_SEC = 600;

export interface TrackContext {
  visitorId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  userAgent?: string | null;
  /** Coarse location from the edge (`cai_geo` cookie): country, state code, city. */
  geo?: Geo | null;
  /** Invitation this browser opened as a guest (`cai_ref` cookie), for the viral loop. */
  refEventId?: string | null;
}

const str = (v: unknown, max = 80) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max).toLowerCase() : null);


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

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly mail: MailService,
  ) {}

  async ingest(batch: TrackBatchInput, ctx: TrackContext): Promise<void> {
    const device = deviceOf(ctx.userAgent);
    if (device === 'bot') return;
    // Heartbeats only feed the daily rollup; storing each one raw would dwarf every other event.
    const raw = batch.events.filter((e) => e.name !== 'engagement');
    const seconds = batch.events
      .filter((e) => e.name === 'engagement')
      .reduce((sum, e) => sum + Math.min(Math.max(Number(e.props?.sec) || 0, 0), MAX_HEARTBEAT_SEC), 0);
    const views = raw.filter((e) => e.name === 'page_view').length;
    await Promise.all([
      raw.length
        ? this.db
            .insert(analyticsEvents)
            .values(
              raw.map((e) => ({
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
            .catch((err: Error) => this.logger.warn(`track failed: ${err.message}`))
        : undefined,
      seconds || views ? this.rollup(batch.visitorId, ctx.userId ?? null, device, Math.min(seconds, MAX_BATCH_SEC), views) : undefined,
      views ? this.attribute(batch.visitorId, ctx, device, raw.find((e) => e.name === 'page_view')!) : undefined,
    ]);
    if (ctx.userId) void this.touch(ctx.userId);
  }

  /**
   * First touch per visitor (channel, campaign, state/city tier, language, network). Later visits
   * only fill the account id and the latest campaign, so the row stays cheap to keep current.
   */
  private async attribute(visitorId: string, ctx: TrackContext, device: string, e: TrackBatchInput['events'][number]) {
    const p = e.props ?? {};
    const inApp = inAppBrowser(ctx.userAgent);
    const utmSource = str(p.utm_source);
    const utmMedium = str(p.utm_medium);
    const utmCampaign = str(p.utm_campaign, 120);
    const referrer = cleanReferrer(e.referrer);
    const channel = classifyChannel({ utmSource, utmMedium, referrer, inApp, paidClick: p.paid === true, guest: Boolean(ctx.refEventId) });
    const geo = ctx.geo;
    await this.db
      .insert(visitorAttribution)
      .values({
        visitorId,
        userId: ctx.userId ?? null,
        channel,
        utmSource,
        utmMedium,
        utmCampaign,
        referrer,
        landingPath: cleanPath(e.path),
        country: geo?.country ?? null,
        state: geo?.country === 'IN' ? (geo.region ?? null) : null,
        city: geo?.city ?? null,
        tier: cityTier(geo?.country, geo?.city),
        language: str(p.lang, 12),
        network: normaliseNetwork(p.net),
        inApp,
        device,
      })
      .onConflictDoUpdate({
        target: visitorAttribution.visitorId,
        set: {
          userId: sql`coalesce(${visitorAttribution.userId}, excluded.user_id)`,
          lastCampaign: sql`coalesce(excluded.utm_campaign, ${visitorAttribution.lastCampaign})`,
          // Older rows (or a first visit without the geo cookie yet) get location filled once known.
          country: sql`coalesce(${visitorAttribution.country}, excluded.country)`,
          state: sql`coalesce(${visitorAttribution.state}, excluded.state)`,
          city: sql`coalesce(${visitorAttribution.city}, excluded.city)`,
          tier: sql`case when ${visitorAttribution.tier} in ('unknown', '') or ${visitorAttribution.tier} is null then excluded.tier else ${visitorAttribution.tier} end`,
        },
      })
      .catch((err: Error) => this.logger.warn(`attribution failed: ${err.message}`));
  }

  /** One upsert per batch into today's (India time) row for this visitor. */
  private async rollup(visitorId: string, userId: string | null, device: string, seconds: number, views: number) {
    await this.db
      .insert(activityDaily)
      .values({ day: sql`(now() at time zone ${TZ})::date`, visitorId, userId, device, activeSeconds: seconds, pageViews: views })
      .onConflictDoUpdate({
        target: [activityDaily.day, activityDaily.visitorId],
        set: {
          activeSeconds: sql`least(${activityDaily.activeSeconds} + excluded.active_seconds, 86400)`,
          pageViews: sql`${activityDaily.pageViews} + excluded.page_views`,
          userId: sql`coalesce(excluded.user_id, ${activityDaily.userId})`,
          device: sql`coalesce(excluded.device, ${activityDaily.device})`,
          updatedAt: sql`now()`,
        },
      })
      .catch((err: Error) => this.logger.warn(`rollup failed: ${err.message}`));
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
    if (name === 'purchase' && ctx.userId) void this.rewardReferrer(ctx.userId).catch((err: Error) => this.logger.warn(`referral reward failed: ${err.message}`));
  }

  /**
   * Viral loop payoff: when someone who first came as a guest pays for their first order, the
   * family whose invitation they saw gets a one-time 20% coupon. The coupon code is derived from
   * the new customer, so the reward is issued at most once per referred person.
   */
  private async rewardReferrer(userId: string): Promise<void> {
    const [me] = await this.db.select({ ref: users.referredEventId }).from(users).where(eq(users.id, userId));
    if (!me?.ref) return;
    const [paid] = await this.db.select({ n: sql<number>`count(*)::int` }).from(orders).where(and(eq(orders.userId, userId), eq(orders.status, 'paid')));
    if ((paid?.n ?? 0) !== 1) return;
    const [ev] = await this.db.select({ ownerId: events.userId }).from(events).where(eq(events.id, me.ref));
    if (!ev || ev.ownerId === userId) return;
    const code = `THANKS-${createHash('sha1').update(userId).digest('hex').slice(0, 6).toUpperCase()}`;
    const days = 90;
    const [made] = await this.db
      .insert(coupons)
      .values({ code, description: `Referral thank-you (owner ${ev.ownerId})`, kind: 'percent', value: 20, maxUses: 1, perUserLimit: 1, endsAt: new Date(Date.now() + days * 86_400_000) })
      .onConflictDoNothing()
      .returning({ id: coupons.id });
    if (!made) return;
    await this.mail.toUser(ev.ownerId, 'referral.reward', (u) => ({ name: u.name, code, percent: 20, validDays: days }), { key: code });
  }

  /** A new account that first came as a guest of this invitation (viral loop). */
  referred(userId: string, eventId: string): void {
    void this.db
      .execute(sql`update users set referred_event_id = ${eventId}::uuid where id = ${userId} and referred_event_id is null and exists (select 1 from events where id = ${eventId}::uuid)`)
      .catch((err: Error) => this.logger.warn(`referral failed: ${err.message}`));
  }

  /** After sign-in: attribute the visitor's earlier anonymous activity to the account. */
  identify(visitorId: string | null | undefined, userId: string): void {
    if (!visitorId) return;
    void this.db
      .update(analyticsEvents)
      .set({ userId })
      .where(and(eq(analyticsEvents.visitorId, visitorId), isNull(analyticsEvents.userId)))
      .catch((err: Error) => this.logger.warn(`identify failed: ${err.message}`));
    void this.db
      .update(visitorAttribution)
      .set({ userId })
      .where(and(eq(visitorAttribution.visitorId, visitorId), isNull(visitorAttribution.userId)))
      .catch((err: Error) => this.logger.warn(`identify attribution failed: ${err.message}`));
    void this.db
      .update(activityDaily)
      .set({ userId })
      .where(and(eq(activityDaily.visitorId, visitorId), isNull(activityDaily.userId)))
      .catch((err: Error) => this.logger.warn(`identify rollup failed: ${err.message}`));
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
