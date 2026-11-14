import type {
  DesignDoc,
  EventContent,
  EventSettings,
  Feature,
  Theme,
} from '@cardai/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// Column naming: camelCase in TS, snake_case in SQL (drizzle `casing: 'snake_case'`).

const id = () => uuid().primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------------- Enums ----------------

export const userRole = pgEnum('user_role', ['user', 'designer', 'agent', 'admin']);
export const eventStatus = pgEnum('event_status', ['draft', 'published', 'archived']);
export const renderFormat = pgEnum('render_format', ['image', 'pdf', 'print_pdf', 'video']);
export const jobStatus = pgEnum('job_status', ['queued', 'processing', 'completed', 'failed']);
export const assetKind = pgEnum('asset_kind', ['photo', 'ai_image', 'ai_clip', 'music', 'render']);
export const aiKind = pgEnum('ai_kind', [
  'wording',
  'transliteration',
  'translation',
  'image',
  'video_clip',
  'intent',
  'transcription',
]);
export const orderStatus = pgEnum('order_status', ['created', 'paid', 'failed', 'refunded']);
export const rsvpStatus = pgEnum('rsvp_status', ['yes', 'no', 'maybe']);
export const printOrderStatus = pgEnum('print_order_status', [
  'requested',
  'quoted',
  'confirmed',
  'printing',
  'shipped',
  'delivered',
  'cancelled',
]);
export const reviewStatus = pgEnum('review_status', ['draft', 'submitted', 'approved', 'rejected']);
export const designerStatus = pgEnum('designer_status', ['pending', 'approved', 'rejected']);
export const payoutStatus = pgEnum('payout_status', ['pending', 'paid']);

// ---------------- Identity ----------------

export const users = pgTable(
  'users',
  {
  id: id(),
  /** E.164, set only after the number was proven by OTP (or arrived via WhatsApp). */
  phone: text().unique(),
  name: text(),
  /** Lower-cased; set only once verified (email OTP or Google), see emailVerifiedAt. */
  email: text(),
  emailVerifiedAt: timestamp({ withTimezone: true }),
  /** Google account subject (stable id), never the email. */
  googleSub: text().unique(),
  avatarUrl: text(),
  role: userRole().notNull().default('user'),
  locale: text().notNull().default('en'),
  /** Reseller agent who onboarded this user (P2 agent network). */
  referredByAgentId: uuid(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('users_email_verified_uq').on(sql`lower(${t.email})`).where(sql`${t.emailVerifiedAt} is not null`),
    check('users_has_contact', sql`${t.phone} is not null or ${t.email} is not null or ${t.googleSub} is not null`),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text().notNull(),
    userAgent: text(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId), uniqueIndex().on(t.refreshTokenHash)],
);

// ---------------- Events ----------------

export const events = pgTable(
  'events',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    slug: text().notNull(),
    status: eventStatus().notNull().default('draft'),
    type: text().notNull(),
    language: text().notNull(),
    secondaryLanguage: text(),
    community: text(),
    templateId: text().notNull(),
    title: text().notNull(),
    content: jsonb().$type<EventContent>().notNull(),
    settings: jsonb().$type<EventSettings>().notNull(),
    /** Layered card design from the editor (null = auto-built from the template). */
    design: jsonb().$type<DesignDoc>(),
    viewCount: integer().notNull().default(0),
    publishedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex().on(t.slug), index().on(t.userId, t.createdAt)],
);

export const eventFunctions = pgTable(
  'event_functions',
  {
    id: id(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }),
    venueName: text().notNull(),
    venueAddress: text(),
    mapUrl: text(),
    dressCode: text(),
    notes: text(),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [index().on(t.eventId, t.sortOrder)],
);

/** Feature unlocks per event (from paid orders). Credits are for consumables like AI clips. */
export const entitlements = pgTable(
  'entitlements',
  {
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    feature: text().$type<Feature>().notNull(),
    credits: integer().notNull().default(0),
    orderId: uuid(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.feature] })],
);

// ---------------- Media & renders ----------------

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    eventId: uuid().references(() => events.id, { onDelete: 'cascade' }),
    kind: assetKind().notNull(),
    storageKey: text().notNull(),
    contentType: text().notNull(),
    bytes: integer(),
    width: integer(),
    height: integer(),
    /** False until the client confirms the presigned upload finished. */
    ready: boolean().notNull().default(false),
    meta: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.eventId, t.kind)],
);

export interface RenderOutput {
  key: string;
  contentType: string;
  bytes: number;
}

export const renders = pgTable(
  'renders',
  {
    id: id(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    format: renderFormat().notNull(),
    status: jobStatus().notNull().default('queued'),
    progress: integer().notNull().default(0),
    watermark: boolean().notNull(),
    /** Hash of everything that affects pixels; identical requests reuse the output. */
    inputHash: text().notNull(),
    outputs: jsonb().$type<RenderOutput[]>().notNull().default([]),
    error: text(),
    /** Where to notify on completion, e.g. WhatsApp number for bot-created events. */
    notify: jsonb().$type<{ whatsapp?: string } | null>(),
    createdAt: createdAt(),
    completedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.eventId, t.format, t.createdAt), index().on(t.inputHash)],
);

