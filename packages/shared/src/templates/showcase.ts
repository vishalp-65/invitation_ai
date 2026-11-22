import type { TemplateDefinition } from './types.js';

/**
 * Showpiece designs for marketing and auth surfaces (landing, sign-in, dashboard, menus).
 * Only the modern collections (Atelier, Celebration) are used as showpieces.
 *
 * Plain strings on purpose: this module is imported by light pages, so it must not pull in the
 * template catalogue or zod (see the bundle-size rules). A test checks every id exists.
 */

/** Families from the modern collections, best first (also used to rank automatic picks). */
export const MODERN_FAMILY_IDS = [
  // Atelier
  'raat-mahal', 'gulab-ring', 'neel-gulab', 'titli-bagh', 'raat-ki-rani', 'sheesh-mahal', 'gulabi-jharokha',
  'sunehri-nikah', 'kasavu', 'pampas-boho', 'titli', 'kamal-deep',
  // Celebration
  'mr-mrs', 'gulistan', 'gubbare', 'sunehri-shaam', 'tasveer', 'chanda-mama', 'haldi-rasam', 'yaadein', 'mehfil', 'save-the-date',
] as const;

const MODERN = new Set<string>(MODERN_FAMILY_IDS);

/** 0 for a modern-collection design, 1 for anything else (sort key: modern first). */
export function showcaseRank(design: string | undefined | null): number {
  return design && MODERN.has(design) ? 0 : 1;
}

/** Hand-picked thumbnails (ids of /public/showcase/<id>.jpg). */
export const SHOWCASE = {
  /** Three-card fan: left, right, centre (front). */
  hero: ['raat-ki-rani-onyx', 'gulab-ring-blush', 'raat-mahal-maroon'],
  wedding: 'raat-mahal-maroon',
  /** Traditional wedding rendered in Hindi (for Hindi-language surfaces). */
  weddingHindi: 'sheesh-mahal-navy',
  nikah: 'sunehri-nikah-emerald',
  birthday: 'gubbare-ice-blue',
  party: 'sunehri-shaam-onyx',
  griha: 'kamal-deep-champagne',
  baby: 'chanda-mama-baby-blue',
  floral: 'neel-gulab-dusty-blue',
  garden: 'titli-bagh-lavender',
  royal: 'sheesh-mahal-emerald',
  romantic: 'gulab-ring-blush',
  /** Template a brand-new draft starts from before the user picks one. */
  defaultTemplate: 'raat-mahal-maroon',
} as const;

/**
 * The language a design is shown in on its gallery tile (the pre-rendered thumbnail, or the
 * live English sample for marketplace and layered designs). Picking a design starts the card in
 * this language, so the form and preview match what the user saw. Kept in step with
 * apps/worker/src/scripts/render-showcase.ts, which renders the thumbnails with it.
 */
export function templateSampleLanguage(t: Pick<TemplateDefinition, 'sampleLanguage' | 'communities' | 'eventTypes' | 'source' | 'doc'>): 'en' | 'hi' {
  if (t.source === 'marketplace' || t.doc) return 'en';
  if (t.sampleLanguage) return t.sampleLanguage;
  const modern = (t.communities as readonly string[]).includes('modern');
  return modern || ['christian-wedding', 'corporate'].some((e) => (t.eventTypes as readonly string[]).includes(e)) ? 'en' : 'hi';
}
