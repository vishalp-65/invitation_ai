import { z } from 'zod';
import { LANGUAGE_CODES } from '../constants/languages.js';
import { ATTIRES, COUPLE_STYLES } from '../templates/types.js';
import { eventContentSchema } from '../schemas/events.js';
import { webUrl } from '../schemas/common.js';
import { ALIAS_MAX, ALIAS_MIN, ALIAS_PATTERN, ALIAS_PROBLEM_TEXT } from '../constants/links.js';
import { MUSIC_TRACK_IDS, SITE_DESIGN_IDS } from './designs.js';

/**
 * Invitation website ("site") document: an ordered list of sections plus page-wide look,
 * opening scene and motion. Stored on `events.site`; the same document drives the builder
 * preview and the public page, so both always match.
 */

const text = (max: number) => z.string().trim().max(max);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected #RRGGBB');
const sectionId = z.string().regex(/^[a-z0-9-]{2,24}$/);

export const SITE_SECTION_TYPES = [
  'hero',
  'welcome',
  'couple',
  'story',
  'schedule',
  'dresscode',
  'venue',
  'gallery',
  'video',
  'family',
  'familytree',
  'travel',
  'rsvp',
  'gifts',
  'livestream',
  'updates',
  'faq',
  'wishes',
  'album',
  'custom',
  'countdown',
  'things',
  'closing',
] as const;
export type SiteSectionType = (typeof SITE_SECTION_TYPES)[number];

/** How a section enters the screen as the guest scrolls (transform/opacity only). */
export const SECTION_MOTIONS = ['rise', 'fade', 'zoom', 'slide', 'unfold', 'none'] as const;
export type SectionMotion = (typeof SECTION_MOTIONS)[number];

/** Animated SVG characters; `auto` picks one from the event type. */
export const SITE_CHARACTERS = [
  'auto',
  'none',
  'couple',
  'ganesha',
  'diya',
  'kalash',
  'baby',
  'cake',
  'elephant',
  'peacock',
  'doves',
  'house',
] as const;
export type SiteCharacter = (typeof SITE_CHARACTERS)[number];

/** Tap-to-open scene shown before the page. */
export const SITE_OPENINGS = ['none', 'envelope', 'doors', 'curtain', 'scroll', 'petals', 'seal', 'lanterns'] as const;
export type SiteOpening = (typeof SITE_OPENINGS)[number];

/** Video invite made from the design: full film, 15-second save-the-date reel, or page-turn storybook. */
export const VIDEO_STYLES = ['cinematic', 'teaser', 'storybook'] as const;
export type VideoStyle = (typeof VIDEO_STYLES)[number];

export const SITE_ORNAMENTS = ['none', 'mandala', 'florals', 'toran', 'stars'] as const;
export const MOTION_LEVELS = ['full', 'subtle', 'off'] as const;
export const ACCESS_MODES = ['link', 'guests', 'password'] as const;
export type SiteAccessMode = (typeof ACCESS_MODES)[number];

const base = {
  id: sectionId,
  hidden: z.boolean().default(false),
  /** Overrides the default heading ("Schedule", "कार्यक्रम"...). */
  title: text(80).optional(),
  motion: z.enum(SECTION_MOTIONS).default('rise'),
  /** Royale: show only to guests in these groups (guest `groupLabel`). Empty = everyone. */
  audience: z.array(text(40)).max(20).default([]),
};

const photo = z.uuid().optional();

/** Icons for "Things to know" cards (hashtag, weather, parking, stay, social...). */
export const THING_ICONS = ['hashtag', 'weather', 'parking', 'stay', 'kids', 'camera', 'instagram', 'phone', 'gift', 'food', 'info'] as const;
export type ThingIcon = (typeof THING_ICONS)[number];

