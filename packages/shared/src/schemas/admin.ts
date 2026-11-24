import { z } from 'zod';
import { COMMUNITIES, EVENT_TYPE_IDS } from '../constants/event-types.js';
import { PRODUCT_CODES, type Product, type ProductCode } from '../constants/products.js';
import { designDocSchema } from '../design/schema.js';

// ---------- First-party analytics ----------

/** Everything the web app reports. Keep names stable: the admin dashboard queries them. */
export const TRACK_EVENTS = [
  'page_view',
  'signup_start', // opened the sign-up / login form
  'otp_requested',
  'signup', // server-side: brand-new account created
  'login', // server-side: existing account signed in
  'template_view', // opened / previewed a template
  'template_select', // chose a template for an invitation
  'card_scanned', // read a photo of a printed card in /create
  'create_step', // reached a /create wizard step (props.step: occasion | details | design)
  'event_created',
  'editor_open',
  'render_download',
  'site_published',
  'checkout_start',
  'coupon_applied',
  'purchase', // server-side: order paid
  'share',
  'engagement', // client heartbeat: engaged seconds since the last one (props.sec); rolled up, not stored raw
] as const;
export type TrackEventName = (typeof TRACK_EVENTS)[number];

/** Events a browser may send (server-side ones are not accepted from clients). */
export const CLIENT_TRACK_EVENTS = TRACK_EVENTS.filter((e) => e !== 'signup' && e !== 'login' && e !== 'purchase');

export const trackBatchSchema = z.object({
  visitorId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{4,64}$/).optional(),
  events: z
    .array(
      z.object({
        name: z.enum(CLIENT_TRACK_EVENTS as unknown as [TrackEventName, ...TrackEventName[]]),
        path: z.string().max(300).optional(),
        referrer: z.string().max(300).optional(),
        templateId: z.string().max(64).optional(),
        props: z.record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean(), z.null()])).optional(),
      }),
    )
    .min(1)
    .max(25),
});
export type TrackBatchInput = z.infer<typeof trackBatchSchema>;

// ---------- Offers & pricing ----------

const optDate = z.iso.datetime({ offset: true }).nullish().transform((v) => (v ? new Date(v) : null));
const productCodes = z.array(z.enum(PRODUCT_CODES)).max(PRODUCT_CODES.length).default([]);

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,24}$/, 'Use 3–24 letters, digits, - or _'),
    description: z.string().trim().max(200).nullish(),
    kind: z.enum(['percent', 'flat']),
    value: z.number().int().min(1),
    productCodes,
    startsAt: optDate,
    endsAt: optDate,
    maxUses: z.number().int().min(1).nullish(),
    perUserLimit: z.number().int().min(1).max(100).default(1),
    active: z.boolean().default(true),
  })
  .refine((c) => c.kind !== 'percent' || c.value <= 90, { message: 'Percent off must be 1–90', path: ['value'] });
export type CouponInput = z.input<typeof couponInputSchema>;

export const saleInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  percentOff: z.number().int().min(1).max(90),
  productCodes,
  startsAt: z.iso.datetime({ offset: true }).transform((v) => new Date(v)),
  endsAt: z.iso.datetime({ offset: true }).transform((v) => new Date(v)),
  active: z.boolean().default(true),
});
export type SaleInput = z.input<typeof saleInputSchema>;

