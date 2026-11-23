import { z } from 'zod';
import { COMMUNITIES, EVENT_TYPE_IDS } from '../constants/event-types.js';
import { LANGUAGE_CODES } from '../constants/languages.js';

export const WORDING_TONES = ['traditional', 'warm', 'poetic', 'modern', 'fun'] as const;
export type WordingTone = (typeof WORDING_TONES)[number];

export const generateWordingSchema = z.object({
  eventType: z.enum(EVENT_TYPE_IDS),
  language: z.enum(LANGUAGE_CODES),
  tone: z.enum(WORDING_TONES).default('traditional'),
  community: z.enum(COMMUNITIES).optional(),
  facts: z.object({
    primaryNames: z.array(z.string().trim().max(60)).max(2).default([]),
    primaryDetails: z.array(z.string().trim().max(160)).max(2).default([]),
    hosts: z.string().trim().max(300).optional(),
    familyMembers: z.string().trim().max(800).optional(),
    extra: z.string().trim().max(500).optional(),
  }),
});
export type GenerateWordingInput = z.infer<typeof generateWordingSchema>;

export const transliterateSchema = z.object({
  /** Up to 50 short strings (names, places) typed in English. */
  texts: z.array(z.string().trim().min(1).max(200)).min(1).max(50),
  language: z.enum(LANGUAGE_CODES),
});
export type TransliterateInput = z.infer<typeof transliterateSchema>;

export const translateContentSchema = z.object({
  eventId: z.uuid(),
  targetLanguage: z.enum(LANGUAGE_CODES),
});

/** `painting`: the host's photo repainted as a watercolour portrait (uses the AI background allowance / credits). */
export const AI_IMAGE_KINDS = ['background', 'caricature', 'portrait', 'painting'] as const;
export type AiImageKind = (typeof AI_IMAGE_KINDS)[number];

export const generateImageSchema = z.object({
  eventId: z.uuid(),
  kind: z.enum(AI_IMAGE_KINDS),
  /** Extra user direction, e.g. "lake palace at sunset". */
  prompt: z.string().trim().max(400).optional(),
  /** Required for caricature/portrait/painting: the uploaded photo to stylise. */
  sourceAssetId: z.uuid().optional(),
});
export type GenerateImageInput = z.infer<typeof generateImageSchema>;

export const generateClipSchema = z.object({
  eventId: z.uuid(),
  prompt: z.string().trim().max(400).optional(),
  /** Use an AI background/photo as the first frame (image-to-video). */
  firstFrameAssetId: z.uuid().optional(),
});
export type GenerateClipInput = z.infer<typeof generateClipSchema>;

/** Parsed output of the conversational (WhatsApp / voice) intake. */
export const parsedEventIntentSchema = z.object({
  eventType: z.enum(EVENT_TYPE_IDS).nullable(),
  primaryNames: z.array(z.string()).max(2),
  hosts: z.string().nullable(),
  functions: z
    .array(
      z.object({
        name: z.string(),
        date: z.string().nullable().describe('YYYY-MM-DD'),
        time: z.string().nullable().describe('HH:mm 24h'),
        venue: z.string().nullable(),
      }),
    )
    .max(8),
  language: z.enum(LANGUAGE_CODES).nullable(),
  /** Only when stated or implied by a faith ceremony; never guessed from names. */
  community: z.enum(COMMUNITIES).nullable(),
});
export type ParsedEventIntent = z.infer<typeof parsedEventIntentSchema>;

// ---------------- Card scan (upload a photo of a printed card) ----------------

export const SCAN_MAX_IMAGES = 4;
/** Per-image cap on the base64 data URL the browser sends (it resizes to ~1800px JPEG first). */
export const SCAN_MAX_IMAGE_CHARS = 1_400_000;

export const scanCardSchema = z
  .object({
    images: z
      .array(
        z
          .string()
          .max(SCAN_MAX_IMAGE_CHARS, 'Photo is too large')
          .refine((s) => /^data:image\/(jpeg|png|webp);base64,/.test(s.slice(0, 40)), 'Unsupported image'),
      )
      .max(SCAN_MAX_IMAGES)
      .default([]),
    /** Fallback: text the browser read off the photos itself (OCR) when the vision model is unavailable. */
    ocrText: z.string().trim().max(8000).optional(),
  })
  .refine((v) => v.images.length > 0 || Boolean(v.ocrText), { message: 'Add a photo of the card' });
export type ScanCardInput = z.infer<typeof scanCardSchema>;

export const SCAN_FIELDS = ['eventType', 'language', 'names', 'parentage', 'date', 'time', 'venue', 'hosts', 'wording'] as const;
export type ScanField = (typeof SCAN_FIELDS)[number];

const nstr = z.string().nullable();

/** What the model reads off a card. Lengths are trimmed when it is applied to a draft. */
export const scannedCardSchema = z.object({
  isInvitation: z.boolean().describe('false when the photos are not an invitation or event document'),
  eventType: z.enum(EVENT_TYPE_IDS).nullable(),
  language: z.enum(LANGUAGE_CODES).nullable().describe('main language of the printed text'),
  community: z.enum(COMMUNITIES).nullable(),
  primaryNames: z.array(z.string()).describe('the person/couple the event is for; wedding: [groom, bride] as printed'),
  primaryDetails: z.array(z.string()).describe('parentage line under each primary name, same order'),
  hosts: nstr.describe('who is inviting, e.g. "Mrs. Sunita & Mr. Ramesh Sharma"'),
  invocation: nstr,
  headline: nstr,
  hostLine: nstr,
  connector: nstr,
  message: nstr,
  familyTitle: nstr,
  familyLines: z.array(z.string()),
  welcomeTitle: nstr,
  welcomeLines: z.array(z.string()),
  complimentsTitle: nstr,
  complimentsLines: z.array(z.string()),
  closing: nstr,
  note: nstr,
  hashtag: nstr,
  rsvpContacts: z.array(z.object({ name: z.string(), phone: z.string() })),
  functions: z.array(
    z.object({
      name: z.string(),
      date: nstr.describe('YYYY-MM-DD'),
      time: nstr.describe('HH:mm 24h'),
      venueName: nstr,
      venueAddress: nstr,
    }),
  ),
  uncertain: z.array(z.enum(SCAN_FIELDS)).describe('fields that were blurry, ambiguous or guessed'),
});
export type ScannedCard = z.infer<typeof scannedCardSchema>;
export type ScanCardResult = ScannedCard & { method: 'vision' | 'ocr' };
