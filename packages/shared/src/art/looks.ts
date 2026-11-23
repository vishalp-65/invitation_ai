import type { ArtId, PaintedMask } from './library.js';

/**
 * Photo looks: painted paper + overlay art + a photo frame + fonts and colours. A look is
 * the shared recipe behind the photo designs of all three outputs:
 *   - image card: `design/families-painted.ts` builds editable layers from it;
 *   - website: design packs with `look` render the photo hero and painted bands;
 *   - video: the website's design video plays the photo storybook scenes.
 *
 * Layer positions are anchored to the page corners/edges and sized as a fraction of the page
 * width, so the same look fits a 1080×1920 card, a phone screen and a wide desktop hero.
 */

export const PHOTO_LOOK_IDS = ['gulab-bagh', 'herbarium', 'gulabi-syahi', 'mahal-maroon', 'harit', 'kahani', 'genda', 'jharokha', 'kamal', 'roshni'] as const;
export type PhotoLookId = (typeof PHOTO_LOOK_IDS)[number];

export type LookAnchor = 'frame' | 'tl' | 'tr' | 'bl' | 'br' | 'top' | 'bottom';

export interface LookLayer {
  art: ArtId;
  at: LookAnchor;
  /** Width as a fraction of the page width (`frame` fills the page and ignores it). */
  w: number;
  flipX?: boolean;
  flipY?: boolean;
  /** Offset from the anchor as a fraction of the page width (negative bleeds off the edge). */
  dx?: number;
  dy?: number;
  opacity?: number;
  /** Gentle idle motion on the website and in the video. */
  motion?: 'sway' | 'drift' | 'glow' | 'none';
  /** Drawn above the text (rare: hanging garlands). */
  over?: boolean;
}

export type LookPhotoMask = PaintedMask | 'circle' | 'oval' | 'rect';

export interface LookPhoto {
  mask: LookPhotoMask;
  /** Photo width as a fraction of the page width, and height / width. */
  w: number;
  aspect: number;
  /** Fine keyline around the photo (geometric masks only). */
  ring?: string;
  /** Painted frame around the photo; `hole` is the opening in the art (fractions x0, y0, x1, y1). */
  frame?: { art: ArtId; hole: readonly [number, number, number, number] };
  /** Painted crown over the top edge: width relative to the photo, `dy` = bottom of the crown, fraction of photo height from the photo top. */
  crown?: { art: ArtId; w: number; dy: number };
  /** Two overlapping round photos (couple) instead of one. */
  twin?: boolean;
}

export interface PhotoLook {
  id: PhotoLookId;
  name: string;
  blurb: string;
  paper: ArtId;
  /** Flat colour close to the paper (loading state, video fallback, website bands). */
  paperColor: string;
  /** A second, slightly deeper paper tone for alternating website bands. */
  paperAlt: string;
  dark: boolean;
  ink: string;
  primary: string;
  accent: string;
  muted: string;
  fonts: { script: string; serif: string; body: string };
  layers: LookLayer[];
  photo: LookPhoto;
  /** Scenery for the video's later scenes (defaults to the paper). */
  sky?: ArtId;
  /** Art for the video's "Together" scene and closing. */
  accentArt?: ArtId;
  /** Brush strokes swept across the video's opening title. */
  strokes?: readonly [ArtId, ArtId];
  /** Event categories it suits best (ranks pickers; never hides). */
  suits: Array<'wedding' | 'pre-wedding' | 'baby' | 'birthday' | 'puja' | 'party' | 'anniversary'>;
}

const L = (art: ArtId, at: LookAnchor, w: number, o: Partial<LookLayer> = {}): LookLayer => ({ art, at, w, ...o });

