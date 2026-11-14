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

export const AI_IMAGE_KINDS = ['background', 'caricature', 'portrait'] as const;
export type AiImageKind = (typeof AI_IMAGE_KINDS)[number];

export const generateImageSchema = z.object({
  eventId: z.uuid(),
  kind: z.enum(AI_IMAGE_KINDS),
  /** Extra user direction, e.g. "lake palace at sunset". */
  prompt: z.string().trim().max(400).optional(),
  /** Required for caricature/portrait: the uploaded photo to stylise. */
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
});
export type ParsedEventIntent = z.infer<typeof parsedEventIntentSchema>;