export const siteSectionSchema = z.discriminatedUnion('type', [
  z.object({
    ...base,
    type: z.literal('hero'),
    variant: z.enum(['classic', 'photo', 'arch', 'split', 'scene']).default('classic'),
    showPhoto: z.boolean().default(true),
    showCountdown: z.boolean().default(true),
  }),
  z.object({ ...base, type: z.literal('welcome'), body: text(1200).default('') }),
  z.object({
    ...base,
    type: z.literal('couple'),
    people: z
      .array(z.object({ name: text(60), role: text(60).default(''), bio: text(400).default(''), photoAssetId: photo }))
      .max(4)
      .default([]),
  }),
  z.object({
    ...base,
    type: z.literal('story'),
    chapters: z
      .array(z.object({ title: text(80), date: text(40).default(''), text: text(500).default(''), photoAssetId: photo }))
      .max(12)
      .default([]),
  }),
  z.object({ ...base, type: z.literal('schedule'), variant: z.enum(['timeline', 'cards', 'ribbon']).default('timeline') }),
  z.object({
    ...base,
    type: z.literal('dresscode'),
    items: z
      .array(z.object({ label: text(60), functionId: z.uuid().optional(), note: text(160).default(''), colors: z.array(hex).max(5).default([]) }))
      .max(12)
      .default([]),
  }),
  z.object({ ...base, type: z.literal('venue'), functionId: z.uuid().optional(), showMap: z.boolean().default(true), showArt: z.boolean().default(true) }),
  z.object({
    ...base,
    type: z.literal('gallery'),
    layout: z.enum(['grid', 'masonry', 'carousel']).default('masonry'),
    /** Empty = the event's gallery photos. */
    assetIds: z.array(z.uuid()).max(60).default([]),
  }),
  z.object({ ...base, type: z.literal('video'), url: webUrl().optional() }),
  z.object({ ...base, type: z.literal('family') }),
  z.object({
    ...base,
    type: z.literal('familytree'),
    /** One or two family sides (the bride's and the groom's), each with its elders and close family. */
    sides: z
      .array(
        z.object({
          title: text(60),
          members: z
            .array(z.object({ name: text(80), relation: text(60).default(''), photoAssetId: photo, late: z.boolean().default(false) }))
            .max(16)
            .default([]),
        }),
      )
      .max(2)
      .default([]),
  }),
  z.object({
    ...base,
    type: z.literal('travel'),
    hotels: z
      .array(z.object({ name: text(100), address: text(300).default(''), url: webUrl().optional(), phone: text(20).optional(), note: text(200).default('') }))
      .max(8)
      .default([]),
    transport: text(800).default(''),
    /** Show each guest their own room / pickup (set per guest). */
    showGuestStay: z.boolean().default(true),
  }),
  z.object({ ...base, type: z.literal('rsvp') }),
  z.object({
    ...base,
    type: z.literal('gifts'),
    note: text(300).default(''),
    /** Host's UPI id. We only show it; money never passes through us. */
    upiId: z
      .string()
      .trim()
      .regex(/^[\w.-]{2,64}@[a-zA-Z]{2,32}$/, 'Enter a valid UPI id, e.g. name@okhdfc')
      .optional(),
    payeeName: text(60).optional(),
    registryUrl: webUrl().optional(),
    /** Gift wishlist: guests reserve an item so nobody buys the same thing twice. */
    wishlist: z
      .array(z.object({ id: z.string().regex(/^[a-z0-9]{4,16}$/), title: text(80), note: text(200).default(''), url: webUrl().optional(), price: text(30).default('') }))
      .max(40)
      .default([]),
  }),
  z.object({ ...base, type: z.literal('livestream'), url: webUrl().optional(), note: text(200).default('') }),
  z.object({ ...base, type: z.literal('updates') }),
  z.object({
    ...base,
    type: z.literal('faq'),
    items: z.array(z.object({ q: text(160), a: text(600) })).max(20).default([]),
  }),
  z.object({ ...base, type: z.literal('wishes') }),
  z.object({ ...base, type: z.literal('album'), note: text(200).default('') }),
  z.object({ ...base, type: z.literal('custom'), body: text(1500).default(''), photoAssetId: photo }),
  z.object({ ...base, type: z.literal('countdown'), note: text(160).default('') }),
  z.object({
    ...base,
    type: z.literal('things'),
    items: z
      .array(z.object({ icon: z.enum(THING_ICONS).default('info'), title: text(60), text: text(300).default(''), url: webUrl().optional() }))
      .max(12)
      .default([]),
  }),
  z.object({ ...base, type: z.literal('closing') }),
]);
export type SiteSection = z.infer<typeof siteSectionSchema>;
export type SiteSectionOf<T extends SiteSectionType> = Extract<SiteSection, { type: T }>;

export const siteDocSchema = z.object({
  version: z.literal(1).default(1),
  /** Cinematic design pack (painted scene, bands, opening, ambient). Unset = classic look. */
  design: z.enum(SITE_DESIGN_IDS).optional(),
  /** Style of the video invite rendered from this design. */
  video: z.object({ style: z.enum(VIDEO_STYLES).default('cinematic') }).default({ style: 'cinematic' }),
  /** Library track; `auto` = the design's mood track. The host's own upload always wins. */
  music: z
    .object({
      track: z.enum(['auto', 'none', ...MUSIC_TRACK_IDS]).default('auto'),
      /** The host's own MP3 (media asset), plays instead of any library track. */
      assetId: z.uuid().optional(),
    })
    .default({ track: 'auto' }),
  look: z
    .object({
      /** Colour overrides on top of the template palette. */
      primary: hex.optional(),
      accent: hex.optional(),
      background: hex.optional(),
      ornament: z.enum(SITE_ORNAMENTS).default('mandala'),
      dark: z.boolean().default(false),
    })
    .default({ ornament: 'mandala', dark: false }),
  opening: z
    .object({
      kind: z.enum(SITE_OPENINGS).default('envelope'),
      label: text(40).optional(),
    })
    .default({ kind: 'envelope' }),
  motion: z
    .object({
      level: z.enum(MOTION_LEVELS).default('full'),
      petals: z.boolean().default(true),
      parallax: z.boolean().default(true),
    })
    .default({ level: 'full', petals: true, parallax: true }),
  character: z
    .object({
      kind: z.enum(SITE_CHARACTERS).default('auto'),
      attire: z.enum(ATTIRES).default('north'),
      style: z.enum(COUPLE_STYLES).default('watercolor'),
    })
    .default({ kind: 'auto', attire: 'north', style: 'watercolor' }),
  access: z.object({ mode: z.enum(ACCESS_MODES).default('link') }).default({ mode: 'link' }),
  /**
   * Wedding-day mode (Premium): on function days the page leads with what is happening now and
   * next, the live stream, and a "share your photos" button for the photo wall.
   */
  live: z.object({ enabled: z.boolean().default(true) }).default({ enabled: true }),
  /** Royale: second language the guest can switch to. */
  alt: z
    .object({
      language: z.enum(LANGUAGE_CODES),
      content: eventContentSchema,
    })
    .optional(),
  sections: z
    .array(siteSectionSchema)
    .min(1)
    .max(30)
    .refine((s) => new Set(s.map((x) => x.id)).size === s.length, 'Section ids must be unique'),
});
export type SiteDoc = z.infer<typeof siteDocSchema>;

