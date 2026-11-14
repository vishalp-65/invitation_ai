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
  STORAGE_PUBLIC_URL: z.url(),
  OPENROUTER_API_KEY: z.string().optional(),
  AI_VIDEO_MODEL: z.string().default('google/veo-3.1-lite'),
  /** Parallel render jobs per worker process (each uses several Chrome tabs). */
  RENDER_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
  /** Chrome tabs per video render; default lets Remotion decide from CPU count. */
  REMOTION_CONCURRENCY: z.coerce.number().int().min(1).optional(),
});

export type WorkerEnv = z.infer<typeof envSchema>;

export function loadEnv(): WorkerEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid worker environment:\n${parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  }
  return parsed.data;
}
