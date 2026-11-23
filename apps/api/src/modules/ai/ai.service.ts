import {
  backgroundImagePrompt,
  caricaturePrompt,
  cardScanPrompt,
  intentPrompt,
  OpenRouterError,
  paintingPrompt,
  portraitCutoutPrompt,
  siteDraftPrompt,
  PROMPT_VERSION,
  transliterationOutputSchema,
  transliterationPrompt,
  translationPrompt,
  wordingOutputSchema,
  wordingPrompt,
  type OpenRouterClient,
  type WordingOutput,
} from '@cardai/ai';
import { aiGenerations, eq, sql, type Database } from '@cardai/db';
import {
  AI_BACKGROUNDS_PER_EVENT,
  eventContentSchema,
  UPGRADE_FEATURES,
  faithOf,
  FREE_AI_QUOTA_PER_DAY,
  getEventType,
  invocationFor,
  parsedEventIntentSchema,
  scannedCardSchema,
  type ScanCardInput,
  type ScanCardResult,
  QUEUES,
  siteDraftOutputSchema,
  type SiteDraftInput,
  type SiteDraftOutput,
  type AiClipJobData,
  type EventContent,
  type GenerateClipInput,
  type GenerateImageInput,
  type GenerateWordingInput,
  type LanguageCode,
  type ParsedEventIntent,
  type TransliterateInput,
} from '@cardai/shared';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, HttpException, UnprocessableEntityException, HttpStatus, Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth.decorators.js';
import { hashJson } from '../../common/crypto.js';
import { ENV, type Env } from '../../config/env.js';
import { bumpCounter } from '../../common/redis.js';
import { DB, OPENROUTER, REDIS, type Redis } from '../../infra/infra.module.js';
import { EntitlementsService } from '../entitlements/entitlements.service.js';
import { EventsService } from '../events/events.service.js';
import { MediaService } from '../media/media.service.js';
import { TemplatesService } from '../templates/templates.service.js';

