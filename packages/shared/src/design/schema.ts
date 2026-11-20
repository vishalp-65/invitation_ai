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
export const IMAGE_MASKS = ['rect', 'rounded', 'circle', 'arch', 'oval'] as const;
export const SHAPES = ['rect', 'ellipse', 'line'] as const;
/** One-tap photo looks (CSS filter presets, see imageFilterCss). */
export const IMAGE_FILTERS = ['none', 'warm', 'cool', 'vivid', 'fade', 'mono', 'sepia', 'noir'] as const;

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

/**
 * Geometry for curved text: an arc whose chord spans the box width.
 * Returns the SVG path (box-local coords, text sits on it) and the box height it needs.
 */
export function curvedTextPath(w: number, size: number, curve: number): { d: string; height: number } {
  const theta = (Math.min(100, Math.abs(curve)) / 100) * Math.PI; // up to a half circle
  const chord = w;
  const r = chord / (2 * Math.sin(theta / 2));
  const sag = r * (1 - Math.cos(theta / 2));
  const pad = size * 0.25;
  if (curve > 0) {
    // Arch (∩): glyph tops at the box top, ends lower.
    const y = pad + size + sag;
    return { d: `M 0 ${y} A ${r} ${r} 0 0 1 ${chord} ${y}`, height: y + pad };
  }
  // Smile (∪): the middle dips; text sits on the curve.
  const y = pad + size;
  return { d: `M 0 ${y} A ${r} ${r} 0 0 0 ${chord} ${y}`, height: y + sag + pad };
}

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
export type ImageFilter = (typeof IMAGE_FILTERS)[number];

/** CSS filter for a photo layer (shared by editor preview, stills and video). */
export function imageFilterCss(el: { filter?: ImageFilter; bright?: number; contrast?: number; sat?: number }): string | undefined {
  const preset: Record<ImageFilter, string> = {
    none: '',
    warm: 'sepia(0.18) saturate(1.25) hue-rotate(-8deg)',
    cool: 'saturate(1.05) hue-rotate(12deg) brightness(1.03)',
    vivid: 'saturate(1.5) contrast(1.08)',
    fade: 'contrast(0.85) brightness(1.08) saturate(0.8)',
    mono: 'grayscale(1)',
    sepia: 'sepia(0.75)',
    noir: 'grayscale(1) contrast(1.35) brightness(0.92)',
  };
  const parts = [preset[el.filter ?? 'none']];
  if (el.bright !== undefined && el.bright !== 1) parts.push(`brightness(${el.bright})`);
  if (el.contrast !== undefined && el.contrast !== 1) parts.push(`contrast(${el.contrast})`);
  if (el.sat !== undefined && el.sat !== 1) parts.push(`saturate(${el.sat})`);
  const out = parts.filter(Boolean).join(' ');
  return out || undefined;
}