export const ANNOUNCEMENT_TONES = ['marigold', 'indigo', 'sindoor'] as const;
export const announcementInputSchema = z.object({
  message: z.string().trim().min(3).max(160),
  ctaLabel: z.string().trim().max(30).nullish(),
  ctaUrl: z
    .string()
    .trim()
    .max(300)
    .refine((u) => u.startsWith('/') || /^https:\/\//.test(u), 'Use a path like /pricing or an https:// link')
    .nullish(),
  tone: z.enum(ANNOUNCEMENT_TONES).default('marigold'),
  audience: z.enum(['all', 'landing', 'app']).default('all'),
  startsAt: optDate,
  endsAt: optDate,
  active: z.boolean().default(true),
});
export type AnnouncementInput = z.input<typeof announcementInputSchema>;

/** Full plan edit; every null = back to the value in code. */
export const productOverrideSchema = z.object({
  pricePaise: z.number().int().min(100).max(10_000_000).nullable(),
  mrpPaise: z.number().int().min(100).max(10_000_000).nullable(),
  name: z.string().trim().min(2).max(40).nullish().transform((v) => v || null),
  description: z.string().trim().min(4).max(300).nullish().transform((v) => v || null),
  /** "Most popular" ribbon on the pricing page. */
  highlight: z.boolean().nullish().transform((v) => v ?? null),
  /** Off sale: hidden from pricing, refused at checkout. */
  disabled: z.boolean().default(false),
});
export type ProductOverrideInput = z.input<typeof productOverrideSchema>;
export type ProductOverride = z.output<typeof productOverrideSchema>;

/** Generates many single-use codes at once (campaigns, partners, influencers). */
export const couponBulkSchema = z.object({
  prefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,12}$/, 'Use 2–12 letters or digits'),
  count: z.number().int().min(1).max(500),
  description: z.string().trim().max(200).nullish(),
  kind: z.enum(['percent', 'flat']),
  value: z.number().int().min(1),
  productCodes,
  endsAt: optDate,
  /** Uses per code (1 = single-use). */
  maxUses: z.number().int().min(1).max(1000).default(1),
}).refine((c) => c.kind !== 'percent' || c.value <= 90, { message: 'Percent off must be 1–90', path: ['value'] });

export interface SaleDto {
  id: string;
  name: string;
  percentOff: number;
  productCodes: ProductCode[];
  startsAt: string;
  endsAt: string;
}

export interface AnnouncementDto {
  id: string;
  message: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  tone: (typeof ANNOUNCEMENT_TONES)[number];
  audience: 'all' | 'landing' | 'app';
}

/** Product with the admin price override and the running sale applied. */
export interface PricedProduct extends Product {
  /** Price in code / admin override, before any sale. */
  basePricePaise: number;
  sale?: { id: string; name: string; percentOff: number };
  /** Taken off sale by an admin. */
  disabled?: boolean;
}

/** Admin visibility of the demo designs shown across the public site. */
export interface DesignVisibilityDto {
  /** Card templates hidden by an admin (also removed from landing-page demos). */
  hiddenTemplates: string[];
  /** Video / website design packs taken out of the picker. */
  hiddenDesigns: string[];
  /** Design packs removed only from the public showcase (landing demos). */
  hiddenShowcase: string[];
  /** Design packs shown first. */
  featuredDesigns: string[];
}

export interface ActiveOffersDto {
  products: Record<ProductCode, PricedProduct>;
  sale: SaleDto | null;
  announcements: AnnouncementDto[];
  designs?: DesignVisibilityDto;
  /** Admin-replaced landing media (slot → URL). */
  media?: Record<string, string>;
  /** Maintenance notice and switched-off features. */
  flags?: PublicFlagsDto;
}

export const validateCouponSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(24),
  productCode: z.enum(PRODUCT_CODES),
});

export interface CouponQuoteDto {
  code: string;
  pricePaise: number;
  discountPaise: number;
  totalPaise: number;
  description: string | null;
}

// ---------- Templates ----------

export const publishTemplateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  baseTemplateId: z.string().regex(/^[a-z0-9-]{3,64}$/),
  eventTypes: z.array(z.enum(EVENT_TYPE_IDS)).min(1),
  communities: z.array(z.enum(COMMUNITIES)).default([]),
  tags: z.array(z.string().trim().min(1).max(24)).max(12).default([]),
  premium: z.boolean().default(false),
  design: designDocSchema,
});
export type PublishTemplateInput = z.input<typeof publishTemplateSchema>;

export const templateOverrideSchema = z.object({
  hidden: z.boolean().optional(),
  featured: z.boolean().optional(),
  /** null = back to the template's own setting. */
  premium: z.boolean().nullable().optional(),
});

// ---------- Users ----------

export const adminUserUpdateSchema = z.object({
  role: z.enum(['user', 'designer', 'agent', 'admin']).optional(),
  disabled: z.boolean().optional(),
  /** Private support note; null clears it. */
  note: z.string().trim().max(2000).nullable().optional(),
});

/** Gives a product to an invitation for free (support, refunds, partners). Logged as a ₹0 order. */
export const adminGrantSchema = z.object({
  eventId: z.uuid(),
  productCode: z.enum(PRODUCT_CODES),
  reason: z.string().trim().min(3).max(200),
});

