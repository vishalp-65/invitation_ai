import type { LockedSiteDto, PublicSiteResponse } from '../schemas/site.js';

/** True when the invite page is behind a passcode (kept out of schemas/site.ts so it carries no zod). */
export function isLockedSite(r: PublicSiteResponse): r is LockedSiteDto {
  return 'locked' in r;
}
