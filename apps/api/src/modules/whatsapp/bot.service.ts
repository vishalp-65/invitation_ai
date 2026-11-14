import { BUILTIN_TEMPLATES, EVENT_TYPES, getEventType, LANGUAGES, templateSupportsEvent, type EventTypeId, type LanguageCode } from '@cardai/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV, type Env } from '../../config/env.js';
import { REDIS, type Redis } from '../../infra/infra.module.js';
import { AiService } from '../ai/ai.service.js';
import { AuthService } from '../auth/auth.service.js';
import { EventsService } from '../events/events.service.js';
import { RendersService } from '../renders/renders.service.js';
import { WhatsAppClient } from './whatsapp.client.js';

/** Conversation state per phone, kept in Redis for 24h (WhatsApp session window). */
interface BotState {
  step: 'type' | 'details' | 'language' | 'confirm' | 'done';
  eventType?: EventTypeId;
  language?: LanguageCode;
  details?: string;
  eventId?: string;
}

export interface InboundMessage {
  from: string; // E.164 without "+"
  type: 'text' | 'interactive' | 'audio' | 'other';
  text?: string;
  replyId?: string;
  audioId?: string;
}

const QUICK_TYPES: EventTypeId[] = ['wedding', 'birthday', 'griha-pravesh', 'engagement', 'puja', 'anniversary', 'baby-shower', 'mundan', 'shop-opening', 'other'];
const QUICK_LANGS: LanguageCode[] = ['hi', 'en', 'mr', 'gu', 'ta', 'te', 'bn', 'kn', 'pa', 'ml'];

/**
 * WhatsApp-first creation flow for users who never open a website:
 * pick event → describe it in one message (text or voice, any language) → pick language → get a card.
 */
