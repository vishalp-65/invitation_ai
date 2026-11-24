import { BUILTIN_TEMPLATES, EVENT_TYPES, faithOf, getEventType, LANGUAGES, templateFaithClash, templateSupportsEvent, type EventTypeId, type LanguageCode } from '@cardai/shared';
import { and, desc, eq, events, ne, users, type Database } from '@cardai/db';
import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { ENV, type Env } from '../../config/env.js';
import { DB, REDIS, type Redis } from '../../infra/infra.module.js';
import { EntitlementsService } from '../entitlements/entitlements.service.js';
import { GuestsService } from '../guests/guests.service.js';
import { ShortLinksService } from '../short-links/short-links.service.js';
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
/** Host commands, typed or tapped. Anything else falls through to the card-making flow. */
const HOST_WORDS: Record<'status' | 'remind' | 'host', string[]> = {
  status: ['status', 'rsvp', 'rsvps', 'count', 'guests', 'स्थिति', 'मेहमान', 'गिनती'],
  remind: ['remind', 'reminder', 'reminders', 'याद', 'रिमाइंडर'],
  host: ['menu', 'help', 'मेनू', 'मदद'],
};
export function hostCommand(text: string, replyId?: string): 'status' | 'remind' | 'host' | 'new' | null {
  if (replyId === 'host:status') return 'status';
  if (replyId === 'host:remind') return 'remind';
  if (replyId === 'host:new') return 'new';
  const t = text.trim().toLowerCase();
  for (const [cmd, words] of Object.entries(HOST_WORDS)) if (words.includes(t)) return cmd as 'status' | 'remind' | 'host';
  return null;
}

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
    @Inject(DB) private readonly db: Database,
    private readonly wa: WhatsAppClient,
    private readonly auth: AuthService,
    private readonly ai: AiService,
    private readonly events: EventsService,
    private readonly renders: RendersService,
    private readonly guests: GuestsService,
    private readonly entitlements: EntitlementsService,
    private readonly links: ShortLinksService,
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

      // Hosts who already have invitations can check RSVPs and send reminders right here.
      const cmd = hostCommand(text, msg.replyId);
      if (cmd === 'new') return this.askType(phone);
      if (cmd && (!state || state.step === 'done' || state.step === 'confirm' || state.step === 'type')) {
        const host = await this.hostEvent(phone);
        if (host) return this.onHost(phone, cmd, host);
      }

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

    const community = intent.community ?? undefined;
    const content = await this.ai.generateWording(authUser, {
      eventType,
      community,
      language: code,
      tone: 'traditional',
      facts: { primaryNames: intent.primaryNames.slice(0, 2), primaryDetails: [], hosts: intent.hosts ?? undefined, extra: state.details },
    });

    const fns = intent.functions.length
      ? intent.functions
      : [{ name: getEventType(eventType).defaultFunctions[0] ?? 'Event', date: null, time: null, venue: null }];
    const fallbackDate = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
    // First design for the occasion, preferring one drawn for the family's faith.
    const faith = faithOf(eventType, community);
    const fits = BUILTIN_TEMPLATES.filter((t) => templateSupportsEvent(t, eventType));
    const template = fits.find((t) => !templateFaithClash(t.communities, faith)) ?? fits[0] ?? BUILTIN_TEMPLATES[0]!;

    const event = await this.events.create(authUser, {
      type: eventType,
      language: code,
      community,
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
    await this.save(phone, { ...state, step: 'confirm', language: code, eventId: event.id });
    if (!(await this.renderOrUpsell(phone, event.id, () => this.renders.create(authUser, { eventId: event.id, format: 'image' }, { whatsapp: phone })))) return;
    await this.wa.sendText(phone, '🎨 Designing your card. It will arrive here in about a minute.');
  }

  /** Free-plan allowance used up: say so with the upgrade link instead of going quiet. */
  private async renderOrUpsell(phone: string, eventId: string, run: () => Promise<unknown>): Promise<boolean> {
    try {
      await run();
      return true;
    } catch (err) {
      if (!(err instanceof ForbiddenException)) throw err;
      const res = err.getResponse() as { message?: string };
      await this.wa.sendText(phone, `${res.message ?? 'This needs an upgrade.'}
💳 Upgrade here: ${this.env.APP_URL}/dashboard/events/${eventId}?upgrade=1`);
      return false;
    }
  }

  private async onConfirm(phone: string, state: BotState, replyId?: string) {
    if (!state.eventId) return this.askType(phone);
    const editUrl = `${this.env.APP_URL}/dashboard/events/${state.eventId}`;
    if (replyId === 'video') {
      const { user } = await this.auth.upsertUserByPhone(phone);
      const eventId = state.eventId;
      if (!(await this.renderOrUpsell(phone, eventId, () => this.renders.create({ id: user.id, role: user.role }, { eventId, format: 'video' }, { whatsapp: phone })))) return;
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

  /** The host's most recent live invitation (by this WhatsApp number), if any. */
  private async hostEvent(phone: string) {
    const [u] = await this.db.select({ id: users.id, role: users.role }).from(users).where(eq(users.phone, phone));
    if (!u) return null;
    const [ev] = await this.db
      .select({ id: events.id, title: events.title })
      .from(events)
      .where(and(eq(events.userId, u.id), ne(events.status, 'archived')))
      .orderBy(desc(events.updatedAt))
      .limit(1);
    return ev ? { user: { id: u.id, role: u.role }, event: ev } : null;
  }

  private async onHost(phone: string, cmd: 'status' | 'remind' | 'host', host: NonNullable<Awaited<ReturnType<BotService['hostEvent']>>>) {
    const dash = `${this.env.APP_URL}/dashboard/events/${host.event.id}`;
    if (cmd === 'host') {
      await this.wa.sendButtons(phone, `🙏 ${host.event.title}\nWhat would you like to do?`, [
        { id: 'host:status', title: '📊 RSVP status' },
        { id: 'host:remind', title: '🔔 Send reminders' },
        { id: 'host:new', title: '➕ New invitation' },
      ]);
      return;
    }
    if (cmd === 'status') {
      const s = await this.guests.rsvpSummary(host.user, host.event.id);
      const lines = [
        `📊 *${host.event.title}*`,
        `Guests: ${s.totals.invited} · sent ${s.totals.sent} · opened ${s.totals.viewed} · replied ${s.totals.responded}`,
        '',
        ...s.functions.map((f) => `• ${f.name}: ✅ ${f.yes}  ❔ ${f.maybe}  ❌ ${f.no}  — ${f.headcount} people`),
      ];
      if (s.totals.checkedIn) lines.push('', `🎟️ Arrived: ${s.totals.checkedIn} families, ${s.totals.checkedInPax} people`);
      lines.push('', `Full list: ${dash}?tab=rsvp`, 'Type *remind* to nudge guests who have not opened it.');
      await this.wa.sendText(phone, lines.join('\n'));
      return;
    }
    // remind: send now through WhatsApp Business when the plan and template allow, else hand over the queue.
    const queueUrl = `${dash}?tab=guests&queue=unopened`;
    if (!this.wa.followUpsReady || !(await this.entitlements.has(host.event.id, 'personalized_links'))) {
      await this.wa.sendText(phone, `🔔 Open your send list and tap through each guest who has not opened the invite yet:\n${queueUrl}`);
      return;
    }
    const { items } = await this.guests.sendQueue(host.user, host.event.id, 'unopened');
    let sent = 0;
    for (const it of items.slice(0, 200)) {
      if (!it.phone) continue;
      try {
        await this.wa.sendFollowUpTemplate(it.phone, it.message);
        await this.guests.markSent(it.guestId, 'unopened');
        sent++;
      } catch (err) {
        this.logger.warn(`bot reminder to ${it.guestId} failed: ${(err as Error).message}`);
      }
    }
    await this.wa.sendText(phone, sent ? `✅ Sent a gentle reminder to ${sent} guests who had not opened the invitation.` : `Everyone with a mobile number has opened it already, or has had a reminder. 🎉\n${dash}?tab=guests`);
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
