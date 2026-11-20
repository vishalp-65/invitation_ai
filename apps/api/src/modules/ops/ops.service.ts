import { adminAlerts, sql, type Database } from '@cardai/db';
import { formatINR, INDIA_STATES, QUEUES } from '@cardai/shared';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import type { SQL } from 'drizzle-orm';
import type { Queue } from 'bullmq';
import { ENV, type Env } from '../../config/env.js';
import { DB, REDIS, STORAGE, type Redis, type S3Storage } from '../../infra/infra.module.js';
import { MailService } from '../mail/mail.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { WhatsAppClient } from '../whatsapp/whatsapp.client.js';

export type OpsJob = { type: 'check' } | { type: 'digest' } | { type: 'nightly' };

const TZ = sql.raw(`'Asia/Kolkata'`);
const TODAY = sql`(now() at time zone ${TZ})::date`;
/** The same problem is emailed at most this often. */
const ALERT_REPEAT_SEC = 2 * 3600;
/** Counter the payments webhook bumps on bad signatures / failures (read by the checks). */
import { WEBHOOK_FAIL_KEY } from './ops.keys.js';
export { WEBHOOK_FAIL_KEY };

interface Alert {
  kind: string;
  severity: 'warn' | 'critical';
  title: string;
  detail: string;
  actions: string[];
  data?: Record<string, unknown>;
}

const n = (v: unknown) => Number(v ?? 0);
const pctChange = (now: number, before: number) => (before ? `${now >= before ? '+' : '−'}${Math.abs(Math.round(((now - before) / before) * 100))}%` : now ? 'new' : '');

/**
 * Keeps an eye on the product so admins don't have to: health checks every 10 minutes (alerts by
 * email, critical ones on WhatsApp too), a daily summary at 8 am India time, and nightly upkeep
 * (finished-day metrics, analytics partitions and retention). One BullMQ scheduler per job, so
 * several API instances never double-run them.
 */
