import { and, catalogTemplates, coupons, eq, gte, inArray, isNull, lt, or, orders, events, sql, users, type Database } from '@cardai/db';
import { productName, QUEUES } from '@cardai/shared';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { ENV, type Env } from '../../config/env.js';
import { DB } from '../../infra/infra.module.js';
import { CampaignsService } from './campaigns.service.js';
import { MailService, type EmailJob } from './mail.service.js';
import { toLocale } from './templates/index.js';

const HOUR = 3_600_000;
/** Per run, so a backlog drains over a few hours instead of one burst. */
const ABANDONED_PER_RUN = 200;
const WINBACK_PER_RUN = 300;

/**
 * Automatic offer emails, scanned hourly by one BullMQ job scheduler (safe with several API
 * instances: the scheduler is upserted, so there is only ever one). Everything here is marketing
 * mail, so the same opt-in, suppression and frequency-cap rules as campaigns apply.
 */
@Injectable()
export class LifecycleService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LifecycleService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(DB) private readonly db: Database,
    private readonly mail: MailService,
    private readonly campaigns: CampaignsService,
    @InjectQueue(QUEUES.email) private readonly queue: Queue<EmailJob>,
  ) {}

  async onApplicationBootstrap() {
    try {
      if (this.env.LIFECYCLE_EMAILS) {
        await this.queue.upsertJobScheduler('lifecycle-hourly', { every: HOUR }, { name: 'lifecycle', data: { type: 'lifecycle' }, opts: { attempts: 1 } });
      } else {
        await this.queue.removeJobScheduler('lifecycle-hourly');
      }
    } catch (err) {
      this.logger.warn(`Could not set up the lifecycle email schedule: ${(err as Error).message}`);
    }
  }

  async run() {
    const [abandoned, winback] = await Promise.all([this.abandonedCheckouts(), this.winback()]);
    if (abandoned || winback) this.logger.log(`Lifecycle emails queued: ${abandoned} abandoned checkout, ${winback} win-back`);
  }

  /**
   * Unpaid orders 24–72 hours old where the same invitation was not paid for since. One reminder
   * per person per run (their latest order); all their open orders are then marked as reminded.
   */
  async abandonedCheckouts(): Promise<number> {
    const now = Date.now();
    const rows = await this.db
      .selectDistinctOn([orders.userId], {
        orderId: orders.id,
        userId: orders.userId,
        eventId: orders.eventId,
        productCode: orders.productCode,
        amountPaise: orders.amountPaise,
        eventTitle: events.title,
        email: users.email,
        name: users.name,
        locale: users.locale,
      })
      .from(orders)
      .innerJoin(events, eq(events.id, orders.eventId))
      .innerJoin(users, eq(users.id, orders.userId))
      .where(
        and(
          eq(orders.status, 'created'),
          isNull(orders.reminderSentAt),
          lt(orders.createdAt, new Date(now - 24 * HOUR)),
          gte(orders.createdAt, new Date(now - 72 * HOUR)),
          sql`not exists (select 1 from orders p where p.event_id = ${orders.eventId} and p.status = 'paid' and p.created_at >= ${orders.createdAt})`,
          this.campaigns.eligibleWhere(),
        ),
      )
      .orderBy(orders.userId, sql`${orders.createdAt} desc`)
      .limit(ABANDONED_PER_RUN);
    if (!rows.length) return 0;

    const coupon = await this.reminderCoupon();
    // Mark first: a crash after this skips a reminder rather than sending two.
    await this.db
      .update(orders)
      .set({ reminderSentAt: new Date() })
      .where(and(inArray(orders.userId, rows.map((r) => r.userId)), eq(orders.status, 'created'), isNull(orders.reminderSentAt)));

    for (const r of rows) {
      await this.mail.send(
        'lifecycle.abandoned_checkout',
        r.email!,
        {
          name: r.name,
          product: productName(r.productCode),
          eventTitle: r.eventTitle,
          eventId: r.eventId,
          pricePaise: r.amountPaise,
          couponCode: coupon,
        },
        { userId: r.userId, key: r.orderId, locale: toLocale(r.locale) },
      );
    }
    return rows.length;
  }

  /** Accounts quiet for 60+ days; at most one win-back per person every 180 days. */
  async winback(): Promise<number> {
    const now = Date.now();
    const rows = await this.db
      .select({ id: users.id, email: users.email, name: users.name, locale: users.locale })
      .from(users)
      .where(
        and(
          this.campaigns.eligibleWhere(),
          sql`coalesce(${users.lastSeenAt}, ${users.createdAt}) < ${new Date(now - 60 * 24 * HOUR)}`,
          or(isNull(users.winbackSentAt), lt(users.winbackSentAt, new Date(now - 180 * 24 * HOUR))),
        ),
      )
      .limit(WINBACK_PER_RUN);
    if (!rows.length) return 0;

    const newDesigns = await this.db.$count(catalogTemplates, and(eq(catalogTemplates.status, 'published'), gte(catalogTemplates.createdAt, new Date(now - 60 * 24 * HOUR))));
    await this.db.update(users).set({ winbackSentAt: new Date() }).where(inArray(users.id, rows.map((r) => r.id)));
    for (const u of rows) {
      await this.mail.send('lifecycle.winback', u.email!, { name: u.name, newDesigns }, { userId: u.id, key: `${u.id}-${new Date().toISOString().slice(0, 7)}`, locale: toLocale(u.locale) });
    }
    return rows.length;
  }

  /** The configured reminder coupon, only while it exists, is active and in its date window. */
  private async reminderCoupon(): Promise<string | null> {
    const code = this.env.ABANDONED_CHECKOUT_COUPON;
    if (!code) return null;
    const [c] = await this.db.select().from(coupons).where(eq(coupons.code, code));
    const now = new Date();
    if (!c?.active || (c.startsAt && c.startsAt > now) || (c.endsAt && c.endsAt < now) || (c.maxUses != null && c.usedCount >= c.maxUses)) {
      this.logger.warn(`ABANDONED_CHECKOUT_COUPON ${code} is not usable right now; sending reminders without it`);
      return null;
    }
    return code;
  }
}
