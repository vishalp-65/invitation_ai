/** RSVP answers and meal choices: plain values (no zod) so guest-facing pages can use them cheaply. */
export const RSVP_STATUSES = ['yes', 'no', 'maybe'] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export const MEAL_PREFERENCES = ['veg', 'non_veg', 'jain', 'vegan'] as const;

/** Follow-up messages a guest can get, each at most once. */
export const NUDGE_KINDS = ['unopened', 'rsvp', 'dayBefore', 'thanks'] as const;
export type NudgeKind = (typeof NUDGE_KINDS)[number];

/** Co-host roles. The owner can do everything; `editor` all but billing and members. */
export const MEMBER_ROLES = ['editor', 'guests', 'viewer'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];
export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  editor: 'Can edit everything',
  guests: 'Guests & RSVPs only',
  viewer: 'Can view only',
};

export const GIFT_METHODS = ['upi', 'cash', 'gift'] as const;
export type GiftMethod = (typeof GIFT_METHODS)[number];

/** Messages a host can send one guest. */
export const SEND_KINDS = ['invite', ...NUDGE_KINDS, 'saveTheDate'] as const;
export type SendKind = (typeof SEND_KINDS)[number];

/** Who the send queue lists. */
export const SEND_QUEUE_FILTERS = ['unsent', 'unopened', 'noRsvp', 'dayBefore', 'thanks', 'saveTheDate', 'all'] as const;
export type SendQueueFilter = (typeof SEND_QUEUE_FILTERS)[number];
