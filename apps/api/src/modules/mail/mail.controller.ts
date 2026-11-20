import { emailCampaignInputSchema, emailCampaignSendSchema, EMAIL_AUDIENCES, emailSchema } from '@cardai/shared';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { CurrentUser, Public, RateLimit, type AuthedRequest, type AuthUser } from '../../common/auth.decorators.js';
import { UuidParam, ZBody, ZQuery } from '../../common/zod.js';
import { ENV, type Env } from '../../config/env.js';
import { AdminGuard, AdminScopes } from '../admin/admin-access.js';
import { CampaignsService } from './campaigns.service.js';
import { MailService } from './mail.service.js';
import { renderMail, TEMPLATE_INFO, TEMPLATES, type MailKind } from './templates/index.js';

const unsubQuery = z.object({ u: z.uuid(), t: z.string().min(16).max(64) });
type UnsubQuery = z.infer<typeof unsubQuery>;

/** Public mail endpoints: unsubscribe links and the Resend bounce/complaint webhook. */
@Controller('mail')
export class MailController {
  private readonly logger = new Logger(MailController.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly mail: MailService,
    private readonly campaigns: CampaignsService,
  ) {}

  /** Both the confirmation page and the RFC 8058 one-click POST (Gmail / Yahoo) land here. */
  @Public()
  @Post('unsubscribe')
  @HttpCode(200)
  @RateLimit({ limit: 30, windowSec: 600, by: 'ip' })
  async unsubscribe(@ZQuery(unsubQuery) q: UnsubQuery) {
    this.check(q);
    await this.mail.setMarketing(q.u, false);
    return { subscribed: false };
  }

  @Public()
  @Post('resubscribe')
  @HttpCode(200)
  @RateLimit({ limit: 30, windowSec: 600, by: 'ip' })
  async resubscribe(@ZQuery(unsubQuery) q: UnsubQuery) {
    this.check(q);
    await this.mail.setMarketing(q.u, true);
    return { subscribed: true };
  }

  private check(q: UnsubQuery) {
    if (!this.mail.verifyUnsubscribe(q.u, q.t)) throw new BadRequestException('This unsubscribe link is not valid.');
  }

  /**
   * Resend → us (Svix-signed). Hard bounces and spam complaints go on the suppression list so we
   * stop mailing them, which protects the sending domain's reputation.
   */
  @Public()
  @Post('webhooks/resend')
  @HttpCode(200)
  async resendWebhook(
    @Req() req: AuthedRequest & { rawBody?: Buffer },
    @Headers('svix-id') id?: string,
    @Headers('svix-timestamp') ts?: string,
    @Headers('svix-signature') sig?: string,
  ) {
    const secret = this.env.RESEND_WEBHOOK_SECRET;
    if (!secret) throw new NotFoundException();
    const raw = req.rawBody?.toString('utf8') ?? '';
    if (!id || !ts || !sig || !verifySvix(secret, id, ts, sig, raw)) throw new BadRequestException('Invalid signature');

    const evt = JSON.parse(raw) as {
      type: string;
      data?: { email_id?: string; to?: string[] | string; bounce?: { type?: string }; tags?: Record<string, string> | Array<{ name: string; value: string }> };
    };
    const to = ([] as string[]).concat(evt.data?.to ?? []);
    const tags = evt.data?.tags;
    const campaignId = Array.isArray(tags) ? tags.find((t) => t.name === 'campaign')?.value : tags?.campaign;
    const stat = ({ 'email.delivered': 'delivered', 'email.opened': 'opened', 'email.clicked': 'clicked', 'email.bounced': 'bounced' } as const)[evt.type as 'email.delivered'];
    if (campaignId && stat && evt.data?.email_id) await this.campaigns.recordEvent(campaignId, stat, evt.data.email_id);
    if (evt.type === 'email.bounced' && evt.data?.bounce?.type !== 'Transient') {
      await Promise.all(to.map((e) => this.mail.suppress(e, 'bounced')));
    } else if (evt.type === 'email.complained') {
      await Promise.all(to.map((e) => this.mail.suppress(e, 'complained')));
    }
    if (to.length && (evt.type === 'email.bounced' || evt.type === 'email.complained')) this.logger.warn(`Resend ${evt.type} for ${to.length} address(es)`);
    return { ok: true };
  }
}

const campaignBody = ZBody(emailCampaignInputSchema);
const localeQuery = z.object({ locale: z.enum(['en', 'hi']).default('en') });
type CampaignBody = z.output<typeof emailCampaignInputSchema>;

