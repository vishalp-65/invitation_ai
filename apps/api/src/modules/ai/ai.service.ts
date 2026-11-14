import {
  backgroundImagePrompt,
  caricaturePrompt,
  intentPrompt,
  OpenRouterError,
  portraitCutoutPrompt,
  PROMPT_VERSION,
  transliterationOutputSchema,
  transliterationPrompt,
  translationPrompt,
  wordingOutputSchema,
  wordingPrompt,
  type OpenRouterClient,
  type WordingOutput,
} from '@cardai/ai';
import { aiGenerations, eq, type Database } from '@cardai/db';
import {
  eventContentSchema,
  FREE_AI_QUOTA_PER_DAY,
  getEventType,
  parsedEventIntentSchema,
  QUEUES,
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
import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth.decorators.js';
import { hashJson } from '../../common/crypto.js';
import { ENV, type Env } from '../../config/env.js';
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
    const used = await this.redis.incrby(key, amount);
    if (used === amount) await this.redis.expire(key, 26 * 3600);
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
      return data;
    } catch (err) {
      this.wrap(err);
    }
  }

  // ---------------- Images ----------------

  async generateImage(user: AuthUser, input: GenerateImageInput) {
    this.ensureConfigured();
    const event = await this.events.getOwned(user, input.eventId);
    const paid = (await this.entitlements.forEvent(event.id)).features.size > 0;
    if (!paid) await this.consumeQuota(user.id, 'image');

    let references: string[] | undefined;
    let prompt: string;
    if (input.kind === 'background') {
      const template = await this.templates.resolve(event.templateId);
      prompt = backgroundImagePrompt({ eventLabel: getEventType(event.type).label, theme: template.theme, extra: input.prompt });
    } else {
      if (!input.sourceAssetId) throw new BadRequestException('Upload a photo first');
      const source = await this.media.getOwnedAsset(user, input.sourceAssetId);
      const urls = await this.media.urlsFor([source.id]);
      references = [urls.get(source.id)!];
      prompt = input.kind === 'caricature' ? caricaturePrompt(input.prompt) : portraitCutoutPrompt();
    }

    try {
      const model = paid ? this.env.AI_IMAGE_PREMIUM_MODEL : this.env.AI_IMAGE_MODEL;
      const result = await this.ai.generateImage({
        model,
        prompt,
        aspectRatio: input.kind === 'background' ? '9:16' : '1:1',
        references,
        background: input.kind === 'background' ? 'opaque' : 'transparent',
        outputFormat: input.kind === 'background' ? 'jpeg' : 'png',
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
      await this.log('image', user.id, { eventId: event.id, model, costUsd: result.usage.costUsd?.toString(), assetId: asset.id, input: { kind: input.kind } });
      return this.media.toDto(asset);
    } catch (err) {
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
        input: { prompt: input.prompt ?? null, firstFrameUrl: firstFrameUrl ?? null, templateId: event.templateId, eventType: event.type },
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
    invocation: o.invocation || undefined,
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
