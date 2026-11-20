import type {
  DesignDoc,
  EventContent,
  EventSettings,
  Feature,
  GuestStay,
  SiteDoc,
  Theme,
} from '@cardai/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
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
export const renderFormat = pgEnum('render_format', ['image', 'pdf', 'print_pdf', 'video', 'site_video']);
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
  /** scrypt hash; null for accounts that only ever used Google (they can set one via password reset). */
  passwordHash: text(),
  /** Google account subject (stable id), never the email. */
  googleSub: text().unique(),
  avatarUrl: text(),
  role: userRole().notNull().default('user'),
  locale: text().notNull().default('en'),
  /** Offer / product-news emails. Transactional mail (codes, receipts, security) ignores this. */
  marketingEmails: boolean().notNull().default(false),
  /** Last offer email of any kind (campaign or automation), for the frequency cap. */
  lastMarketingAt: timestamp({ withTimezone: true }),
  /** Last "we miss you" email, so a dormant account gets at most one every 6 months. */
  winbackSentAt: timestamp({ withTimezone: true }),
  /** Reseller agent who onboarded this user (P2 agent network). */
  referredByAgentId: uuid(),
  /** Invitation this person was a guest of before signing up (viral loop). */
  referredEventId: uuid(),
  /** Admin permissions (see ADMIN_SCOPES); empty on an admin = owner. */
  adminScopes: jsonb().$type<string[]>().notNull().default([]),
  /** Admins: receive the 8 am daily summary email. */
  adminDigest: boolean().notNull().default(true),
  /** Set by an admin to block sign-in (existing sessions are revoked). */
  disabledAt: timestamp({ withTimezone: true }),
  /** Private support note, visible to admins only. */
  adminNote: text(),
  lastSeenAt: timestamp({ withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('users_email_verified_uq').on(sql`lower(${t.email})`).where(sql`${t.emailVerifiedAt} is not null`),
    index('users_created_idx').on(t.createdAt),
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
    /** Invitation website document (null = occasion default). */
    site: jsonb().$type<SiteDoc>(),
    /** scrypt hash for password-protected sites (Royale). */
    sitePasswordHash: text(),
    /** Random short-link code, e.g. inv.to/k7Qp2. */
    shortCode: text(),
    viewCount: integer().notNull().default(0),
    publishedAt: timestamp({ withTimezone: true }),
    /** Taken down by an admin: the public site, links and short codes stop working until restored. */
    suspendedAt: timestamp({ withTimezone: true }),
    suspendedReason: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex().on(t.slug), uniqueIndex('events_short_code_uq').on(t.shortCode), index().on(t.userId, t.createdAt), index('events_created_idx').on(t.createdAt)],
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
    /** Catalogue price before sale/coupon (amountPaise is what was charged). */
    listPricePaise: integer(),
    discountPaise: integer().notNull().default(0),
    couponCode: text(),
    saleId: uuid(),
    createdAt: createdAt(),
    paidAt: timestamp({ withTimezone: true }),
    /** Abandoned-checkout reminder sent for this unpaid order. */
    reminderSentAt: timestamp({ withTimezone: true }),
    /** upi | card | netbanking | wallet | emi | paylater (from the gateway). */
    paymentMethod: text(),
    refundedPaise: integer().notNull().default(0),
    refundedAt: timestamp({ withTimezone: true }),
    /** Gateway refund id; 'pending' while a refund call is in flight (blocks double refunds). */
    refundId: text(),
    refundReason: text(),
  },
  (t) => [
    uniqueIndex().on(t.providerOrderId),
    index().on(t.userId),
    index().on(t.eventId),
    index('orders_paid_idx').on(t.paidAt).where(sql`${t.status} = 'paid'`),
    index('orders_coupon_idx').on(t.couponCode).where(sql`${t.couponCode} is not null`),
  ],
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
    /** Personal short-link code (longer than event codes, still unguessable). */
    shortCode: text(),
    /** Room / pickup details for the Royale travel manager. */
    stay: jsonb().$type<GuestStay | null>(),
    viewCount: integer().notNull().default(0),
    firstViewedAt: timestamp({ withTimezone: true }),
    lastViewedAt: timestamp({ withTimezone: true }),
    invitedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.token), uniqueIndex('guests_short_code_uq').on(t.shortCode), index().on(t.eventId)],
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

