import { z } from 'zod';
import { MEAL_PREFERENCES, RSVP_STATUSES, type RsvpStatus } from '../constants/guests.js';
import { phoneSchema } from './common.js';
import { guestStaySchema, type GuestStay } from '../site/schema.js';

export const guestInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: phoneSchema.optional(),
  email: z.email().optional(),
  /** e.g. "Bride side", "Office", "Neighbours". */
  groupLabel: z.string().trim().max(40).optional(),
  /** How the invite greets them, e.g. "Respected Gupta Ji & Family". */
  salutation: z.string().trim().max(120).optional(),
  maxPax: z.number().int().min(1).max(50).default(2),
  /** Functions the guest is invited to; omitted = all. */
  functionIds: z.array(z.uuid()).max(12).optional(),
  /** Royale travel manager: room, pickup... */
  stay: guestStaySchema.optional(),
});
export type GuestInput = z.infer<typeof guestInputSchema>;

export const importGuestsSchema = z.object({
  guests: z.array(guestInputSchema).min(1).max(2000),
});

/** No defaults on PATCH (Zod 4 `.partial()` would otherwise reset maxPax to 2). */
export const updateGuestSchema = guestInputSchema
  .extend({ maxPax: z.number().int().min(1).max(50), stay: guestStaySchema.nullable() })
  .partial();
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;

export const submitRsvpSchema = z.object({
  guestToken: z.string().max(40).optional(),
  name: z.string().trim().min(1).max(100),
  phone: phoneSchema.optional(),
  responses: z
    .array(
      z.object({
        functionId: z.uuid(),
        status: z.enum(RSVP_STATUSES),
        headcount: z.number().int().min(0).max(50).default(1),
      }),
    )
    .min(1)
    .max(12),
  mealPreference: z.enum(MEAL_PREFERENCES).optional(),
  needsAccommodation: z.boolean().optional(),
  note: z.string().trim().max(500).optional(),
});
export type SubmitRsvpInput = z.infer<typeof submitRsvpSchema>;

export interface GuestDto {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  groupLabel: string | null;
  salutation: string | null;
  maxPax: number;
  functionIds: string[] | null;
  token: string;
  inviteUrl: string;
  /** Short personal link, e.g. https://inv.to/k7Qp2Xa */
  shortUrl: string;
  stay: GuestStay | null;
  invitedAt: string | null;
  viewCount: number;
  firstViewedAt: string | null;
  rsvp: Record<string, { status: RsvpStatus; headcount: number }>;
}

export interface RsvpSummaryDto {
  functions: Array<{
    functionId: string;
    name: string;
    yes: number;
    no: number;
    maybe: number;
    headcount: number;
  }>;
  totals: { invited: number; viewed: number; responded: number };
}