export const PHOTO_LOOKS: readonly PhotoLook[] = [
  {
    id: 'gulab-bagh',
    name: 'Gulab Bagh',
    blurb: 'Your photo inside an arch of painted garden roses',
    paper: 'paper-cream',
    paperColor: '#F6EEDF',
    paperAlt: '#EFE3CF',
    dark: false,
    ink: '#4E3436',
    primary: '#9C4F5B',
    accent: '#B98A54',
    muted: '#7A6A64',
    fonts: { script: 'Pinyon Script', serif: 'EB Garamond', body: 'EB Garamond' },
    layers: [L('rose-arch', 'frame', 1, { motion: 'none' })],
    photo: { mask: 'soft-arch', w: 0.56, aspect: 1.28 },
    accentArt: 'rose-cluster',
    suits: ['wedding', 'pre-wedding', 'anniversary'],
  },
  {
    id: 'herbarium',
    name: 'Herbarium',
    blurb: 'Pressed flowers and ferns around an oval photo',
    paper: 'paper-linen',
    paperColor: '#F1EEE4',
    paperAlt: '#E6E3D6',
    dark: false,
    ink: '#3F4237',
    primary: '#5D6B4E',
    accent: '#8A7A5C',
    muted: '#6F7266',
    fonts: { script: 'Alex Brush', serif: 'Questrial', body: 'Questrial' },
    layers: [L('pressed-sprig', 'br', 0.42, { dx: -0.04, dy: -0.02, motion: 'sway', opacity: 0.9 }), L('pressed-sprig', 'tl', 0.3, { flipX: true, flipY: true, dx: -0.05, dy: -0.04, opacity: 0.75 })],
    photo: { mask: 'oval', w: 0.46, aspect: 1.35, frame: { art: 'pressed-wreath', hole: [0.157, 0.137, 0.844, 0.862] } },
    accentArt: 'pressed-wreath',
    suits: ['baby', 'anniversary', 'birthday', 'pre-wedding'],
  },
  {
    id: 'gulabi-syahi',
    name: 'Gulabi Syahi',
    blurb: 'Blush watercolour and fine ink flowers, very elegant',
    paper: 'paper-white',
    paperColor: '#FBF6F3',
    paperAlt: '#F6ECE8',
    dark: false,
    ink: '#4A2C47',
    primary: '#6E3B66',
    accent: '#C98A80',
    muted: '#7D6A78',
    fonts: { script: 'Great Vibes', serif: 'Cinzel', body: 'Cormorant Garamond' },
    layers: [L('blush-corner', 'tl', 0.62, { dx: -0.02, dy: -0.01, motion: 'sway' }), L('blush-corner', 'br', 0.62, { flipX: true, flipY: true, dx: -0.02, dy: -0.01, motion: 'sway' })],
    photo: { mask: 'circle', w: 0.5, aspect: 1, ring: '#C98A80' },
    accentArt: 'blush-corner',
    suits: ['wedding', 'pre-wedding', 'anniversary', 'birthday'],
  },
  {
    id: 'mahal-maroon',
    name: 'Mahal Maroon',
    blurb: 'Rich maroon, gold frame and painted peonies',
    paper: 'maroon-velvet',
    paperColor: '#4A0F1A',
    paperAlt: '#3A0B14',
    dark: true,
    ink: '#F6E7C9',
    primary: '#E4C383',
    accent: '#E4C383',
    muted: '#D9BFA0',
    fonts: { script: 'Imperial Script', serif: 'Forum', body: 'Cormorant Garamond' },
    layers: [L('peony-corner', 'tl', 0.6, { dx: -0.03, dy: -0.02, motion: 'sway' }), L('peony-corner', 'br', 0.6, { flipX: true, flipY: true, dx: -0.03, dy: -0.02, motion: 'sway' })],
    photo: { mask: 'soft-arch', w: 0.5, aspect: 1.3, ring: '#E4C383' },
    accentArt: 'peony-corner',
    suits: ['wedding', 'anniversary', 'party'],
  },
  {
    id: 'harit',
    name: 'Harit',
    blurb: 'Fresh watercolour leaves on soft mint',
    paper: 'paper-mint',
    paperColor: '#EEF6F0',
    paperAlt: '#E2EFE6',
    dark: false,
    ink: '#1F3D2B',
    primary: '#2F6B45',
    accent: '#7FA36B',
    muted: '#56705F',
    fonts: { script: 'Great Vibes', serif: 'Cinzel', body: 'Cormorant Garamond' },
    layers: [L('leaf-corner', 'tl', 0.58, { dx: -0.03, dy: -0.03, motion: 'sway' }), L('leaf-corner', 'br', 0.58, { flipX: true, flipY: true, dx: -0.03, dy: -0.03, motion: 'sway' })],
    photo: { mask: 'brush', w: 0.56, aspect: 1.25 },
    accentArt: 'leaf-corner',
    suits: ['wedding', 'pre-wedding', 'baby', 'puja'],
  },
  {
    id: 'kahani',
    name: 'Kahani',
    blurb: 'Storybook: two painted photo circles, autumn leaves and sky',
    paper: 'paper-cream',
    paperColor: '#F7F1E6',
    paperAlt: '#EEF3F8',
    dark: false,
    ink: '#3A3A3A',
    primary: '#4F5F9E',
    accent: '#D08A3B',
    muted: '#6B6B6B',
    fonts: { script: 'Ms Madi', serif: 'Montserrat', body: 'Montserrat' },
    layers: [L('peach-sprig', 'tr', 0.42, { dx: -0.02, dy: -0.02, motion: 'sway' }), L('peach-sprig', 'bl', 0.42, { flipX: true, flipY: true, dx: -0.02, dy: -0.02, motion: 'sway' })],
    photo: { mask: 'blob', w: 0.84, aspect: 0.66, twin: true, crown: { art: 'autumn-crown', w: 1.08, dy: 0.62 } },
    sky: 'sky-wash',
    accentArt: 'wash-circle',
    strokes: ['brush-blue', 'brush-yellow'],
    suits: ['wedding', 'pre-wedding', 'anniversary'],
  },
  {
    id: 'genda',
    name: 'Genda Phool',
    blurb: 'Marigold torans and garlands, festive and bright',
    paper: 'paper-saffron',
    paperColor: '#FCE9B8',
    paperAlt: '#F9DDA0',
    dark: false,
    ink: '#4A1A0C',
    primary: '#A8321A',
    accent: '#C77A12',
    muted: '#7A4A2A',
    fonts: { script: 'Pinyon Script', serif: 'EB Garamond', body: 'EB Garamond' },
    layers: [L('marigold-side', 'frame', 1, { opacity: 0.95 }), L('marigold-toran', 'top', 1, { dy: -0.01, motion: 'sway', over: true })],
    photo: { mask: 'soft-arch', w: 0.5, aspect: 1.25, ring: '#C77A12' },
    accentArt: 'marigold-toran',
    suits: ['wedding', 'puja', 'baby', 'party'],
  },
  {
    id: 'jharokha',
    name: 'Jharokha',
    blurb: 'Your photo framed in a carved palace window',
    paper: 'teal-wall',
    paperColor: '#0F3B3A',
    paperAlt: '#0B2F2E',
    dark: true,
    ink: '#F6EBD3',
    primary: '#E5C77E',
    accent: '#E5C77E',
    muted: '#CFE0D8',
    fonts: { script: 'Great Vibes', serif: 'Cinzel', body: 'Cormorant Garamond' },
    layers: [],
    photo: { mask: 'rect', w: 0.27, aspect: 1.55, frame: { art: 'jharokha-arch', hole: [0.275, 0.46, 0.725, 0.862] } },
    accentArt: 'jharokha-arch',
    suits: ['wedding', 'anniversary', 'party'],
  },
  {
    id: 'kamal',
    name: 'Kamal',
    blurb: 'Pink lotus pond in soft Pichwai watercolour',
    paper: 'paper-cream',
    paperColor: '#F8F0E4',
    paperAlt: '#F3E4D8',
    dark: false,
    ink: '#4E2236',
    primary: '#A63C66',
    accent: '#4F8A62',
    muted: '#7A5D69',
    fonts: { script: 'Monsieur La Doulaise', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' },
    layers: [L('lotus-pond', 'bottom', 1.02, { dy: 0.01, motion: 'sway' }), L('lotus-bud', 'tr', 0.34, { flipX: true, flipY: true, dx: -0.02, dy: -0.02, opacity: 0.9 })],
    photo: { mask: 'circle', w: 0.52, aspect: 1, ring: '#D9A6B8' },
    accentArt: 'lotus-bud',
    suits: ['puja', 'baby', 'wedding', 'anniversary'],
  },
  {
    id: 'roshni',
    name: 'Roshni',
    blurb: 'Fairy lights on a midnight sky, for sangeet and parties',
    paper: 'night-navy',
    paperColor: '#0B1430',
    paperAlt: '#101B3D',
    dark: true,
    ink: '#FFF3DA',
    primary: '#F2C66D',
    accent: '#F2C66D',
    muted: '#C8CCE0',
    fonts: { script: 'Monsieur La Doulaise', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' },
    layers: [L('fairy-lights', 'top', 1.04, { dx: -0.02, motion: 'glow', over: true })],
    photo: { mask: 'circle', w: 0.5, aspect: 1, ring: '#F2C66D' },
    accentArt: 'fairy-lights',
    suits: ['party', 'birthday', 'wedding', 'anniversary'],
  },
];

const BY_ID = new Map(PHOTO_LOOKS.map((l) => [l.id, l]));
export const getPhotoLook = (id: string | null | undefined): PhotoLook | undefined => (id ? BY_ID.get(id as PhotoLookId) : undefined);

/** A layer's box on a page of `pageW` × `pageH` (any unit), from its anchor. */
export function layerBox(l: LookLayer, pageW: number, pageH: number, aspect: number): { x: number; y: number; w: number; h: number } {
  if (l.at === 'frame') return { x: 0, y: 0, w: pageW, h: pageH };
  const w = l.w * pageW;
  const h = w * aspect;
  const dx = (l.dx ?? 0) * pageW;
  const dy = (l.dy ?? 0) * pageW;
  switch (l.at) {
    case 'tl':
      return { x: dx, y: dy, w, h };
    case 'tr':
      return { x: pageW - w - dx, y: dy, w, h };
    case 'bl':
      return { x: dx, y: pageH - h - dy, w, h };
    case 'br':
      return { x: pageW - w - dx, y: pageH - h - dy, w, h };
    case 'top':
      return { x: (pageW - w) / 2 + dx, y: dy, w, h };
    case 'bottom':
      return { x: (pageW - w) / 2 + dx, y: pageH - h + dy, w, h };
  }
}

/**
 * Geometry of the photo block (photo or twin photos + frame / crown) for a photo `pw` wide,
 * relative to the block's top-left. The block height is what a layout must reserve.
 */
export function photoBlock(p: LookPhoto, pw: number, frameAspect: number, crownAspect: number) {
  const ph = pw * p.aspect;
  let top = 0;
  let left = 0;
  let width = pw;
  let height = ph;
  let frame: { x: number; y: number; w: number; h: number } | null = null;
  if (p.frame) {
    const [x0, y0, x1, y1] = p.frame.hole;
    const fw = pw / (x1 - x0);
    const fh = fw * frameAspect;
    frame = { x: -x0 * fw, y: -y0 * fh, w: fw, h: fh };
    // The photo sits slightly under the frame's inner edge.
    void y1;
    top = Math.min(top, frame.y);
    left = Math.min(left, frame.x);
    width = Math.max(width, frame.x + fw) - left;
    height = Math.max(height, frame.y + fh) - top;
  }
  let crown: { x: number; y: number; w: number; h: number } | null = null;
  if (p.crown) {
    const cw = pw * p.crown.w;
    const ch = cw * crownAspect;
    crown = { x: (pw - cw) / 2, y: p.crown.dy * ph - ch, w: cw, h: ch };
    if (crown.y < top) {
      height += top - crown.y;
      top = crown.y;
    }
  }
  const shift = (b: { x: number; y: number; w: number; h: number } | null) => (b ? { ...b, x: b.x - left, y: b.y - top } : null);
  return { w: width, h: height, photo: { x: -left, y: -top, w: pw, h: ph }, frame: shift(frame), crown: shift(crown) };
}
