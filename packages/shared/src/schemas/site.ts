import type { SiteBranding } from '../constants/free-plan.js';
import { z } from 'zod';
import type { EventContent, EventFunctionDto, EventSettings } from './events.js';
import type { LayoutId, Theme } from '../templates/types.js';
import type { GuestStay, SiteDoc } from '../site/schema.js';
import type { SiteTier } from '../site/tiers.js';

export interface SiteUpdateDto {
  id: string;
  text: string;
  pinned: boolean;
  createdAt: string;
}

export interface SiteWishDto {
  id: string;
  name: string;
  message: string;
  createdAt: string;
}

/** Everything the public invitation website needs, in one request. */
export interface PublicSiteDto {
  event: {
    id: string;
    slug: string;
    type: string;
    /** The family's tradition (decides sacred characters and attire). */
    community: string | null;
    language: string;
    title: string;
    content: EventContent;
    settings: Pick<
      EventSettings,
      'timezone' | 'showCountdown' | 'rsvpEnabled' | 'rsvpDeadline' | 'askMealPreference' | 'askAccommodation' | 'saveTheDate' | 'qr' | 'photoBg'
    >;
  };
  template: { id: string; layout: LayoutId; theme: Theme };
  functions: EventFunctionDto[];
  media: {
    photos: string[];
    gallery: string[];
    backgroundUrl: string | null;
    musicUrl: string | null;
    /** Library track URLs by id (design mood tracks and the website's own pick). */
    musicLibrary: Record<string, string>;
    coverUrl: string | null;
    videoUrl: string | null;
    /** Public URLs of photos used inside sections (couple, story, custom...), by asset id. */
    assets: Record<string, string>;
  };
  guest: {
    name: string;
    salutation: string | null;
    functionIds: string[] | null;
    maxPax: number;
    groupLabel: string | null;
    stay: GuestStay | null;
  } | null;
  /** `gifts`: guests can tell the family what shagun they sent (needs a gifts section). */
  /** `branding`: how Noyta is credited (free: sticky bar, Premium: footer line, Royale: none). */
  features: { rsvp: boolean; branding: SiteBranding; gifts: boolean };
  /**
   * Free website past its visitor limit, for this visitor: only the basics (names, date, venue)
   * are sent, and the page says the rest opens when the family upgrades.
   */
  capped?: boolean;
  /** The page document with the plan applied (locked sections removed). */
  site: SiteDoc;
  tier: SiteTier;
  shortUrl: string;
  updates: SiteUpdateDto[];
  wishes: SiteWishDto[];
  album: string[];
  /** Wishlist items already reserved by a guest (ids only; who reserved them stays private). */
  claimedWishes: string[];
  expiresAt: string | null;
}

/** Returned instead of the site when it is private and the visitor has no access yet. */
export interface LockedSiteDto {
  locked: 'password' | 'guests';
  title: string;
  coverUrl: string | null;
  language: string;
}

export type PublicSiteResponse = PublicSiteDto | LockedSiteDto;

export const trackViewSchema = z.object({
  g: z.string().max(40).optional(),
});