export const designOverrideSchema = z.object({
  hidden: z.boolean().optional(),
  hideShowcase: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export const bulkTemplateSchema = z.object({
  ids: z.array(z.string().regex(/^[a-z0-9-]{3,64}$/)).min(1).max(500),
  hidden: z.boolean().optional(),
  featured: z.boolean().optional(),
});

/** Take an invitation's public site down (abuse, copyright, complaints) or restore it. */
export const eventModerationSchema = z.object({
  suspended: z.boolean(),
  reason: z.string().trim().max(300).nullish(),
});

export const ANALYTICS_RANGES = ['7d', '30d', '90d', '1y'] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

// ---------- Admin access ----------

/**
 * What an admin can do. `owner` = everything (roles, refunds, exports, data requests, switches).
 * An admin with no scopes is treated as owner, so accounts promoted before scopes existed keep working.
 */
export const ADMIN_SCOPES = ['owner', 'support', 'marketing', 'content'] as const;
export type AdminScope = (typeof ADMIN_SCOPES)[number];
export const ADMIN_SCOPE_LABEL: Record<AdminScope, string> = {
  owner: 'Owner: everything',
  support: 'Support: users, invitations, orders',
  marketing: 'Marketing: offers, plans, emails',
  content: 'Content: templates, designs, media',
};

export const adminScopesSchema = z.object({ scopes: z.array(z.enum(ADMIN_SCOPES)).min(1).max(ADMIN_SCOPES.length) });

export const adminMfaVerifySchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') });

// ---------- Money ----------

export const refundSchema = z.object({
  /** Paise; omitted = refund what is left on the order. */
  amountPaise: z.number().int().min(100).optional(),
  reason: z.string().trim().min(3).max(200),
  /** Remove what the order unlocked (full refunds only). */
  revokeAccess: z.boolean().default(false),
});

// ---------- Landing media ----------

/** Files on the public site an admin can replace without a deploy. */
export const MEDIA_SLOTS = {
  'hero.video': { label: 'Hero video (desktop)', accept: ['video/mp4', 'video/webm'], maxMb: 40, fallback: '/video/hero.mp4' },
  'hero.video_sm': { label: 'Hero video (phones)', accept: ['video/mp4', 'video/webm'], maxMb: 15, fallback: '/video/hero-sm.mp4' },
  'hero.poster': { label: 'Hero poster image', accept: ['image/jpeg', 'image/webp', 'image/png'], maxMb: 3, fallback: '/video/hero-poster.jpg' },
  'og.image': { label: 'Share preview image (WhatsApp / social)', accept: ['image/jpeg', 'image/png'], maxMb: 2, fallback: null },
} as const;
export type MediaSlot = keyof typeof MEDIA_SLOTS;
export const MEDIA_SLOT_KEYS = Object.keys(MEDIA_SLOTS) as MediaSlot[];

export const mediaPresignSchema = z.object({
  contentType: z.string().max(80),
  bytes: z.number().int().min(1).max(60 * 1024 * 1024),
});

export const musicTrackSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,40}$/),
  title: z.string().trim().min(2).max(60),
  mood: z.string().trim().min(2).max(30),
  durationSec: z.number().int().min(5).max(900),
  license: z.string().trim().min(2).max(120),
  active: z.boolean().default(true),
  /** Storage key from the presigned upload; omitted when only editing details. */
  storageKey: z.string().max(300).optional(),
});

// ---------- Data protection (DPDP Act 2023) ----------

export const dataRequestSchema = z.object({
  kind: z.enum(['export', 'erasure']),
  /** Where the request came from, e.g. "Email from the user on 12 Nov". */
  note: z.string().trim().max(300).nullish(),
});

/** Erasure must be typed out, so it is never one stray click. */
export const erasureConfirmSchema = z.object({ confirm: z.literal('DELETE') });

/** Public slice of the switches, sent with /offers/active. */
export interface PublicFlagsDto {
  maintenance: { on: boolean; message: string | null };
  off: string[];
}

// ---------- Admin edits (invitations, users, orders) ----------

export const adminInvitationUpdateSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  /** Public link /i/<slug>. */
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{2,60}[a-z0-9]$/, 'Use 4–62 lowercase letters, digits or -')
    .optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

export const adminWishActionSchema = z.object({ action: z.enum(['hide', 'show', 'delete']) });

export const adminProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).nullable().optional(),
  locale: z.enum(['en', 'hi']).optional(),
  marketingEmails: z.boolean().optional(),
});

export const adminUsersBulkSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(200),
  action: z.enum(['disable', 'enable', 'sign-out']),
});