/** Admin: transactional template gallery + offer campaigns. */
@UseGuards(AdminGuard)
@AdminScopes('marketing')
@Controller('admin/emails')
export class AdminMailController {
  constructor(
    private readonly mail: MailService,
    private readonly campaigns: CampaignsService,
  ) {}

  @Get('templates')
  templates() {
    return { provider: this.mail.provider, items: TEMPLATE_INFO };
  }

  /** A template rendered with its sample data, for the preview iframe. */
  @Get('templates/:kind/preview')
  previewTemplate(@Param('kind') kind: string, @ZQuery(localeQuery) q: { locale: 'en' | 'hi' }) {
    if (!Object.hasOwn(TEMPLATES, kind)) throw new NotFoundException('Unknown template');
    const k = kind as MailKind;
    const r = renderMail(k, TEMPLATES[k].sample as never, this.mail.ctx(q.locale, '#unsubscribe'));
    return { subject: r.subject, html: r.html, text: r.text };
  }

  @Get('campaigns')
  list() {
    return this.campaigns.list();
  }

  @Get('audience')
  async audience(@ZQuery(z.object({ audience: z.enum(EMAIL_AUDIENCES) })) q: { audience: (typeof EMAIL_AUDIENCES)[number] }) {
    return { count: await this.campaigns.audienceSize(q.audience) };
  }

  /** Live preview of unsaved composer content. Lenient: renders whatever is filled in so far. */
  @Post('campaigns/preview')
  @HttpCode(200)
  preview(@Body() body: Record<string, unknown>) {
    const s = (k: string, max: number) => (typeof body?.[k] === 'string' ? (body[k] as string).slice(0, max) : '');
    const r = this.campaigns.preview({
      subject: s('subject', 120) || 'Subject',
      preheader: s('preheader', 160) || null,
      heading: s('heading', 120) || 'Your heading',
      body: s('body', 5000) || 'Write your message…',
      ctaLabel: s('ctaLabel', 40) || null,
      ctaUrl: s('ctaUrl', 500) || null,
      couponCode: s('couponCode', 40) || null,
      audience: 'all',
    }, body?.locale === 'hi' ? 'hi' : 'en');
    return { subject: r.subject, html: r.html };
  }

  @Post('campaigns')
  create(@CurrentUser() me: AuthUser, @campaignBody body: CampaignBody) {
    return this.campaigns.create(me, body);
  }

  @Put('campaigns/:id')
  update(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @campaignBody body: CampaignBody) {
    return this.campaigns.update(me, id, body);
  }

  @Delete('campaigns/:id')
  @HttpCode(204)
  remove(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.campaigns.remove(me, id);
  }

  @Post('campaigns/:id/test')
  @HttpCode(200)
  @RateLimit({ limit: 20, windowSec: 3600, by: 'user' })
  test(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.campaigns.sendTest(me, id);
  }

  /** Send now, or schedule with `{ scheduledAt }`. */
  @Post('campaigns/:id/send')
  @HttpCode(200)
  send(@CurrentUser() me: AuthUser, @UuidParam('id') id: string, @ZBody(emailCampaignSendSchema) body: z.infer<typeof emailCampaignSendSchema>) {
    return this.campaigns.send(me, id, body.scheduledAt);
  }

  @Post('campaigns/:id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() me: AuthUser, @UuidParam('id') id: string) {
    return this.campaigns.cancel(me, id);
  }

  // ---------- Suppression list ----------

  @Get('suppressions')
  suppressions(@ZQuery(z.object({ q: z.string().trim().max(120).optional() })) q: { q?: string }) {
    return this.mail.listSuppressions(q.q);
  }

  @Post('suppressions')
  @HttpCode(204)
  async suppress(@ZBody(z.object({ email: emailSchema })) body: { email: string }) {
    await this.mail.suppress(body.email, 'manual');
  }

  /** Lets mail flow to an address again, e.g. after the person fixed their mailbox. */
  @Delete('suppressions/:email')
  @HttpCode(204)
  async unsuppress(@Param('email') email: string) {
    await this.mail.unsuppress(email);
  }
}

/** Svix signature check used by Resend webhooks: HMAC-SHA256 of `id.timestamp.body`, 5 min tolerance. */
function verifySvix(secret: string, id: string, ts: string, header: string, body: string): boolean {
  const t = Number(ts);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest();
  return header.split(' ').some((part) => {
    const [, sig] = part.split(',');
    if (!sig) return false;
    const got = Buffer.from(sig, 'base64');
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
