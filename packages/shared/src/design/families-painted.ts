import { artAspect, ART_PATH, type ArtId } from '../art/library.js';
import { PHOTO_LOOKS, layerBox, type PhotoLook, type PhotoLookId } from '../art/looks.js';
import type { EventTypeId } from '../constants/event-types.js';
import { nextId, type Band, type DateStyle, type RecipeCtx, type TypeSetKey, type Zone } from './builder.js';
import { mix } from './color.js';
import { coupleNames, soloOrNames, venue } from './families-atelier.js';
import { ALL_WEDDINGS, type Chrome, type DesignCategory, type DesignFamily } from './families.js';
import { DESIGN_H, DESIGN_W, type DesignElement, type ImageElement } from './schema.js';

/**
 * "Painted photo" collection (Nov 2026): the couple's (or family's) own photo inside painted
 * watercolour art — rose arches, pressed-flower wreaths, blush ink florals, maroon peonies,
 * marigold torans, a carved jharokha window, a lotus pond, fairy lights. Built from the shared
 * photo looks (art/looks.ts), so the website and the video of the same invitation match.
 *
 * Every painted piece is an ordinary locked image layer, so hosts can still move, hide or
 * replace it in the editor. Saved designs keep `/art/<id>.webp`; renderers on another origin
 * resolve it with `resolveArtUrl`.
 */

const W = DESIGN_W;
const H = DESIGN_H;


/** Stored form of an art URL (always relative, origin-free). */
const stored = (id: ArtId) => `${ART_PATH}${id}.webp`;

/** A locked painted overlay. Flips use rotation (image layers only flip on X). */
export function artImage(id: ArtId, x: number, y: number, w: number, h: number, o: { flipX?: boolean; flipY?: boolean; opacity?: number; anim?: ImageElement['anim'] } = {}): DesignElement {
  const both = o.flipX && o.flipY;
  return {
    id: nextId('o'),
    type: 'image',
    x,
    y,
    w,
    h,
    rot: both || o.flipY ? 180 : 0,
    opacity: o.opacity ?? 1,
    locked: true,
    src: stored(id),
    mask: 'rect',
    borderW: 0,
    ...(o.anim ? { anim: o.anim } : { anim: 'fade' }),
    ...((o.flipX && !both) || (o.flipY && !both) ? { flipX: true } : {}),
  };
}

function lookLayers(look: PhotoLook, which: 'under' | 'over', inner = false): DesignElement[] {
  return look.layers
    .filter((l) => (which === 'over' ? l.over : !l.over))
    // Inner pages keep the corners and edges; a full-page frame only where it hugs the edges.
    .filter((l) => !inner || l.at !== 'frame' || l.art === 'rose-arch' || l.art === 'marigold-side')
    .map((l) => {
      const b = layerBox(l, W, H, artAspect(l.art));
      return artImage(l.art, b.x, b.y, b.w, b.h, { flipX: l.flipX, flipY: l.flipY, opacity: l.opacity });
    });
}

const paperBg = (look: PhotoLook): Chrome['bg'] => ({ color: look.paperColor, gradient: 'none', pattern: 'none', patternOpacity: 0, image: stored(look.paper), imageOpacity: 1 });

/** The photo band of a look: mask, painted frame / crown, initials until a photo is added. */
function photoBand(look: PhotoLook, ctx: RecipeCtx, font: string): Band {
  const p = look.photo;
  const w = p.w * W;
  const twin = Boolean(p.twin) && ctx.data.photos.length !== 1;
  return {
    t: 'photo',
    w,
    h: w * p.aspect,
    mask: p.mask,
    gap: 30,
    borderW: p.ring ? 6 : 0,
    ...(p.ring ? { border: p.ring } : {}),
    empty: { bg: mix(look.primary, look.dark ? look.paperColor : '#FFFFFF', look.dark ? 0.45 : 0.78), ink: look.dark ? look.paperColor : look.primary, font },
    ...(p.frame ? { frame: { src: stored(p.frame.art), hole: p.frame.hole, aspect: artAspect(p.frame.art) } } : {}),
    ...(p.crown ? { crown: { src: stored(p.crown.art), w: p.crown.w, dy: p.crown.dy, aspect: artAspect(p.crown.art) } } : {}),
    ...(twin ? { twin: true } : {}),
  };
}

interface CardSpec {
  type: TypeSetKey;
  date: DateStyle;
  zone: Zone;
  category: DesignCategory;
  eventTypes: EventTypeId[];
  tags: string[];
  styles: string[];
  /** Initials font in an empty photo frame. */
  initials: string;
  premium?: boolean;
}

const BABY: EventTypeId[] = ['baby-shower', 'naming-ceremony', 'annaprashan', 'mundan'];
const PUJA: EventTypeId[] = ['griha-pravesh', 'puja', 'jagran', 'bhandara', 'upanayana'];
const PARTY: EventTypeId[] = ['birthday', 'anniversary', 'reception', 'retirement', 'other'];

