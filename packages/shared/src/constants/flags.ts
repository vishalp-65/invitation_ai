import { z } from 'zod';

/**
 * Feature switches the admin console controls. Kill switches default ON (the feature works);
 * `maintenance` defaults OFF. Custom keys (lower-kebab) can be added for gradual roll-outs.
 */
export const BUILTIN_FLAGS = {
  maintenance: { label: 'Maintenance mode', description: 'Shows a notice everywhere and pauses saving for customers. Admins keep working.', default: false, kill: false },
  signups: { label: 'New sign-ups', description: 'Turn off to stop new accounts (existing users can still sign in).', default: true, kill: true },
  checkout: { label: 'Checkout & payments', description: 'Turn off if payments misbehave. Pricing stays visible.', default: true, kill: true },
  ai_generation: { label: 'AI generation', description: 'AI backgrounds, text and clips. Turn off when AI spend spikes or a model is down.', default: true, kill: true },
  video_render: { label: 'Video rendering', description: 'New video invites and design films. Turn off if the render queue backs up.', default: true, kill: true },
  print_orders: { label: 'Print orders', description: 'New print requests.', default: true, kill: true },
  marketplace: { label: 'Designer marketplace', description: 'New designer submissions.', default: true, kill: true },
} as const;

export type BuiltinFlag = keyof typeof BUILTIN_FLAGS;
export const BUILTIN_FLAG_KEYS = Object.keys(BUILTIN_FLAGS) as BuiltinFlag[];

export const flagKeySchema = z.string().regex(/^[a-z][a-z0-9_-]{1,39}$/, 'Use 2–40 lowercase letters, digits, - or _');

export const flagInputSchema = z.object({
  enabled: z.boolean(),
  /** 0–100: share of people who get the feature (stable per person). 100 = everyone. */
  rolloutPct: z.number().int().min(0).max(100).default(100),
  description: z.string().trim().max(200).nullish(),
  /** Shown to customers while maintenance is on, or when a kill switch blocks something. */
  message: z.string().trim().max(200).nullish(),
});
export type FlagInput = z.input<typeof flagInputSchema>;

export interface FlagDto {
  key: string;
  enabled: boolean;
  rolloutPct: number;
  description: string | null;
  message: string | null;
  builtin: boolean;
  updatedAt: string | null;
}

/**
 * Stable 0–99 bucket for a person and flag (FNV-1a), so a 20 % roll-out always shows the
 * feature to the same 20 % of people, and different flags pick different people.
 */
export function rolloutBucket(subject: string, flag: string): number {
  let h = 0x811c9dc5;
  const s = `${flag}:${subject}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 100;
}

export function flagOn(flag: Pick<FlagDto, 'enabled' | 'rolloutPct'> | undefined, subject: string | null | undefined, key: string, fallback = true): boolean {
  if (!flag) return fallback;
  if (!flag.enabled) return false;
  if (flag.rolloutPct >= 100) return true;
  if (!subject) return false;
  return rolloutBucket(subject, key) < flag.rolloutPct;
}
