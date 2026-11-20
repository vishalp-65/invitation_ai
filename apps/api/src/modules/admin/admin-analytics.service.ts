import { sql, type Database } from '@cardai/db';
import type { SQL } from 'drizzle-orm';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { SITE_DESIGNS, type AnalyticsRange } from '@cardai/shared';
import { DB_READ, REDIS, type Redis } from '../../infra/infra.module.js';
import { TemplatesService } from '../templates/templates.service.js';

export const RANGE_DAYS: Record<AnalyticsRange, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };

/**
 * Analytics day boundaries follow Indian time, not UTC. Inlined as literals (never user input) so the
 * same expression in SELECT and GROUP BY is identical text: two bind parameters would not be.
 */
const TZ = sql.raw(`'Asia/Kolkata'`);
const TODAY = sql`(now() at time zone ${TZ})::date`;
/** Charts longer than 90 days are drawn per week, so a year is 53 points, not 365. */
const unitFor = (days: number) => sql.raw(days > 90 ? `'week'` : `'day'`);
const CACHE_SEC = 60;

interface Kpis {
  visitors: number;
  signups: number;
  activeUsers: number;
  eventsCreated: number;
  orders: number;
  revenuePaise: number;
  payingUsers: number;
  discountPaise: number;
  /** Sign-ups that arrived through a tracked visit (denominator-safe for the conversion rate). */
  trackedSignups: number;
}

const n = (v: unknown) => Number(v ?? 0);
const round1 = (v: unknown) => Math.round(n(v) * 10) / 10;

