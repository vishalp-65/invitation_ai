import type { EVENT_TYPES } from '@cardai/shared';

/** Short occasion name for menus. */
export function occasionLabel(e: (typeof EVENT_TYPES)[number], locale: string) {
  if (locale === 'hi') return e.labelHi;
  // "Griha Pravesh / Housewarming" → "Griha Pravesh": the short name reads better in a menu.
  return e.label.split(' / ')[0]!;
}
