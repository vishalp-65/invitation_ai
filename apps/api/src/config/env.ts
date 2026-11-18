import { z } from 'zod';

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

const csv = z
  .string()
  .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean))
  .pipe(z.array(z.string()).min(1));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.url(),
  /**
   * Base of short invitation links, e.g. https://inv.to (a separate short domain pointed at the
   * web app). Unset = `${APP_URL}/s`. Pick the domain at launch; links are built from this only.
   */
  SHORT_LINK_BASE: z
    .string()
    .optional()
    .transform((v) => (v ? v.replace(/\/+$/, '') : undefined))
    .pipe(z.url().optional()),
  API_PORT: z.coerce.number().int().default(4000),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: bool,
  STORAGE_PUBLIC_URL: z.url(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  COOKIE_DOMAIN: z.string().optional().transform((v) => v || undefined),
  EMAIL_PROVIDER: z.enum(['console', 'resend']).default('console'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  /** OAuth 2.0 Web client ID from Google Cloud Console. Unset = Google sign-in hidden. */
  GOOGLE_CLIENT_ID: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  /** Needed for the redirect (authorization code) flow. Never sent to the browser. */
  GOOGLE_CLIENT_SECRET: z
    .string()
    .optional()
    .transform((v) => v || undefined),

  /**
   * Accounts that get the admin role when they sign in (normal email-code / Google login).
   * Comma separated; compared case-insensitively. Admins can promote others from /admin.
   */
  ADMIN_EMAILS: z
    .string()
    .optional()
    .transform((v) => (v ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)),

  OPENROUTER_API_KEY: z.string().optional(),
  AI_TEXT_MODELS: csv.default(['google/gemini-4-hydrogen']),
  /** Image-reading models for card scans (first is primary). */
  AI_VISION_MODELS: csv.default(['google/gemini-4-hydrogen', 'anthropic/claude-haiku-5.5']),
  AI_IMAGE_MODEL: z.string().default('google/gemini-3.1-flash-image'),
  AI_IMAGE_PREMIUM_MODEL: z.string().default('google/gemini-3-pro-image'),
  AI_VIDEO_MODEL: z.string().default('google/veo-3.1-lite'),
  AI_AUDIO_MODELS: csv.default(['google/gemini-omni-1.2-flash']),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_INVITE_TEMPLATE: z.string().default('invitation_link'),
});

export type Env = z.infer<typeof envSchema>;

/** Fail fast at boot with a readable list of what is missing. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production') {
    const required: Array<keyof Env> = ['OPENROUTER_API_KEY', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'];
    const missing = required.filter((k) => !env[k]);
    if (missing.length) throw new Error(`Missing production configuration: ${missing.join(', ')}`);
    if (env.EMAIL_PROVIDER === 'console') throw new Error('EMAIL_PROVIDER=console is not allowed in production');
  }
  return env;
}

export const ENV = Symbol('ENV');
