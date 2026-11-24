/**
 * What a free account gets. One place for every number, so pricing copy, the API checks and
 * the host's usage meter can never disagree. Zod-free on purpose (see bundle-size rules).
 */
export const FREE_PLAN = {
  /** Watermarked image renders per account (each new design/version; re-downloads are free). */
  images: 5,
  /** Watermarked video invitations per account... */
  videos: 1,
  /** ...each of which can be re-made this many more times after edits. */
  videoRedos: 2,
  /** Unique people who can open a free website in full. Later visitors see the basics only. */
  siteVisitors: 50,
  /** The host is emailed when the free website reaches this many people, and again at the limit. */
  siteVisitorsWarnAt: 40,
} as const;

/** Render formats counted against the free image allowance. PDFs of the same card stay free. */
export const FREE_IMAGE_FORMATS = ['image'] as const;
/** Render formats counted against the free video allowance (countdown Status clips stay free). */
export const FREE_VIDEO_FORMATS = ['video', 'site_video'] as const;

/** Sections a free website keeps showing to visitors past the limit: who, when and where. */
export const CAPPED_SITE_SECTIONS: ReadonlySet<string> = new Set(['hero', 'welcome', 'schedule', 'venue', 'countdown', 'closing']);

/**
 * How Noyta is credited on a website:
 * - `bar`: free sites, a slim bar that stays at the bottom of the screen;
 * - `footer`: Site Premium, one line at the very end of the page;
 * - `none`: Site Royale (white-label), and Premium sites bought before the footer existed
 *   (they were sold as "no branding").
 */
export type SiteBranding = 'bar' | 'footer' | 'none';
/** Premium sites bought before this moment keep the old "no branding" promise. */
export const PREMIUM_FOOTER_SINCE = '2026-11-24T00:00:00+05:30';

export function siteBranding(tier: 'free' | 'premium' | 'royale', premiumSince?: Date | null): SiteBranding {
  if (tier === 'royale') return 'none';
  if (tier === 'premium') return premiumSince && premiumSince < new Date(PREMIUM_FOOTER_SINCE) ? 'none' : 'footer';
  return 'bar';
}

/** Tracking tags on every "Made with Noyta" link, so sign-ups from shared invitations are credited. */
export function brandLink(base: string, medium: 'bar' | 'footer' | 'capped' | 'video' | 'image', campaign: string): string {
  return `${base}/?utm_source=invite&utm_medium=${medium}&utm_campaign=${encodeURIComponent(campaign)}`;
}
