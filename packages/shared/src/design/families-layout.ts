import type { EventTypeId } from '../constants/event-types.js';
import { nextId, shapeEl, type Band, type RecipeCtx } from './builder.js';
import { DESIGN_H, DESIGN_W } from './constants.js';
import { coupleNames, soloOrNames, venue } from './families-atelier.js';
import type { DesignFamily } from './families.js';
import type { DesignElement } from './schema.js';

/**
 * Cards for the layout designs (Nov 2026): the same idea as their website and video —
 * a chat screen, a story with progress bars, a streaming-show title card and a scrapbook
 * page with a magazine masthead. Ordinary layers, so everything stays editable; the family
 * id matches the website/video design id, so picking the card picks the matching website.
 */

const W = DESIGN_W;
const H = DESIGN_H;

const ALL_OCCASIONS: EventTypeId[] = [
  'wedding', 'engagement', 'reception', 'nikah', 'christian-wedding', 'anand-karaj', 'birthday', 'anniversary',
  'baby-shower', 'naming-ceremony', 'griha-pravesh', 'puja', 'retirement', 'other',
];

/** A rotated shape (the shape helper is upright). */
const tilted = (el: DesignElement, rot: number): DesignElement => ({ ...el, rot });

/** A photo layer bound to event photo `i`; an initials disc until the host adds one. */
function photoEl(i: number, x: number, y: number, w: number, h: number, o: { mask?: 'circle' | 'rounded' | 'rect'; bg: string; ink: string; font: string; rot?: number; border?: string; borderW?: number; fade?: 'bottom' | 'soft' }): DesignElement {
  return {
    id: nextId('p'),
    type: 'image',
    x,
    y,
    w,
    h,
    rot: o.rot ?? 0,
    opacity: 1,
    src: null,
    bind: `photo.${i}`,
    mask: o.mask ?? 'rect',
    borderW: o.borderW ?? 0,
    ...(o.border ? { border: o.border } : {}),
    empty: { bg: o.bg, ink: o.ink, font: o.font },
    ...(o.fade ? { fade: o.fade } : {}),
    auto: true,
  };
}

/** A line of text bound to the event (names, headline…) or fixed text, in a fixed box. */
function label(x: number, y: number, w: number, h: number, o: { bind?: string; text?: string; font: string; size: number; color: string; weight?: number; align?: 'left' | 'center' | 'right'; upper?: boolean; ls?: number }): DesignElement {
  return {
    id: nextId('t'),
    type: 'text',
    x,
    y,
    w,
    h,
    rot: 0,
    opacity: 1,
    text: o.text ?? '',
    ...(o.bind ? { bind: o.bind } : {}),
    font: o.font,
    size: o.size,
    weight: o.weight ?? 400,
    italic: false,
    color: o.color,
    align: o.align ?? 'left',
    lh: 1.1,
    ls: o.ls ?? 0,
    upper: o.upper ?? false,
    effect: 'none',
    fit: true,
    auto: true,
  };
}

const people = (ctx: RecipeCtx): Band[] => (ctx.people === 2 ? coupleNames() : soloOrNames(ctx));

