/** RSVP answers and meal choices: plain values (no zod) so guest-facing pages can use them cheaply. */
export const RSVP_STATUSES = ['yes', 'no', 'maybe'] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export const MEAL_PREFERENCES = ['veg', 'non_veg', 'jain', 'vegan'] as const;
