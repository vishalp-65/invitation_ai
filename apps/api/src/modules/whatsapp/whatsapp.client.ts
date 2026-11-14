import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV, type Env } from '../../config/env.js';
import { hmacSha256Hex, safeEqual } from '../../common/crypto.js';

const GRAPH = 'https://graph.facebook.com/v23.0';

export interface ButtonOption {
  id: string;
  title: string;
}

/** Thin WhatsApp Cloud API client. All methods no-op (with a log) when not configured. */
@Injectable()
export class WhatsAppClient {
  private readonly logger = new Logger(WhatsAppClient.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  get configured(): boolean {
    return Boolean(this.env.WHATSAPP_PHONE_NUMBER_ID && this.env.WHATSAPP_ACCESS_TOKEN);
  }

  verifySignature(rawBody: Buffer, header: string | undefined): boolean {
    if (!this.env.WHATSAPP_APP_SECRET || !header?.startsWith('sha256=')) return false;
    return safeEqual(hmacSha256Hex(this.env.WHATSAPP_APP_SECRET, rawBody), header.slice(7));
  }

  private async send(to: string, payload: Record<string, unknown>) {
    if (!this.configured) {
      this.logger.warn(`[whatsapp disabled] would send to ${to}: ${JSON.stringify(payload).slice(0, 200)}`);
      return;
    }
    const res = await fetch(`${GRAPH}/${this.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: to.replace('+', ''), ...payload }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`WhatsApp send failed ${res.status}: ${body.slice(0, 300)}`);
      throw new Error(`WhatsApp send failed (${res.status})`);
    }
  }

  sendText(to: string, body: string) {
    return this.send(to, { type: 'text', text: { body: body.slice(0, 4096), preview_url: true } });
  }

  /** Up to 3 reply buttons (titles ≤ 20 chars). */
  sendButtons(to: string, body: string, buttons: ButtonOption[]) {
    return this.send(to, {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body.slice(0, 1024) },
        action: { buttons: buttons.slice(0, 3).map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title.slice(0, 20) } })) },
      },
    });
  }

  /** Up to 10 list rows (titles ≤ 24 chars). */
  sendList(to: string, body: string, button: string, rows: ButtonOption[]) {
    return this.send(to, {
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: body.slice(0, 1024) },
        action: { button: button.slice(0, 20), sections: [{ title: 'Options', rows: rows.slice(0, 10).map((r) => ({ id: r.id, title: r.title.slice(0, 24) })) }] },
      },
    });
  }

  sendImage(to: string, link: string, caption?: string) {
    return this.send(to, { type: 'image', image: { link, caption } });
  }

  sendVideo(to: string, link: string, caption?: string) {
    return this.send(to, { type: 'video', video: { link, caption } });
  }

  /** Business-initiated message (outside the 24h window) requires an approved template. */
  sendInviteTemplate(to: string, params: { guestName: string; eventTitle: string; url: string }, language = 'en') {
    return this.send(to, {
      type: 'template',
      template: {
        name: this.env.WHATSAPP_INVITE_TEMPLATE,
        language: { code: language },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: params.guestName },
              { type: 'text', text: params.eventTitle },
              { type: 'text', text: params.url },
            ],
          },
        ],
      },
    });
  }

  /** Downloads inbound media (e.g. a voice note). */
  async downloadMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const headers = { Authorization: `Bearer ${this.env.WHATSAPP_ACCESS_TOKEN}` };
    const meta = (await (await fetch(`${GRAPH}/${mediaId}`, { headers })).json()) as { url: string; mime_type: string };
    const file = await fetch(meta.url, { headers, signal: AbortSignal.timeout(30_000) });
    return { buffer: Buffer.from(await file.arrayBuffer()), mimeType: meta.mime_type };
  }
}
