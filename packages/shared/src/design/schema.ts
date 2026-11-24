import { z } from 'zod';
import { PATTERNS } from '../templates/types.js';
import { ELEMENT_ANIMS, IMAGE_FILTERS, IMAGE_MASKS, SHAPES, TEXT_EFFECTS } from './constants.js';
import { PHOTO_BG_BLENDS, PHOTO_BG_FADES } from '../constants/photo-bg.js';

export { DESIGN_H, DESIGN_W, ELEMENT_ANIMS, IMAGE_FILTERS, IMAGE_MASKS, SHAPES, TEXT_EFFECTS, curvedTextPath, imageFilterCss, type ElementAnim, type ImageFilter, type TextEffect } from './constants.js';

/**
 * Editable card document: pages of absolutely positioned layers on a fixed 1080×1920 canvas
 * (WhatsApp story size). The same document drives the editor, the image/PDF renders, the
 * video (layers animate in) and the website cover.
 */

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const id = z.string().min(1).max(40);
const num = (min: number, max: number) => z.number().finite().min(min).max(max);


const base = {
  id,
  x: num(-4000, 6000),
  y: num(-4000, 6000),
  w: num(1, 6000),
  h: num(1, 6000),
  /** Degrees, clockwise. */
  rot: num(-360, 360).default(0),
  opacity: num(0, 1).default(1),
  locked: z.boolean().optional(),
  hidden: z.boolean().optional(),
  anim: z.enum(ELEMENT_ANIMS).optional(),
  /** Template-generated layer the user hasn't touched (may be re-laid out). */
  auto: z.boolean().optional(),
  /** Layers sharing a group id select and move together. */
  group: z.string().max(40).optional(),
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
  /** Bend the text along an arc: + arches up (rainbow), − curves down (smile). 100 = half circle. */
  curve: num(-100, 100).optional(),
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
  filter: z.enum(IMAGE_FILTERS).optional(),
  /** Manual adjustments, 1 = unchanged. */
  bright: num(0.2, 2).optional(),
  contrast: num(0.2, 2).optional(),
  sat: num(0, 2.5).optional(),
  /** Crop: zoom inside the frame (1 = fill) and focal point in % (object-position). */
  zoom: num(1, 4).optional(),
  fx: num(0, 100).optional(),
  fy: num(0, 100).optional(),
  flipX: z.boolean().optional(),
  /**
   * Template photo frames before a photo is added: a tinted disc with the person's initials,
   * so the frame keeps its exact place, crop and roundness and the card still looks finished.
   */
  empty: z.object({ bg: hex, ink: hex, font: z.string().max(60) }).optional(),
  /** Melt the photo into the design: soft edges or a fade at one side. */
  fade: z.enum(PHOTO_BG_FADES).optional(),
  /** Blend with what is under it (multiply, screen, soft light…). */
  blend: z.enum(PHOTO_BG_BLENDS).optional(),
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
  /** Linear gradient direction in degrees (180 = top → bottom). */
  angle: num(0, 360).optional(),
  image: z.string().max(2000).nullable().optional(),
  imageOpacity: num(0, 1).optional(),
  /** px blur on the 1080-wide canvas. */
  imageBlur: num(0, 40).optional(),
  /** Colour wash over the image so text stays readable. */
  overlay: hex.optional(),
  overlayOpacity: num(0, 1).optional(),
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

/** "Save as my template": a design the user can start other invitations from. */
export const saveUserTemplateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  design: designDocSchema,
});
export type SaveUserTemplateInput = z.infer<typeof saveUserTemplateSchema>;

export interface UserTemplateDto {
  id: string;
  name: string;
  eventType: string | null;
  design: DesignDoc;
  createdAt: string;
}

export type TextElement = z.infer<typeof textElementSchema>;
export type ArtElement = z.infer<typeof artElementSchema>;
export type ImageElement = z.infer<typeof imageElementSchema>;
export type ShapeElement = z.infer<typeof shapeElementSchema>;
export type DesignElement = z.infer<typeof designElementSchema>;
export type PageBackground = z.infer<typeof pageBackgroundSchema>;
export type DesignPage = z.infer<typeof designPageSchema>;
export type DesignDoc = z.infer<typeof designDocSchema>;
