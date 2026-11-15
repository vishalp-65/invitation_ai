import { sql, type Database } from '@cardai/db';
import type { SQL } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';
import type { AnalyticsRange } from '@cardai/shared';
import { DB } from '../../infra/infra.module.js';
import { TemplatesService } from '../templates/templates.service.js';

export const RANGE_DAYS: Record<AnalyticsRange, number> = { '7d': 7, '30d': 30, '90d': 90 };

/** Analytics day boundaries follow Indian time, not UTC. */
const TZ = 'Asia/Kolkata';

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

@Injectable()
export class AdminAnalyticsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly templates: TemplatesService,
  ) {}

  private async rows<T>(q: SQL): Promise<T[]> {
    return (await this.db.execute(q)).rows as T[];
  }

  private async kpis(from: SQL, to: SQL): Promise<Kpis> {
    const [r] = await this.rows<Record<keyof Kpis, string | number | null>>(sql`
      select
        (select count(distinct visitor_id) from analytics_events where name = 'page_view' and created_at >= ${from} and created_at < ${to}) as "visitors",
        (select count(*) from users where created_at >= ${from} and created_at < ${to}) as "signups",
        (select count(distinct user_id) from analytics_events where user_id is not null and created_at >= ${from} and created_at < ${to}) as "activeUsers",
        (select count(*) from events where created_at >= ${from} and created_at < ${to}) as "eventsCreated",
        (select count(*) from orders where status = 'paid' and paid_at >= ${from} and paid_at < ${to}) as "orders",
        (select coalesce(sum(amount_paise), 0) from orders where status = 'paid' and paid_at >= ${from} and paid_at < ${to}) as "revenuePaise",
        (select count(distinct user_id) from orders where status = 'paid' and paid_at >= ${from} and paid_at < ${to}) as "payingUsers",
        (select coalesce(sum(discount_paise), 0) from orders where status = 'paid' and paid_at >= ${from} and paid_at < ${to}) as "discountPaise",
        (select count(*) from analytics_events s where s.name = 'signup' and s.created_at >= ${from} and s.created_at < ${to}
           and exists (select 1 from analytics_events v where v.visitor_id = s.visitor_id and v.name = 'page_view')) as "trackedSignups"
    `);
    return Object.fromEntries(Object.entries(r ?? {}).map(([k, v]) => [k, Number(v ?? 0)])) as unknown as Kpis;
  }

  async overview(range: AnalyticsRange) {
    const days = RANGE_DAYS[range];
    const now = sql`now()`;
    const from = sql`now() - make_interval(days => ${days})`;
    const prevFrom = sql`now() - make_interval(days => ${days * 2})`;

    const [current, previous, totals, series, funnel, products, recentOrders] = await Promise.all([
      this.kpis(from, now),
      this.kpis(prevFrom, from),
      this.rows<{ users: string; events: string; revenue: string; orders: string; paying: string }>(sql`
        select (select count(*) from users) as users, (select count(*) from events) as events,
               (select coalesce(sum(amount_paise),0) from orders where status='paid') as revenue,
               (select count(*) from orders where status='paid') as orders,
               (select count(distinct user_id) from orders where status='paid') as paying`),
      this.rows<{ day: string; visitors: string; signups: string; orders: string; revenue: string }>(sql`
        with d as (
          select generate_series((now() at time zone ${TZ})::date - ${days - 1}::int, (now() at time zone ${TZ})::date, interval '1 day')::date as day
        )
        select to_char(d.day, 'YYYY-MM-DD') as day,
          (select count(distinct visitor_id) from analytics_events a where a.name = 'page_view' and (a.created_at at time zone ${TZ})::date = d.day) as visitors,
          (select count(*) from users u where (u.created_at at time zone ${TZ})::date = d.day) as signups,
          (select count(*) from orders o where o.status = 'paid' and (o.paid_at at time zone ${TZ})::date = d.day) as orders,
          (select coalesce(sum(amount_paise), 0) from orders o where o.status = 'paid' and (o.paid_at at time zone ${TZ})::date = d.day) as revenue
        from d order by d.day`),
      this.funnel(from),
      this.rows<{ code: string; orders: string; revenue: string }>(sql`
        select product_code as code, count(*) as orders, coalesce(sum(amount_paise), 0) as revenue
        from orders where status = 'paid' and paid_at >= ${from}
        group by product_code order by revenue desc`),
      this.rows<{ id: string; product: string; amount: number; name: string | null; email: string | null; paidAt: string; coupon: string | null }>(sql`
        select o.id, o.product_code as product, o.amount_paise as amount, u.name, u.email, o.paid_at as "paidAt", o.coupon_code as coupon
        from orders o join users u on u.id = o.user_id
        where o.status = 'paid' order by o.paid_at desc limit 8`),
    ]);
    const t = totals[0]!;
    return {
      range,
      current,
      previous,
      totals: { users: Number(t.users), events: Number(t.events), revenuePaise: Number(t.revenue), orders: Number(t.orders), payingUsers: Number(t.paying) },
      series: series.map((s) => ({ day: s.day, visitors: Number(s.visitors), signups: Number(s.signups), orders: Number(s.orders), revenuePaise: Number(s.revenue) })),
      funnel,
      products: products.map((p) => ({ code: p.code, orders: Number(p.orders), revenuePaise: Number(p.revenue) })),
      recentOrders,
      topTemplates: (await this.templateStats(range)).slice(0, 6),
    };
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
    return steps.map(([key, label]) => ({ key, label, count: Number(r?.[key] ?? 0) }));
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
        const last7 = Number(a.get(t.id)?.last7 ?? 0);
        const prev7 = Number(a.get(t.id)?.prev7 ?? 0);
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
          invitations: Number(u.get(t.id)?.total ?? 0),
          invitationsInRange: Number(u.get(t.id)?.recent ?? 0),
          views: Number(a.get(t.id)?.views ?? 0),
          selects: Number(a.get(t.id)?.selects ?? 0),
          orders: Number(s.get(t.id)?.orders ?? 0),
          revenuePaise: Number(s.get(t.id)?.revenue ?? 0),
          last7,
          trend: Math.round(((last7 - prev7) / (prev7 + 3)) * 100),
          trendScore: last7 * 2 + (last7 - prev7),
        };
      })
      .sort((x, y) => y.invitations - x.invitations || y.views - x.views);
  }

  /** How people use the product: actions, pages, devices, sources, sessions, and when they come. */
  async behaviour(range: AnalyticsRange) {
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
        from analytics_events where name = 'page_view' and created_at >= ${from} group by 1 order by 2 desc`),
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
        select to_char((created_at at time zone ${TZ})::date, 'YYYY-MM-DD') as day, count(distinct user_id) as users
        from analytics_events where user_id is not null and created_at >= ${from} group by 1 order by 1`),
      // Of the people who signed up in the window, how many came back on a later day.
      this.rows<{ cohort: string; returned: string }>(sql`
        select count(*) as cohort, count(*) filter (where back) as returned from (
          select u.id, exists (
            select 1 from analytics_events a where a.user_id = u.id and (a.created_at at time zone ${TZ})::date > (u.created_at at time zone ${TZ})::date
          ) as back from users u where u.created_at >= ${from}
        ) c`),
    ]);
    const s = sessions[0];
    const r = retention[0];
    return {
      range,
      actions: actions.map((x) => ({ name: x.name, count: Number(x.count), people: Number(x.people) })),
      pages: pages.map((x) => ({ path: x.path, views: Number(x.views), visitors: Number(x.visitors) })),
      devices: devices.map((x) => ({ device: x.device, visitors: Number(x.visitors) })),
      referrers: referrers.map((x) => ({ source: x.source, visitors: Number(x.visitors) })),
      heatmap: heat.map((x) => ({ dow: x.dow, hour: x.hour, count: Number(x.count) })),
      sessions: { count: Number(s?.sessions ?? 0), avgEvents: Number(Number(s?.avgEvents ?? 0).toFixed(1)), avgMinutes: Number(Number(s?.avgMinutes ?? 0).toFixed(1)) },
      dailyActive: dau.map((x) => ({ day: x.day, users: Number(x.users) })),
      retention: { cohort: Number(r?.cohort ?? 0), returned: Number(r?.returned ?? 0) },
    };
  }
}
