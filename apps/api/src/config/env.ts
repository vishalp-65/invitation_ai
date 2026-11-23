import { z } from 'zod';

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

/** Optional string where an empty value (`KEY=`) means unset. */
const optionalStr = z
  .string()
  .optional()
  .transform((v) => v || undefined);

const csv = z
  .string()
  .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean))
  .pipe(z.array(z.string()).min(1));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.url(),
  /**
   * Base of short invitation links, e.g. https://inv.to (a separate short domain pointed at the
   * web app). Unset = the main domain root (`${APP_URL}/<code>`, handled by the web proxy). Pick the domain at launch; links are built from this only.
   */
  SHORT_LINK_BASE: z
    .string()
    .optional()
    .transform((v) => (v ? v.replace(/\/+$/, '') : undefined))
    .pipe(z.url().optional()),
  API_PORT: z.coerce.number().int().default(4000),

  DATABASE_URL: z.string().min(1),
  /** Optional read replica (Neon read-only endpoint) for admin reports. Unset = the primary. */
  DATABASE_URL_READ: optionalStr,
  REDIS_URL: z.string().min(1),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: bool,
  /** true on DigitalOcean Spaces: objects are written with the public-read ACL. */
  S3_PUBLIC_READ_ACL: bool,
  STORAGE_PUBLIC_URL: z.url(),
  /** Public origin of this API (e.g. https://api.noyta.in). Browser uploads go straight to it; unset = same-origin /api via the web rewrite. */
  API_PUBLIC_URL: z.url().optional(),

  JWT_ACCESS_SECRET: z.string().min(32),
  /**
   * Shared with the web app: its edge proxy signs the real client IP with this (see common/client-ip.ts).
   * Set = only loopback / private proxies (nginx, Docker) are trusted for X-Forwarded-For, and IP rate
   * limits use the signed IP. Unset = legacy trust-everything mode (X-Forwarded-For can be spoofed).
   */
  CLIENT_IP_SECRET: z
    .string()
    .optional()
    .transform((v) => v || undefined)
    .pipe(z.string().min(32).optional()),
  JWT_REFRESH_SECRET: z.string().min(32),
  COOKIE_DOMAIN: z.string().optional().transform((v) => v || undefined),
  EMAIL_PROVIDER: z.enum(['console', 'resend']).default('console'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  /** Sender for offers and automations, e.g. "Noyta Offers <offers@mail.noyta.in>". Unset = EMAIL_FROM. */
  EMAIL_FROM_MARKETING: optionalStr,
  /** Minimum days between two offer emails to the same person (campaigns + automations). */
  MARKETING_MIN_GAP_DAYS: z.coerce.number().int().min(0).max(60).default(3),
  /** Optional coupon code included in abandoned-checkout reminders (must exist and be active). */
  ABANDONED_CHECKOUT_COUPON: z
    .string()
    .optional()
    .transform((v) => (v ? v.trim().toUpperCase() : undefined)),
  /** Turns the hourly abandoned-checkout and win-back emails on or off. */
  LIFECYCLE_EMAILS: z
    .string()
    .optional()
    .transform((v) => v !== 'false' && v !== '0'),
  /** Where replies go (defaults to the brand support address). */
  EMAIL_REPLY_TO: optionalStr,
  /** Signing secret (whsec_…) of the Resend webhook that reports bounces and spam complaints. */
  RESEND_WEBHOOK_SECRET: optionalStr,
  /** OAuth 2.0 Web client ID from Google Cloud Console. Unset = Google sign-in hidden. */
  GOOGLE_CLIENT_ID: optionalStr,
  /** Needed for the redirect (authorization code) flow. Never sent to the browser. */
  GOOGLE_CLIENT_SECRET: optionalStr,

  /**
   * Accounts that get the admin role when they sign in (normal email-code / Google login).
   * Comma separated; compared case-insensitively. Admins can promote others from /admin.
   */
  ADMIN_EMAILS: z
    .string()
    .optional()
    .transform((v) => (v ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)),

  /** Admins confirm a 6-digit email code once per device every 12 h. Default: on in production. */
  ADMIN_MFA: z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? undefined : v === 'true' || v === '1')),
  /** Raw analytics events are kept this many months (whole monthly partitions are dropped). */
  ANALYTICS_RETENTION_MONTHS: z.coerce.number().int().min(3).max(60).default(13),
  /** Alert when AI spend in 24 h passes this (USD). */
  ALERT_AI_USD_DAY: z.coerce.number().min(0).default(20),
  /** Optional WhatsApp number (E.164 without +) that also gets critical alerts, via the WhatsApp Cloud API. */
  ADMIN_ALERT_WHATSAPP: z
    .string()
    .optional()
    .transform((v) => v?.replace(/\D/g, '') || undefined),
  /** Health checks, daily digest and nightly metrics. Turn off only for local debugging. */
  OPS_JOBS: z
    .string()
    .optional()
    .transform((v) => v !== 'false' && v !== '0'),

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
  /**
   * Approved utility template with ONE body variable (the whole follow-up text). Needed for
   * automatic reminders / day-before / thank-you messages; without it they wait in the host's
   * tap-through send queue instead.
   */
  WHATSAPP_FOLLOWUP_TEMPLATE: optionalStr,
  /**
   * Approved Authentication-category template with a copy-code button, for sign-in codes on
   * WhatsApp. Unset (or the Cloud API unset) = the sign-in form offers email and Google only.
   */
  WHATSAPP_OTP_TEMPLATE: optionalStr,
  /** Language code the OTP template was approved in, exactly as in WhatsApp Manager (en, en_US, hi…). */
  WHATSAPP_OTP_LANGUAGE: z.string().trim().min(2).default('en'),
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
    // Razorpay is optional: without its keys checkout is switched off (DisabledGateway), never mocked.
    const required: Array<keyof Env> = ['OPENROUTER_API_KEY'];
    if (env.RAZORPAY_KEY_ID && !env.RAZORPAY_WEBHOOK_SECRET) required.push('RAZORPAY_WEBHOOK_SECRET');
    const missing = required.filter((k) => !env[k]);
    if (missing.length) throw new Error(`Missing production configuration: ${missing.join(', ')}`);
    if (env.EMAIL_PROVIDER === 'console') throw new Error('EMAIL_PROVIDER=console is not allowed in production');
    // Without it every per-IP limit (sign-in, codes, site passwords) can be dodged with a fake X-Forwarded-For.
    if (!env.CLIENT_IP_SECRET) throw new Error('CLIENT_IP_SECRET is required in production (set the same value on Vercel first, see docs/DEPLOYMENT.md)');
    if (env.ADMIN_MFA === false) throw new Error('ADMIN_MFA=false is not allowed in production');
  }
  return env;
}

export const ENV = Symbol('ENV');