export const aiGenerations = pgTable(
  'ai_generations',
  {
    id: id(),
    userId: uuid().references(() => users.id, { onDelete: 'set null' }),
    eventId: uuid().references(() => events.id, { onDelete: 'cascade' }),
    kind: aiKind().notNull(),
    model: text(),
    status: jobStatus().notNull().default('queued'),
    externalId: text(),
    input: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    output: jsonb().$type<Record<string, unknown>>(),
    assetId: uuid(),
    costUsd: numeric({ precision: 10, scale: 5 }),
    error: text(),
    createdAt: createdAt(),
    completedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.userId, t.kind, t.createdAt), index().on(t.eventId)],
);

// ---------------- Commerce ----------------

export const orders = pgTable(
  'orders',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    eventId: uuid()
      .notNull()
      .references(() => events.id),
    productCode: text().notNull(),
    amountPaise: integer().notNull(),
    currency: text().notNull().default('INR'),
    status: orderStatus().notNull().default('created'),
    provider: text().notNull().default('razorpay'),
    providerOrderId: text(),
    providerPaymentId: text(),
    /** Template in use at purchase time, for marketplace revenue share. */
    templateId: text(),
    agentId: uuid(),
    createdAt: createdAt(),
    paidAt: timestamp({ withTimezone: true }),
  },
  (t) => [uniqueIndex().on(t.providerOrderId), index().on(t.userId), index().on(t.eventId)],
);

// ---------------- Guests & RSVP ----------------

export const guests = pgTable(
  'guests',
  {
    id: id(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    phone: text(),
    email: text(),
    groupLabel: text(),
    salutation: text(),
    maxPax: integer().notNull().default(2),
    functionIds: jsonb().$type<string[] | null>(),
    /** Unguessable token for the personalised link. */
    token: text().notNull(),
    viewCount: integer().notNull().default(0),
    firstViewedAt: timestamp({ withTimezone: true }),
    lastViewedAt: timestamp({ withTimezone: true }),
    invitedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.token), index().on(t.eventId)],
);

export const rsvps = pgTable(
  'rsvps',
  {
    id: id(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    functionId: uuid()
      .notNull()
      .references(() => eventFunctions.id, { onDelete: 'cascade' }),
    guestId: uuid().references(() => guests.id, { onDelete: 'set null' }),
    name: text().notNull(),
    phone: text(),
    status: rsvpStatus().notNull(),
    headcount: integer().notNull().default(1),
    mealPreference: text(),
    needsAccommodation: boolean(),
    note: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.eventId),
    // One response per guest per function (anonymous RSVPs are keyed by phone in service code).
    uniqueIndex()
      .on(t.guestId, t.functionId)
      .where(sql`${t.guestId} IS NOT NULL`),
  ],
);

// ---------------- Print ----------------

export const printPartners = pgTable('print_partners', {
  id: id(),
  name: text().notNull(),
  city: text().notNull(),
  state: text().notNull(),
  phone: text().notNull(),
  active: boolean().notNull().default(true),
  /** Indicative price per card by paper type, in paise. */
  priceList: jsonb().$type<Record<string, number>>().notNull().default({}),
  createdAt: createdAt(),
});

export const printOrders = pgTable(
  'print_orders',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    eventId: uuid()
      .notNull()
      .references(() => events.id),
    partnerId: uuid().references(() => printPartners.id),
    renderId: uuid().references(() => renders.id),
    quantity: integer().notNull(),
    paperType: text().notNull(),
    status: printOrderStatus().notNull().default('requested'),
    quotePaise: integer(),
    shippingAddress: jsonb().$type<Record<string, string>>().notNull(),
    notes: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId), index().on(t.status)],
);

// ---------------- Designer marketplace ----------------

export const designerProfiles = pgTable('designer_profiles', {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  displayName: text().notNull(),
  bio: text(),
  portfolioUrl: text(),
  payoutUpi: text().notNull(),
  status: designerStatus().notNull().default('pending'),
  revenueSharePct: integer().notNull().default(30),
  createdAt: createdAt(),
});

export const marketplaceTemplates = pgTable(
  'marketplace_templates',
  {
    id: id(),
    designerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Public template id, e.g. "mkt-xxxxxx". */
    templateKey: text().notNull(),
    name: text().notNull(),
    layout: text().notNull(),
    theme: jsonb().$type<Theme>().notNull(),
    eventTypes: jsonb().$type<string[]>().notNull(),
    communities: jsonb().$type<string[]>().notNull().default([]),
    tags: jsonb().$type<string[]>().notNull().default([]),
    status: reviewStatus().notNull().default('draft'),
    reviewNote: text(),
    salesCount: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex().on(t.templateKey), index().on(t.status)],
);

export const designerEarnings = pgTable(
  'designer_earnings',
  {
    id: id(),
    designerId: uuid()
      .notNull()
      .references(() => users.id),
    orderId: uuid()
      .notNull()
      .references(() => orders.id),
    templateKey: text().notNull(),
    amountPaise: integer().notNull(),
    status: payoutStatus().notNull().default('pending'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.orderId), index().on(t.designerId)],
);

// ---------------- Music library ----------------

export const musicTracks = pgTable('music_tracks', {
  id: text().primaryKey(),
  title: text().notNull(),
  mood: text().notNull(),
  storageKey: text().notNull(),
  durationSec: integer().notNull(),
  license: text().notNull(),
  active: boolean().notNull().default(true),
});

// ---------------- User templates ("Save as my template") ----------------

export const userTemplates = pgTable(
  'user_templates',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    /** Event type it was saved from (lists it first for the same kind of invitation). */
    eventType: text(),
    design: jsonb().$type<DesignDoc>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('user_templates_user_idx').on(t.userId, t.createdAt)],
);
