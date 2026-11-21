import { and, desc, emailSuppressions, eq, ilike, inArray, isNotNull, sql, users, type Database } from '@cardai/db';
import { QUEUES } from '@cardai/shared';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { hmacSha256Hex, safeEqual } from '../../common/crypto.js';
import { ENV, type Env } from '../../config/env.js';
import { DB } from '../../infra/infra.module.js';
import { MAIL_TRANSPORT, type MailTransport, type OutgoingMail } from './mail.transport.js';
import { mailCategory, renderMail, toLocale, type MailContext, type MailKind, type MailLocale, type MailProps } from './templates/index.js';

export type EmailJob =
  | { type: 'single'; kind: MailKind; to: string; props: unknown; userId?: string; key: string; locale?: MailLocale }
  | { type: 'campaign'; campaignId: string; cursor?: string }
  /** A failed campaign batch, retried later on its own. */
  | { type: 'campaign-batch'; campaignId: string; userIds: string[] }
  /** Hourly scan for abandoned checkouts and dormant accounts. */
  | { type: 'lifecycle' };

export interface SendOptions {
  /** Recipient's user id. Required for marketing mail (opt-in check + unsubscribe link). */
  userId?: string;
  /**
   * Stable dedupe key, e.g. `receipt-<orderId>`. The same key is never queued twice (and Resend
   * drops a repeat for 24h), so callers can fire-and-forget from code that may run twice.
   */
  key?: string;
  delayMs?: number;
  locale?: MailLocale;
}

export interface Recipient {
  id: string;
  email: string;
  name: string | null;
  locale: MailLocale;
  marketingEmails: boolean;
  lastMarketingAt: Date | null;
}