@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly wa: WhatsAppClient,
    private readonly auth: AuthService,
    private readonly ai: AiService,
    private readonly events: EventsService,
    private readonly renders: RendersService,
  ) {}

  private key(phone: string) {
    return `bot:${phone}`;
  }

  private async load(phone: string): Promise<BotState | null> {
    const raw = await this.redis.get(this.key(phone));
    return raw ? (JSON.parse(raw) as BotState) : null;
  }

  private save(phone: string, state: BotState) {
    return this.redis.set(this.key(phone), JSON.stringify(state), 'EX', 24 * 3600);
  }

  async handle(msg: InboundMessage): Promise<void> {
    const phone = `+${msg.from}`;
    try {
      let text = msg.text?.trim() ?? '';
      if (msg.type === 'audio' && msg.audioId) {
        const media = await this.wa.downloadMedia(msg.audioId);
        text = await this.ai.transcribe(media.buffer, media.mimeType.includes('ogg') ? 'ogg' : 'mp3', phone);
      }
      const state = await this.load(phone);
      const lower = text.toLowerCase();

      if (!state || ['hi', 'hello', 'namaste', 'start', 'menu', 'नमस्ते'].includes(lower) || msg.replyId === 'restart') {
        return this.askType(phone);
      }
      switch (state.step) {
        case 'type':
          return this.onType(phone, msg.replyId);
        case 'details':
          return this.onDetails(phone, state, text);
        case 'language':
          return this.onLanguage(phone, state, msg.replyId);
        case 'confirm':
          return this.onConfirm(phone, state, msg.replyId);
        default:
          return this.askType(phone);
      }
    } catch (err) {
      this.logger.error({ err }, 'bot failure');
      await this.wa.sendText(phone, 'Sorry, something went wrong. Type "menu" to start again. 🙏').catch(() => undefined);
    }
  }

  private async askType(phone: string) {
    await this.save(phone, { step: 'type' });
    await this.wa.sendList(
      phone,
      '🙏 Namaste! Let us make your invitation card in 2 minutes.\nनमस्ते! 2 मिनट में अपना निमंत्रण कार्ड बनाइए।\n\nWhat is the occasion?',
      'Choose event',
      QUICK_TYPES.map((id) => ({ id: `type:${id}`, title: getEventType(id).label })),
    );
  }

  private async onType(phone: string, replyId?: string) {
    const id = replyId?.replace('type:', '') as EventTypeId | undefined;
    if (!id || !EVENT_TYPES.some((e) => e.id === id)) return this.askType(phone);
    await this.save(phone, { step: 'details', eventType: id });
    await this.wa.sendText(
      phone,
      [
        `Great! ${getEventType(id).emoji} Now send the details in ONE message (type or 🎤 voice note, any language):`,
        '',
        '• Names (e.g. Rahul & Priya)',
        '• Who is inviting (parents / family)',
        '• Date, time and venue for each function',
        '',
        'Example: "Rahul weds Priya, Sharma parivar ki taraf se. Haldi 10 Dec subah 10 baje ghar par, shaadi 11 Dec raat 8 baje Rambagh Palace Jaipur"',
      ].join('\n'),
    );
  }

  private async onDetails(phone: string, state: BotState, text: string) {
    if (text.length < 8) {
      await this.wa.sendText(phone, 'Please send a bit more detail — names, date and venue 🙏');
      return;
    }
    await this.save(phone, { ...state, step: 'language', details: text });
    await this.wa.sendList(
      phone,
      'In which language should the card be written?',
      'Choose language',
      QUICK_LANGS.map((code) => {
        const l = LANGUAGES.find((x) => x.code === code)!;
        return { id: `lang:${code}`, title: `${l.nativeName} (${l.name})` };
      }),
    );
  }

  private async onLanguage(phone: string, state: BotState, replyId?: string) {
    const code = replyId?.replace('lang:', '') as LanguageCode | undefined;
    if (!code || !LANGUAGES.some((l) => l.code === code)) return this.onDetails(phone, state, state.details ?? '');
    await this.wa.sendText(phone, '✨ Creating your invitation…');

    const { user } = await this.auth.upsertUserByPhone(phone);
    const authUser = { id: user.id, role: user.role };
    const intent = await this.ai.parseIntent(state.details ?? '', user.id);
    const eventType = state.eventType ?? intent.eventType ?? 'other';

    const content = await this.ai.generateWording(authUser, {
      eventType,
      language: code,
      tone: 'traditional',
      facts: { primaryNames: intent.primaryNames.slice(0, 2), primaryDetails: [], hosts: intent.hosts ?? undefined, extra: state.details },
    });

    const fns = intent.functions.length
      ? intent.functions
      : [{ name: getEventType(eventType).defaultFunctions[0] ?? 'Event', date: null, time: null, venue: null }];
    const fallbackDate = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
    const template = BUILTIN_TEMPLATES.find((t) => templateSupportsEvent(t, eventType)) ?? BUILTIN_TEMPLATES[0]!;

    const event = await this.events.create(authUser, {
      type: eventType,
      language: code,
      templateId: template.id,
      title: content.headline || getEventType(eventType).label,
      content,
      functions: fns.slice(0, 8).map((f) => ({
        name: f.name,
        startsAt: `${f.date ?? fallbackDate}T${f.time ?? '18:00'}:00+05:30`,
        venueName: f.venue ?? 'Venue to be announced',
      })),
    });
    await this.events.setStatus(authUser, event.id, 'published');
    await this.renders.create(authUser, { eventId: event.id, format: 'image' }, { whatsapp: phone });

    await this.save(phone, { ...state, step: 'confirm', language: code, eventId: event.id });
    await this.wa.sendText(phone, '🎨 Designing your card. It will arrive here in about a minute.');
  }

  private async onConfirm(phone: string, state: BotState, replyId?: string) {
    if (!state.eventId) return this.askType(phone);
    const editUrl = `${this.env.APP_URL}/dashboard/events/${state.eventId}`;
    if (replyId === 'video') {
      const { user } = await this.auth.upsertUserByPhone(phone);
      await this.renders.create({ id: user.id, role: user.role }, { eventId: state.eventId, format: 'video' }, { whatsapp: phone });
      await this.wa.sendText(phone, '🎬 Making your video invite. It takes 2–4 minutes.');
      return;
    }
    if (replyId === 'edit') {
      await this.wa.sendText(phone, `✏️ Edit wording, photos, design and more here (login with this number):\n${editUrl}`);
      return;
    }
    if (replyId === 'hd') {
      await this.wa.sendText(phone, `💳 Remove the watermark and get HD + video + website from ₹79:\n${editUrl}?upgrade=1`);
      return;
    }
    await this.sendPostRenderMenu(phone);
  }

  /** Shown after a card arrives. */
  async sendPostRenderMenu(phone: string) {
    await this.wa.sendButtons(phone, 'What next?', [
      { id: 'video', title: '🎬 Make video' },
      { id: 'edit', title: '✏️ Edit card' },
      { id: 'hd', title: '⭐ Get HD' },
    ]);
  }
}
