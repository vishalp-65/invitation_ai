import type { Feature } from '../constants/products.js';
import type { SiteDesignId } from './designs.js';
import type { SiteCharacter, SiteDoc, SiteOpening, SiteSection, SiteSectionType } from './schema.js';

/** Website plan of one invitation, derived from its entitlements. */
export const SITE_TIERS = ['free', 'premium', 'royale'] as const;
export type SiteTier = (typeof SITE_TIERS)[number];

const RANK: Record<SiteTier, number> = { free: 0, premium: 1, royale: 2 };

export function siteTier(features: Iterable<Feature | string>): SiteTier {
  const set = new Set(features);
  if (set.has('website_royale')) return 'royale';
  if (set.has('website_premium')) return 'premium';
  return 'free';
}

export function tierAtLeast(tier: SiteTier, needed: SiteTier): boolean {
  return RANK[tier] >= RANK[needed];
}

/** Lowest plan that shows each section on the public page. */
export const SECTION_TIER: Record<SiteSectionType, SiteTier> = {
  hero: 'free',
  welcome: 'free',
  schedule: 'free',
  venue: 'free',
  family: 'free',
  rsvp: 'free',
  custom: 'free',
  closing: 'free',
  countdown: 'free',
  things: 'premium',
  couple: 'premium',
  story: 'premium',
  dresscode: 'premium',
  gallery: 'premium',
  video: 'premium',
  faq: 'premium',
  wishes: 'premium',
  gifts: 'premium',
  travel: 'royale',
  livestream: 'royale',
  updates: 'royale',
  album: 'royale',
};

export const OPENING_TIER: Record<SiteOpening, SiteTier> = {
  none: 'free',
  envelope: 'free',
  doors: 'premium',
  curtain: 'premium',
  scroll: 'premium',
  petals: 'premium',
  seal: 'premium',
  lanterns: 'premium',
};

/** Free sites get the couple (also what `auto` picks for weddings) and sacred characters; the rest of the cast is Premium. */
export const CHARACTER_TIER: Record<SiteCharacter, SiteTier> = {
  auto: 'free',
  none: 'free',
  ganesha: 'free',
  diya: 'free',
  kalash: 'free',
  couple: 'free',
  baby: 'premium',
  cake: 'premium',
  elephant: 'premium',
  peacock: 'premium',
  doves: 'premium',
  house: 'premium',
};

/** Cinematic design packs: two are free, the painted royal ones need Premium. */
export const DESIGN_TIER: Record<SiteDesignId, SiteTier> = {
  'modern-minimal': 'free',
  'pastel-floral': 'free',
  'royal-lanterns': 'premium',
  'rose-seal': 'premium',
  'temple-dawn': 'premium',
  alpana: 'premium',
  phulkari: 'premium',
  bandhani: 'premium',
  paithani: 'premium',
  'nikah-emerald': 'premium',
  'garden-chapel': 'premium',
  'anand-karaj': 'premium',
  'lake-palace': 'premium',
  'goa-sunset': 'premium',
  'kerala-backwaters': 'premium',
  'banaras-ghats': 'premium',
  'himalayan-pines': 'premium',
  'blue-pottery': 'premium',
  'bombay-deco': 'premium',
  'pichwai-lotus': 'premium',
  'raat-mahal': 'premium',
  'gulab-ring': 'premium',
  'neel-gulab': 'premium',
  'titli-bagh': 'premium',
  'raat-ki-rani': 'premium',
  'mr-mrs': 'premium',
  'gulistan': 'premium',
  'pampas-boho': 'premium',
  'haldi-rasam': 'premium',
  'gubbare': 'premium',
  'sunehri-shaam': 'premium',
  'chanda-mama': 'premium',
};

/** Royale-only page features (beyond sections). */
export const ROYALE_EXTRAS = ['audience', 'alt-language', 'password', 'guest-stay'] as const;

/** Days the site stays online after the last function. */
export const SITE_LIFETIME_DAYS: Record<SiteTier, number> = { free: 15, premium: 365, royale: 730 };
export const SITE_EXTRA_YEAR_DAYS = 365;

/** When the site goes offline (null when the event has no functions yet). */
export function siteExpiresAt(lastFunctionAt: Date | null, tier: SiteTier, extraYears = 0): Date | null {
  if (!lastFunctionAt) return null;
  const days = SITE_LIFETIME_DAYS[tier] + extraYears * SITE_EXTRA_YEAR_DAYS;
  return new Date(lastFunctionAt.getTime() + days * 86_400_000);
}

export function sectionAllowed(section: Pick<SiteSection, 'type'>, tier: SiteTier): boolean {
  return tierAtLeast(tier, SECTION_TIER[section.type]);
}

/**
 * Applies the plan to a document for the public page: drops locked sections, falls back to
 * free openings / characters and strips Royale-only options. The builder keeps the full
 * document so people can try everything before paying.
 */
export function applySiteTier(doc: SiteDoc, tier: SiteTier): SiteDoc {
  const royale = tierAtLeast(tier, 'royale');
  const design = doc.design && tierAtLeast(tier, DESIGN_TIER[doc.design]) ? doc.design : undefined;
  return {
    ...doc,
    design,
    opening: tierAtLeast(tier, OPENING_TIER[doc.opening.kind]) ? doc.opening : { ...doc.opening, kind: 'envelope' },
    character: tierAtLeast(tier, CHARACTER_TIER[doc.character.kind]) ? doc.character : { ...doc.character, kind: 'auto' },
    access: royale ? doc.access : { mode: 'link' },
    alt: royale ? doc.alt : undefined,
    sections: doc.sections
      .filter((s) => sectionAllowed(s, tier))
      .map((s) => (royale ? s : { ...s, audience: [] })),
  };
}

/** Plan features the document uses that this tier doesn't include (for the builder's banner). */
export function lockedInDoc(doc: SiteDoc, tier: SiteTier): Array<{ label: string; tier: SiteTier }> {
  const out: Array<{ label: string; tier: SiteTier }> = [];
  for (const s of doc.sections) {
    if (!s.hidden && !sectionAllowed(s, tier)) out.push({ label: s.type, tier: SECTION_TIER[s.type] });
  }
  if (doc.design && !tierAtLeast(tier, DESIGN_TIER[doc.design])) out.push({ label: `${doc.design} design`, tier: DESIGN_TIER[doc.design] });
  if (!tierAtLeast(tier, OPENING_TIER[doc.opening.kind])) out.push({ label: `${doc.opening.kind} opening`, tier: OPENING_TIER[doc.opening.kind] });
  if (!tierAtLeast(tier, CHARACTER_TIER[doc.character.kind])) out.push({ label: `${doc.character.kind} character`, tier: CHARACTER_TIER[doc.character.kind] });
  if (!tierAtLeast(tier, 'royale')) {
    if (doc.access.mode !== 'link') out.push({ label: 'private access', tier: 'royale' });
    if (doc.alt) out.push({ label: 'second language', tier: 'royale' });
    if (doc.sections.some((s) => s.audience.length)) out.push({ label: 'sections for chosen guests', tier: 'royale' });
  }
  return out;
}
