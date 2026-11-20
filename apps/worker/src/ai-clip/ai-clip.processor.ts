import { clipPrompt } from '@cardai/ai';
import { aiGenerations, and, entitlements, eq, events, mediaAssets, sql } from '@cardai/db';
import { AI_CLIP_SECONDS, BUILTIN_TEMPLATES, faithOf, findBuiltinTemplate, getEventType, type AiClipJobData } from '@cardai/shared';
import type { Job } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import type { WorkerContext } from '../context.js';

const POLL_MS = 10_000;
const MAX_WAIT_MS = 15 * 60_000;

/**
 * Generates a short cinematic intro via OpenRouter's async video API.
 * Cost control: 720p, no audio (our music track is used), 6 s, one attempt; credit refunded on failure.
 */
export function createAiClipProcessor(ctx: WorkerContext) {
  return async function process(job: Job<AiClipJobData>): Promise<void> {
    const [gen] = await ctx.db.select().from(aiGenerations).where(eq(aiGenerations.id, job.data.generationId));
    if (!gen || gen.status === 'completed' || !gen.eventId || !gen.userId) return;
    const log = ctx.log.child({ generationId: gen.id });
    const input = gen.input as { prompt: string | null; firstFrameUrl: string | null; templateId: string; eventType: string; community?: string | null };

    try {
      await ctx.db.update(aiGenerations).set({ status: 'processing' }).where(eq(aiGenerations.id, gen.id));
      const theme = (findBuiltinTemplate(input.templateId) ?? BUILTIN_TEMPLATES[0]!).theme;
      const submitted = await ctx.ai.submitVideo({
        model: gen.model ?? ctx.env.AI_VIDEO_MODEL,
        prompt: clipPrompt({ eventLabel: getEventType(input.eventType).label, theme, extra: input.prompt ?? undefined, faith: faithOf(input.eventType, input.community) }),
        durationSec: AI_CLIP_SECONDS,
        resolution: '720p',
        aspectRatio: '9:16',
        firstFrameUrl: input.firstFrameUrl ?? undefined,
        generateAudio: false,
      });
      await ctx.db.update(aiGenerations).set({ externalId: submitted.id }).where(eq(aiGenerations.id, gen.id));

      const deadline = Date.now() + MAX_WAIT_MS;
      let status = await ctx.ai.getVideo(submitted.id);
      while (!['completed', 'failed', 'cancelled', 'expired'].includes(status.status)) {
        if (Date.now() > deadline) throw new Error('AI clip timed out');
        await sleep(POLL_MS);
        status = await ctx.ai.getVideo(submitted.id);
      }
      if (status.status !== 'completed' || !status.urls[0]) throw new Error(status.error ?? `AI clip ${status.status}`);

      const bytes = await ctx.ai.download(status.urls[0]);
      const assetId = randomUUID();
      const key = `u/${gen.userId}/${assetId}.mp4`;
      await ctx.storage.put(key, bytes, 'video/mp4');
      await ctx.db.insert(mediaAssets).values({
        id: assetId,
        userId: gen.userId,
        eventId: gen.eventId,
        kind: 'ai_clip',
        storageKey: key,
        contentType: 'video/mp4',
        bytes: bytes.byteLength,
        ready: true,
        meta: { model: gen.model },
      });
      await ctx.db
        .update(aiGenerations)
        .set({ status: 'completed', assetId, completedAt: new Date(), costUsd: status.costUsd?.toString() })
        .where(eq(aiGenerations.id, gen.id));
      // Attach to the event so the next video render includes it.
      await ctx.db
        .update(events)
        .set({ settings: sql`jsonb_set(${events.settings}, '{aiClipAssetId}', to_jsonb(${assetId}::text))`, updatedAt: new Date() })
        .where(eq(events.id, gen.eventId));
      await ctx.notifications.add('ai_clip.completed', { kind: 'ai_clip.completed', generationId: gen.id });
      log.info('AI clip ready');
    } catch (err) {
      log.error({ err }, 'AI clip failed — refunding credit');
      await ctx.db.update(aiGenerations).set({ status: 'failed', error: (err as Error).message.slice(0, 500) }).where(eq(aiGenerations.id, gen.id));
      await ctx.db
        .update(entitlements)
        .set({ credits: sql`${entitlements.credits} + 1` })
        .where(and(eq(entitlements.eventId, gen.eventId), eq(entitlements.feature, 'ai_clip')));
    }
  };
}
