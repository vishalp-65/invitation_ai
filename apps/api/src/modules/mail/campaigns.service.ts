import { adminAuditLog, and, asc, coupons, desc, emailCampaigns, eq, gt, inArray, isNotNull, isNull, sql, users, type Database, type SQL } from '@cardai/db';
import {
  QUEUES,
  type EmailAudience,
  type EmailCampaignDto,
  type EmailCampaignInput,
  type EmailCampaignStatus,
  type emailCampaignInputSchema,
} from '@cardai/shared';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import type { z } from 'zod';
import type { AuthUser } from '../../common/auth.decorators.js';
import { DB, REDIS, type Redis } from '../../infra/infra.module.js';
import { MailService, type EmailJob } from './mail.service.js';
import { BATCH_LIMIT, type OutgoingMail } from './mail.transport.js';
import { renderMail, TEMPLATES, toLocale } from './templates/index.js';

type Row = typeof emailCampaigns.$inferSelect;
type Input = z.output<typeof emailCampaignInputSchema>;
/** Pause between batch requests so one campaign stays under Resend's per-second rate limit. */
const BATCH_PAUSE_MS = 600;
/** Failed batches are retried on their own a few minutes later. */
const RETRY_DELAY_MS = 3 * 60_000;
type Stat = 'delivered' | 'opened' | 'clicked' | 'bounced';
const STAT_COLUMN = {
  delivered: emailCampaigns.deliveredCount,
  opened: emailCampaigns.openedCount,
  clicked: emailCampaigns.clickedCount,
  bounced: emailCampaigns.bouncedCount,
} as const;