@Injectable()
export class OpsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OpsService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(DB) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(STORAGE) private readonly storage: S3Storage,
    private readonly mail: MailService,
    private readonly whatsapp: WhatsAppClient,
    private readonly payments: PaymentsService,
    @InjectQueue(QUEUES.ops) private readonly queue: Queue<OpsJob>,
  ) {}

  async onApplicationBootstrap() {
    try {
      if (!this.env.OPS_JOBS) {
        for (const id of ['ops-check', 'ops-digest', 'ops-nightly']) await this.queue.removeJobScheduler(id);
        return;
      }
      await this.queue.upsertJobScheduler('ops-check', { every: 10 * 60_000 }, { name: 'check', data: { type: 'check' }, opts: { attempts: 1 } });
      await this.queue.upsertJobScheduler('ops-digest', { pattern: '0 8 * * *', tz: 'Asia/Kolkata' }, { name: 'digest', data: { type: 'digest' }, opts: { attempts: 2 } });
      await this.queue.upsertJobScheduler('ops-nightly', { pattern: '30 0 * * *', tz: 'Asia/Kolkata' }, { name: 'nightly', data: { type: 'nightly' }, opts: { attempts: 2 } });
    } catch (err) {
      this.logger.warn(`Could not schedule ops jobs: ${(err as Error).message}`);
    }
  }

  private async rows<T>(q: SQL): Promise<T[]> {
    return (await this.db.execute(q)).rows as T[];
  }

  // ---------------- Health checks ----------------

  async check(): Promise<Alert[]> {
    const [renders, stuck, checkout, signups, ai] = await Promise.all([
      this.rows<{ total: string; failed: string; error: string | null }>(sql`
        select count(*) as total, count(*) filter (where status = 'failed') as failed,
               (select left(error, 200) from renders where status = 'failed' and created_at >= now() - interval '30 minutes' order by created_at desc limit 1) as error
        from renders where created_at >= now() - interval '30 minutes'`),
      this.rows<{ n: string; oldest: string | null }>(sql`
        select count(*) as n, min(created_at) as oldest from renders
        where status in ('queued', 'processing') and created_at < now() - interval '20 minutes'`),
      this.rows<{ created: string; paid: string }>(sql`
        select count(*) as created, count(*) filter (where status = 'paid') as paid
        from orders where created_at >= now() - interval '2 hours'`),
      // Sign-ups so far today vs the same hours on the previous 7 days (India time).
      this.rows<{ today: string; usual: string; hour: string }>(sql`
        select
          (select count(*) from users where created_at >= (${TODAY})::timestamp at time zone ${TZ}) as today,
          (select count(*) / 7.0 from users u, generate_series(1, 7) d
             where u.created_at >= ((${TODAY} - d)::timestamp at time zone ${TZ})
               and u.created_at < ((${TODAY} - d)::timestamp at time zone ${TZ}) + (now() - ((${TODAY})::timestamp at time zone ${TZ}))) as usual,
          extract(hour from now() at time zone ${TZ}) as hour`),
      this.rows<{ usd: string }>(sql`select coalesce(sum(cost_usd), 0) as usd from ai_generations where created_at >= now() - interval '24 hours'`),
    ]);
    const webhookFails = n(await this.redis.get(WEBHOOK_FAIL_KEY).catch(() => 0));
    const alerts: Alert[] = [];

    // Refunds left half-done (gateway accepted, DB write failed or the process died) are settled here.
    const refunds = await this.payments.reconcileRefunds().catch((err: Error) => {
      this.logger.error(`Refund reconciliation crashed: ${err.message}`);
      return { settled: [], failed: ['(all)'] };
    });
    const recovered = refunds.settled.filter((r) => r.recovered);
    if (recovered.length) {
      alerts.push({
        kind: 'refund-reconciled',
        severity: 'warn',
        title: `${recovered.length} refund(s) recovered from Razorpay`,
        detail: `Razorpay held refunds that were not saved here. They are recorded now. Access was not revoked: check these orders and revoke by hand if needed.`,
        actions: ['Open Orders and review the listed orders'],
        data: { orders: recovered.map((r) => r.orderId) },
      });
    }
    if (refunds.failed.length) {
      alerts.push({
        kind: 'refund-reconcile-failed',
        severity: 'critical',
        title: `${refunds.failed.length} refund(s) could not be reconciled`,
        detail: 'These orders have a refund claim that could not be checked against Razorpay. Refunds on them are blocked until this clears.',
        actions: ['Check the Razorpay dashboard for these payments', 'Check API logs for "Refund reconciliation failed"'],
        data: { orders: refunds.failed },
      });
    }

    const r = renders[0];
    if (r && n(r.failed) >= 5 && n(r.failed) / Math.max(1, n(r.total)) >= 0.3) {
      alerts.push({
        kind: 'renders-failing',
        severity: 'critical',
        title: `${n(r.failed)} renders failed in 30 minutes`,
        detail: `${n(r.failed)} of ${n(r.total)} renders failed in the last 30 minutes.${r.error ? ` Latest error: ${r.error}` : ''}`,
        actions: ['Check the worker container logs on the server', 'Pause video rendering from Settings → Switches if it keeps failing'],
        data: { failed: n(r.failed), total: n(r.total) },
      });
    }
    const s = stuck[0];
    if (s && n(s.n) > 0) {
      alerts.push({
        kind: 'renders-stuck',
        severity: n(s.n) >= 5 ? 'critical' : 'warn',
        title: `${n(s.n)} render job(s) stuck`,
        detail: `${n(s.n)} render(s) have been queued or running for over 20 minutes. Customers are waiting for their files.`,
        actions: ['Check that the worker is running', 'Restart the worker container'],
        data: { stuck: n(s.n) },
      });
    }
    if (webhookFails >= 3) {
      alerts.push({
        kind: 'payment-webhook',
        severity: 'critical',
        title: 'Payment webhooks are failing',
        detail: `${webhookFails} Razorpay webhook calls failed in the last hour (bad signature or error). Payments may not unlock purchases.`,
        actions: ['Check RAZORPAY_WEBHOOK_SECRET matches the Razorpay dashboard', 'Look for failed webhook deliveries in Razorpay'],
      });
    }
    const c = checkout[0];
    if (c && n(c.created) >= 8 && n(c.paid) === 0) {
      alerts.push({
        kind: 'checkout-no-payments',
        severity: 'warn',
        title: 'Checkouts started but nothing paid in 2 hours',
        detail: `${n(c.created)} checkouts were started in the last 2 hours and none were paid. UPI or the payment page may be failing.`,
        actions: ['Try a test payment', 'Check the Razorpay status page'],
      });
    }
    const g = signups[0];
    if (g && n(g.hour) >= 13 && n(g.usual) >= 5 && n(g.today) < n(g.usual) * 0.3) {
      alerts.push({
        kind: 'signups-drop',
        severity: 'warn',
        title: 'Sign-ups are far below normal today',
        detail: `${n(g.today)} sign-ups so far today vs about ${Math.round(n(g.usual))} by this time on a usual day. Sign-in emails or Google sign-in may be failing.`,
        actions: ['Try signing up with a new email', 'Check the email provider dashboard for bounces'],
      });
    }
    const usd = n(ai[0]?.usd);
    if (usd > this.env.ALERT_AI_USD_DAY) {
      alerts.push({
        kind: 'ai-spend',
        severity: 'warn',
        title: `AI spend $${usd.toFixed(2)} in 24 hours`,
        detail: `AI generation cost $${usd.toFixed(2)} in the last 24 hours, above the $${this.env.ALERT_AI_USD_DAY} limit.`,
        actions: ['Look at Operations → AI usage', 'Pause AI generation from Settings → Switches if it is abuse'],
      });
    }
    for (const a of alerts) await this.raise(a);
    return alerts;
  }

  /** Records the alert and notifies admins, at most once per kind every 2 hours. */
  async raise(a: Alert) {
    const fresh = await this.redis.set(`ops:alert:${a.kind}`, '1', 'EX', ALERT_REPEAT_SEC, 'NX').catch(() => 'OK');
    if (!fresh) return;
    await this.db.insert(adminAlerts).values({ kind: a.kind, severity: a.severity, title: a.title, detail: a.detail, data: a.data ?? null });
    const to = await this.recipients('alerts');
    for (const r of to) {
      await this.mail.send('admin.alert', r.email, { title: a.title, detail: a.detail, severity: a.severity, actions: a.actions }, { key: `alert-${a.kind}-${Math.floor(Date.now() / (ALERT_REPEAT_SEC * 1000))}-${r.id}` });
    }
    if (a.severity === 'critical' && this.env.ADMIN_ALERT_WHATSAPP && this.whatsapp.configured) {
      await this.whatsapp.sendText(this.env.ADMIN_ALERT_WHATSAPP, `🔴 ${a.title}\n${a.detail}\n${this.env.APP_URL}/admin/operations`).catch((e: Error) => this.logger.warn(`WhatsApp alert failed: ${e.message}`));
    }
    this.logger.warn(`ALERT ${a.kind}: ${a.title}`);
  }

  /** Owners get alerts; owners and marketing get the digest (if they keep it on). */
  private async recipients(kind: 'alerts' | 'digest') {
    const scopes = kind === 'alerts' ? sql`(admin_scopes = '[]'::jsonb or admin_scopes ? 'owner' or admin_scopes ? 'support')` : sql`(admin_scopes = '[]'::jsonb or admin_scopes ? 'owner' or admin_scopes ? 'marketing')`;
    return this.rows<{ id: string; email: string }>(sql`
      select id, email from users
      where role = 'admin' and disabled_at is null and email is not null and ${scopes}
        ${kind === 'digest' ? sql`and admin_digest` : sql``}`);
  }

  // ---------------- Daily metrics ----------------

  /** Upserts one finished day (India time) into daily_metrics. Idempotent. */
  async computeDay(day: string) {
    const start = sql`(${day}::date)::timestamp at time zone ${TZ}`;
    const end = sql`((${day}::date) + 1)::timestamp at time zone ${TZ}`;
    await this.db.execute(sql`
      insert into daily_metrics (day, visitors, signups, active_users, invitations, orders, revenue_paise, refunds_paise, engaged_seconds, guest_views, renders_failed, ai_cost_micro_usd, computed_at)
      select ${day}::date,
        (select count(distinct visitor_id) from activity_daily where day = ${day}::date and page_views > 0),
        (select count(*) from users where created_at >= ${start} and created_at < ${end}),
        (select count(distinct user_id) from activity_daily where day = ${day}::date and user_id is not null),
        (select count(*) from events where created_at >= ${start} and created_at < ${end}),
        (select count(*) from orders where status in ('paid', 'refunded') and paid_at >= ${start} and paid_at < ${end}),
        (select coalesce(sum(amount_paise), 0) from orders where status in ('paid', 'refunded') and paid_at >= ${start} and paid_at < ${end}),
        (select coalesce(sum(refunded_paise), 0) from orders where refunded_at >= ${start} and refunded_at < ${end}),
        (select coalesce(sum(active_seconds), 0) from activity_daily where day = ${day}::date),
        (select coalesce(sum(views), 0) from invitation_daily where day = ${day}::date),
        (select count(*) from renders where status = 'failed' and created_at >= ${start} and created_at < ${end}),
        (select coalesce(round(sum(cost_usd) * 1000000), 0) from ai_generations where created_at >= ${start} and created_at < ${end}),
        now()
      on conflict (day) do update set
        visitors = excluded.visitors, signups = excluded.signups, active_users = excluded.active_users, invitations = excluded.invitations,
        orders = excluded.orders, revenue_paise = excluded.revenue_paise, refunds_paise = excluded.refunds_paise, engaged_seconds = excluded.engaged_seconds,
        guest_views = excluded.guest_views, renders_failed = excluded.renders_failed, ai_cost_micro_usd = excluded.ai_cost_micro_usd, computed_at = now()`);
  }

  /** Yesterday (and the day before, late data), then any missing day in the last ~13 months. */
  async nightly() {
    const [y] = await this.rows<{ y: string; y2: string }>(sql`select to_char(${TODAY} - 1, 'YYYY-MM-DD') as y, to_char(${TODAY} - 2, 'YYYY-MM-DD') as y2`);
    await this.computeDay(y!.y);
    await this.computeDay(y!.y2);
    const missing = await this.rows<{ day: string }>(sql`
      select to_char(g::date, 'YYYY-MM-DD') as day
      from generate_series(greatest(${TODAY} - 400, coalesce((select (min(created_at) at time zone ${TZ})::date from users), ${TODAY})), ${TODAY} - 3, interval '1 day') g
      where not exists (select 1 from daily_metrics m where m.day = g::date)`);
    for (const m of missing) await this.computeDay(m.day);
    const [p] = await this.rows<{ made: number; dropped: number }>(sql`
      select ensure_analytics_partitions(2) as made, drop_old_analytics_partitions(${this.env.ANALYTICS_RETENTION_MONTHS}::int) as dropped`);
    // Alerts older than a week are history.
    await this.db.execute(sql`update admin_alerts set resolved_at = now() where resolved_at is null and created_at < now() - interval '7 days'`);
    const purged = await this.purgeDeadRows();
    this.logger.log(
      `Nightly: metrics for ${y!.y} (+${missing.length} backfilled), partitions +${p?.made ?? 0} / −${p?.dropped ?? 0}, ` +
        `purged ${purged.sessions} sessions, ${purged.uploads} unconfirmed uploads`,
    );
    return { day: y!.y, backfilled: missing.length, partitions: p, purged };
  }

  /**
   * Rows nothing reads any more: sessions expired or revoked over 30 days ago, and presigned
   * uploads never confirmed within 2 days (their object, if any part arrived, is deleted too).
   * Batched so one night never holds long locks.
   */
  private async purgeDeadRows(): Promise<{ sessions: number; uploads: number }> {
    const sessions = await this.db.execute(sql`
      delete from sessions where id in (
        select id from sessions
        where expires_at < now() - interval '30 days' or revoked_at < now() - interval '30 days'
        limit 5000)`);
    const uploads = await this.rows<{ storage_key: string }>(sql`
      delete from media_assets where id in (
        select id from media_assets where ready = false and created_at < now() - interval '2 days' limit 500)
      returning storage_key`);
    await Promise.allSettled(uploads.map((u) => this.storage.delete(u.storage_key)));
    return { sessions: sessions.rowCount ?? 0, uploads: uploads.length };
  }

  // ---------------- Daily digest ----------------

  async digest() {
    const [y] = await this.rows<{ y: string; y2: string; label: string }>(sql`
      select to_char(${TODAY} - 1, 'YYYY-MM-DD') as y, to_char(${TODAY} - 2, 'YYYY-MM-DD') as y2, to_char(${TODAY} - 1, 'FMDay, DD Mon YYYY') as label`);
    await this.computeDay(y!.y);
    await this.computeDay(y!.y2);
    const [days, templates, states, alerts] = await Promise.all([
      this.rows<Record<string, string>>(sql`select * from daily_metrics where day in (${y!.y}::date, ${y!.y2}::date) order by day desc`),
      this.rows<{ id: string; n: string }>(sql`
        select template_id as id, count(*) as n from events
        where created_at >= ((${TODAY} - 1)::timestamp at time zone ${TZ}) and created_at < ((${TODAY})::timestamp at time zone ${TZ})
        group by 1 order by 2 desc limit 3`),
      this.rows<{ state: string; n: string }>(sql`
        select state, count(*) as n from visitor_attribution
        where state is not null and first_seen_at >= ((${TODAY} - 1)::timestamp at time zone ${TZ}) and first_seen_at < ((${TODAY})::timestamp at time zone ${TZ})
        group by 1 order by 2 desc limit 3`),
      this.rows<{ n: string }>(sql`select count(*) as n from admin_alerts where created_at >= now() - interval '24 hours'`),
    ]);
    const cur = days.find((d) => String(d.day).startsWith(y!.y)) ?? {};
    const prev = days.find((d) => String(d.day).startsWith(y!.y2)) ?? {};
    const row = (label: string, key: string, fmt: (v: number) => string = (v) => v.toLocaleString('en-IN')) => ({ label, value: fmt(n(cur[key])), change: pctChange(n(cur[key]), n(prev[key])) });
    const conv = n(cur.visitors) ? ` (${((n(cur.signups) / n(cur.visitors)) * 100).toFixed(1)}%)` : '';
    const props = {
      day: y!.label,
      rows: [
        row('Visitors', 'visitors'),
        { ...row('Sign-ups', 'signups'), value: `${n(cur.signups).toLocaleString('en-IN')}${conv}` },
        row('Active users', 'active_users'),
        row('New invitations', 'invitations'),
        row('Paid orders', 'orders'),
        row('Revenue', 'revenue_paise', (v) => formatINR(v)),
        ...(n(cur.refunds_paise) ? [row('Refunds', 'refunds_paise', (v) => formatINR(v))] : []),
        row('Guest opens', 'guest_views'),
        row('Time in app', 'engaged_seconds', (v) => `${Math.round(v / 3600).toLocaleString('en-IN')} h`),
        ...(n(cur.renders_failed) ? [row('Failed renders', 'renders_failed')] : []),
      ],
      topTemplates: templates.map((t) => `${t.id} · ${n(t.n)} invitation${n(t.n) === 1 ? '' : 's'}`),
      topStates: states.map((s) => `${INDIA_STATES[s.state] ?? s.state} · ${n(s.n)} new visitors`),
      alerts: n(alerts[0]?.n),
    };
    const to = await this.recipients('digest');
    for (const r of to) await this.mail.send('admin.digest', r.email, props, { key: `digest-${y!.y}-${r.id}` });
    return { sentTo: to.length, props };
  }
}