/**
 * The single entry point for email. Callers name a template and pass typed props:
 *
 *   mail.send('payment.receipt', email, props, { key: `receipt-${orderId}` })   // queued
 *   mail.toUser(userId, 'security.new_login', (u) => ({ name: u.name, device, method, at }))
 *   mail.sendNow('otp.signin', email, { code, ttlMinutes }, 'hi')                // immediate
 *
 * Queued mail is retried with backoff by MailProcessor and never blocks or fails the caller.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(DB) private readonly db: Database,
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    @InjectQueue(QUEUES.email) private readonly queue: Queue<EmailJob>,
  ) {}

  get provider() {
    return this.transport.name;
  }

  /** Minimum gap between two offer emails to the same person. */
  get marketingGapDays() {
    return this.env.MARKETING_MIN_GAP_DAYS;
  }

  /** Offers go from their own address so complaints about promos never hurt sign-in code delivery. */
  fromFor(kind: MailKind): string | undefined {
    return mailCategory(kind) === 'marketing' ? this.env.EMAIL_FROM_MARKETING : undefined;
  }

  /** Render and send right away; throws on failure. Only for sign-in codes, where the user is waiting. */
  async sendNow<K extends MailKind>(kind: K, to: string, props: MailProps<K>, locale: MailLocale = 'en'): Promise<void> {
    const r = renderMail(kind, props, this.ctx(locale));
    await this.transport.send({ to, subject: r.subject, html: r.html, text: r.text, tag: tagOf(kind), from: this.fromFor(kind) });
  }

  /** Queue a mail. Never throws: a queue outage must not break a payment or a sign-in. */
  async send<K extends MailKind>(kind: K, to: string, props: MailProps<K>, opts: SendOptions = {}): Promise<void> {
    const key = opts.key ? `${kind}-${opts.key}` : undefined;
    try {
      await this.queue.add(
        kind,
        { type: 'single', kind, to, props, userId: opts.userId, key: key ?? '', locale: opts.locale },
        { jobId: key ? jobId(key) : undefined, delay: opts.delayMs, attempts: 5, backoff: { type: 'exponential', delay: 10_000 } },
      );
    } catch (err) {
      this.logger.error(`Could not queue ${kind} mail: ${(err as Error).message}`);
    }
  }

  /** Look up a user's verified email and queue a mail to them in their language; skips users without one. */
  async toUser<K extends MailKind>(userId: string, kind: K, build: (u: Recipient) => MailProps<K>, opts: Omit<SendOptions, 'userId' | 'locale'> = {}) {
    try {
      const u = await this.recipient(userId);
      if (u) await this.send(kind, u.email, build(u), { ...opts, userId, locale: u.locale });
    } catch (err) {
      this.logger.error(`Could not prepare ${kind} mail: ${(err as Error).message}`);
    }
  }

  async recipient(userId: string): Promise<Recipient | undefined> {
    const [u] = await this.db
      .select({ id: users.id, email: users.email, name: users.name, locale: users.locale, marketingEmails: users.marketingEmails, lastMarketingAt: users.lastMarketingAt })
      .from(users)
      .where(and(eq(users.id, userId), isNotNull(users.emailVerifiedAt)));
    return u?.email ? { ...u, email: u.email, locale: toLocale(u.locale) } : undefined;
  }

  /** True when this person got an offer email too recently. */
  capped(lastMarketingAt: Date | null): boolean {
    return !!lastMarketingAt && Date.now() - lastMarketingAt.getTime() < this.marketingGapDays * 86_400_000;
  }

  /** Worker side of `send`: checks suppression, opt-in and the frequency cap at delivery time. */
  async deliver(job: Extract<EmailJob, { type: 'single' }>): Promise<'sent' | 'skipped'> {
    const category = mailCategory(job.kind);
    if (category !== 'auth' && (await this.isSuppressed(job.to))) return 'skipped';

    let locale = job.locale ?? 'en';
    let unsubscribeUrl: string | undefined;
    if (category === 'marketing') {
      const u = job.userId ? await this.recipient(job.userId) : undefined;
      if (!u?.marketingEmails || this.capped(u.lastMarketingAt)) return 'skipped';
      locale = u.locale;
      unsubscribeUrl = this.unsubscribeLinks(u.id).page;
    }
    const r = renderMail(job.kind, job.props as never, this.ctx(locale, unsubscribeUrl));
    const mail: OutgoingMail = { to: job.to, subject: r.subject, html: r.html, text: r.text, tag: tagOf(job.kind), from: this.fromFor(job.kind) };
    if (job.userId && category === 'marketing') mail.headers = this.unsubscribeHeaders(job.userId);
    await this.transport.send(mail, job.key || undefined);
    if (category === 'marketing' && job.userId) await this.markMarketed([job.userId]);
    return 'sent';
  }

  async sendBatch(mails: OutgoingMail[], idempotencyKey: string) {
    return this.transport.sendBatch(mails, idempotencyKey);
  }

  /** Starts the frequency-cap clock for these users. */
  async markMarketed(userIds: string[]) {
    if (userIds.length) await this.db.update(users).set({ lastMarketingAt: sql`now()` }).where(inArray(users.id, userIds));
  }

  async isSuppressed(email: string): Promise<boolean> {
    const [row] = await this.db.select({ email: emailSuppressions.email }).from(emailSuppressions).where(eq(emailSuppressions.email, email.toLowerCase()));
    return !!row;
  }

  async listSuppressions(q?: string) {
    const rows = await this.db
      .select()
      .from(emailSuppressions)
      .where(q ? ilike(emailSuppressions.email, `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`) : undefined)
      .orderBy(desc(emailSuppressions.createdAt))
      .limit(200);
    return rows.map((r) => ({ email: r.email, reason: r.reason, createdAt: r.createdAt.toISOString() }));
  }

  async unsuppress(email: string) {
    await this.db.delete(emailSuppressions).where(eq(emailSuppressions.email, email.toLowerCase()));
  }

  async suppress(email: string, reason: 'bounced' | 'complained' | 'manual') {
    await this.db.insert(emailSuppressions).values({ email: email.toLowerCase(), reason }).onConflictDoNothing();
  }

  ctx(locale: MailLocale = 'en', unsubscribeUrl?: string): MailContext {
    return { appUrl: this.env.APP_URL, locale, unsubscribeUrl };
  }

  // ---------- Unsubscribe ----------

  private unsubToken(userId: string) {
    return hmacSha256Hex(this.env.JWT_REFRESH_SECRET, `unsubscribe:${userId}`).slice(0, 32);
  }

  verifyUnsubscribe(userId: string, token: string) {
    return safeEqual(this.unsubToken(userId), token);
  }

  /** `page` is the human confirmation page; `oneClick` takes the RFC 8058 POST from Gmail / Yahoo. */
  unsubscribeLinks(userId: string) {
    const q = `u=${encodeURIComponent(userId)}&t=${this.unsubToken(userId)}`;
    const base = this.env.APP_URL.replace(/\/+$/, '');
    return { page: `${base}/email/unsubscribe?${q}`, oneClick: `${base}/api/mail/unsubscribe?${q}` };
  }

  unsubscribeHeaders(userId: string): Record<string, string> {
    return {
      'List-Unsubscribe': `<${this.unsubscribeLinks(userId).oneClick}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };
  }

  async setMarketing(userId: string, on: boolean) {
    await this.db.update(users).set({ marketingEmails: on }).where(eq(users.id, userId));
  }
}

/** BullMQ custom ids may not contain ':' and should stay short. */
const jobId = (key: string) => key.replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 200);
export const tagOf = (kind: string) => kind.replace(/[^A-Za-z0-9_-]/g, '_');