const toDto = (r: Row): EmailCampaignDto => ({
  id: r.id,
  subject: r.subject,
  preheader: r.preheader,
  heading: r.heading,
  body: r.body,
  ctaLabel: r.ctaLabel,
  ctaUrl: r.ctaUrl,
  couponCode: r.couponCode,
  audience: r.audience as EmailAudience,
  status: r.status as EmailCampaignStatus,
  scheduledAt: r.scheduledAt?.toISOString() ?? null,
  recipientCount: r.recipientCount,
  sentCount: r.sentCount,
  failedCount: r.failedCount,
  deliveredCount: r.deliveredCount,
  openedCount: r.openedCount,
  clickedCount: r.clickedCount,
  bouncedCount: r.bouncedCount,
  createdAt: r.createdAt.toISOString(),
  sentAt: r.sentAt?.toISOString() ?? null,
});

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly mail: MailService,
    @InjectQueue(QUEUES.email) private readonly queue: Queue<EmailJob>,
  ) {}

  /**
   * Who may get offer email right now: verified, enabled, opted in, not suppressed, and not
   * mailed an offer within the frequency-cap window. Shared with the lifecycle automations.
   */
  eligibleWhere(): SQL {
    return and(
      isNotNull(users.email),
      isNotNull(users.emailVerifiedAt),
      isNull(users.disabledAt),
      eq(users.marketingEmails, true),
      sql`not exists (select 1 from email_suppressions s where s.email = lower(${users.email}))`,
      sql`(${users.lastMarketingAt} is null or ${users.lastMarketingAt} < now() - make_interval(days => ${this.mail.marketingGapDays}))`,
    )!;
  }

  private audienceWhere(audience: EmailAudience): SQL {
    const base = this.eligibleWhere();
    const paid = sql`exists (select 1 from orders o where o.user_id = ${users.id} and o.status = 'paid')`;
    switch (audience) {
      case 'all':
        return base;
      case 'paid':
        return and(base, paid)!;
      case 'never_paid':
        return and(base, sql`not ${paid}`)!;
      case 'inactive_30d':
        return and(base, sql`coalesce(${users.lastSeenAt}, ${users.createdAt}) < now() - interval '30 days'`)!;
      case 'designers':
        return and(base, sql`(${users.role} = 'designer' or exists (select 1 from designer_profiles d where d.user_id = ${users.id} and d.status = 'approved'))`)!;
    }
  }

  async list(): Promise<EmailCampaignDto[]> {
    const rows = await this.db.select().from(emailCampaigns).orderBy(desc(emailCampaigns.createdAt)).limit(100);
    return rows.map(toDto);
  }

  async audienceSize(audience: EmailAudience): Promise<number> {
    return this.db.$count(users, this.audienceWhere(audience));
  }

  /** Renders the campaign exactly as a recipient would see it (with a sample name). */
  preview(input: EmailCampaignInput | Input, locale: 'en' | 'hi' = 'en') {
    return renderMail('campaign', { ...TEMPLATES.campaign.sample, ...normalise(input), name: 'Priya' }, this.mail.ctx(locale, '#unsubscribe'));
  }

  async create(admin: AuthUser, input: Input) {
    await this.checkCoupon(input.couponCode);
    const [row] = await this.db.insert(emailCampaigns).values({ ...input, createdBy: admin.id }).returning();
    this.audit(admin, 'email_campaign.create', row!.id);
    return toDto(row!);
  }

  async update(admin: AuthUser, id: string, input: Input) {
    await this.checkCoupon(input.couponCode);
    const [row] = await this.db
      .update(emailCampaigns)
      .set(input)
      .where(and(eq(emailCampaigns.id, id), eq(emailCampaigns.status, 'draft')))
      .returning();
    if (!row) throw new BadRequestException('Only drafts can be edited');
    this.audit(admin, 'email_campaign.update', id);
    return toDto(row);
  }

  async remove(admin: AuthUser, id: string) {
    const [row] = await this.db
      .delete(emailCampaigns)
      .where(and(eq(emailCampaigns.id, id), eq(emailCampaigns.status, 'draft')))
      .returning({ id: emailCampaigns.id });
    if (!row) throw new BadRequestException('Only drafts can be deleted');
    this.audit(admin, 'email_campaign.delete', id);
  }

  /** Sends one copy to the admin's own address (ignores opt-in and the cap so admins can always test). */
  async sendTest(admin: AuthUser, id: string) {
    const row = await this.get(id);
    const me = await this.mail.recipient(admin.id);
    if (!me) throw new BadRequestException('Your account has no verified email to send the test to');
    const r = renderMail('campaign', { ...normalise(row), name: me.name }, this.mail.ctx(me.locale, this.mail.unsubscribeLinks(me.id).page));
    await this.mail.sendBatch(
      [{ to: me.email, subject: `[Test] ${r.subject}`, html: r.html, text: r.text, tag: 'campaign_test', from: this.mail.fromFor('campaign') }],
      `campaign-test-${id}-${Date.now()}`,
    );
    return { to: me.email };
  }

  /**
   * Locks the draft and hands it to the queue, now or at `scheduledAt`. The status flip makes a
   * double click harmless. The audience is counted again when sending actually starts.
   */
  async send(admin: AuthUser, id: string, scheduledAt?: string) {
    const row = await this.get(id);
    const when = scheduledAt ? new Date(scheduledAt) : null;
    if (when && when.getTime() < Date.now() + 60_000) throw new BadRequestException('Pick a time at least a minute from now');
    if (when && when.getTime() > Date.now() + 60 * 86_400_000) throw new BadRequestException('Schedule at most 60 days ahead');
    const recipients = await this.audienceSize(row.audience as EmailAudience);
    if (!when && recipients === 0) throw new BadRequestException('Nobody in this audience can receive offer emails right now');

    const [locked] = await this.db
      .update(emailCampaigns)
      .set({ status: when ? 'scheduled' : 'sending', scheduledAt: when, recipientCount: recipients, sentCount: 0, failedCount: 0 })
      .where(and(eq(emailCampaigns.id, id), eq(emailCampaigns.status, 'draft')))
      .returning();
    if (!locked) throw new BadRequestException('This campaign was already sent or scheduled');
    // Job ids are unique per queue; a timestamp lets a cancelled campaign be scheduled again.
    await this.queue.add(
      'campaign',
      { type: 'campaign', campaignId: id },
      { jobId: `campaign-${id}-${Date.now()}`, delay: when ? when.getTime() - Date.now() : undefined, attempts: 5, backoff: { type: 'exponential', delay: 30_000 } },
    );
    this.audit(admin, when ? 'email_campaign.schedule' : 'email_campaign.send', id, { recipients, scheduledAt });
    return toDto(locked);
  }

  /** Back to draft. The queued job sees the status and does nothing. */
  async cancel(admin: AuthUser, id: string) {
    const [row] = await this.db
      .update(emailCampaigns)
      .set({ status: 'draft', scheduledAt: null })
      .where(and(eq(emailCampaigns.id, id), eq(emailCampaigns.status, 'scheduled')))
      .returning();
    if (!row) throw new BadRequestException('Only scheduled campaigns can be cancelled');
    this.audit(admin, 'email_campaign.cancel', id);
    return toDto(row);
  }

  /**
   * Worker: walks the audience in id order, 100 users per Resend batch call. The cursor is saved
   * on the job after every batch, so a retry resumes where it stopped, and each batch has a stable
   * idempotency key, so a batch that did go out before a crash is not delivered twice. A failed
   * batch is queued again on its own instead of being lost.
   */
  async dispatch(job: Job<EmailJob>) {
    const data = job.data as Extract<EmailJob, { type: 'campaign' }>;
    // Deleted after being scheduled and cancelled: nothing to do.
    let [row] = await this.db.select().from(emailCampaigns).where(eq(emailCampaigns.id, data.campaignId));
    if (!row) return;
    if (row.status === 'scheduled' && !data.cursor) {
      const recipients = await this.audienceSize(row.audience as EmailAudience);
      [row] = (await this.db
        .update(emailCampaigns)
        .set({ status: 'sending', recipientCount: recipients })
        .where(and(eq(emailCampaigns.id, row.id), eq(emailCampaigns.status, 'scheduled')))
        .returning()) as [Row];
      if (!row) return; // cancelled in the meantime
    }
    if (row.status !== 'sending') return;
    const where = this.audienceWhere(row.audience as EmailAudience);
    let cursor = data.cursor;

    try {
      for (;;) {
        const batch = await this.db
          .select({ id: users.id, email: users.email, name: users.name, locale: users.locale })
          .from(users)
          .where(cursor ? and(where, gt(users.id, cursor)) : where)
          .orderBy(asc(users.id))
          .limit(BATCH_LIMIT);
        if (batch.length === 0) break;
        const last = batch[batch.length - 1]!.id;

        if (!(await this.sendBatch(row, batch, `campaign-${row.id}-${last}`))) {
          await this.bump(row.id, { failed: batch.length });
          await this.queue.add(
            'campaign-batch',
            { type: 'campaign-batch', campaignId: row.id, userIds: batch.map((u) => u.id) },
            { jobId: `campaign-batch-${row.id}-${last}`, delay: RETRY_DELAY_MS, attempts: 3, backoff: { type: 'exponential', delay: RETRY_DELAY_MS } },
          );
        }
        cursor = last;
        await job.updateData({ ...data, cursor });
        if (batch.length < BATCH_LIMIT) break;
        await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS));
      }
      const [done] = await this.db.select().from(emailCampaigns).where(eq(emailCampaigns.id, row.id));
      const status = done && done.sentCount === 0 && done.failedCount > 0 ? 'failed' : 'sent';
      await this.db.update(emailCampaigns).set({ status, sentAt: new Date() }).where(eq(emailCampaigns.id, row.id));
      this.logger.log(`Campaign ${row.id} finished: ${done?.sentCount ?? 0} sent, ${done?.failedCount ?? 0} failed (retrying)`);
    } catch (err) {
      if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) {
        await this.db.update(emailCampaigns).set({ status: 'failed' }).where(eq(emailCampaigns.id, row.id));
      }
      throw err;
    }
  }

  /** Worker: second chance for one failed batch. Throws so BullMQ backs off and tries again. */
  async retryBatch(job: Job<EmailJob>) {
    const data = job.data as Extract<EmailJob, { type: 'campaign-batch' }>;
    const [row] = await this.db.select().from(emailCampaigns).where(eq(emailCampaigns.id, data.campaignId));
    if (!row) return;
    // Re-check eligibility: someone may have unsubscribed since the first attempt.
    const batch = await this.db
      .select({ id: users.id, email: users.email, name: users.name, locale: users.locale })
      .from(users)
      .where(and(this.eligibleWhere(), inArray(users.id, data.userIds)));
    const dropped = data.userIds.length - batch.length;
    if (batch.length && !(await this.sendBatch(row, batch, `campaign-retry-${row.id}-${data.userIds.at(-1)}`))) {
      throw new Error(`Retry of ${batch.length} campaign emails failed`);
    }
    // Moved from "failed" to "sent"; people no longer eligible simply leave the failed count.
    await this.bump(row.id, { sent: batch.length, failed: -(batch.length + dropped) });
  }

  private async sendBatch(row: Row, batch: Array<{ id: string; email: string | null; name: string | null; locale: string }>, key: string): Promise<boolean> {
    const content = normalise(row);
    const mails: OutgoingMail[] = batch.map((u) => {
      const r = renderMail('campaign', { ...content, name: u.name }, this.mail.ctx(toLocale(u.locale), this.mail.unsubscribeLinks(u.id).page));
      return {
        to: u.email!,
        subject: r.subject,
        html: r.html,
        text: r.text,
        tag: 'campaign',
        tags: { campaign: row.id },
        from: this.mail.fromFor('campaign'),
        headers: this.mail.unsubscribeHeaders(u.id),
      };
    });
    try {
      await this.mail.sendBatch(mails, key);
      await Promise.all([this.bump(row.id, { sent: mails.length }), this.mail.markMarketed(batch.map((u) => u.id))]);
      return true;
    } catch (err) {
      this.logger.error(`Campaign ${row.id} batch ${key} failed: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Resend webhook → campaign stats. Each email counts once per event type (a person opening the
   * same mail five times is one open), deduped in Redis for 30 days.
   */
  async recordEvent(campaignId: string, stat: Stat, emailId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(campaignId)) return;
    const fresh = await this.redis.set(`mailevt:${emailId}:${stat}`, '1', 'EX', 30 * 86_400, 'NX');
    if (!fresh) return;
    const col = STAT_COLUMN[stat];
    await this.db.update(emailCampaigns).set({ [`${stat}Count`]: sql`${col} + 1` }).where(eq(emailCampaigns.id, campaignId));
  }

  private bump(id: string, by: { sent?: number; failed?: number }) {
    return this.db
      .update(emailCampaigns)
      .set({ sentCount: sql`${emailCampaigns.sentCount} + ${by.sent ?? 0}`, failedCount: sql`greatest(${emailCampaigns.failedCount} + ${by.failed ?? 0}, 0)` })
      .where(eq(emailCampaigns.id, id));
  }

  private async get(id: string): Promise<Row> {
    const [row] = await this.db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id));
    if (!row) throw new NotFoundException('Campaign not found');
    return row;
  }

  private async checkCoupon(code: string | null) {
    if (!code) return;
    const [c] = await this.db.select({ active: coupons.active }).from(coupons).where(eq(coupons.code, code));
    if (!c) throw new BadRequestException(`Coupon ${code} does not exist. Create it under Offers first.`);
    if (!c.active) throw new BadRequestException(`Coupon ${code} is switched off.`);
  }

  private audit(admin: AuthUser, action: string, target: string, details?: Record<string, unknown>) {
    void this.db
      .insert(adminAuditLog)
      .values({ adminId: admin.id, action, target, details })
      .catch((err: Error) => this.logger.warn(`Audit log failed: ${err.message}`));
  }
}

function normalise(c: Pick<Row, 'subject' | 'preheader' | 'heading' | 'body' | 'ctaLabel' | 'ctaUrl' | 'couponCode'> | EmailCampaignInput) {
  return {
    subject: c.subject,
    preheader: c.preheader ?? null,
    heading: c.heading,
    body: c.body,
    ctaLabel: c.ctaLabel ?? null,
    ctaUrl: c.ctaUrl ?? null,
    couponCode: c.couponCode ? c.couponCode.toUpperCase() : null,
  };
}
