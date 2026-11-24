import { z } from 'zod';
import { PRODUCT_CODES } from '../constants/products.js';
import { RENDER_FORMATS } from '../constants/render.js';
import { LAYOUTS, themeSchema } from '../templates/types.js';
import { COMMUNITIES, EVENT_TYPE_IDS } from '../constants/event-types.js';
import { phoneSchema, webUrl } from './common.js';

// ---------- Renders ----------
export const createRenderSchema = z.object({
  eventId: z.uuid(),
  format: z.enum(RENDER_FORMATS),
  /**
   * Made by the app, not asked for by the user (the link-preview cover on Finish). Doesn't use a
   * free-plan image until the user downloads it.
   */
  auto: z.boolean().optional(),
});
export type CreateRenderInput = z.infer<typeof createRenderSchema>;

export interface RenderDto {
  id: string;
  eventId: string;
  format: (typeof RENDER_FORMATS)[number];
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  watermark: boolean;
  /** False for the automatic link-preview cover until the user downloads it (free-plan count). */
  freeCounted: boolean;
  outputs: Array<{ url: string; contentType: string; bytes: number }>;
  error: string | null;
  createdAt: string;
  /** Event list only: the invitation changed since this was made, so it no longer matches the card. */
  stale?: boolean;
}

// ---------- Media ----------
export const presignUploadSchema = z.object({
  eventId: z.uuid().optional(),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg']),
  bytes: z.number().int().min(1).max(15 * 1024 * 1024),
});
export type PresignUploadInput = z.infer<typeof presignUploadSchema>;

export const completeUploadSchema = z.object({
  assetId: z.uuid(),
});

export interface MediaAssetDto {
  id: string;
  kind: string;
  url: string;
  contentType: string;
  /** ~480 px copy for lists and previews (photos uploaded after thumbnails were added). */
  thumbUrl?: string;
  /** Where the subject sits in the picture, in % (object-position), for cropping into frames. */
  focus?: { x: number; y: number };
  width: number | null;
  height: number | null;
  createdAt: string;
}

// ---------- Payments ----------
export const createOrderSchema = z.object({
  eventId: z.uuid(),
  productCode: z.enum(PRODUCT_CODES),
  couponCode: z.string().trim().toUpperCase().min(1).max(24).optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const verifyPaymentSchema = z.object({
  orderId: z.uuid(),
  razorpayOrderId: z.string().min(1).max(64),
  razorpayPaymentId: z.string().min(1).max(64),
  razorpaySignature: z.string().min(1).max(256),
});
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export interface CheckoutDto {
  orderId: string;
  provider: 'razorpay';
  providerOrderId: string;
  keyId: string;
  amountPaise: number;
  currency: 'INR';
  productName: string;
  discountPaise?: number;
  prefill: { contact: string; name?: string };
}

// ---------- Print ----------
export const PAPER_TYPES = ['matte_300gsm', 'glossy_300gsm', 'textured_350gsm', 'handmade'] as const;
export const PRINT_ORDER_STATUSES = [
  'requested',
  'quoted',
  'confirmed',
  'printing',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export const addressSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: phoneSchema,
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a 6-digit PIN code'),
});

export const createPrintOrderSchema = z.object({
  eventId: z.uuid(),
  partnerId: z.uuid().optional(),
  quantity: z.number().int().min(25).max(5000),
  paperType: z.enum(PAPER_TYPES),
  shippingAddress: addressSchema,
  notes: z.string().trim().max(500).optional(),
});
export type CreatePrintOrderInput = z.infer<typeof createPrintOrderSchema>;

export const updatePrintOrderSchema = z.object({
  status: z.enum(PRINT_ORDER_STATUSES),
  quotePaise: z.number().int().min(0).optional(),
  notes: z.string().trim().max(500).optional(),
});

// ---------- Marketplace ----------
export const designerApplySchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  bio: z.string().trim().max(500).optional(),
  portfolioUrl: webUrl().optional(),
  payoutUpi: z.string().regex(/^[\w.-]{2,256}@[a-zA-Z]{2,64}$/, 'Enter a valid UPI ID'),
});

export const marketplaceTemplateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  layout: z.enum(LAYOUTS),
  theme: themeSchema,
  eventTypes: z.array(z.enum(EVENT_TYPE_IDS)).min(1),
  communities: z.array(z.enum(COMMUNITIES)).default([]),
  tags: z.array(z.string().trim().max(24)).max(12).default([]),
});
export type MarketplaceTemplateInput = z.infer<typeof marketplaceTemplateSchema>;

export const reviewTemplateSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(500).optional(),
});
