import { z } from 'zod';
import type { EventContent, EventFunctionDto, EventSettings } from './events.js';
import type { LayoutId, Theme } from '../templates/types.js';

/** Everything the public invitation website needs, in one request. */
export interface PublicSiteDto {
  event: {
    id: string;
    slug: string;
    type: string;
    language: string;
    title: string;
    content: EventContent;
    settings: Pick<
      EventSettings,
      'timezone' | 'showCountdown' | 'rsvpEnabled' | 'rsvpDeadline' | 'askMealPreference' | 'askAccommodation'
    >;
  };
  template: { id: string; layout: LayoutId; theme: Theme };
  functions: EventFunctionDto[];
  media: {
    photos: string[];
    gallery: string[];
    backgroundUrl: string | null;
    musicUrl: string | null;
    coverUrl: string | null;
    videoUrl: string | null;
  };
  guest: { name: string; salutation: string | null; functionIds: string[] | null; maxPax: number } | null;
  features: { rsvp: boolean; showBranding: boolean };
}

export const trackViewSchema = z.object({
  g: z.string().max(40).optional(),
});