export const saveSiteSchema = z.object({ site: siteDocSchema });
export type SaveSiteInput = z.infer<typeof saveSiteSchema>;

export const sitePasswordSchema = z.object({ password: z.string().min(4).max(64).nullable() });

export const siteUpdateInputSchema = z.object({ text: text(500).min(1), pinned: z.boolean().default(false) });
export type SiteUpdateInput = z.infer<typeof siteUpdateInputSchema>;

export const wishInputSchema = z.object({
  guestToken: z.string().max(40).optional(),
  /** Unlock key of a password-protected site (from the unlock step). */
  key: z.string().max(64).optional(),
  name: text(80).min(1),
  message: text(500).min(1),
});
export type WishInput = z.infer<typeof wishInputSchema>;

export const unlockSiteSchema = z.object({ password: z.string().min(1).max(64) });

export const vanityLinkSchema = z.object({
  alias: z
    .string()
    .trim()
    .toLowerCase()
    .min(ALIAS_MIN, ALIAS_PROBLEM_TEXT.short)
    .max(ALIAS_MAX, ALIAS_PROBLEM_TEXT.long)
    .regex(ALIAS_PATTERN, ALIAS_PROBLEM_TEXT.format),
});

export const albumUploadSchema = z.object({
  guestToken: z.string().max(40).optional(),
  /** Unlock key of a password-protected site (from the unlock step). */
  key: z.string().max(64).optional(),
  name: text(80).min(1),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  bytes: z.number().int().positive().max(12 * 1024 * 1024),
});
export type AlbumUploadInput = z.infer<typeof albumUploadSchema>;

/** Per-guest stay & travel details (Royale travel manager). */
export const guestStaySchema = z.object({
  hotel: text(100).optional(),
  room: text(40).optional(),
  checkIn: text(40).optional(),
  checkOut: text(40).optional(),
  pickup: text(200).optional(),
  note: text(300).optional(),
});
export type GuestStay = z.infer<typeof guestStaySchema>;

/** Owner view of the website settings (builder). */
export interface SiteSettingsDto {
  site: SiteDoc;
  /** True until the owner saves a document (we show the occasion's default). */
  isDefault: boolean;
  tier: 'free' | 'premium' | 'royale';
  shortUrl: string;
  vanityAlias: string | null;
  vanityUrl: string | null;
  hasPassword: boolean;
  expiresAt: string | null;
  updatedAt: string | null;
}

// ---------------- AI draft ----------------

export const SITE_VIBES = ['royal', 'floral', 'modern', 'temple', 'playful'] as const;

export const siteDraftSchema = z.object({
  story: text(2000).optional(),
  tone: z.enum(['traditional', 'warm', 'poetic', 'modern', 'fun']).default('warm'),
  vibe: z.enum(SITE_VIBES).default('royal'),
});
export type SiteDraftInput = z.infer<typeof siteDraftSchema>;

/** What the model writes; merged into a default document server-side. */
export const siteDraftOutputSchema = z.object({
  welcome: z.string().describe('2–4 sentence welcome note to guests'),
  people: z
    .array(z.object({ name: z.string(), role: z.string(), bio: z.string() }))
    .describe('Short intros of the main people (couple / birthday person); empty if none'),
  story: z.array(z.object({ title: z.string(), date: z.string(), text: z.string() })).describe('3–5 story chapters from the facts given; empty if no story'),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).describe('4–6 practical guest FAQs'),
  dressCode: z
    .array(z.object({ label: z.string(), note: z.string(), colors: z.array(z.string()) }))
    .describe('Per-function dress code with 2–4 #RRGGBB colours'),
  opening: z.enum(SITE_OPENINGS),
  character: z.enum(SITE_CHARACTERS),
  headings: z
    .array(z.object({ type: z.enum(SITE_SECTION_TYPES), title: z.string() }))
    .describe('Short heading (1–3 words) for every section type, in the invitation language'),
});
export type SiteDraftOutput = z.infer<typeof siteDraftOutputSchema>;