export const LAYOUT_FAMILIES: DesignFamily[] = [
  // ---------------- Chat Story: a chat screen, the invitation in one big message ----------------
  {
    id: 'chat-story',
    name: 'Chat Story',
    category: 'wedding',
    eventTypes: ALL_OCCASIONS,
    tags: ['chat', 'whatsapp', 'message', 'modern', 'fun', 'viral', 'texting'],
    styles: ['modern', 'photo', 'minimal'],
    premium: false,
    palettes: ['chat'],
    legacy: { layout: 'minimal-modern', motif: 'none', pattern: 'none' },
    type: 'sage',
    date: 'line',
    zone: { top: 400, bottom: 470, left: 150, right: 150 },
    innerZone: { top: 400, bottom: 300, left: 150, right: 150 },
    sampleLanguage: 'en',
    chrome: ({ p }) => ({
      bg: { color: p.background, gradient: 'none', pattern: 'none', patternOpacity: 0, image: null },
      under: [
        // Header bar: avatar, the occasion and an online dot.
        shapeEl('rect', 0, 0, W, 250, { fill: p.primary }),
        photoEl(0, 60, 90, 120, 120, { mask: 'circle', bg: p.accent, ink: '#FFFFFF', font: 'Inter' }),
        label(210, 100, W - 300, 64, { bind: 'headline', font: 'Inter', size: 44, color: '#FFFFFF', weight: 600 }),
        shapeEl('ellipse', 212, 178, 18, 18, { fill: p.accent }),
        label(242, 168, 400, 40, { text: 'online', font: 'Inter', size: 28, color: '#FFFFFF' }),
        // The message bubble the invitation sits in.
        shapeEl('rect', 80, 320, W - 160, H - 760, { fill: '#FFFFFF', radius: 48 }),
        // The guest's reply.
        shapeEl('rect', W - 560, H - 380, 480, 120, { fill: '#D9FDD3', radius: 44 }),
        label(W - 530, H - 350, 420, 60, { text: 'RSVP 🎉  ✓✓', font: 'Inter', size: 42, color: '#1F2C34', align: 'right', weight: 600 }),
      ],
    }),
    inner: ({ p }) => ({
      bg: { color: p.background, gradient: 'none', pattern: 'none', patternOpacity: 0, image: null },
      under: [shapeEl('rect', 0, 0, W, 250, { fill: p.primary }), shapeEl('rect', 80, 320, W - 160, H - 560, { fill: '#FFFFFF', radius: 48 })],
    }),
    bands: (ctx) => [
      { t: 'text', role: 'host', bind: 'hostLine', gap: 0 },
      { t: 'photo', w: 640, h: 560, mask: 'rounded', gap: 30, empty: { bg: ctx.p.backgroundAlt, ink: ctx.p.primary, font: 'Allura' } },
      ...people(ctx),
      { t: 'date', style: 'line', gap: 26 },
      ...venue,
    ],
  },

  // ---------------- Story Mode: a phone story with progress bars and a reply bar ----------------
  {
    id: 'insta-stories',
    name: 'Story Mode',
    category: 'wedding',
    eventTypes: ALL_OCCASIONS,
    tags: ['story', 'instagram', 'stories', 'gradient', 'modern', 'viral', 'save the date'],
    styles: ['modern', 'photo', 'party'],
    premium: true,
    palettes: ['storyPink'],
    legacy: { layout: 'minimal-modern', motif: 'none', pattern: 'none' },
    type: 'sage',
    date: 'strip',
    zone: { top: 240, bottom: 250, left: 120, right: 120 },
    sampleLanguage: 'en',
    chrome: ({ p }) => {
      const barW = (W - 80 - 4 * 12) / 5;
      return {
        bg: { color: p.background, color2: p.backgroundAlt, gradient: 'linear', angle: 160, pattern: 'none', patternOpacity: 0, image: null },
        under: [
          ...Array.from({ length: 5 }, (_, i) => shapeEl('rect', 40 + i * (barW + 12), 36, barW, 8, { fill: '#FFFFFF', radius: 4, opacity: i === 0 ? 1 : 0.4 })),
          shapeEl('ellipse', 40, 72, 104, 104, { stroke: '#FFFFFF', strokeW: 5 }),
          photoEl(0, 50, 82, 84, 84, { mask: 'circle', bg: p.accent, ink: p.background, font: 'Inter' }),
          label(166, 100, 620, 52, { bind: 'hashtag', font: 'Inter', size: 34, color: '#FFFFFF', weight: 600 }),
          // Reply bar
          shapeEl('rect', 40, H - 170, W - 240, 104, { stroke: '#FFFFFF', strokeW: 3, radius: 52 }),
          label(90, H - 140, W - 340, 50, { text: 'Send RSVP…', font: 'Inter', size: 32, color: '#FFFFFF' }),
          label(W - 170, H - 150, 130, 70, { text: '♡  ➤', font: 'Inter', size: 48, color: '#FFFFFF', align: 'right' }),
        ],
      };
    },
    bands: (ctx) => [
      { t: 'text', role: 'eyebrow', bind: 'headline', gap: 0 },
      { t: 'photo', w: 780, h: 900, mask: 'rounded', gap: 34, empty: { bg: ctx.p.backgroundAlt, ink: '#FFFFFF', font: 'Allura' } },
      ...people(ctx),
      { t: 'date', style: 'strip', gap: 24 },
      ...venue,
    ],
  },

  // ---------------- Premiere Night: a streaming-show title card ----------------
  {
    id: 'premiere',
    name: 'Premiere Night',
    category: 'wedding',
    eventTypes: ALL_OCCASIONS,
    tags: ['movie', 'premiere', 'netflix', 'cinema', 'film', 'black', 'red', 'viral', 'bold'],
    styles: ['modern', 'photo', 'night'],
    premium: true,
    palettes: ['premiere'],
    legacy: { layout: 'minimal-modern', motif: 'none', pattern: 'none' },
    type: 'cinema',
    date: 'strip',
    zone: { top: 1060, bottom: 260, left: 90, right: 90, align: 'left' },
    innerZone: { top: 300, bottom: 300, left: 110, right: 110 },
    sampleLanguage: 'en',
    chrome: ({ p }) => ({
      bg: { color: p.background, gradient: 'none', pattern: 'none', patternOpacity: 0, image: null },
      under: [
        // Backdrop photo melting into black (stacked fades; shapes have no gradients).
        // Backdrop photo melting into black at the bottom.
        photoEl(0, 0, 0, W, 1120, { bg: '#2A0E12', ink: p.accent, font: 'Bebas Neue', fade: 'bottom' }),
        // Our own "original" tag.
        shapeEl('rect', 90, 990, 12, 52, { fill: p.primary }),
        label(118, 990, 800, 56, { text: 'A FAMILY ORIGINAL', font: 'Bebas Neue', size: 50, color: p.primary, ls: 0.3 }),
        // Play / RSVP buttons.
        shapeEl('rect', 90, H - 200, 330, 110, { fill: '#FFFFFF', radius: 14 }),
        label(90, H - 175, 330, 60, { text: '▶  RSVP', font: 'Inter', size: 46, color: '#000000', weight: 700, align: 'center' }),
      ],
    }),
    inner: ({ p }) => ({ bg: { color: p.background, gradient: 'none', pattern: 'none', patternOpacity: 0, image: null }, under: [] }),
    bands: (ctx) => [...people(ctx), { t: 'date', style: 'strip', gap: 28 }, ...venue],
  },

  // ---------------- Scrapbook Diary: masthead, a taped polaroid, handwriting ----------------
  {
    id: 'scrapbook',
    name: 'Scrapbook Diary',
    category: 'wedding',
    eventTypes: ALL_OCCASIONS,
    tags: ['scrapbook', 'polaroid', 'magazine', 'kraft', 'handwritten', 'tape', 'diary', 'viral'],
    styles: ['modern', 'photo', 'vintage'],
    premium: true,
    palettes: ['kraft'],
    legacy: { layout: 'minimal-modern', motif: 'none', pattern: 'none' },
    type: 'diary',
    date: 'line',
    zone: { top: 260, bottom: 200, left: 130, right: 130 },
    sampleLanguage: 'en',
    chrome: ({ p }) => ({
      bg: { color: p.background, gradient: 'none', pattern: 'dots', patternColor: p.muted, patternOpacity: 0.1, image: null },
      under: [
        // Masthead and issue line, like a magazine cover.
        label(60, 60, W - 120, 150, { bind: 'headline', font: 'Abril Fatface', size: 120, color: p.primary, align: 'center', upper: true }),
        shapeEl('line', 80, 222, W - 160, 2, { stroke: p.text, strokeW: 2, opacity: 0.5 }),
        // Torn note behind the names.
        tilted(shapeEl('rect', 120, 1270, W - 240, 470, { fill: p.surface }), -1.5),
      ],
      over: [
        // Washi tape on the polaroid's corners.
        tilted(shapeEl('rect', 210, 300, 230, 64, { fill: '#F3C5C5', opacity: 0.85 }), -28),
        tilted(shapeEl('rect', W - 440, 300, 230, 64, { fill: '#C9E4DE', opacity: 0.85 }), 26),
      ],
    }),
    bands: (ctx) => [
      { t: 'photo', w: 720, h: 760, mask: 'rect', rot: -3, borderW: 30, border: '#FFFDF8', gap: 40, empty: { bg: ctx.p.backgroundAlt, ink: ctx.p.primary, font: 'Caveat' } },
      ...people(ctx),
      { t: 'date', style: 'line', gap: 22 },
      ...venue,
    ],
  },
];
