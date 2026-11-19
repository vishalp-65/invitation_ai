import { BRAND } from '@cardai/shared';
import { Logger } from '@nestjs/common';
import type { Env } from '../../config/env.js';

export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Extra headers, e.g. List-Unsubscribe for marketing mail. */
  headers?: Record<string, string>;
  /** Resend tags (letters, digits, `_` and `-` only); `category` filters the dashboard, `campaign` feeds stats. */
  tag?: string;
  tags?: Record<string, string>;
  /** Overrides the default sender (offers use EMAIL_FROM_MARKETING). */
  from?: string;
}

export interface MailTransport {
  readonly name: string;
  send(mail: OutgoingMail, idempotencyKey?: string): Promise<{ id: string }>;
  /** Up to 100 mails in one request. */
  sendBatch(mails: OutgoingMail[], idempotencyKey?: string): Promise<{ ids: string[] }>;
}

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');
export const BATCH_LIMIT = 100;

/** Thrown for errors that will never succeed on retry (bad address, invalid payload, auth). */
export class PermanentMailError extends Error {}

/** Development: prints a one-line summary instead of sending. */
export class ConsoleTransport implements MailTransport {
  readonly name = 'console';
  private readonly logger = new Logger('Mail');

  async send(mail: OutgoingMail) {
    this.logger.log(`[console mail] to=${mail.to} subject="${mail.subject}"`);
    return { id: `console-${Date.now()}` };
  }

  async sendBatch(mails: OutgoingMail[]) {
    for (const m of mails) this.logger.log(`[console mail] to=${m.to} subject="${m.subject}"`);
    return { ids: mails.map((_, i) => `console-${Date.now()}-${i}`) };
  }
}

/**
 * Resend REST API over fetch (no SDK). Retries 429 / 5xx a couple of times with Retry-After, and
 * sends an Idempotency-Key so a retried queue job never delivers the same mail twice.
 */
export class ResendTransport implements MailTransport {
  readonly name = 'resend';
  private static readonly BASE = 'https://api.resend.com';

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly replyTo: string | undefined,
  ) {}

  private payload(m: OutgoingMail) {
    return {
      from: m.from ?? this.from,
      to: [m.to],
      subject: m.subject,
      html: m.html,
      text: m.text,
      ...(this.replyTo ? { reply_to: this.replyTo } : {}),
      ...(m.headers ? { headers: m.headers } : {}),
      tags: [
        ...(m.tag ? [{ name: 'category', value: m.tag }] : []),
        ...Object.entries(m.tags ?? {}).map(([name, value]) => ({ name, value })),
      ],
    };
  }

  async send(mail: OutgoingMail, idempotencyKey?: string) {
    const res = await this.post<{ id: string }>('/emails', this.payload(mail), idempotencyKey);
    return { id: res.id };
  }

  async sendBatch(mails: OutgoingMail[], idempotencyKey?: string) {
    if (mails.length === 0) return { ids: [] };
    if (mails.length > BATCH_LIMIT) throw new Error(`Resend batch is limited to ${BATCH_LIMIT} emails`);
    const res = await this.post<{ data: Array<{ id: string }> }>('/emails/batch', mails.map((m) => this.payload(m)), idempotencyKey);
    return { ids: res.data.map((d) => d.id) };
  }

  private async post<T>(path: string, body: unknown, idempotencyKey?: string, attempt = 0): Promise<T> {
    const res = await fetch(`${ResendTransport.BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return (await res.json()) as T;

    const detail = await res.text().catch(() => '');
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      const wait = Math.min(Number(res.headers.get('retry-after')) * 1000 || 600 * (attempt + 1), 3000);
      await new Promise((r) => setTimeout(r, wait));
      return this.post<T>(path, body, idempotencyKey, attempt + 1);
    }
    const msg = `Resend ${res.status}: ${detail.slice(0, 300)}`;
    // 4xx other than rate limiting will fail the same way every time; don't burn queue retries.
    if (res.status >= 400 && res.status < 500 && res.status !== 429) throw new PermanentMailError(msg);
    throw new Error(msg);
  }
}

export function createMailTransport(env: Env): MailTransport {
  if (env.EMAIL_PROVIDER === 'resend') {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new Error('RESEND_API_KEY and EMAIL_FROM are required when EMAIL_PROVIDER=resend');
    return new ResendTransport(env.RESEND_API_KEY, env.EMAIL_FROM, env.EMAIL_REPLY_TO ?? BRAND.supportEmail);
  }
  return new ConsoleTransport();
}
