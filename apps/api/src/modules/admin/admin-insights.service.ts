import { sql, type Database } from '@cardai/db';
import { abuseSignals, ABUSE_PATTERNS, normaliseEmail, type AnalyticsRange } from '@cardai/shared';
import type { SQL } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';
import { DB_READ, REDIS, type Redis } from '../../infra/infra.module.js';
import { RANGE_DAYS } from './admin-analytics.service.js';

const TZ = sql.raw(`'Asia/Kolkata'`);
const n = (v: unknown) => Number(v ?? 0);
/** Net of refunds; refunded orders keep counting what was not given back. */
const NET = sql.raw(`(amount_paise - refunded_paise)`);

type Dim = 'channel' | 'campaign' | 'state' | 'tier' | 'language' | 'network' | 'inApp' | 'device' | 'country';

/**
 * Acquisition (India-first), guests & sharing, revenue quality and trust & safety. All reads go to
 * the read replica when one is configured, and every report is cached for a minute in Redis.
 */
@Injectable()
export class AdminInsightsService {
  constructor(
    @Inject(DB_READ) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  private async rows<T>(q: SQL): Promise<T[]> {
    return (await this.db.execute(q)).rows as T[];
  }

  private async cached<T>(key: string, fn: () => Promise<T>, ttl = 60): Promise<T> {
    const k = `admin:stats:v3:${key}`;
    const hit = await this.redis.get(k).catch(() => null);
    if (hit) return JSON.parse(hit) as T;
    const v = await fn();
    void this.redis.set(k, JSON.stringify(v), 'EX', ttl).catch(() => undefined);
    return v;
  }

  // ---------------- Acquisition ----------------

  /**
   * Visitors first seen in the window, grouped nine ways in one pass: channel, campaign, state,
   * city tier, language, network, in-app browser, device and country. "Accounts" = visitors who
   * have an account now; payers and revenue are counted once per account.
   */
  acquisition(range: AnalyticsRange) {
    return this.cached(`acq:${range}`, async () => {
      const days = RANGE_DAYS[range];
      const from = sql`now() - make_interval(days => ${days})`;
      const rows = await this.rows<{ dim: Dim; key: string | null; visitors: string; accounts: string; payers: string; revenue: string }>(sql`
        with v as (
          select a.*, (a.user_id is not null and row_number() over (partition by a.user_id order by a.first_seen_at) = 1) as first_for_user
          from visitor_attribution a where a.first_seen_at >= ${from}
        ),
        rev as (
          select user_id, sum(${NET}) as r from orders where status in ('paid', 'refunded') group by user_id
        )
        select
          case
            when grouping(v.channel) = 0 then 'channel'
            when grouping(v.utm_campaign) = 0 then 'campaign'
            when grouping(v.state) = 0 then 'state'
            when grouping(v.tier) = 0 then 'tier'
            when grouping(v.language) = 0 then 'language'
            when grouping(v.network) = 0 then 'network'
            when grouping(v.in_app) = 0 then 'inApp'
            when grouping(v.device) = 0 then 'device'
            else 'country'
          end as dim,
          coalesce(v.channel, v.utm_campaign, v.state, v.tier, v.language, v.network, v.in_app, v.device, v.country) as key,
          count(*) as visitors,
          count(*) filter (where v.first_for_user) as accounts,
          count(rev.user_id) filter (where v.first_for_user) as payers,
          coalesce(sum(rev.r) filter (where v.first_for_user), 0) as revenue
        from v left join rev on rev.user_id = v.user_id
        group by grouping sets ((v.channel), (v.utm_campaign), (v.state), (v.tier), (v.language), (v.network), (v.in_app), (v.device), (v.country))`);
      const pick = (dim: Dim, limit = 15) =>
        rows
          .filter((r) => r.dim === dim && r.key)
          .map((r) => ({ key: r.key!, visitors: n(r.visitors), accounts: n(r.accounts), payers: n(r.payers), revenuePaise: n(r.revenue) }))
          .sort((a, b) => b.visitors - a.visitors)
          .slice(0, limit);
      const [totals] = await this.rows<{ visitors: string; located: string; india: string }>(sql`
        select count(*) as visitors, count(*) filter (where country is not null) as located, count(*) filter (where country = 'IN') as india
        from visitor_attribution where first_seen_at >= ${from}`);
      return {
        range,
        totals: { visitors: n(totals?.visitors), located: n(totals?.located), india: n(totals?.india) },
        channels: pick('channel'),
        campaigns: pick('campaign', 25),
        states: pick('state', 36),
        tiers: pick('tier'),
        languages: pick('language'),
        networks: pick('network'),
        inApp: pick('inApp'),
        devices: pick('device'),
        countries: pick('country', 10),
      };
    });
  }

  // ---------------- Guests & sharing ----------------

  guests(range: AnalyticsRange) {
    return this.cached(`guests:${range}`, async () => {
      const days = RANGE_DAYS[range];
      const from = sql`now() - make_interval(days => ${days})`;
      const dayFrom = sql`(now() at time zone ${TZ})::date - ${days}::int`;
      const unit = sql.raw(days > 90 ? `'week'` : `'day'`);
      const [totals, series, top, rsvp, viral, shares, published] = await Promise.all([
        this.rows<Record<string, string>>(sql`
          select coalesce(sum(views), 0) as views, coalesce(sum(guest_views), 0) as "guestViews",
                 coalesce(sum(whatsapp_views), 0) as whatsapp, coalesce(sum(mobile_views), 0) as mobile,
                 count(distinct event_id) as invitations
          from invitation_daily where day > ${dayFrom}`),
        this.rows<{ day: string; views: string }>(sql`
          select to_char(date_trunc(${unit}, day::timestamp), 'YYYY-MM-DD') as day, sum(views) as views
          from invitation_daily where day > ${dayFrom} group by 1 order by 1`),
        this.rows<{ id: string; title: string; type: string; views: string; guests: string; rsvps: string; yes: string }>(sql`
          select e.id, e.title, e.type, d.views,
                 (select count(*) from guests g where g.event_id = e.id) as guests,
                 (select count(*) from rsvps r where r.event_id = e.id) as rsvps,
                 (select count(*) from rsvps r where r.event_id = e.id and r.status = 'yes') as yes
          from (select event_id, sum(views) as views from invitation_daily where day > ${dayFrom} group by event_id order by 2 desc limit 15) d
          join events e on e.id = d.event_id order by d.views desc`),
        this.rows<Record<string, string>>(sql`
          select
            (select count(*) from guests g join events e on e.id = g.event_id where e.created_at >= ${from}) as invited,
            (select count(*) from guests g join events e on e.id = g.event_id where e.created_at >= ${from} and g.view_count > 0) as opened,
            (select count(*) from rsvps r where r.created_at >= ${from}) as rsvps,
            (select count(*) from rsvps r where r.created_at >= ${from} and r.status = 'yes') as yes,
            (select coalesce(sum(r.headcount), 0) from rsvps r where r.created_at >= ${from} and r.status <> 'no') as headcount`),
        this.rows<Record<string, string>>(sql`
          select count(*) as referred,
                 count(*) filter (where exists (select 1 from orders o where o.user_id = u.id and o.status = 'paid')) as "referredPaying",
                 (select count(*) from users where created_at >= ${from}) as signups
          from users u where u.referred_event_id is not null and u.created_at >= ${from}`),
        this.rows<{ kind: string; count: string; people: string }>(sql`
          select coalesce(props->>'kind', 'other') as kind, count(*) as count, count(distinct coalesce(user_id::text, visitor_id)) as people
          from analytics_events where name = 'share' and created_at >= ${from} group by 1`),
        this.rows<{ n: string }>(sql`select count(*) as n from events where status = 'published' and published_at >= ${from}`),
      ]);
      const t = totals[0] ?? {};
      const r = rsvp[0] ?? {};
      const v = viral[0] ?? {};
      return {
        range,
        bucket: days > 90 ? 'week' : 'day',
        totals: {
          views: n(t.views),
          guestViews: n(t.guestViews),
          whatsapp: n(t.whatsapp),
          mobile: n(t.mobile),
          invitations: n(t.invitations),
          published: n(published[0]?.n),
        },
        series: series.map((s) => ({ day: s.day, views: n(s.views) })),
        top: top.map((x) => ({ id: x.id, title: x.title, type: x.type, views: n(x.views), guests: n(x.guests), rsvps: n(x.rsvps), yes: n(x.yes) })),
        rsvp: { invited: n(r.invited), opened: n(r.opened), rsvps: n(r.rsvps), yes: n(r.yes), headcount: n(r.headcount) },
        viral: { referred: n(v.referred), referredPaying: n(v.referredPaying), signups: n(v.signups) },
        shares: shares.map((s) => ({ kind: s.kind, count: n(s.count), people: n(s.people) })),
      };
    });
  }

  // ---------------- Revenue ----------------

  revenue(range: AnalyticsRange) {
    return this.cached(`revenue:${range}`, async () => {
      const days = RANGE_DAYS[range];
      const from = sql`now() - make_interval(days => ${days})`;
      const [totals, methods, monthly, cohorts, coupon, states, active] = await Promise.all([
        this.rows<Record<string, string>>(sql`
          select count(*) as orders, coalesce(sum(amount_paise), 0) as gross, coalesce(sum(refunded_paise), 0) as refunds,
                 coalesce(sum(${NET}), 0) as net, count(distinct user_id) as payers,
                 count(*) filter (where refunded_paise > 0) as "refundedOrders",
                 coalesce(sum(discount_paise), 0) as discounts
          from orders where status in ('paid', 'refunded') and paid_at >= ${from}`),
        this.rows<{ method: string; orders: string; amount: string }>(sql`
          select coalesce(payment_method, 'unknown') as method, count(*) as orders, coalesce(sum(amount_paise), 0) as amount
          from orders where status in ('paid', 'refunded') and paid_at >= ${from} group by 1 order by 3 desc`),
        this.rows<{ month: string; product: string; net: string; orders: string }>(sql`
          select to_char(date_trunc('month', paid_at at time zone ${TZ}), 'YYYY-MM') as month, product_code as product,
                 sum(${NET}) as net, count(*) as orders
          from orders where status in ('paid', 'refunded') and paid_at >= date_trunc('month', now() at time zone ${TZ}) - interval '11 months'
          group by 1, 2 order by 1`),
        // Lifetime value: net revenue per user by months since their sign-up month (last 12 cohorts).
        this.rows<{ cohort: string; size: string; month: number; net: string }>(sql`
          with c as (
            select id, date_trunc('month', created_at at time zone ${TZ}) as m from users
            where created_at at time zone ${TZ} >= date_trunc('month', now() at time zone ${TZ}) - interval '11 months'
          ),
          s as (select m, count(*) as size from c group by m)
          select to_char(s.m, 'YYYY-MM') as cohort, s.size,
                 coalesce((extract(year from age(date_trunc('month', o.paid_at at time zone ${TZ}), s.m)) * 12 + extract(month from age(date_trunc('month', o.paid_at at time zone ${TZ}), s.m)))::int, 0) as month,
                 coalesce(sum(o.amount_paise - o.refunded_paise), 0) as net
          from s left join c on c.m = s.m
          left join orders o on o.user_id = c.id and o.status in ('paid', 'refunded')
          group by s.m, s.size, 3 order by 1, 3`),
        this.rows<Record<string, string>>(sql`
          select
            count(*) filter (where coupon_code is not null) as "withOrders",
            coalesce(sum(${NET}) filter (where coupon_code is not null), 0) as "withNet",
            coalesce(sum(discount_paise) filter (where coupon_code is not null), 0) as "withDiscount",
            coalesce(avg(${NET}) filter (where coupon_code is not null), 0) as "withAov",
            count(*) filter (where coupon_code is null) as "withoutOrders",
            coalesce(avg(${NET}) filter (where coupon_code is null), 0) as "withoutAov",
            coalesce(avg(discount_paise::float / nullif(list_price_paise, 0)) filter (where coupon_code is not null), 0) as "avgDiscountShare"
          from orders where status in ('paid', 'refunded') and paid_at >= ${from}`),
        this.rows<{ state: string | null; tier: string | null; net: string; payers: string }>(sql`
          with first_touch as (
            select distinct on (user_id) user_id, state, tier from visitor_attribution where user_id is not null order by user_id, first_seen_at
          )
          select f.state, f.tier, sum(o.amount_paise - o.refunded_paise) as net, count(distinct o.user_id) as payers
          from orders o left join first_touch f on f.user_id = o.user_id
          where o.status in ('paid', 'refunded') and o.paid_at >= ${from}
          group by grouping sets ((f.state), (f.tier))`),
        this.rows<{ active: string; signups: string }>(sql`
          select (select count(distinct user_id) from activity_daily where user_id is not null and day > (now() at time zone ${TZ})::date - ${days}::int) as active,
                 (select count(*) from users where created_at >= ${from}) as signups`),
      ]);
      const t = totals[0] ?? {};
      const c = coupon[0] ?? {};
      const a: Partial<{ active: string; signups: string }> = active[0] ?? {};
      const net = n(t.net);
      const cohortMap = new Map<string, { cohort: string; size: number; months: number[] }>();
      for (const r of cohorts) {
        const e = cohortMap.get(r.cohort) ?? { cohort: r.cohort, size: n(r.size), months: [] };
        e.months[n(r.month)] = (e.months[n(r.month)] ?? 0) + n(r.net);
        cohortMap.set(r.cohort, e);
      }
      return {
        range,
        totals: {
          orders: n(t.orders),
          grossPaise: n(t.gross),
          refundsPaise: n(t.refunds),
          netPaise: net,
          discountsPaise: n(t.discounts),
          payers: n(t.payers),
          refundedOrders: n(t.refundedOrders),
          activeUsers: n(a.active),
          signups: n(a.signups),
          arpuPaise: n(a.active) ? Math.round(net / n(a.active)) : 0,
          arppuPaise: n(t.payers) ? Math.round(net / n(t.payers)) : 0,
          aovPaise: n(t.orders) ? Math.round(net / n(t.orders)) : 0,
        },
        methods: methods.map((m) => ({ method: m.method, orders: n(m.orders), amountPaise: n(m.amount) })),
        monthly: monthly.map((m) => ({ month: m.month, product: m.product, netPaise: n(m.net), orders: n(m.orders) })),
        // Cumulative net revenue per user at month 0..11 after sign-up (only months that have happened).
        ltv: [...cohortMap.values()].map((e) => {
          const age = monthsSince(e.cohort);
          let run = 0;
          const cumulative: number[] = [];
          for (let i = 0; i <= Math.min(11, age); i++) {
            run += e.months[i] ?? 0;
            cumulative.push(e.size ? Math.round(run / e.size) : 0);
          }
          return { cohort: e.cohort, size: e.size, perUserPaise: cumulative };
        }),
        coupons: {
          withOrders: n(c.withOrders),
          withNetPaise: n(c.withNet),
          withDiscountPaise: n(c.withDiscount),
          withAovPaise: Math.round(n(c.withAov)),
          withoutOrders: n(c.withoutOrders),
          withoutAovPaise: Math.round(n(c.withoutAov)),
          avgDiscountPct: Math.round(n(c.avgDiscountShare) * 100),
        },
        byState: states.filter((s) => s.state).map((s) => ({ key: s.state!, netPaise: n(s.net), payers: n(s.payers) })).sort((x, y) => y.netPaise - x.netPaise),
        byTier: states.filter((s) => s.tier && !s.state).map((s) => ({ key: s.tier!, netPaise: n(s.net), payers: n(s.payers) })),
      };
    });
  }

  // ---------------- Trust & safety ----------------

  /** Things a human should look at. Nothing here acts on its own. */
  abuse() {
    return this.cached('abuse', async () => {
      const coarse = ABUSE_PATTERNS.map((p) => p.re.source.replace(/\\b/g, '').replace(/\\s\*/g, ' ?').replace(/\\s/g, ' ')).join('|');
      const [invites, burst, linked, refunders] = await Promise.all([
        // Coarse database filter, then the exact patterns in code (Postgres regex differs from JS).
        this.rows<{ id: string; title: string; slug: string; status: string; userId: string; email: string | null; createdAt: string; viewCount: number; text: string }>(sql`
          select e.id, e.title, e.slug, e.status, e.user_id as "userId", u.email, e.created_at as "createdAt", e.view_count as "viewCount",
                 left(e.title || ' ' || e.content::text || ' ' || coalesce(e.site::text, ''), 20000) as text
          from events e join users u on u.id = e.user_id
          where e.suspended_at is null and e.created_at >= now() - interval '120 days'
            and (e.title || ' ' || e.content::text || ' ' || coalesce(e.site::text, '')) ~* ${coarse}
          order by e.created_at desc limit 200`),
        this.rows<{ userId: string; email: string | null; name: string | null; n: string }>(sql`
          select e.user_id as "userId", u.email, u.name, count(*) as n
          from events e join users u on u.id = e.user_id
          where e.created_at >= now() - interval '24 hours' and u.role = 'user'
          group by 1, 2, 3 having count(*) >= 10 order by 4 desc limit 20`),
        // One browser signed into several accounts that each used a coupon.
        this.rows<{ visitorId: string; users: string[]; emails: string[]; coupons: string[] }>(sql`
          with pairs as (
            select distinct visitor_id, user_id from analytics_events where user_id is not null and created_at >= now() - interval '90 days'
          ),
          multi as (select visitor_id from pairs group by visitor_id having count(distinct user_id) >= 2)
          select p.visitor_id as "visitorId", array_agg(distinct p.user_id::text) as users, array_agg(distinct u.email) as emails,
                 array_agg(distinct o.coupon_code) filter (where o.coupon_code is not null) as coupons
          from pairs p join multi m on m.visitor_id = p.visitor_id
          join users u on u.id = p.user_id
          left join orders o on o.user_id = p.user_id and o.status = 'paid' and o.coupon_code is not null
          group by p.visitor_id
          having count(distinct o.user_id) >= 2
          limit 30`),
        this.rows<{ userId: string; email: string | null; refunds: string; refundedPaise: string }>(sql`
          select o.user_id as "userId", u.email, count(*) as refunds, sum(o.refunded_paise) as "refundedPaise"
          from orders o join users u on u.id = o.user_id where o.refunded_paise > 0
          group by 1, 2 having count(*) >= 2 order by 3 desc limit 20`),
      ]);
      // Gmail aliases (dots / +tags) of the same inbox that each redeemed a coupon.
      const couponUsers = await this.rows<{ userId: string; email: string; coupons: string[] }>(sql`
        select u.id as "userId", u.email, array_agg(distinct o.coupon_code) as coupons
        from orders o join users u on u.id = o.user_id
        where o.status = 'paid' and o.coupon_code is not null and u.email is not null
        group by 1, 2`);
      const byInbox = new Map<string, typeof couponUsers>();
      for (const u of couponUsers) {
        const key = normaliseEmail(u.email);
        byInbox.set(key, [...(byInbox.get(key) ?? []), u]);
      }
      const aliases = [...byInbox.entries()]
        .filter(([, list]) => list.length >= 2)
        .map(([inbox, list]) => ({ inbox, accounts: list.map((l) => ({ userId: l.userId, email: l.email, coupons: l.coupons })) }));

      return {
        invitations: invites
          .map((e) => ({ ...e, signals: abuseSignals(e.text), text: undefined }))
          .filter((e) => e.signals.length)
          .slice(0, 50)
          .map((e) => ({ ...e, signals: e.signals.map((s) => ABUSE_PATTERNS.find((p) => p.id === s)?.label ?? s) })),
        burst: burst.map((b) => ({ ...b, n: n(b.n) })),
        sharedDevices: linked,
        aliases,
        refunders: refunders.map((r) => ({ ...r, refunds: n(r.refunds), refundedPaise: n(r.refundedPaise) })),
      };
    }, 120);
  }
}

function monthsSince(cohort: string): number {
  const [y, m] = cohort.split('-').map(Number) as [number, number];
  const now = new Date(Date.now() + 5.5 * 3600_000);
  return (now.getUTCFullYear() - y) * 12 + (now.getUTCMonth() + 1 - m);
}
