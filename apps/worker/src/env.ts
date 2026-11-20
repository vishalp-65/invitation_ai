import { availableParallelism } from 'node:os';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.string().optional().transform((v) => v === 'true' || v === '1'),
  S3_PUBLIC_READ_ACL: z.string().optional().transform((v) => v === 'true' || v === '1'),
  STORAGE_PUBLIC_URL: z.url(),
  OPENROUTER_API_KEY: z.string().optional(),
  AI_VIDEO_MODEL: z.string().default('google/veo-3.1-lite'),
  /** Parallel render jobs per worker process (each uses several Chrome tabs). */
  RENDER_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
  /**
   * Chrome tabs per video render. Remotion's own default (half the host's CPUs) ignores container
   * limits and is the main cause of OOM kills, so we default to CPUs / RENDER_CONCURRENCY, max 4.
   */
  REMOTION_CONCURRENCY: z.coerce.number().int().min(1).optional(),
  /** Cache for decoded <OffthreadVideo> frames. Remotion defaults to half of system RAM. */
  OFFTHREAD_VIDEO_CACHE_MB: z.coerce.number().int().min(32).default(256),
  /** Relaunch Chrome after this many render jobs to reclaim leaked memory (0 = never). */
  BROWSER_RECYCLE_AFTER: z.coerce.number().int().min(0).default(40),
});

export type WorkerEnv = Omit<z.infer<typeof envSchema>, 'REMOTION_CONCURRENCY'> & { REMOTION_CONCURRENCY: number };

export function loadEnv(): WorkerEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid worker environment:\n${parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  }
  const env = parsed.data;
  const tabs = env.REMOTION_CONCURRENCY ?? Math.max(1, Math.min(4, Math.floor(availableParallelism() / env.RENDER_CONCURRENCY)));
  return { ...env, REMOTION_CONCURRENCY: tabs };
}
