import type { Decor } from './types.js';

/**
 * Decor defaults without zod (same values as `decorSchema` in types.ts), so the card builder and
 * the template catalogue don't pull zod into client pages. A test keeps the two in step.
 */
export const DECOR_DEFAULTS: Omit<Decor, 'nameFont'> = {
  art: 'none',
  coupleStyle: 'watercolor',
  attire: 'north',
  florals: 'none',
  floralPlacement: 'diagonal',
  toran: false,
  mandala: false,
};

export function withDecorDefaults(decor: Partial<Decor> | null | undefined): Decor {
  const set = Object.fromEntries(Object.entries(decor ?? {}).filter(([, v]) => v !== undefined));
  return { ...DECOR_DEFAULTS, ...set } as Decor;
}
