import { z } from 'zod';
import { GIFT_METHODS, MEAL_PREFERENCES, MEMBER_ROLES, RSVP_STATUSES, SEND_KINDS, type GiftMethod, type MemberRole, type RsvpStatus, type SendKind } from '../constants/guests.js';
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
  /** Unlock key of a password-protected site (from the unlock step). */
  key: z.string().max(64).optional(),
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
  lastViewedAt: string | null;
  nudges: string[];
  checkedInAt: string | null;
  checkedInPax: number | null;
  thankedAt: string | null;
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
  totals: { invited: number; viewed: number; responded: number; sent: number; checkedIn: number; checkedInPax: number };
  /** Caterer view: confirmed people per function by meal choice (unknown = no answer). */
  meals: Array<{ functionId: string; veg: number; non_veg: number; jain: number; vegan: number; unknown: number }>;
  needsStay: number;
}

// ---------------- Sending & follow-ups ----------------

export const sendInviteSchema = z.object({
  viaApi: z.boolean().default(false),
  /** Which message; default picks invite / unopened reminder automatically. */
  kind: z.enum(SEND_KINDS).optional(),
});
export type SendInviteInput = z.infer<typeof sendInviteSchema>;

/** One item in the host's send queue (tap through, one wa.me link at a time). */
export interface SendQueueItem {
  guestId: string;
  name: string;
  phone: string | null;
  kind: SendKind;
  message: string;
  shareUrl: string;
  smsUrl: string | null;
}

// ---------------- Event day ----------------

export const checkInSchema = z.object({
  /** What the gate scanned: the pass QR (a full personal link), a short link, or a bare token. */
  token: z.string().trim().min(6).max(400).optional(),
  guestId: z.uuid().optional(),
  pax: z.number().int().min(0).max(50).optional(),
  undo: z.boolean().optional(),
});
export type CheckInInput = z.infer<typeof checkInSchema>;

// ---------------- Co-hosts ----------------

export const inviteMemberSchema = z.object({
  email: z.email().max(200),
  role: z.enum(MEMBER_ROLES),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberSchema = z.object({ role: z.enum(MEMBER_ROLES) });

export interface EventMemberDto {
  id: string;
  email: string;
  name: string | null;
  role: MemberRole;
  accepted: boolean;
  createdAt: string;
}

// ---------------- Shagun / gifts ----------------

export const submitGiftSchema = z.object({
  guestToken: z.string().max(40).optional(),
  key: z.string().max(64).optional(),
  name: z.string().trim().min(1).max(100),
  phone: phoneSchema.optional(),
  /** Rupees, optional and self-reported. */
  amount: z.number().int().min(1).max(10_000_000).optional(),
  method: z.enum(GIFT_METHODS).default('upi'),
  note: z.string().trim().max(300).optional(),
});
export type SubmitGiftInput = z.infer<typeof submitGiftSchema>;

/** A guest reserves a wishlist item ("I'll bring this") so nobody buys it twice. */
export const claimWishSchema = z.object({
  guestToken: z.string().max(40).optional(),
  key: z.string().max(64).optional(),
  name: z.string().trim().min(1).max(100),
  phone: phoneSchema.optional(),
});
export type ClaimWishInput = z.infer<typeof claimWishSchema>;

/** Host writes down a gift received at the venue. */
export const recordGiftSchema = submitGiftSchema.omit({ guestToken: true, key: true }).extend({ guestId: z.uuid().optional() });
export type RecordGiftInput = z.infer<typeof recordGiftSchema>;

export interface GiftDto {
  id: string;
  guestId: string | null;
  name: string;
  phone: string | null;
  amount: number | null;
  method: GiftMethod;
  note: string | null;
  source: 'guest' | 'host';
  thankedAt: string | null;
  /** Wishlist item the guest reserved, if any. */
  wishId: string | null;
  createdAt: string;
}
