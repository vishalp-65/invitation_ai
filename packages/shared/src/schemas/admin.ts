import { z } from 'zod';
import { COMMUNITIES, EVENT_TYPE_IDS } from '../constants/event-types.js';
import { PRODUCT_CODES, PRODUCTS, type Product, type ProductCode } from '../constants/products.js';
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
  'event_created',
  'editor_open',
  'render_download',
  'site_published',
  'checkout_start',
  'coupon_applied',
  'purchase', // server-side: order paid
  'share',
] as const;
export type TrackEventName = (typeof TRACK_EVENTS)[number];

/** Events a browser may send (server-side ones are not accepted from clients). */
export const CLIENT_TRACK_EVENTS = TRACK_EVENTS.filter((e) => e !== 'signup' && e !== 'login' && e !== 'purchase');

export const VISITOR_COOKIE = 'cai_vid';

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

export const productOverrideSchema = z.object({
  /** null = back to the price in code. */
  pricePaise: z.number().int().min(100).max(10_000_000).nullable(),
  mrpPaise: z.number().int().min(100).max(10_000_000).nullable(),
});

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
}

export interface ActiveOffersDto {
  products: Record<ProductCode, PricedProduct>;
  sale: SaleDto | null;
  announcements: AnnouncementDto[];
}

export function saleApplies(sale: Pick<SaleDto, 'productCodes'>, code: ProductCode): boolean {
  return sale.productCodes.length === 0 || sale.productCodes.includes(code);
}

/** Single source of truth for what a product costs right now (API checkout + web display). */
export function priceProducts(
  overrides: Partial<Record<ProductCode, { pricePaise: number | null; mrpPaise: number | null }>>,
  sale: Pick<SaleDto, 'id' | 'name' | 'percentOff' | 'productCodes'> | null,
): Record<ProductCode, PricedProduct> {
  const out = {} as Record<ProductCode, PricedProduct>;
  for (const code of PRODUCT_CODES) {
    const p = PRODUCTS[code];
    const o = overrides[code];
    const base = o?.pricePaise ?? p.pricePaise;
    const mrp = o?.mrpPaise ?? p.mrpPaise;
    const onSale = sale && saleApplies(sale, code);
    const price = onSale ? Math.max(100, Math.round((base * (100 - sale.percentOff)) / 100 / 100) * 100) : base;
    out[code] = {
      ...p,
      basePricePaise: base,
      pricePaise: price,
      // On sale, the pre-sale price is the honest strike-through when there is no MRP.
      mrpPaise: mrp ?? (onSale ? base : undefined),
      ...(onSale ? { sale: { id: sale.id, name: sale.name, percentOff: sale.percentOff } } : {}),
    };
  }
  return out;
}

/** Discount (paise) a coupon gives on a price; never brings the price below ₹1. */
export function couponDiscount(c: { kind: 'percent' | 'flat'; value: number }, pricePaise: number): number {
  // Whole rupees only: customers should never see ₹1,079.10.
  const raw = Math.round((c.kind === 'percent' ? (pricePaise * c.value) / 100 : c.value) / 100) * 100;
  return Math.max(0, Math.min(raw, pricePaise - 100));
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
});

export const ANALYTICS_RANGES = ['7d', '30d', '90d'] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];