const CACHE_TTL_SEC = 7 * 24 * 3600;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(DB) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(OPENROUTER) private readonly ai: OpenRouterClient,
    @InjectQueue(QUEUES.aiClip) private readonly clipQueue: Queue<AiClipJobData>,
    private readonly events: EventsService,
    private readonly media: MediaService,
    private readonly entitlements: EntitlementsService,
    private readonly templates: TemplatesService,
  ) {}

  private ensureConfigured() {
    if (!this.env.OPENROUTER_API_KEY) throw new ServiceUnavailableException('AI is not configured (OPENROUTER_API_KEY)');
  }

  /** Daily per-user quota (free-tier guardrail against cost abuse). */
  private async consumeQuota(userId: string, kind: keyof typeof FREE_AI_QUOTA_PER_DAY, amount = 1) {
    const day = new Date().toISOString().slice(0, 10);
    const key = `aiq:${kind}:${userId}:${day}`;
    const used = await bumpCounter(this.redis, key, 26 * 3600, amount);
    if (used > FREE_AI_QUOTA_PER_DAY[kind]) {
      throw new HttpException(`Daily AI limit reached for ${kind}. Please try again tomorrow.`, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async cached<T>(key: string, produce: () => Promise<T>): Promise<T> {
    const hit = await this.redis.get(key);
    if (hit) return JSON.parse(hit) as T;
    const value = await produce();
    await this.redis.set(key, JSON.stringify(value), 'EX', CACHE_TTL_SEC);
    return value;
  }

  private async log(kind: (typeof aiGenerations.$inferInsert)['kind'], userId: string | null, data: Partial<typeof aiGenerations.$inferInsert>) {
    await this.db
      .insert(aiGenerations)
      .values({ kind, userId, status: 'completed', completedAt: new Date(), ...data })
      .catch((err: unknown) => this.logger.warn({ err }, 'failed to log AI generation'));
  }

  private wrap(err: unknown): never {
    if (err instanceof OpenRouterError) {
      this.logger.error({ status: err.status, body: err.body }, 'OpenRouter error');
      throw new ServiceUnavailableException('AI service is busy, please try again in a moment');
    }
    throw err;
  }

  // ---------------- Wording ----------------

  async generateWording(user: AuthUser, input: GenerateWordingInput): Promise<EventContent> {
    this.ensureConfigured();
    await this.consumeQuota(user.id, 'wording');
    const key = `ai:wording:${PROMPT_VERSION}:${hashJson(input)}`;
    try {
      const output = await this.cached(key, async () => {
        const { system, user: prompt } = wordingPrompt(input);
        const { data, usage } = await this.ai.chatJson({
          models: this.env.AI_TEXT_MODELS,
          system,
          user: prompt,
          schema: wordingOutputSchema,
          schemaName: 'invitation_wording',
          temperature: 0.8,
          userId: user.id,
        });
        await this.log('wording', user.id, { model: usage.model, costUsd: usage.costUsd?.toString(), input: input as never });
        return data;
      });
      return toContent(output, input);
    } catch (err) {
      this.wrap(err);
    }
  }

  // ---------------- Transliteration ----------------

  async transliterate(user: AuthUser, input: TransliterateInput): Promise<{ results: string[] }> {
    if (input.language === 'en') return { results: input.texts };
    this.ensureConfigured();

    // Per-string cache: names repeat a lot across users.
    const keys = input.texts.map((t) => `ai:tl:${input.language}:${t.toLowerCase()}`);
    const hits = await this.redis.mget(keys);
    const missing = input.texts.filter((_, i) => !hits[i]);
    if (missing.length) {
      await this.consumeQuota(user.id, 'transliteration', missing.length);
      try {
        const { system, user: prompt } = transliterationPrompt({ texts: missing, language: input.language });
        const { data } = await this.ai.chatJson({
          models: this.env.AI_TEXT_MODELS,
          system,
          user: prompt,
          schema: transliterationOutputSchema,
          schemaName: 'transliteration',
          temperature: 0,
          maxTokens: 800,
          userId: user.id,
        });
        const pipeline = this.redis.pipeline();
        missing.forEach((text, i) => {
          const out = data.results[i];
          if (out) pipeline.set(`ai:tl:${input.language}:${text.toLowerCase()}`, out, 'EX', 90 * 24 * 3600);
        });
        await pipeline.exec();
        const fresh = new Map(missing.map((t, i) => [t, data.results[i] ?? t]));
        return { results: input.texts.map((t, i) => hits[i] ?? fresh.get(t) ?? t) };
      } catch (err) {
        this.wrap(err);
      }
    }
    return { results: hits.map((h, i) => h ?? input.texts[i]!) };
  }

  // ---------------- Translation of existing content ----------------

  async translateEvent(user: AuthUser, eventId: string, targetLanguage: LanguageCode): Promise<EventContent> {
    this.ensureConfigured();
    const event = await this.events.getOwned(user, eventId);
    await this.consumeQuota(user.id, 'wording');
    try {
      const { system, user: prompt } = translationPrompt(targetLanguage, event.content);
      const { data, usage } = await this.ai.chatJson({
        models: this.env.AI_TEXT_MODELS,
        system,
        user: prompt,
        schema: eventContentSchema,
        schemaName: 'invitation_content',
        temperature: 0.2,
        userId: user.id,
      });
      await this.log('translation', user.id, { eventId, model: usage.model, costUsd: usage.costUsd?.toString() });
      // Never lose card details the model skipped; phone numbers and the hashtag stay as typed.
      const src = event.content;
      return {
        ...src,
        ...data,
        welcomeLines: data.welcomeLines?.length ? data.welcomeLines : src.welcomeLines,
        complimentsLines: data.complimentsLines?.length ? data.complimentsLines : src.complimentsLines,
        rsvpContacts: src.rsvpContacts?.map((r, i) => ({ name: data.rsvpContacts?.[i]?.name || r.name, phone: r.phone })),
        hashtag: src.hashtag,
      };
    } catch (err) {
      this.wrap(err);
    }
  }

  // ---------------- Images ----------------

  /** Backgrounds being generated right now on the allowance (reserved, not yet logged). */
  private bgInflightKey(eventId: string) {
    return `aibg:inflight:${eventId}`;
  }

  /**
   * Allowance backgrounds already made, from the durable ai_generations log (a Redis flush must
   * never hand out a fresh allowance). Rows logged before `paid` was recorded count as allowance.
   */
  private async allowanceUsed(eventId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(aiGenerations)
      .where(
        sql`${aiGenerations.eventId} = ${eventId} and ${aiGenerations.kind} = 'image' and ${aiGenerations.status} = 'completed'
            and ${aiGenerations.input}->>'kind' in ('background', 'painting') and coalesce(${aiGenerations.input}->>'paid', 'allowance') = 'allowance'`,
      );
    return Number(row?.n ?? 0);
  }

  private async upgraded(eventId: string) {
    const { features, credits } = await this.entitlements.forEvent(eventId);
    return { upgraded: UPGRADE_FEATURES.some((f) => features.has(f)), credits: credits.ai_background ?? 0 };
  }

  /**
   * Pays for one AI background: the invitation's included allowance first, then an
   * `ai_background` credit (AI Background Pack). Returns how it was paid, for refunds.
   */
  private async chargeBackground(eventId: string, upgraded: boolean): Promise<'allowance' | 'credit'> {
    const included = upgraded ? AI_BACKGROUNDS_PER_EVENT.paid : AI_BACKGROUNDS_PER_EVENT.free;
    // Reserve first (atomic), so two parallel requests can't both take the last free one.
    const key = this.bgInflightKey(eventId);
    const [[, inflight]] = (await this.redis.multi().incr(key).expire(key, 600).exec()) as [[null, number], unknown];
    if ((await this.allowanceUsed(eventId)) + inflight <= included) return 'allowance';
    await this.redis.decr(key);
    try {
      await this.entitlements.consumeCredit(eventId, 'ai_background');
      return 'credit';
    } catch {
      throw new HttpException('No AI backgrounds left for this invitation. Get the AI Background Pack to make more.', HttpStatus.PAYMENT_REQUIRED);
    }
  }

  /** Releases an allowance reservation (after it was logged, or when generation failed). */
  private async releaseReservation(eventId: string) {
    await this.redis.decr(this.bgInflightKey(eventId)).catch(() => undefined);
  }

  private async refundBackground(eventId: string, how: 'allowance' | 'credit') {
    if (how === 'allowance') await this.releaseReservation(eventId);
    else await this.entitlements.refundCredit(eventId, 'ai_background');
  }

  /** AI background allowance + pack credits for one invitation (the editor shows "2 left"). */
  async imageQuota(user: AuthUser, eventId: string) {
    const event = await this.events.getOwned(user, eventId, 'view');
    const { upgraded, credits } = await this.upgraded(event.id);
    const used = await this.allowanceUsed(event.id);
    const included = upgraded ? AI_BACKGROUNDS_PER_EVENT.paid : AI_BACKGROUNDS_PER_EVENT.free;
    return {
      background: { used: Math.min(used, included), included, credits, remaining: Math.max(0, included - used) + credits, upgraded },
      configured: Boolean(this.env.OPENROUTER_API_KEY),
    };
  }

  async generateImage(user: AuthUser, input: GenerateImageInput) {
    this.ensureConfigured();
    const event = await this.events.getOwned(user, input.eventId);
    const { upgraded: paid } = await this.upgraded(event.id);

    // Build the prompt first so bad input never costs a credit.
    let references: string[] | undefined;
    let prompt: string;
    if (input.kind === 'background') {
      const template = await this.templates.resolve(event.templateId);
      prompt = backgroundImagePrompt({ eventLabel: getEventType(event.type).label, theme: template.theme, extra: input.prompt, faith: faithOf(event.type, event.community) });
    } else {
      if (!input.sourceAssetId) throw new BadRequestException('Upload a photo first');
      const source = await this.media.getOwnedAsset(user, input.sourceAssetId);
      const urls = await this.media.urlsFor([source.id]);
      references = [urls.get(source.id)!];
      prompt = input.kind === 'caricature' ? caricaturePrompt(input.prompt) : input.kind === 'painting' ? paintingPrompt(input.prompt) : portraitCutoutPrompt();
    }

    // Backgrounds and photo paintings share the invitation's AI allowance, then pack credits.
    const charged = input.kind === 'background' || input.kind === 'painting';
    const charge = charged ? await this.chargeBackground(event.id, paid) : null;
    // Daily per-user guardrail applies to free generations only (pack credits are paid for).
    if (!paid && charge !== 'credit') {
      try {
        await this.consumeQuota(user.id, 'image');
      } catch (err) {
        if (charge) await this.refundBackground(event.id, charge);
        throw err;
      }
    }

    try {
      const model = paid ? this.env.AI_IMAGE_PREMIUM_MODEL : this.env.AI_IMAGE_MODEL;
      const result = await this.ai.generateImage({
        model,
        prompt,
        aspectRatio: input.kind === 'background' ? '9:16' : input.kind === 'painting' ? '3:4' : '1:1',
        references,
        background: charged ? 'opaque' : 'transparent',
        outputFormat: charged ? 'jpeg' : 'png',
        userId: user.id,
      });
      const asset = await this.media.storeGenerated({
        userId: user.id,
        eventId: event.id,
        kind: 'ai_image',
        buffer: result.buffer,
        contentType: result.mediaType,
        meta: { aiKind: input.kind, model },
      });
      const logRow = { eventId: event.id, model, costUsd: result.usage.costUsd?.toString(), assetId: asset.id, input: { kind: input.kind, ...(charge ? { paid: charge } : {}) } };
      if (charge === 'allowance') {
        // This row is what counts the allowance, so it must be written before the reservation goes.
        await this.db
          .insert(aiGenerations)
          .values({ kind: 'image', userId: user.id, status: 'completed', completedAt: new Date(), ...logRow })
          .then(() => this.releaseReservation(event.id))
          .catch((err: unknown) => this.logger.error({ err, eventId: event.id }, 'AI background made but not logged; reservation kept until it expires'));
      } else {
        await this.log('image', user.id, logRow);
      }
      return this.media.toDto(asset);
    } catch (err) {
      // A failed generation shouldn't use up a credit.
      if (charge) await this.refundBackground(event.id, charge).catch(() => undefined);
      this.wrap(err);
    }
  }

  // ---------------- AI video clip (async, paid credit) ----------------

  async requestClip(user: AuthUser, input: GenerateClipInput) {
    this.ensureConfigured();
    const event = await this.events.getOwned(user, input.eventId);
    await this.entitlements.consumeCredit(event.id, 'ai_clip');

    let firstFrameUrl: string | undefined;
    if (input.firstFrameAssetId) {
      const asset = await this.media.getOwnedAsset(user, input.firstFrameAssetId);
      firstFrameUrl = (await this.media.urlsFor([asset.id])).get(asset.id);
    }
    const [gen] = await this.db
      .insert(aiGenerations)
      .values({
        kind: 'video_clip',
        userId: user.id,
        eventId: event.id,
        model: this.env.AI_VIDEO_MODEL,
        status: 'queued',
        input: { prompt: input.prompt ?? null, firstFrameUrl: firstFrameUrl ?? null, templateId: event.templateId, eventType: event.type, community: event.community ?? null },
      })
      .returning();
    await this.clipQueue.add('clip', { generationId: gen!.id }, { jobId: gen!.id, attempts: 1 });
    return { id: gen!.id, status: gen!.status };
  }

  async getGeneration(user: AuthUser, id: string) {
    const [gen] = await this.db.select().from(aiGenerations).where(eq(aiGenerations.id, id));
    if (!gen || (gen.userId !== user.id && user.role !== 'admin')) throw new NotFoundException('Not found');
    const asset = gen.assetId ? (await this.media.urlsFor([gen.assetId])).get(gen.assetId) : null;
    return { id: gen.id, kind: gen.kind, status: gen.status, error: gen.error, assetId: gen.assetId, url: asset ?? null };
  }

  // ---------------- Invitation website draft ----------------

  /** Writes the website's words (welcome, intros, story, FAQ, dress code) from the host's facts. */
  async draftSite(user: AuthUser, eventId: string, input: SiteDraftInput): Promise<SiteDraftOutput> {
    this.ensureConfigured();
    const event = await this.events.getOwned(user, eventId);
    await this.consumeQuota(user.id, 'wording');
    const fns = await this.events.functionsOf(event.id);
    const facts = {
      eventType: event.type,
      language: event.language,
      tone: input.tone,
      vibe: input.vibe,
      community: event.community,
      primaryNames: event.content.primaryNames,
      functions: fns.map((f) => ({ name: f.name, date: f.startsAt.toISOString().slice(0, 10), venue: f.venueName })),
      story: input.story,
    };
    const key = `ai:site:${PROMPT_VERSION}:${hashJson(facts)}`;
    try {
      return await this.cached(key, async () => {
        const { system, user: prompt } = siteDraftPrompt(facts);
        const { data, usage } = await this.ai.chatJson({
          models: this.env.AI_TEXT_MODELS,
          system,
          user: prompt,
          schema: siteDraftOutputSchema,
          schemaName: 'invitation_site',
          temperature: 0.7,
          maxTokens: 2500,
          userId: user.id,
        });
        await this.log('wording', user.id, { eventId, model: usage.model, costUsd: usage.costUsd?.toString(), input: { site: true } });
        return data;
      });
    } catch (err) {
      this.wrap(err);
    }
  }

  // ---------------- Card scan: photo of a printed card → draft details ----------------

  /**
   * Reads an uploaded invitation card. Photos go to a vision model; when the browser could only send
   * its own OCR text (vision unavailable), a text model structures that instead.
   */
  async scanCard(user: AuthUser, input: ScanCardInput): Promise<ScanCardResult> {
    this.ensureConfigured();
    await this.consumeQuota(user.id, 'scan');
    const method = input.images.length ? 'vision' : 'ocr';
    const { system } = cardScanPrompt(new Date().toISOString().slice(0, 10));
    const userContent =
      method === 'vision'
        ? [
            { type: 'text' as const, text: `Read this invitation card (${input.images.length} photo${input.images.length > 1 ? 's' : ''}).` },
            ...input.images.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
          ]
        : `Text read off the card by OCR (expect recognition errors; fix only obvious ones):

${input.ocrText}`;
    try {
      const { data, usage } = await this.ai.chatJson({
        models: method === 'vision' ? this.env.AI_VISION_MODELS : this.env.AI_TEXT_MODELS,
        system,
        user: userContent,
        schema: scannedCardSchema,
        schemaName: 'scanned_card',
        temperature: 0,
        maxTokens: 4000,
        userId: user.id,
      });
      await this.log('intent', user.id, { model: usage.model, costUsd: usage.costUsd?.toString(), input: { scan: method, photos: input.images.length } });
      if (!data.isInvitation) throw new UnprocessableEntityException('This doesn’t look like an invitation card. Try a clearer photo, or fill in the details yourself.');
      return { ...data, method };
    } catch (err) {
      this.wrap(err);
    }
  }

  // ---------------- Conversational intake (WhatsApp / voice) ----------------

  async parseIntent(text: string, userId?: string): Promise<ParsedEventIntent> {
    this.ensureConfigured();
    const { system } = intentPrompt(new Date().toISOString().slice(0, 10));
    const { data } = await this.ai.chatJson({
      models: this.env.AI_TEXT_MODELS,
      system,
      user: text.slice(0, 2000),
      schema: parsedEventIntentSchema,
      schemaName: 'event_intent',
      temperature: 0,
      userId,
    });
    return data;
  }

  /** Voice note → text using an audio-capable model. */
  async transcribe(audio: Buffer, format: string, userId?: string): Promise<string> {
    this.ensureConfigured();
    const { data } = await this.ai.chatJson({
      models: this.env.AI_AUDIO_MODELS,
      system: 'Transcribe the voice message verbatim in its original language and script. Return {"text": "..."}',
      user: [
        { type: 'text', text: 'Transcribe this.' },
        { type: 'input_audio', input_audio: { data: audio.toString('base64'), format } },
      ],
      schema: z.object({ text: z.string() }),
      schemaName: 'transcript',
      temperature: 0,
      userId,
    });
    return data.text;
  }
}

function toContent(o: WordingOutput, input: GenerateWordingInput): EventContent {
  return eventContentSchema.parse({
    // The blessing line is decided by the family's faith, never by the model (it tends to put a
    // Ganesha line on every Indian card).
    invocation: invocationFor({ eventType: input.eventType, faith: faithOf(input.eventType, input.community), language: input.language, community: input.community }),
    headline: o.headline,
    hostLine: o.hostLine || undefined,
    primaryNames: (o.primaryNames.length ? o.primaryNames : input.facts.primaryNames).slice(0, 2),
    primaryDetails: o.primaryDetails.slice(0, 2),
    connector: o.connector || undefined,
    message: o.message || undefined,
    familyTitle: o.familyTitle || undefined,
    familyLines: o.familyLines.slice(0, 12),
    closing: o.closing || undefined,
  });
}
