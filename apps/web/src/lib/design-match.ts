import {
  BUILTIN_TEMPLATES,
  DESIGN_TIER,
  faithOf,
  getSiteDesign,
  isRetiredDesign,
  SITE_DESIGNS,
  templateSupportsEvent,
  type SiteDesign,
  type SiteDesignId,
  type TemplateDefinition,
} from '@cardai/shared';

/**
 * Card designs (image cards) and cinematic designs (video + website) are two catalogs. A card
 * family and a cinematic design with the same id share their name and art; every other card's
 * video and website get the best design for the event's faith.
 */

/** Cinematic designs still offered (retired plain looks excluded). */
export const LIVE_SITE_DESIGNS: readonly SiteDesign[] = SITE_DESIGNS.filter((d) => !isRetiredDesign(d.id));

/** A video/website design that needs a paid website plan. */
export const isPremiumSiteDesign = (id: string) => (DESIGN_TIER[id as SiteDesignId] ?? 'free') !== 'free';

/** The live cinematic design that matches this card's family, if one exists. */
export function siteDesignOfCard(t: Pick<TemplateDefinition, 'design'> | null | undefined): SiteDesign | null {
  const d = getSiteDesign(t?.design);
  return d && !isRetiredDesign(d.id) ? d : null;
}

/** First card colourway of a cinematic design's family that suits this occasion. */
export function cardForSiteDesign(id: string, eventType?: string): TemplateDefinition | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.design === id && !t.retired && (!eventType || templateSupportsEvent(t, eventType)));
}

/**
 * Cinematic designs for an occasion: its faith's designs and the neutral ones (never another
 * faith's sacred art). No occasion = all of them.
 */
export function siteDesignsForOccasion(eventType?: string, community?: string | null): SiteDesign[] {
  if (!eventType) return [...LIVE_SITE_DESIGNS];
  const faith = faithOf(eventType, community);
  return LIVE_SITE_DESIGNS.filter((d) => d.faith === null || d.faith === faith).sort((a, b) => Number(a.faith === null) - Number(b.faith === null));
}

/**
 * Occasion to start a video design on when the gallery shows all occasions: the design's own
 * ceremony for faith-specific art, a wedding otherwise.
 */
export function occasionForSiteDesign(d: SiteDesign): string {
  return d.faith === 'muslim' ? 'nikah' : d.faith === 'sikh' ? 'anand-karaj' : d.faith === 'christian' ? 'christian-wedding' : 'wedding';
}

/** Words a video design is found by: its name, line and region. */
export const siteDesignText = (d: SiteDesign) => `${d.name} ${d.blurb} ${d.region} ${d.id.replaceAll('-', ' ')}`.toLowerCase();
