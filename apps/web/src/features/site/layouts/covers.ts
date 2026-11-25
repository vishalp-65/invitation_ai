import type { SiteLayout, SiteSectionType } from '@cardai/shared';

/** Sections a layout shows in its own way (they are skipped in the bands below it). */
export const LAYOUT_COVERS: Record<SiteLayout, ReadonlySet<SiteSectionType>> = {
  stories: new Set(['hero', 'couple', 'schedule', 'countdown', 'story']),
  movie: new Set(['hero', 'couple', 'schedule', 'countdown', 'family']),
  chat: new Set(['hero', 'welcome', 'couple', 'schedule', 'countdown', 'dresscode', 'family']),
  scrapbook: new Set(['hero', 'welcome', 'couple', 'schedule', 'countdown', 'closing']),
  boarding: new Set(['hero', 'schedule', 'countdown']),
  newspaper: new Set(['hero', 'welcome', 'schedule', 'countdown']),
  playlist: new Set(['hero', 'schedule', 'countdown']),
  arcade: new Set(['hero', 'schedule', 'countdown']),
  menu: new Set(['hero', 'welcome', 'schedule', 'countdown', 'closing']),
  calendar: new Set(['hero', 'schedule', 'countdown']),
};