@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);

  constructor(
    @Inject(DB_READ) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly templates: TemplatesService,
  ) {}

  private async rows<T>(q: SQL): Promise<T[]> {
    return (await this.db.execute(q)).rows as T[];
  }

  /**
   * Dashboards are read far more often than the numbers change: every report is computed at most
   * once a minute and shared by all admins (Redis), so a busy console never loads the database.
   */
  private async cached<T>(key: string, fn: () => Promise<T>, ttl = CACHE_SEC): Promise<T> {
    const k = `admin:stats:v2:${key}`;
    const hit = await this.redis.get(k).catch(() => null);
    if (hit) return JSON.parse(hit) as T;
    const value = await fn();
    void this.redis.set(k, JSON.stringify(value), 'EX', ttl).catch((e: Error) => this.logger.warn(`stats cache: ${e.message}`));
    return value;
  }

  /** Window = the `days` days ending `offset` days ago (today counts as day one). */
  private async kpis(offset: number, days: number): Promise<Kpis> {
    const from = sql`now() - make_interval(days => ${offset + days})`;
    const to = sql`now() - make_interval(days => ${offset})`;
    const d0 = sql`${TODAY} - ${offset + days}::int`;
    const d1 = sql`${TODAY} - ${offset}::int`;
    const [r] = await this.rows<Record<keyof Kpis, string | number | null>>(sql`
      with o as (
        select user_id, amount_paise - refunded_paise as amount_paise, discount_paise from orders where status in ('paid', 'refunded') and paid_at >= ${from} and paid_at < ${to}
      ), a as (
        select visitor_id, user_id, page_views from activity_daily where day > ${d0} and day <= ${d1}
      )
      select
        (select count(distinct visitor_id) from a where page_views > 0) as "visitors",
        (select count(distinct user_id) from a where user_id is not null) as "activeUsers",
        (select count(*) from users where created_at >= ${from} and created_at < ${to}) as "signups",
        (select count(*) from events where created_at >= ${from} and created_at < ${to}) as "eventsCreated",
        (select count(*) from o) as "orders",
        (select coalesce(sum(amount_paise), 0) from o) as "revenuePaise",
        (select count(distinct user_id) from o) as "payingUsers",
        (select coalesce(sum(discount_paise), 0) from o) as "discountPaise",
        (select count(*) from analytics_events s where s.name = 'signup' and s.created_at >= ${from} and s.created_at < ${to}
           and exists (select 1 from activity_daily v where v.visitor_id = s.visitor_id and v.page_views > 0 and v.day > ${d0} - 30 and v.day <= ${d1})) as "trackedSignups"
    `);
    return Object.fromEntries(Object.entries(r ?? {}).map(([k, v]) => [k, n(v)])) as unknown as Kpis;
  }

  /** Visitors, sign-ups, orders and revenue per day (per week beyond 90 days), gaps filled with zero. */
  private async series(days: number) {
    const unit = unitFor(days);
    const from = sql`now() - make_interval(days => ${days})`;
    const rows = await this.rows<{ day: string; visitors: string; signups: string; orders: string; revenue: string }>(sql`
      with b as (
        select distinct date_trunc(${unit}, g)::date as b
        from generate_series((${TODAY} - ${days - 1}::int)::timestamp, ${TODAY}::timestamp, interval '1 day') g
      ),
      v as (
        select date_trunc(${unit}, day::timestamp)::date as b, count(distinct visitor_id) as n
        from activity_daily where page_views > 0 and day > ${TODAY} - ${days}::int group by 1
      ),
      s as (
        select date_trunc(${unit}, created_at at time zone ${TZ})::date as b, count(*) as n
        from users where created_at >= ${from} group by 1
      ),
      o as (
        select date_trunc(${unit}, paid_at at time zone ${TZ})::date as b, count(*) as n, sum(amount_paise - refunded_paise) as rev
        from orders where status in ('paid', 'refunded') and paid_at >= ${from} group by 1
      )
      select to_char(b.b, 'YYYY-MM-DD') as day, coalesce(v.n, 0) as visitors, coalesce(s.n, 0) as signups,
             coalesce(o.n, 0) as orders, coalesce(o.rev, 0) as revenue
      from b left join v using (b) left join s using (b) left join o using (b)
      order by b.b`);
    return rows.map((s) => ({ day: s.day, visitors: n(s.visitors), signups: n(s.signups), orders: n(s.orders), revenuePaise: n(s.revenue) }));
  }

  overview(range: AnalyticsRange) {
    return this.cached(`overview:${range}`, async () => {
      const days = RANGE_DAYS[range];
      const from = sql`now() - make_interval(days => ${days})`;
      const [current, previous, totals, series, funnel, products, recentOrders, topTemplates] = await Promise.all([
        this.kpis(0, days),
        this.kpis(days, days),
        this.rows<{ users: string; events: string; revenue: string; orders: string; paying: string }>(sql`
          select (select count(*) from users) as users, (select count(*) from events) as events,
                 (select coalesce(sum(amount_paise - refunded_paise),0) from orders where status in ('paid', 'refunded')) as revenue,
                 (select count(*) from orders where status='paid') as orders,
                 (select count(distinct user_id) from orders where status='paid') as paying`),
        this.series(days),
        this.funnel(from),
        this.rows<{ code: string; orders: string; revenue: string }>(sql`
          select product_code as code, count(*) as orders, coalesce(sum(amount_paise - refunded_paise), 0) as revenue
          from orders where status in ('paid', 'refunded') and paid_at >= ${from}
          group by product_code order by revenue desc`),
        this.rows<{ id: string; product: string; amount: number; name: string | null; email: string | null; paidAt: string; coupon: string | null }>(sql`
          select o.id, o.product_code as product, o.amount_paise as amount, u.name, u.email, o.paid_at as "paidAt", o.coupon_code as coupon
          from orders o join users u on u.id = o.user_id
          where o.status = 'paid' order by o.paid_at desc limit 8`),
        this.templateStats(range),
      ]);
      const t = totals[0]!;
      return {
        range,
        bucket: days > 90 ? 'week' : 'day',
        current,
        previous,
        totals: { users: n(t.users), events: n(t.events), revenuePaise: n(t.revenue), orders: n(t.orders), payingUsers: n(t.paying) },
        series,
        funnel,
        products: products.map((p) => ({ code: p.code, orders: n(p.orders), revenuePaise: n(p.revenue) })),
        recentOrders,
        topTemplates: topTemplates.slice(0, 6),
      };
    });
  }

  /** Distinct visitors reaching each step in the window (users counted via their linked visitor id). */
  private async funnel(from: SQL) {
    const [r] = await this.rows<Record<string, string>>(sql`
      select
        count(distinct visitor_id) filter (where name = 'page_view') as visited,
        count(distinct visitor_id) filter (where name = 'template_view') as "viewedTemplate",
        count(distinct visitor_id) filter (where name in ('signup_start', 'otp_requested')) as "startedSignup",
        count(distinct coalesce(user_id::text, visitor_id)) filter (where name = 'signup') as "signedUp",
        count(distinct coalesce(user_id::text, visitor_id)) filter (where name = 'event_created') as "createdInvite",
        count(distinct coalesce(user_id::text, visitor_id)) filter (where name = 'checkout_start') as "startedCheckout",
        count(distinct coalesce(user_id::text, visitor_id)) filter (where name = 'purchase') as "paid"
      from analytics_events where created_at >= ${from}`);
    const steps: Array<[string, string]> = [
      ['visited', 'Visited the site'],
      ['viewedTemplate', 'Viewed a template'],
      ['startedSignup', 'Opened sign-up'],
      ['signedUp', 'Signed up'],
      ['createdInvite', 'Created an invitation'],
      ['startedCheckout', 'Started checkout'],
      ['paid', 'Paid'],
    ];
    return steps.map(([key, label]) => ({ key, label, count: n(r?.[key]) }));
  }

  /**
   * Per-template usage. Popular = all-time invitations made with it; trending = selections in the
   * last 7 days compared with the 7 days before (with smoothing so 1 → 2 isn't "+100 %").
   */
  async templateStats(range: AnalyticsRange) {
    const days = RANGE_DAYS[range];
    const [usage, activity, sales] = await Promise.all([
      this.rows<{ id: string; total: string; recent: string }>(sql`
        select template_id as id, count(*) as total,
               count(*) filter (where created_at >= now() - make_interval(days => ${days})) as recent
        from events group by template_id`),
      this.rows<{ id: string; views: string; selects: string; last7: string; prev7: string }>(sql`
        select template_id as id,
          count(*) filter (where name = 'template_view' and created_at >= now() - make_interval(days => ${days})) as views,
          count(*) filter (where name = 'template_select' and created_at >= now() - make_interval(days => ${days})) as selects,
          count(*) filter (where name in ('template_select', 'event_created') and created_at >= now() - interval '7 days') as last7,
          count(*) filter (where name in ('template_select', 'event_created') and created_at >= now() - interval '14 days' and created_at < now() - interval '7 days') as prev7
        from analytics_events where template_id is not null and created_at >= now() - make_interval(days => ${Math.max(days, 14)})
        group by template_id`),
      this.rows<{ id: string; orders: string; revenue: string }>(sql`
        select e.template_id as id, count(*) as orders, coalesce(sum(o.amount_paise), 0) as revenue
        from orders o join events e on e.id = o.event_id
        where o.status = 'paid' group by e.template_id`),
    ]);
    const u = new Map(usage.map((r) => [r.id, r]));
    const a = new Map(activity.map((r) => [r.id, r]));
    const s = new Map(sales.map((r) => [r.id, r]));
    return (await this.templates.everything())
      .map((t) => {
        const last7 = n(a.get(t.id)?.last7);
        const prev7 = n(a.get(t.id)?.prev7);
        return {
          id: t.id,
          name: t.name,
          family: t.family?.name ?? null,
          source: t.source,
          premium: t.premium,
          featured: t.featured ?? false,
          hidden: t.hidden,
          eventTypes: t.eventTypes,
          tags: t.tags,
          coverPage: t.doc ? (t.doc.pages.find((p) => p.id === 'cover') ?? t.doc.pages[0]) : undefined,
          invitations: n(u.get(t.id)?.total),
          invitationsInRange: n(u.get(t.id)?.recent),
          views: n(a.get(t.id)?.views),
          selects: n(a.get(t.id)?.selects),
          orders: n(s.get(t.id)?.orders),
          revenuePaise: n(s.get(t.id)?.revenue),
          last7,
          trend: Math.round(((last7 - prev7) / (prev7 + 3)) * 100),
          trendScore: last7 * 2 + (last7 - prev7),
        };
      })
      .sort((x, y) => y.invitations - x.invitations || y.views - x.views);
  }

  /** Invitations per occasion, all time and in the window. */
  eventTypeStats(range: AnalyticsRange) {
    return this.cached(`event-types:${range}`, async () => {
      const days = RANGE_DAYS[range];
      const rows = await this.rows<{ type: string; total: string; recent: string; paid: string }>(sql`
        select e.type, count(*) as total,
               count(*) filter (where e.created_at >= now() - make_interval(days => ${days})) as recent,
               count(*) filter (where exists (select 1 from orders o where o.event_id = e.id and o.status = 'paid')) as paid
        from events e group by e.type order by total desc`);
      return rows.map((r) => ({ type: r.type, total: n(r.total), recent: n(r.recent), paid: n(r.paid) }));
    });
  }

  /** How people use the product: actions, pages, devices, sources, sessions, and when they come. */
  behaviour(range: AnalyticsRange) {
    return this.cached(`behaviour:${range}`, async () => {
      const days = RANGE_DAYS[range];
      const from = sql`now() - make_interval(days => ${days})`;
      const [actions, pages, devices, referrers, heat, sessions, dau, retention] = await Promise.all([
        this.rows<{ name: string; count: string; people: string }>(sql`
          select name, count(*) as count, count(distinct coalesce(user_id::text, visitor_id)) as people
          from analytics_events where created_at >= ${from} group by name order by count desc`),
        this.rows<{ path: string; views: string; visitors: string }>(sql`
          select path, count(*) as views, count(distinct visitor_id) as visitors
          from analytics_events where name = 'page_view' and path is not null and created_at >= ${from}
          group by path order by views desc limit 12`),
        this.rows<{ device: string; visitors: string }>(sql`
          select coalesce(device, 'unknown') as device, count(distinct visitor_id) as visitors
          from activity_daily where page_views > 0 and day > ${TODAY} - ${days}::int group by 1 order by 2 desc`),
        this.rows<{ source: string; visitors: string }>(sql`
          select coalesce(referrer, 'Direct') as source, count(distinct visitor_id) as visitors
          from analytics_events where name = 'page_view' and created_at >= ${from} group by 1 order by 2 desc limit 8`),
        this.rows<{ dow: number; hour: number; count: string }>(sql`
          select extract(isodow from created_at at time zone ${TZ})::int as dow, extract(hour from created_at at time zone ${TZ})::int as hour, count(*) as count
          from analytics_events where name = 'page_view' and created_at >= ${from} group by 1, 2`),
        this.rows<{ sessions: string; avgEvents: string; avgMinutes: string }>(sql`
          select count(*) as sessions, coalesce(avg(n), 0) as "avgEvents", coalesce(avg(mins), 0) as "avgMinutes" from (
            select session_id, count(*) as n, extract(epoch from max(created_at) - min(created_at)) / 60 as mins
            from analytics_events where session_id is not null and created_at >= ${from} group by session_id
          ) s`),
        this.rows<{ day: string; users: string }>(sql`
          select to_char(day, 'YYYY-MM-DD') as day, count(distinct user_id) as users
          from activity_daily where user_id is not null and day > ${TODAY} - ${days}::int group by day order by day`),
        // Of the people who signed up in the window, how many came back on a later day.
        this.rows<{ cohort: string; returned: string }>(sql`
          select count(*) as cohort, count(*) filter (where back) as returned from (
            select u.id, exists (
              select 1 from activity_daily a where a.user_id = u.id and a.day > (u.created_at at time zone ${TZ})::date
            ) as back from users u where u.created_at >= ${from}
          ) c`),
      ]);
      const s = sessions[0];
      const r = retention[0];
      return {
        range,
        actions: actions.map((x) => ({ name: x.name, count: n(x.count), people: n(x.people) })),
        pages: pages.map((x) => ({ path: x.path, views: n(x.views), visitors: n(x.visitors) })),
        devices: devices.map((x) => ({ device: x.device, visitors: n(x.visitors) })),
        referrers: referrers.map((x) => ({ source: x.source, visitors: n(x.visitors) })),
        heatmap: heat.map((x) => ({ dow: x.dow, hour: x.hour, count: n(x.count) })),
        sessions: { count: n(s?.sessions), avgEvents: round1(s?.avgEvents), avgMinutes: round1(s?.avgMinutes) },
        dailyActive: dau.map((x) => ({ day: x.day, users: n(x.users) })),
        retention: { cohort: n(r?.cohort), returned: n(r?.returned) },
      };
    });
  }

  /**
   * Growth & engagement: active people (day / week / month / year), engaged time per person per
   * day / week / month / year, repeat rates, weekly retention cohorts and visitor → sign-up
   * conversion by source, device and landing page.
   */
  growth(range: AnalyticsRange) {
    return this.cached(`growth:${range}`, async () => {
      const days = RANGE_DAYS[range];
      const unit = unitFor(days);
      const from = sql`now() - make_interval(days => ${days})`;
      const start = sql`${TODAY} - ${days}::int`;
      // A person = their account when signed in, else the anonymous visitor (one row per person-day).
      const personDays = sql`
        select coalesce(user_id::text, visitor_id) as who, bool_or(user_id is not null) as member, day, sum(active_seconds) as s
        from activity_daily where day > ${TODAY} - 365 group by 1, 3`;

      const [active, time, timeSeries, dist, repeatV, repeatBuy, repeatMake, cohortSize, cohortCells, conv, convSeries] = await Promise.all([
        this.rows<Record<string, string>>(sql`
          select
            count(distinct visitor_id) filter (where day = ${TODAY}) as "dVisitors",
            count(distinct visitor_id) filter (where day > ${TODAY} - 7) as "wVisitors",
            count(distinct visitor_id) filter (where day > ${TODAY} - 30) as "mVisitors",
            count(distinct visitor_id) as "yVisitors",
            count(distinct user_id) filter (where day = ${TODAY}) as "dUsers",
            count(distinct user_id) filter (where day > ${TODAY} - 7) as "wUsers",
            count(distinct user_id) filter (where day > ${TODAY} - 30) as "mUsers",
            count(distinct user_id) as "yUsers",
            (select count(*) from (select distinct day, user_id from activity_daily where user_id is not null and day > ${TODAY} - 30) x) / 30.0 as "avgDailyUsers30"
          from activity_daily where day > ${TODAY} - 365`),
        this.rows<Record<string, string>>(sql`
          with p as (${personDays}), e as (select * from p where s > 0)
          select
            (select avg(s) from e where day > ${TODAY} - 30) as "perDay",
            (select percentile_cont(0.5) within group (order by s) from e where day > ${TODAY} - 30) as "medianDay",
            (select avg(t) from (select who, date_trunc('week', day::timestamp), sum(s) as t from e where day > ${TODAY} - 84 group by 1, 2) w) as "perWeek",
            (select avg(t) from (select who, date_trunc('month', day::timestamp), sum(s) as t from e group by 1, 2) m) as "perMonth",
            (select avg(t) from (select who, sum(s) as t from e group by 1) y) as "perYear",
            (select avg(s) from e where member and day > ${TODAY} - 30) as "memberPerDay",
            (select avg(t) from (select who, date_trunc('week', day::timestamp), sum(s) as t from e where member and day > ${TODAY} - 84 group by 1, 2) w) as "memberPerWeek",
            (select avg(t) from (select who, date_trunc('month', day::timestamp), sum(s) as t from e where member group by 1, 2) m) as "memberPerMonth",
            (select avg(t) from (select who, sum(s) as t from e where member group by 1) y) as "memberPerYear",
            (select coalesce(sum(s), 0) from e where day > ${start}) as "totalInRange"`),
        this.rows<{ day: string; seconds: string; people: string; personDays: string }>(sql`
          with p as (${personDays})
          select to_char(date_trunc(${unit}, day::timestamp), 'YYYY-MM-DD') as day, sum(s) as seconds,
                 count(distinct who) as people, count(*) filter (where s > 0) as "personDays"
          from p where day > ${start} group by 1 order by 1`),
        this.rows<Record<string, string>>(sql`
          with p as (${personDays})
          select
            count(*) filter (where s < 60) as "lt1",
            count(*) filter (where s >= 60 and s < 300) as "m1to5",
            count(*) filter (where s >= 300 and s < 900) as "m5to15",
            count(*) filter (where s >= 900 and s < 1800) as "m15to30",
            count(*) filter (where s >= 1800 and s < 3600) as "m30to60",
            count(*) filter (where s >= 3600) as "h1plus"
          from p where day > ${start}`),
        // Visitors in the window: how many days they came, and whether they had been here before it.
        this.rows<Record<string, string>>(sql`
          with v as (
            select visitor_id, min(day) as first_day, count(*) filter (where day > ${start}) as days
            from activity_daily where page_views > 0 group by visitor_id
            having count(*) filter (where day > ${start}) > 0
          )
          select count(*) as visitors,
            count(*) filter (where days >= 2) as "multiDay",
            count(*) filter (where first_day <= ${start}) as "returning",
            coalesce(avg(days), 0) as "avgDays",
            count(*) filter (where days = 1) as d1,
            count(*) filter (where days = 2) as d2,
            count(*) filter (where days between 3 and 5) as d3to5,
            count(*) filter (where days between 6 and 10) as d6to10,
            count(*) filter (where days > 10) as d11plus
          from v`),
        this.rows<Record<string, string>>(sql`
          with b as (select user_id, count(*) as n, max(paid_at) as last_paid from orders where status = 'paid' group by user_id)
          select count(*) as payers, count(*) filter (where n >= 2) as repeat,
                 count(*) filter (where last_paid >= ${from}) as "payersInRange",
                 count(*) filter (where last_paid >= ${from} and n >= 2) as "repeatInRange",
                 coalesce(avg(n), 0) as "ordersPerPayer"
          from b`),
        this.rows<Record<string, string>>(sql`
          select count(*) as creators, count(*) filter (where n >= 2) as repeat, coalesce(avg(n), 0) as "perCreator"
          from (select user_id, count(*) as n from events group by user_id) c`),
        this.rows<{ cohort: string; size: string }>(sql`
          select to_char(date_trunc('week', created_at at time zone ${TZ}), 'YYYY-MM-DD') as cohort, count(*) as size
          from users where created_at at time zone ${TZ} >= date_trunc('week', now() at time zone ${TZ}) - interval '7 weeks'
          group by 1 order by 1`),
        this.rows<{ cohort: string; week: number; active: string }>(sql`
          with c as (
            select id, date_trunc('week', created_at at time zone ${TZ})::date as wk from users
            where created_at at time zone ${TZ} >= date_trunc('week', now() at time zone ${TZ}) - interval '7 weeks'
          ),
          a as (
            select distinct user_id, date_trunc('week', day::timestamp)::date as wk from activity_daily
            where user_id is not null and day >= (${TODAY} - 56)
          )
          select to_char(c.wk, 'YYYY-MM-DD') as cohort, ((a.wk - c.wk) / 7)::int as week, count(distinct c.id) as active
          from c join a on a.user_id = c.id and a.wk >= c.wk
          group by 1, 2 order by 1, 2`),
        // First touch of each visitor in the window, then who signed up, grouped three ways at once.
        this.rows<{ dim: 'source' | 'device' | 'landing'; key: string; visitors: string; signups: string }>(sql`
          with f as (
            select distinct on (visitor_id) visitor_id, coalesce(referrer, 'Direct') as source, coalesce(device, 'unknown') as device, coalesce(path, '/') as landing
            from analytics_events where name = 'page_view' and created_at >= ${from}
            order by visitor_id, created_at
          ),
          s as (select distinct visitor_id from analytics_events where name = 'signup' and created_at >= ${from})
          select case when grouping(f.source) = 0 then 'source' when grouping(f.device) = 0 then 'device' else 'landing' end as dim,
                 coalesce(f.source, f.device, f.landing) as key,
                 count(*) as visitors, count(s.visitor_id) as signups
          from f left join s on s.visitor_id = f.visitor_id
          group by grouping sets ((f.source), (f.device), (f.landing))`),
        this.series(days),
      ]);

      const a = active[0] ?? {};
      const t = time[0] ?? {};
      const d = dist[0] ?? {};
      const rv = repeatV[0] ?? {};
      const rb = repeatBuy[0] ?? {};
      const rm = repeatMake[0] ?? {};
      const mins = (v: unknown) => round1(n(v) / 60);
      const dims = (dim: 'source' | 'device' | 'landing', limit: number) =>
        conv
          .filter((r) => r.dim === dim)
          .map((r) => ({ key: r.key, visitors: n(r.visitors), signups: n(r.signups) }))
          .sort((x, y) => y.visitors - x.visitors)
          .slice(0, limit);

      return {
        range,
        bucket: days > 90 ? 'week' : 'day',
        active: {
          visitors: { day: n(a.dVisitors), week: n(a.wVisitors), month: n(a.mVisitors), year: n(a.yVisitors) },
          users: { day: n(a.dUsers), week: n(a.wUsers), month: n(a.mUsers), year: n(a.yUsers) },
          /** Average daily signed-in users over 30 days ÷ monthly signed-in users. */
          stickiness: n(a.mUsers) ? round1((n(a.avgDailyUsers30) / n(a.mUsers)) * 100) : 0,
        },
        time: {
          everyone: { day: mins(t.perDay), week: mins(t.perWeek), month: mins(t.perMonth), year: mins(t.perYear) },
          members: { day: mins(t.memberPerDay), week: mins(t.memberPerWeek), month: mins(t.memberPerMonth), year: mins(t.memberPerYear) },
          medianDay: mins(t.medianDay),
          totalHoursInRange: round1(n(t.totalInRange) / 3600),
        },
        timeSeries: timeSeries.map((r) => ({
          day: r.day,
          minutes: Math.round(n(r.seconds) / 60),
          people: n(r.people),
          avgMinutes: n(r.personDays) ? round1(n(r.seconds) / n(r.personDays) / 60) : 0,
        })),
        timeDistribution: [
          { key: 'lt1', label: 'Under 1 min', value: n(d.lt1) },
          { key: 'm1to5', label: '1–5 min', value: n(d.m1to5) },
          { key: 'm5to15', label: '5–15 min', value: n(d.m5to15) },
          { key: 'm15to30', label: '15–30 min', value: n(d.m15to30) },
          { key: 'm30to60', label: '30–60 min', value: n(d.m30to60) },
          { key: 'h1plus', label: 'Over 1 hour', value: n(d.h1plus) },
        ],
        repeat: {
          visitors: n(rv.visitors),
          multiDay: n(rv.multiDay),
          returning: n(rv.returning),
          avgDays: round1(rv.avgDays),
          frequency: [
            { key: 'd1', label: '1 day', value: n(rv.d1) },
            { key: 'd2', label: '2 days', value: n(rv.d2) },
            { key: 'd3to5', label: '3–5 days', value: n(rv.d3to5) },
            { key: 'd6to10', label: '6–10 days', value: n(rv.d6to10) },
            { key: 'd11plus', label: '11+ days', value: n(rv.d11plus) },
          ],
          payers: n(rb.payers),
          repeatPayers: n(rb.repeat),
          payersInRange: n(rb.payersInRange),
          repeatPayersInRange: n(rb.repeatInRange),
          ordersPerPayer: round1(rb.ordersPerPayer),
          creators: n(rm.creators),
          repeatCreators: n(rm.repeat),
          invitationsPerCreator: round1(rm.perCreator),
        },
        cohorts: cohortSize.map((c) => ({
          cohort: c.cohort,
          size: n(c.size),
          weeks: cohortCells.filter((x) => x.cohort === c.cohort).map((x) => ({ week: n(x.week), active: n(x.active) })),
        })),
        conversion: {
          series: convSeries.map((s) => ({ day: s.day, visitors: s.visitors, signups: s.signups })),
          bySource: dims('source', 10),
          byDevice: dims('device', 5),
          byLanding: dims('landing', 10),
        },
      };
    });
  }

  /** Video / website design packs: invitations using each, published sites and finished films. */
  designStats() {
    return this.cached('designs', async () => {
      const [sites, films] = await Promise.all([
        this.rows<{ id: string; events: string; published: string; recent: string }>(sql`
          select site->>'design' as id, count(*) as events, count(*) filter (where status = 'published') as published,
                 count(*) filter (where created_at >= now() - interval '30 days') as recent
          from events where site is not null and site->>'design' is not null group by 1`),
        this.rows<{ id: string; films: string }>(sql`
          select e.site->>'design' as id, count(*) as films
          from renders r join events e on e.id = r.event_id
          where r.format = 'site_video' and r.status = 'completed' and e.site->>'design' is not null group by 1`),
      ]);
      const s = new Map(sites.map((r) => [r.id, r]));
      const f = new Map(films.map((r) => [r.id, n(r.films)]));
      return Object.fromEntries(
        SITE_DESIGNS.map((d) => [d.id, { events: n(s.get(d.id)?.events), published: n(s.get(d.id)?.published), recent: n(s.get(d.id)?.recent), films: f.get(d.id) ?? 0 }]),
      );
    });
  }

  /** System health: render queue, failures, AI spend, storage and the biggest tables. */
  operations(range: AnalyticsRange) {
    return this.cached(`ops:${range}`, async () => {
      const days = RANGE_DAYS[range];
      const from = sql`now() - make_interval(days => ${days})`;
      const [renders, stuck, failures, ai, storage, invites, tables] = await Promise.all([
        this.rows<{ format: string; status: string; count: string; secs: string | null }>(sql`
          select format, status, count(*) as count,
                 avg(extract(epoch from completed_at - created_at)) filter (where status = 'completed' and completed_at is not null) as secs
          from renders where created_at >= ${from} group by 1, 2`),
        this.rows<{ count: string }>(sql`
          select count(*) as count from renders where status in ('queued', 'processing') and created_at < now() - interval '15 minutes'`),
        this.rows<{ id: string; format: string; error: string | null; createdAt: string; eventId: string; title: string; email: string | null }>(sql`
          select r.id, r.format, left(r.error, 300) as error, r.created_at as "createdAt", e.id as "eventId", e.title, u.email
          from renders r join events e on e.id = r.event_id left join users u on u.id = r.user_id
          where r.status = 'failed' and r.created_at >= ${from} order by r.created_at desc limit 12`),
        this.rows<{ kind: string; status: string; count: string; cost: string }>(sql`
          select kind, status, count(*) as count, coalesce(sum(cost_usd), 0) as cost
          from ai_generations where created_at >= ${from} group by 1, 2`),
        this.rows<{ kind: string; files: string; bytes: string }>(sql`
          select kind, count(*) as files, coalesce(sum(bytes), 0) as bytes from media_assets where ready group by 1 order by 3 desc`),
        this.rows<{ status: string; count: string; suspended: string }>(sql`
          select status, count(*) as count, count(*) filter (where suspended_at is not null) as suspended from events group by 1`),
        this.rows<{ name: string; rows: string; bytes: string }>(sql`
          select relname as name, n_live_tup as rows, pg_total_relation_size(relid) as bytes
          from pg_stat_user_tables order by pg_total_relation_size(relid) desc limit 10`),
      ]);
      return {
        range,
        renders: renders.map((r) => ({ format: r.format, status: r.status, count: n(r.count), avgSeconds: r.secs == null ? null : Math.round(n(r.secs)) })),
        stuck: n(stuck[0]?.count),
        failures,
        ai: ai.map((r) => ({ kind: r.kind, status: r.status, count: n(r.count), costUsd: Math.round(n(r.cost) * 100) / 100 })),
        storage: storage.map((r) => ({ kind: r.kind, files: n(r.files), bytes: n(r.bytes) })),
        invitations: invites.map((r) => ({ status: r.status, count: n(r.count), suspended: n(r.suspended) })),
        tables: tables.map((r) => ({ name: r.name, rows: n(r.rows), bytes: n(r.bytes) })),
      };
    });
  }
}
