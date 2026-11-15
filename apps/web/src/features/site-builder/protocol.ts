import type { PublicSiteDto, SiteDoc } from '@cardai/shared';

/** Messages between the builder and its preview iframe (same origin only). */
export type PreviewMessage =
  | { type: 'site-preview'; data: PublicSiteDto; doc: SiteDoc; replay: number }
  | { type: 'site-scroll'; sectionId: string }
  | { type: 'site-preview-ready' };