const SPECS: Record<PhotoLookId, CardSpec> = {
  'gulab-bagh': { type: 'script', date: 'rules', zone: { top: 240, bottom: 230, left: 150, right: 150 }, category: 'wedding', eventTypes: [...ALL_WEDDINGS], tags: ['photo', 'roses', 'arch', 'watercolour', 'couple photo', 'romantic'], styles: ['photo', 'floral', 'watercolour', 'arch'], initials: 'Pinyon Script' },
  herbarium: { type: 'garden', date: 'line', zone: { top: 170, bottom: 220, left: 150, right: 150 }, category: 'kids', eventTypes: [...BABY, 'birthday', 'anniversary', 'engagement'], tags: ['photo', 'pressed flowers', 'baby shower', 'godh bharai', 'botanical', 'oval'], styles: ['photo', 'floral', 'minimal', 'watercolour'], initials: 'Alex Brush', premium: false },
  'gulabi-syahi': { type: 'royal', date: 'rules', zone: { top: 260, bottom: 260, left: 150, right: 150 }, category: 'wedding', eventTypes: [...ALL_WEDDINGS, 'birthday'], tags: ['photo', 'blush', 'line art', 'pink', 'elegant', 'circle'], styles: ['photo', 'floral', 'line-art', 'watercolour'], initials: 'Great Vibes', premium: false },
  'mahal-maroon': { type: 'regal', date: 'bars', zone: { top: 260, bottom: 250, left: 150, right: 150 }, category: 'wedding', eventTypes: [...ALL_WEDDINGS, 'reception'], tags: ['photo', 'maroon', 'gold', 'peony', 'royal', 'burgundy'], styles: ['photo', 'royal', 'floral', 'arch'], initials: 'Imperial Script' },
  harit: { type: 'royal', date: 'rules', zone: { top: 250, bottom: 250, left: 150, right: 150 }, category: 'wedding', eventTypes: [...ALL_WEDDINGS, ...PUJA], tags: ['photo', 'greenery', 'leaves', 'mint', 'fresh', 'brush'], styles: ['photo', 'floral', 'watercolour', 'minimal'], initials: 'Great Vibes' },
  kahani: { type: 'brush', date: 'line', zone: { top: 170, bottom: 230, left: 140, right: 140 }, category: 'wedding', eventTypes: [...ALL_WEDDINGS], tags: ['photo', 'save the date', 'storybook', 'autumn', 'two photos', 'pre-wedding'], styles: ['photo', 'watercolour', 'modern', 'floral'], initials: 'Ms Madi' },
  genda: { type: 'script', date: 'bars', zone: { top: 380, bottom: 200, left: 200, right: 200 }, category: 'wedding', eventTypes: [...ALL_WEDDINGS, ...PUJA, ...BABY], tags: ['photo', 'marigold', 'genda', 'toran', 'haldi', 'festive', 'griha pravesh'], styles: ['photo', 'traditional', 'floral', 'arch'], initials: 'Pinyon Script' },
  jharokha: { type: 'royal', date: 'bars', zone: { top: 150, bottom: 170, left: 130, right: 130 }, category: 'wedding', eventTypes: [...ALL_WEDDINGS, 'reception'], tags: ['photo', 'jharokha', 'palace', 'rajasthan', 'teal', 'royal window'], styles: ['photo', 'royal', 'traditional', 'arch'], initials: 'Great Vibes' },
  kamal: { type: 'mahal', date: 'rules', zone: { top: 190, bottom: 420, left: 150, right: 150 }, category: 'religious', eventTypes: [...PUJA, ...BABY, ...ALL_WEDDINGS], tags: ['photo', 'lotus', 'pichwai', 'pink', 'puja', 'naamkaran'], styles: ['photo', 'traditional', 'floral', 'watercolour'], initials: 'Monsieur La Doulaise' },
  roshni: { type: 'gala', date: 'rules', zone: { top: 380, bottom: 200, left: 150, right: 150 }, category: 'kids', eventTypes: [...PARTY, 'engagement', 'wedding'], tags: ['photo', 'fairy lights', 'sangeet', 'party', 'night', 'navy'], styles: ['photo', 'party', 'modern', 'night'], initials: 'Monsieur La Doulaise' },
};

/** Card palette from the look (`look:<id>` palettes, see templates/catalog.ts). */
export const lookPaletteKey = (id: PhotoLookId) => `look:${id}` as const;

export const PAINTED_FAMILIES: DesignFamily[] = PHOTO_LOOKS.map((look): DesignFamily => {
  const s = SPECS[look.id];
  return {
    id: look.id,
    name: look.name,
    look: look.id,
    category: s.category,
    eventTypes: s.eventTypes,
    tags: [...s.tags, 'painted', 'new'],
    styles: s.styles,
    premium: s.premium ?? true,
    palettes: [lookPaletteKey(look.id)],
    legacy: { layout: 'photo-frame', motif: 'none', pattern: 'none' },
    type: s.type,
    date: s.date,
    divider: 'simple',
    zone: s.zone,
    innerZone: { ...s.zone, top: Math.max(s.zone.top, 300), bottom: Math.max(s.zone.bottom, 300) },
    sampleLanguage: 'en',
    chrome: () => ({ bg: paperBg(look), under: lookLayers(look, 'under'), over: lookLayers(look, 'over') }),
    inner: () => ({ bg: paperBg(look), under: lookLayers(look, 'under', true), over: lookLayers(look, 'over', true) }),
    bands: (ctx) => [
      { t: 'text', role: 'eyebrow', bind: 'headline', gap: 0 },
      photoBand(look, ctx, s.initials),
      ...(ctx.people === 2 ? coupleNames() : soloOrNames(ctx)),
      { t: 'date', style: s.date, gap: 28 },
      ...venue,
    ],
  };
});