// ---------------- Invitation website extras ----------------

/** Vanity short links, e.g. inv.to/rahul-weds-priya (Site Premium). */
export const shortAliases = pgTable(
  'short_aliases',
  {
    alias: text().primaryKey(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    clicks: integer().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index('short_aliases_event_idx').on(t.eventId)],
);

/** Host-posted live announcements ("Baraat is leaving now"). */
export const siteUpdates = pgTable(
  'site_updates',
  {
    id: id(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    text: text().notNull(),
    pinned: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index('site_updates_event_idx').on(t.eventId, t.createdAt)],
);

/** Guestbook wishes left on the website. Hosts can hide any. */
export const siteWishes = pgTable(
  'site_wishes',
  {
    id: id(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    guestId: uuid().references(() => guests.id, { onDelete: 'set null' }),
    name: text().notNull(),
    message: text().notNull(),
    hidden: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index('site_wishes_event_idx').on(t.eventId, t.createdAt)],
);

// ---------------- Admin: catalogue control, offers, analytics ----------------

/** Admin overrides on any template (built-in or not): hide = "deleted" from the catalogue, restorable. */
export const templateOverrides = pgTable('template_overrides', {
  templateId: text().primaryKey(),
  hidden: boolean().notNull().default(false),
  featured: boolean().notNull().default(false),
  premium: boolean(),
  updatedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
  updatedAt: updatedAt(),
});

/**
 * Admin overrides on the cinematic video / website design packs (defined in code). `hidden` takes a
 * pack out of the picker (invitations already using it keep working); `hideShowcase` only removes
 * it from the public demos on the landing page.
 */
export const siteDesignOverrides = pgTable('site_design_overrides', {
  designId: text().primaryKey(),
  hidden: boolean().notNull().default(false),
  hideShowcase: boolean().notNull().default(false),
  featured: boolean().notNull().default(false),
  updatedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
  updatedAt: updatedAt(),
});

export const catalogStatus = pgEnum('catalog_status', ['draft', 'published']);

/** Templates designed by admins in the editor and published straight into the catalogue. */
export const catalogTemplates = pgTable(
  'catalog_templates',
  {
    id: id(),
    /** Public template id, "adm-xxxxxx". */
    templateKey: text().notNull(),
    name: text().notNull(),
    /** Built-in template the design started from (layout/theme fallback for video + website). */
    baseTemplateId: text().notNull(),
    eventTypes: jsonb().$type<string[]>().notNull(),
    communities: jsonb().$type<string[]>().notNull().default([]),
    tags: jsonb().$type<string[]>().notNull().default([]),
    premium: boolean().notNull().default(false),
    design: jsonb().$type<DesignDoc>().notNull(),
    status: catalogStatus().notNull().default('published'),
    createdBy: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('catalog_templates_key_uq').on(t.templateKey)],
);

/** Admin plan edits per product code (price, MRP, wording, on/off). Missing row / null = the value in code. */
export const productOverrides = pgTable('product_overrides', {
  code: text().primaryKey(),
  pricePaise: integer(),
  mrpPaise: integer(),
  name: text(),
  description: text(),
  highlight: boolean(),
  /** Taken off sale: hidden from pricing and refused at checkout. Existing purchases keep working. */
  disabled: boolean().notNull().default(false),
  updatedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
  updatedAt: updatedAt(),
});

export const discountKind = pgEnum('discount_kind', ['percent', 'flat']);

export const coupons = pgTable(
  'coupons',
  {
    id: id(),
    /** Upper-cased. */
    code: text().notNull(),
    description: text(),
    kind: discountKind().notNull(),
    /** Percent (1..90) or paise. */
    value: integer().notNull(),
    /** Empty = every product. */
    productCodes: jsonb().$type<string[]>().notNull().default([]),
    startsAt: timestamp({ withTimezone: true }),
    endsAt: timestamp({ withTimezone: true }),
    maxUses: integer(),
    perUserLimit: integer().notNull().default(1),
    usedCount: integer().notNull().default(0),
    active: boolean().notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('coupons_code_uq').on(t.code)],
);

/** Sitewide sale: automatic % off on chosen products for a date range. Best active sale wins. */
export const sales = pgTable('sales', {
  id: id(),
  name: text().notNull(),
  percentOff: integer().notNull(),
  productCodes: jsonb().$type<string[]>().notNull().default([]),
  startsAt: timestamp({ withTimezone: true }).notNull(),
  endsAt: timestamp({ withTimezone: true }).notNull(),
  active: boolean().notNull().default(true),
  createdAt: createdAt(),
});

export const announcements = pgTable('announcements', {
  id: id(),
  message: text().notNull(),
  ctaLabel: text(),
  ctaUrl: text(),
  tone: text().notNull().default('marigold'),
  /** all | landing | app */
  audience: text().notNull().default('all'),
  startsAt: timestamp({ withTimezone: true }),
  endsAt: timestamp({ withTimezone: true }),
  active: boolean().notNull().default(true),
  createdAt: createdAt(),
});

/**
 * First-party product analytics. One row per tracked action; `visitorId` is an anonymous
 * first-party cookie, linked to `userId` once the visitor signs in.
 */
export const analyticsEvents = pgTable(
  'analytics_events',
  {
    // Partitioned by month on created_at (migration 0011), so the key includes it.
    id: uuid().notNull().default(sql`gen_random_uuid()`),
    name: text().notNull(),
    visitorId: text().notNull(),
    sessionId: text(),
    userId: uuid().references(() => users.id, { onDelete: 'set null' }),
    path: text(),
    referrer: text(),
    device: text(),
    templateId: text(),
    props: jsonb().$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index('analytics_name_time_idx').on(t.name, t.createdAt),
    index('analytics_visitor_idx').on(t.visitorId),
    index('analytics_user_idx').on(t.userId, t.createdAt),
    index('analytics_template_idx').on(t.templateId, t.createdAt),
    // Append-only time series: a BRIN index serves every "created_at >= X" scan at a tiny size.
    index('analytics_time_brin').using('brin', t.createdAt),
    primaryKey({ columns: [t.id, t.createdAt] }),
  ],
);

/**
 * One row per visitor per India-time day: engaged seconds (tab visible + recent input) and page
 * views. Time-spent, DAU/WAU/MAU and repeat-visit analytics read this small rollup instead of
 * scanning raw events.
 */
export const activityDaily = pgTable(
  'activity_daily',
  {
    day: date({ mode: 'string' }).notNull(),
    visitorId: text().notNull(),
    userId: uuid().references(() => users.id, { onDelete: 'set null' }),
    activeSeconds: integer().notNull().default(0),
    pageViews: integer().notNull().default(0),
    device: text(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.day, t.visitorId] }),
    index('activity_daily_user_idx').on(t.userId, t.day),
    index('activity_daily_day_idx').on(t.day),
  ],
);

/** Every admin write, for accountability. */
export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: id(),
    adminId: uuid().references(() => users.id, { onDelete: 'set null' }),
    action: text().notNull(),
    target: text(),
    details: jsonb().$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index('admin_audit_time_idx').on(t.createdAt)],
);

