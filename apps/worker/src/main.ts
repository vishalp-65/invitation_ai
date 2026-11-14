import { QUEUES, type AiClipJobData, type RenderJobData } from '@cardai/shared';
import { Worker } from 'bullmq';
import { createAiClipProcessor } from './ai-clip/ai-clip.processor.js';
import { createContext } from './context.js';
import { RemotionRuntime } from './remotion.js';
import { createRenderProcessor } from './render/render.processor.js';

const ctx = createContext();
const remotion = new RemotionRuntime(ctx.log);

// Warm up before taking jobs so the first customer does not wait for bundling.
await remotion.warmUp();

const renderWorker = new Worker<RenderJobData>(QUEUES.render, createRenderProcessor(ctx, remotion), {
  connection: ctx.redis,
  concurrency: ctx.env.RENDER_CONCURRENCY,
  lockDuration: 5 * 60_000,
});

const clipWorker = new Worker<AiClipJobData>(QUEUES.aiClip, createAiClipProcessor(ctx), {
  connection: ctx.redis,
  concurrency: 4,
  lockDuration: 20 * 60_000,
});

for (const w of [renderWorker, clipWorker]) {
  w.on('failed', (job, err) => ctx.log.warn({ jobId: job?.id, queue: w.name, err: err.message }, 'job failed'));
  w.on('error', (err) => ctx.log.error({ err, queue: w.name }, 'worker error'));
}
ctx.log.info({ concurrency: ctx.env.RENDER_CONCURRENCY }, 'workers started');

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  ctx.log.info({ signal }, 'shutting down — finishing in-flight jobs');
  await Promise.allSettled([renderWorker.close(), clipWorker.close()]);
  await remotion.close();
  await ctx.close();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
