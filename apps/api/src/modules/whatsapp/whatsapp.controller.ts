import { BadRequestException, Controller, ForbiddenException, Get, Headers, HttpCode, Inject, Logger, Post, Query, Req, type RawBodyRequest } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ENV, type Env } from '../../config/env.js';
import { Public } from '../../common/auth.decorators.js';
import { BotService, type InboundMessage } from './bot.service.js';
import { WhatsAppClient } from './whatsapp.client.js';

interface WebhookBody {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from: string;
          type: string;
          text?: { body: string };
          audio?: { id: string };
          interactive?: { button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } };
        }>;
      };
    }>;
  }>;
}

@Public()
@Controller('webhooks/whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly wa: WhatsAppClient,
    private readonly bot: BotService,
  ) {}

  /** Meta's one-time subscription verification handshake. */
  @Get()
  verify(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string) {
    if (mode === 'subscribe' && this.env.WHATSAPP_VERIFY_TOKEN && token === this.env.WHATSAPP_VERIFY_TOKEN) return challenge;
    throw new ForbiddenException();
  }

  /** Acknowledge immediately (Meta retries slow webhooks); process in the background. */
  @Post()
  @HttpCode(200)
  receive(@Req() req: RawBodyRequest<FastifyRequest>, @Headers('x-hub-signature-256') signature?: string) {
    if (!req.rawBody || !this.wa.verifySignature(req.rawBody, signature)) throw new BadRequestException('Bad signature');
    const body = req.body as WebhookBody;
    const messages = body.entry?.flatMap((e) => e.changes?.flatMap((c) => c.value?.messages ?? []) ?? []) ?? [];

    for (const m of messages) {
      const msg: InboundMessage = {
        from: m.from,
        type: m.type === 'text' ? 'text' : m.type === 'interactive' ? 'interactive' : m.type === 'audio' ? 'audio' : 'other',
        text: m.text?.body ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title,
        replyId: m.interactive?.button_reply?.id ?? m.interactive?.list_reply?.id,
        audioId: m.audio?.id,
      };
      void this.bot.handle(msg).catch((err: unknown) => this.logger.error({ err }, 'bot handler failed'));
    }
    return { ok: true };
  }
}
