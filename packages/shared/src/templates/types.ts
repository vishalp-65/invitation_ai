import { z } from 'zod';
import { COMMUNITIES, EVENT_TYPE_IDS } from '../constants/event-types.js';

/** Layout families implemented as Remotion components in @cardai/templates. */
export const LAYOUTS = [
  'royal-arch',
  'floral-frame',
  'minimal-modern',
  'temple-heritage',
  'festive-pop',
  'photo-frame',
  'botanical',
  'art-deco',
  'monogram',
  'jharokha',
] as const;
export type LayoutId = (typeof LAYOUTS)[number];

/** Sacred / decorative symbol placed at the top of the card. */
export const MOTIFS = [
  'none',
  'om',
  'shree',
  'kalash',
  'diya',
  'lotus',
  'khanda',
  'crescent',
  'cross',
  'peacock',
  'balloons',
  'heart',
] as const;
export type MotifId = (typeof MOTIFS)[number];

export const PATTERNS = ['none', 'mandala', 'paisley', 'jaali', 'dots', 'leaves', 'confetti'] as const;
export type PatternId = (typeof PATTERNS)[number];

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected #RRGGBB');

/** Hero illustration on the cover / video intro. */
export const ART_KINDS = ['none', 'ganesha', 'couple', 'diya'] as const;
export const COUPLE_STYLES = ['watercolor', 'caricature', 'lineart'] as const;
/** Wedding attire for the couple illustration. */
export const ATTIRES = ['north', 'south', 'bengali', 'marathi', 'sikh', 'muslim', 'christian'] as const;
export const FLORALS = ['none', 'marigold', 'rose', 'lotus', 'jasmine', 'mixed'] as const;
export const FLORAL_PLACEMENTS = ['diagonal', 'bottom', 'corners'] as const;

export type ArtKind = (typeof ART_KINDS)[number];
export type CoupleStyle = (typeof COUPLE_STYLES)[number];
export type Attire = (typeof ATTIRES)[number];
export type FloralKind = (typeof FLORALS)[number];

/** Premium ornament layer (all vector, drawn by @cardai/templates). */
export const decorSchema = z.object({
  art: z.enum(ART_KINDS).default('none'),
  coupleStyle: z.enum(COUPLE_STYLES).default('watercolor'),
  attire: z.enum(ATTIRES).default('north'),
  florals: z.enum(FLORALS).default('none'),
  floralPlacement: z.enum(FLORAL_PLACEMENTS).default('diagonal'),
  /** Hanging marigold garland + brass lanterns along the top edge. */
  toran: z.boolean().default(false),
  /** Large faint mandala behind the text. */
  mandala: z.boolean().default(false),
  /** Script font for Latin names (e.g. "Great Vibes"). */
  nameFont: z.string().max(60).optional(),
});
export type Decor = z.infer<typeof decorSchema>;

export const themeSchema = z.object({
  palette: z.object({
    background: hex,
    backgroundAlt: hex,
    surface: hex,
    primary: hex,
    accent: hex,
    text: hex,
    muted: hex,
  }),
  motif: z.enum(MOTIFS),
  pattern: z.enum(PATTERNS),
  /** Optional font overrides; otherwise language defaults are used. */
  fontDisplay: z.string().max(60).optional(),
  fontBody: z.string().max(60).optional(),
  /** 0..1 strength of ornaments/pattern. */
  ornamentOpacity: z.number().min(0).max(1).default(0.18),
  decor: decorSchema.optional(),
});
export type Theme = z.infer<typeof themeSchema>;

export const templateDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,64}$/),
  name: z.string().min(2).max(60),
  layout: z.enum(LAYOUTS),
  theme: themeSchema,
  eventTypes: z.array(z.enum(EVENT_TYPE_IDS)).min(1).or(z.literal('all')),
  communities: z.array(z.enum(COMMUNITIES)).default([]),
  tags: z.array(z.string().max(24)).max(12).default([]),
  premium: z.boolean().default(false),
});
export type TemplateDefinition = z.infer<typeof templateDefinitionSchema> & {
  source: 'builtin' | 'marketplace';
  designer?: { id: string; name: string };
  /** Design family: same layout + ornaments, different colourways. */
  family?: { id: string; name: string; variant: string };
  /** Layered design family (editor-first templates); absent for the classic catalogue. */
  design?: string;
  /** Gallery group. */
  category?: 'wedding' | 'kids' | 'religious' | 'business';
  /** Declared visual styles for search (more are derived, see templates/search.ts). */
  styles?: string[];
};