// ---------------- Growth & operations ----------------

/**
 * First touch per anonymous visitor: where they came from (UTM / channel), coarse location
 * (state + city from the edge, never an IP), language and connection. One row per visitor, so
 * campaign, state and tier reports never scan raw events.
 */
export const visitorAttribution = pgTable(
  'visitor_attribution',
  {
    visitorId: text().primaryKey(),
    userId: uuid().references(() => users.id, { onDelete: 'set null' }),
    firstSeenAt: createdAt(),
    channel: text().notNull(),
    utmSource: text(),
    utmMedium: text(),
    utmCampaign: text(),
    referrer: text(),
    landingPath: text(),
    country: text(),
    state: text(),
    city: text(),
    tier: text(),
    language: text(),
    network: text(),
    inApp: text(),
    device: text(),
    /** Latest campaign seen (last touch), when different from the first. */
    lastCampaign: text(),
  },
  (t) => [
    index('visitor_attr_user_idx').on(t.userId),
    index('visitor_attr_time_idx').on(t.firstSeenAt),
    index('visitor_attr_campaign_idx').on(t.utmCampaign).where(sql`${t.utmCampaign} is not null`),
  ],
);

/** Guest side of an invitation per day: opens, personal-link opens, WhatsApp opens. */
export const invitationDaily = pgTable(
  'invitation_daily',
  {
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    day: date({ mode: 'string' }).notNull(),
    views: integer().notNull().default(0),
    guestViews: integer().notNull().default(0),
    whatsappViews: integer().notNull().default(0),
    mobileViews: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.day] }), index('invitation_daily_day_idx').on(t.day)],
);

