import { z } from 'zod';
import { PATTERNS } from '../templates/types.js';

/**
 * Editable card document: pages of absolutely positioned layers on a fixed 1080×1920 canvas
 * (WhatsApp story size). The same document drives the editor, the image/PDF renders, the
 * video (layers animate in) and the website cover.
 */
export const DESIGN_W = 1080;
export const DESIGN_H = 1920;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const id = z.string().min(1).max(40);
const num = (min: number, max: number) => z.number().finite().min(min).max(max);

export const ELEMENT_ANIMS = ['auto', 'fade', 'rise', 'zoom', 'drop', 'none'] as const;
export const TEXT_EFFECTS = ['none', 'shadow', 'glow', 'gold', 'outline'] as const;
export const IMAGE_MASKS = ['rect', 'rounded', 'circle', 'arch'] as const;
export const SHAPES = ['rect', 'ellipse', 'line'] as const;

const base = {
  id,
  x: num(-4000, 6000),
  y: num(-4000, 6000),
  w: num(4, 6000),
  h: num(4, 6000),
  /** Degrees, clockwise. */
  rot: num(-360, 360).default(0),
  opacity: num(0, 1).default(1),
  locked: z.boolean().optional(),
  hidden: z.boolean().optional(),
  anim: z.enum(ELEMENT_ANIMS).optional(),
  /** Template-generated layer the user hasn't touched (may be re-laid out). */
  auto: z.boolean().optional(),
};

export const textElementSchema = z.object({
  ...base,
  type: z.literal('text'),
  text: z.string().max(2000),
  /** Shows live event data (names, date, venue…) instead of `text`. See bindings.ts. */
  bind: z.string().max(40).optional(),
  font: z.string().max(60),
  /** px on the 1080-wide canvas. */
  size: num(6, 600),
  weight: z.number().int().min(100).max(900).default(400),
  italic: z.boolean().default(false),
  color: hex,
  align: z.enum(['left', 'center', 'right']).default('center'),
  lh: num(0.6, 3).default(1.2),
  /** Letter spacing in em. */
  ls: num(-0.2, 1).default(0),
  upper: z.boolean().default(false),
  effect: z.enum(TEXT_EFFECTS).default('none'),
  effectColor: hex.optional(),
  /** Shrink the font so the text never overflows its box (template text). */
  fit: z.boolean().default(false),
});

export const artElementSchema = z.object({
  ...base,
  type: z.literal('art'),
  /** Key in the art library (@cardai/templates design/assets). */
  asset: z.string().min(1).max(60),
  /** Colour slots of the asset, in the asset's order. */
  colors: z.array(hex).max(6).default([]),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
  /** Asset options, e.g. couple style / attire. */
  opts: z.record(z.string().max(30), z.union([z.string().max(60), z.number(), z.boolean()])).optional(),
});

export const imageElementSchema = z.object({
  ...base,
  type: z.literal('image'),
  src: z.string().max(2000).nullable(),
  /** e.g. "photo.0" → the event's first photo. */
  bind: z.string().max(40).optional(),
  mask: z.enum(IMAGE_MASKS).default('rect'),
  border: hex.optional(),
  borderW: num(0, 80).default(0),
});

export const shapeElementSchema = z.object({
  ...base,
  type: z.literal('shape'),
  shape: z.enum(SHAPES),
  fill: hex.nullable().default(null),
  fillOpacity: num(0, 1).default(1),
  stroke: hex.nullable().default(null),
  strokeW: num(0, 80).default(0),
  radius: num(0, 2000).default(0),
});

export const designElementSchema = z.discriminatedUnion('type', [textElementSchema, artElementSchema, imageElementSchema, shapeElementSchema]);

export const pageBackgroundSchema = z.object({
  color: hex,
  /** Second stop for gradients. */
  color2: hex.optional(),
  gradient: z.enum(['none', 'radial', 'linear']).default('none'),
  pattern: z.enum(PATTERNS).default('none'),
  patternColor: hex.optional(),
  patternAccent: hex.optional(),
  patternOpacity: num(0, 1).default(0.16),
  image: z.string().max(2000).nullable().optional(),
});

export const designPageSchema = z.object({
  id,
  bg: pageBackgroundSchema,
  elements: z.array(designElementSchema).max(120),
});

export const designDocSchema = z.object({
  v: z.literal(1),
  /** Template it was started from (for "reset to template"). */
  templateId: z.string().max(64),
  pages: z.array(designPageSchema).min(1).max(8),
});

export type TextElement = z.infer<typeof textElementSchema>;
export type ArtElement = z.infer<typeof artElementSchema>;
export type ImageElement = z.infer<typeof imageElementSchema>;
export type ShapeElement = z.infer<typeof shapeElementSchema>;
export type DesignElement = z.infer<typeof designElementSchema>;
export type PageBackground = z.infer<typeof pageBackgroundSchema>;
export type DesignPage = z.infer<typeof designPageSchema>;
export type DesignDoc = z.infer<typeof designDocSchema>;
export type ElementAnim = (typeof ELEMENT_ANIMS)[number];
export type TextEffect = (typeof TEXT_EFFECTS)[number];
