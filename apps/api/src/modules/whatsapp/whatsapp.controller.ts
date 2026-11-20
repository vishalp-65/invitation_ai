import { BadRequestException, Controller, ForbiddenException, Get, Headers, HttpCode, Inject, Logger, Post, Query, Req, type RawBodyRequest } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ENV, type Env } from '../../config/env.js';
import { Public } from '../../common/auth.decorators.js';
import { safeEqual } from '../../common/crypto.js';
import { REDIS, type Redis } from '../../infra/infra.module.js';
import { BotService, type InboundMessage } from './bot.service.js';
import { WhatsAppClient } from './whatsapp.client.js';

interface WaMessage {
  id?: string;
  from: string;
  type: string;
  text?: { body: string };
  audio?: { id: string };
  interactive?: { button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } };
}

interface WebhookBody {
  entry?: Array<{ changes?: Array<{ value?: { messages?: WaMessage[] } }> }>;
}

@Public()
@Controller('webhooks/whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly wa: WhatsAppClient,
    private readonly bot: BotService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /** Meta's one-time subscription verification handshake. */
  @Get()
  verify(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string) {
    if (mode === 'subscribe' && this.env.WHATSAPP_VERIFY_TOKEN && typeof token === 'string' && safeEqual(token, this.env.WHATSAPP_VERIFY_TOKEN)) return challenge;
    throw new ForbiddenException();
  }

  /** Acknowledge immediately (Meta retries slow webhooks); process in the background. */
  @Post()
  @HttpCode(200)
  receive(@Req() req: RawBodyRequest<FastifyRequest>, @Headers('x-hub-signature-256') signature?: string) {
    if (!req.rawBody || !this.wa.verifySignature(req.rawBody, signature)) throw new BadRequestException('Bad signature');
    const body = req.body as WebhookBody;
    const messages = body.entry?.flatMap((e) => e.changes?.flatMap((c) => c.value?.messages ?? []) ?? []) ?? [];

    void this.process(messages);
    return { ok: true };
  }

  /**
   * Meta delivers webhooks at least once, so each message id is handled once (24 h dedupe), and
   * one delivery's messages run in order, so a user's quick replies can't race the bot's state.
   */
  private async process(messages: WaMessage[]) {
    for (const m of messages) {
      try {
        if (m.id && !(await this.redis.set(`wa:msg:${m.id}`, '1', 'EX', 24 * 3600, 'NX'))) continue;
        const msg: InboundMessage = {
          from: m.from,
          type: m.type === 'text' ? 'text' : m.type === 'interactive' ? 'interactive' : m.type === 'audio' ? 'audio' : 'other',
          text: m.text?.body ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title,
          replyId: m.interactive?.button_reply?.id ?? m.interactive?.list_reply?.id,
          audioId: m.audio?.id,
        };
        await this.bot.handle(msg);
      } catch (err) {
        this.logger.error({ err }, 'bot handler failed');
      }
    }
  }
}