/** Feature switches and gradual roll-outs (see BUILTIN_FLAGS). Missing row = the default. */
export const featureFlags = pgTable('feature_flags', {
  key: text().primaryKey(),
  enabled: boolean().notNull(),
  rolloutPct: integer().notNull().default(100),
  description: text(),
  message: text(),
  updatedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
  updatedAt: updatedAt(),
});

/** Health alerts raised by the 10-minute checks (also emailed to admins, de-duplicated). */
export const adminAlerts = pgTable(
  'admin_alerts',
  {
    id: id(),
    kind: text().notNull(),
    severity: text().notNull().default('warn'),
    title: text().notNull(),
    detail: text(),
    data: jsonb().$type<Record<string, unknown>>(),
    resolvedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('admin_alerts_time_idx').on(t.createdAt)],
);

/** Finished days, computed nightly (India time). Long-range charts and the digest read this. */
export const dailyMetrics = pgTable('daily_metrics', {
  day: date({ mode: 'string' }).primaryKey(),
  visitors: integer().notNull().default(0),
  signups: integer().notNull().default(0),
  activeUsers: integer().notNull().default(0),
  invitations: integer().notNull().default(0),
  orders: integer().notNull().default(0),
  revenuePaise: integer().notNull().default(0),
  refundsPaise: integer().notNull().default(0),
  engagedSeconds: integer().notNull().default(0),
  guestViews: integer().notNull().default(0),
  rendersFailed: integer().notNull().default(0),
  aiCostMicroUsd: integer().notNull().default(0),
  computedAt: updatedAt(),
});

/** Landing-page media an admin replaced (hero video, poster, share image). */
export const siteMedia = pgTable('site_media', {
  slot: text().primaryKey(),
  storageKey: text().notNull(),
  contentType: text().notNull(),
  bytes: integer(),
  updatedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
  updatedAt: updatedAt(),
});

/** Data-protection requests (DPDP Act): export or erasure, handled by an admin, kept as a record. */
export const dataRequests = pgTable(
  'data_requests',
  {
    id: id(),
    /** Kept as text: the account itself may be erased. */
    userId: uuid().notNull(),
    kind: text().notNull(),
    status: text().notNull().default('open'),
    note: text(),
    handledBy: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    completedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index('data_requests_user_idx').on(t.userId)],
);

// ---------------- Email ----------------

/** Addresses that hard-bounced, complained or were blocked by Resend: never mailed again (except sign-in codes). */
export const emailSuppressions = pgTable('email_suppressions', {
  email: text().primaryKey(),
  /** bounced | complained | manual */
  reason: text().notNull(),
  createdAt: createdAt(),
});

/** Admin-composed offer / announcement emails sent to an audience segment. */
export const emailCampaigns = pgTable(
  'email_campaigns',
  {
    id: id(),
    subject: text().notNull(),
    preheader: text(),
    heading: text().notNull(),
    body: text().notNull(),
    ctaLabel: text(),
    ctaUrl: text(),
    couponCode: text(),
    /** all | paid | never_paid | inactive_30d | designers */
    audience: text().notNull(),
    /** draft | scheduled | sending | sent | failed */
    status: text().notNull().default('draft'),
    scheduledAt: timestamp({ withTimezone: true }),
    recipientCount: integer().notNull().default(0),
    sentCount: integer().notNull().default(0),
    failedCount: integer().notNull().default(0),
    /** Unique recipients, from Resend webhooks (opens/clicks need tracking enabled on the domain). */
    deliveredCount: integer().notNull().default(0),
    openedCount: integer().notNull().default(0),
    clickedCount: integer().notNull().default(0),
    bouncedCount: integer().notNull().default(0),
    createdBy: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    sentAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.createdAt)],
);
