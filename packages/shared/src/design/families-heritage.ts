import { artEl, fullPage, shapeEl, solidBg, type Band, type DateStyle, type RecipeCtx } from './builder.js';
import { isDarkColor, mix } from './color.js';
import { ALL_WEDDINGS, couple, DESIGN_FAMILIES, ganesha, goldOn, motif, radial, SACRED, trueGold, WEDDINGS, type Chrome, type DesignFamily } from './families.js';
import { DESIGN_H, DESIGN_W } from './constants.js';
import type { DesignElement } from './schema.js';
import { ATELIER_FAMILIES } from './families-atelier.js';
import { CELEBRATION_FAMILIES } from './families-celebration.js';
import { PAINTED_FAMILIES } from './families-painted.js';
import { OCCASION_FAMILIES } from './families-occasions.js';

/**
 * "Heritage & Florals" collection (Nov 2026): multi-page, Canva-style invitations —
 * scalloped Rajasthani arches, lantern-lit mahals, watercolour peonies and hydrangeas,
 * line-art botanicals, Nikah arches, save-the-date bows and caricature couples.
 * Every family gets the blessing → cover → ceremonies → family & RSVP → photo pages.
 */

const W = DESIGN_W;
const H = DESIGN_H;

// ------------------------------------------------------------ helpers

/** Watercolour bouquet tinted from the palette. */
const blooms = (ctx: RecipeCtx, petal?: string): string[] => {
  const p = petal ?? mix(ctx.p.primary, '#FFFFFF', isDarkColor(ctx.p.primary) ? 0.42 : 0.2);
  return [p, mix(p, '#2A1420', 0.35), '#7A9A6B', ctx.p.accent];
};
const WHITE_BLOOMS = ['#FFF9F0', '#E5D5BC', '#5E7D4A', '#E9B949'];

/** One art layer in a corner; corner = tl | tr | bl | br (the art is drawn for the top-left). */
function corner(asset: string, where: 'tl' | 'tr' | 'bl' | 'br', size: number, colors: string[], opts?: Record<string, string | number | boolean>, inset = 0, opacity = 1): DesignElement {
  const x = where === 'tl' || where === 'bl' ? inset : W - size - inset;
  const y = where === 'tl' || where === 'tr' ? inset : H - size - inset;
  return artEl(asset, x, y, size, size, colors, { opts, locked: true, flipX: where === 'tr' || where === 'br', flipY: where === 'bl' || where === 'br', opacity });
}

/** Bands that put a monogram (A & R) inside a gold hoop. */
function hoopMonogram(ctx: RecipeCtx, size = 380, asset = 'gold-ring', opts?: Record<string, string | number | boolean>): Band[] {
  const text = 150;
  const th = text * 1.05 * 1.08;
  const h = asset === 'arch-panel' ? size * 1.2 : size;
  return [
    { t: 'art', asset, w: size, h, colors: [trueGold(ctx), trueGold(ctx), trueGold(ctx)], opts, gap: 0, anim: 'zoom' },
    { t: 'text', role: 'names', bind: 'monogram', size: text, gap: -(h / 2 + th / 2) },
    { t: 'gap', h: h / 2 - th / 2 - 26 },
  ];
}

const coupleNames = (big = 1): Band[] => [
  { t: 'text', role: 'names', bind: 'name1', gap: 26, size: 130 * big },
  { t: 'text', role: 'connector', bind: 'connector', gap: 4 },
  { t: 'text', role: 'names', bind: 'name2', gap: 4, size: 130 * big },
];

const whenWhere = (date: DateStyle, divider = 'ornate'): Band[] => [
  { t: 'divider', style: divider, gap: 30 },
  { t: 'date', style: date, gap: 30 },
  { t: 'text', role: 'venue', bind: 'fnM.venue', gap: 24 },
  { t: 'text', role: 'small', bind: 'fnM.address', gap: 6 },
];

const lanterns = (ctx: RecipeCtx, xs: number[], lens: number[], w = 92): DesignElement[] =>
  xs.map((x, i) => artEl('lantern', x - w / 2, 0, w, lens[i % lens.length]!, [goldOn(ctx), '#FFE29A'], { locked: true }));

const plain = (ctx: RecipeCtx, under: DesignElement[]): Chrome => ({ bg: radial(ctx), under });

// ------------------------------------------------------------ families

export const HERITAGE_FAMILIES: DesignFamily[] = [
  // 1. Maroon damask with a cream scalloped arch (ref: Prerna & Sumit)
  {
    id: 'darbar-arch', name: 'Darbar Arch', category: 'wedding', eventTypes: [...WEDDINGS, ...SACRED], communities: ['hindu-north', 'marwari', 'gujarati', 'punjabi'],
    tags: ['scalloped arch', 'jharokha', 'filigree', 'om', 'traditional', 'royal'], styles: ['traditional', 'royal', 'arch'], premium: true,
    palettes: ['kumkum', 'wine', 'royalBlue', 'emerald'], legacy: { layout: 'jharokha', motif: 'om', pattern: 'paisley' },
    type: 'mahal', date: 'bars', divider: 'ornate', zone: { top: 470, bottom: 190, left: 190, right: 190 },
    textBg: (ctx) => ctx.p.surface,
    chrome: (ctx) => ({
      bg: radial(ctx, 'paisley', 0.16),
      under: [
        artEl('arch-panel', 110, 120, W - 220, H - 200, [ctx.p.surface, goldOn({ ...ctx, p: { ...ctx.p, background: ctx.p.surface } }), ctx.p.primary], { locked: true, opts: { shape: 'scallop' } }),
        corner('filigree', 'tl', 300, [ctx.p.primary], undefined, 6),
        corner('filigree', 'tr', 300, [ctx.p.primary], undefined, 6),
        corner('filigree', 'bl', 260, [ctx.p.primary], undefined, 6),
        corner('filigree', 'br', 260, [ctx.p.primary], undefined, 6),
      ],
    }),
    innerZone: { top: 440, bottom: 190, left: 190, right: 190 },
    hero: (ctx) => [motif({ ...ctx, p: { ...ctx.p, background: ctx.p.surface } }, 'om', 110)],
  },
  // 2. Cream frame, maroon scalloped arch, hanging lanterns, white peonies (ref: lantern card)
  {
    id: 'lantern-mahal', name: 'Lantern Mahal', category: 'wedding', eventTypes: ALL_WEDDINGS, communities: ['hindu-north', 'muslim', 'punjabi', 'marwari'],
    tags: ['lanterns', 'arch', 'peonies', 'mimosa', 'maroon', 'night'], styles: ['traditional', 'floral', 'arch'], premium: true,
    palettes: ['maroon', 'wine', 'navy', 'forest'], legacy: { layout: 'jharokha', motif: 'none', pattern: 'jaali' },
    type: 'mahal', date: 'bars', divider: 'ornate', zone: { top: 400, bottom: 330, left: 210, right: 210 },
    chrome: (ctx) => ({
      bg: solidBg(ctx.p.surface, mix(ctx.p.surface, ctx.p.accent, 0.25), 'radial', 'mandala', goldOn({ ...ctx, p: { ...ctx.p, background: ctx.p.surface } }), 0.1),
      under: [
        artEl('arch-panel', 130, 150, W - 260, H - 240, [ctx.p.background, ctx.p.primary, ctx.p.accent], { locked: true, opts: { shape: 'scallop' } }),
        ...lanterns(ctx, [150, 260, W - 260, W - 150], [520, 380]),
        corner('bloom-corner', 'bl', 470, WHITE_BLOOMS, { kind: 'peony' }, -40),
        corner('bloom-corner', 'br', 470, WHITE_BLOOMS, { kind: 'peony' }, -40),
        corner('bloom-corner', 'tl', 300, WHITE_BLOOMS, { kind: 'daisy' }, -50),
        corner('bloom-corner', 'tr', 300, WHITE_BLOOMS, { kind: 'daisy' }, -50),
      ],
    }),
    hero: () => [],
  },
  // 3. Lavender watercolour with a gold hoop monogram (ref: Aaron & Olivia)
  {
    id: 'lavender-hoop', name: 'Lavender Hoop', category: 'wedding', eventTypes: ALL_WEDDINGS, communities: ['modern', 'christian'],
    tags: ['lavender', 'watercolour', 'hydrangea', 'gold hoop', 'monogram', 'pastel'], styles: ['floral', 'watercolour', 'pastel'],
    palettes: ['lavender', 'blush', 'babyBlue', 'sage'], legacy: { layout: 'botanical', motif: 'none', pattern: 'none' },
    type: 'garden', date: 'bars', divider: 'leaf', zone: { top: 200, bottom: 220, left: 170, right: 170 },
    chrome: (ctx) =>
      plain(ctx, [
        corner('bloom-corner', 'tl', 420, blooms(ctx), { kind: 'hydrangea' }, -30),
        corner('bloom-corner', 'tr', 330, blooms(ctx), { kind: 'peony' }, -30),
        corner('bloom-corner', 'bl', 330, blooms(ctx), { kind: 'peony' }, -30),
        corner('bloom-corner', 'br', 420, blooms(ctx), { kind: 'hydrangea' }, -30),
        artEl('bloom-corner', 40, H * 0.42, 220, 220, blooms(ctx), { locked: true, opts: { kind: 'mixed' }, opacity: 0.85 }),
        artEl('bloom-corner', W - 260, H * 0.5, 220, 220, blooms(ctx), { locked: true, opts: { kind: 'mixed' }, flipX: true, opacity: 0.85 }),
      ]),
    bands: (ctx) => [
      { t: 'text', role: 'invocation', bind: 'invocation', gap: 0 },
      { t: 'text', role: 'host', bind: 'hostLine', gap: 20 },
      ...hoopMonogram(ctx, 360),
      ...coupleNames(0.85),
      ...whenWhere('bars', 'leaf'),
    ],
  },
  // 4. Pink palace arch with pillars, bells and a caricature couple (ref: Aarti & Rohit)
  {
    id: 'gulabi-mahal', name: 'Gulabi Mahal', category: 'wedding', eventTypes: WEDDINGS, communities: ['hindu-north', 'marwari', 'punjabi', 'gujarati'],
    tags: ['palace', 'pillars', 'couple', 'caricature', 'pink', 'bells', 'ganesha'], styles: ['illustrated', 'caricature', 'traditional', 'arch'], premium: true,
    palettes: ['blush', 'peach', 'cream', 'mint'], legacy: { layout: 'jharokha', motif: 'shree', pattern: 'none' },
    type: 'mahal', date: 'line', divider: 'ornate', zone: { top: 300, bottom: 70, left: 170, right: 170 },
    innerZone: { top: 330, bottom: 150, left: 170, right: 170 },
    chrome: (ctx) => ({
      bg: radial(ctx),
      under: [fullPage('palace-arch', [mix(ctx.p.primary, '#FFFFFF', 0.62), mix(ctx.p.primary, '#FFFFFF', 0.35), goldOn(ctx)])],
    }),
    bands: (ctx) => [
      ganesha(ctx, 110),
      { t: 'text', role: 'host', bind: 'hostLine', gap: 14, size: 30 },
      ...coupleNames(0.85),
      { t: 'date', style: 'line', gap: 22 },
      { t: 'text', role: 'small', bind: 'fnM.venueFull', gap: 8 },
      couple(ctx, 'caricature', 'north', 470),
    ],
  },
  // 5. Dusty-rose roses around a dome arch (ref: Samira & Murad)
  {
    id: 'noor-arch', name: 'Noor Arch', category: 'wedding', eventTypes: ['nikah', 'engagement', 'reception', 'wedding', 'anniversary'], communities: ['muslim', 'modern'],
    tags: ['nikah', 'bismillah', 'roses', 'arch', 'dusty rose', 'walima'], styles: ['floral', 'watercolour', 'arch'], premium: true,
    palettes: ['dustyRose', 'cream', 'sage', 'blush'], legacy: { layout: 'floral-frame', motif: 'crescent', pattern: 'jaali' },
    type: 'petal', date: 'rules', divider: 'leaf', zone: { top: 470, bottom: 220, left: 200, right: 200 },
    textBg: (ctx) => ctx.p.surface,
    chrome: (ctx) => ({
      bg: radial(ctx, 'jaali', 0.07),
      under: [
        artEl('arch-panel', 140, 130, W - 280, H - 220, [ctx.p.surface, goldOn(ctx), ctx.p.accent], { locked: true, opts: { shape: 'dome' } }),
        corner('bloom-corner', 'tl', 430, blooms(ctx), { kind: 'peony' }, 10),
        corner('bloom-corner', 'br', 430, blooms(ctx), { kind: 'peony' }, 10),
        artEl('bloom-corner', W - 330, 330, 250, 250, blooms(ctx), { locked: true, flipX: true, opts: { kind: 'mixed' } }),
        artEl('bloom-corner', 70, H - 640, 250, 250, blooms(ctx), { locked: true, flipY: true, opts: { kind: 'mixed' } }),
      ],
    }),
    hero: (ctx) => [motif({ ...ctx, p: { ...ctx.p, background: ctx.p.surface } }, 'crescent', 90)],
  },
  // 6. White & green watercolour greenery (ref: Daniel & Marceline)
  {
    id: 'eucalyptus-grace', name: 'Eucalyptus Grace', category: 'wedding', eventTypes: ALL_WEDDINGS, communities: ['modern', 'christian', 'muslim'],
    tags: ['greenery', 'eucalyptus', 'white roses', 'minimal', 'garden', 'sage'], styles: ['floral', 'watercolour', 'minimal'],
    palettes: ['sage', 'linen', 'ivory', 'jade'], legacy: { layout: 'botanical', motif: 'none', pattern: 'none' },
    type: 'brush', date: 'bars', divider: 'simple', zone: { top: 260, bottom: 300, left: 160, right: 160 },
    chrome: (ctx) =>
      plain(ctx, [
        corner('greenery', 'tr', 520, ['#6E8B5A', '#3F5A35'], { kind: 'mixed' }, -60),
        corner('greenery', 'bl', 560, ['#6E8B5A', '#3F5A35'], { kind: 'mixed' }, -60),
        corner('bloom-corner', 'tr', 300, WHITE_BLOOMS, { kind: 'peony' }, -20),
        corner('bloom-corner', 'bl', 320, WHITE_BLOOMS, { kind: 'peony' }, -20),
        corner('greenery', 'br', 300, ['#8BA77A', '#55734A'], { kind: 'fern' }, -40, 0.8),
      ]),
    hero: () => [],
  },
  // 7. Beige editorial, flush-left, with a line-art poppy (ref: Olivia and Taylor)
  {
    id: 'beige-editorial', name: 'Beige Editorial', category: 'wedding', eventTypes: [...ALL_WEDDINGS, 'birthday', 'retirement'], communities: ['modern'],
    tags: ['minimal', 'line art', 'poppy', 'typography', 'beige', 'elegant'], styles: ['minimal', 'modern', 'line-art'],
    palettes: ['linen', 'ivory', 'onyx', 'sage'], legacy: { layout: 'minimal-modern', motif: 'none', pattern: 'none' },
    type: 'deco', date: 'line', divider: 'simple', zone: { top: 300, bottom: 250, left: 130, right: 250, align: 'left' },
    innerZone: { top: 300, bottom: 250, left: 130, right: 250, align: 'left' },
    chrome: (ctx) => {
      const ink = isDarkColor(ctx.p.background) ? ctx.p.accent : ctx.p.muted;
      return {
        bg: solidBg(ctx.p.background),
        under: [
          artEl('line-flower', W - 470, -20, 480, 540, [ink], { locked: true, opts: { kind: 'poppy' }, flipX: true, rot: 180 }),
          shapeEl('line', 130, 70, 3, 170, { fill: ink }),
          shapeEl('line', W - 160, H - 560, 3, 470, { fill: ink }),
          shapeEl('line', W - 480, H - 92, 322, 3, { fill: ink }),
        ],
      };
    },
    bands: (ctx) => [
      { t: 'text', role: 'name', bind: 'name1', gap: 0, size: 150 },
      ...(ctx.people === 2
        ? ([
            { t: 'text', role: 'connector', bind: 'connector', gap: 6, font: 'Pinyon Script', size: 64 },
            { t: 'text', role: 'name', bind: 'name2', gap: 6, size: 150 },
          ] satisfies Band[])
        : []),
      { t: 'text', role: 'eyebrow', bind: 'hostLine', gap: 70, size: 24 },
      { t: 'date', style: 'line', gap: 50 },
      { t: 'text', role: 'venue', bind: 'fnM.venue', gap: 30 },
      { t: 'text', role: 'small', bind: 'fnM.address', gap: 6 },
      { t: 'text', role: 'connector', bind: 'closing', gap: 60, font: 'Pinyon Script', size: 56 },
    ],
  },
  // 8. Navy with pink florals and a dome panel (ref: Dark Blue Pink Floral)
  {
    id: 'midnight-bloom', name: 'Midnight Bloom', category: 'wedding', eventTypes: [...ALL_WEDDINGS, 'birthday'], communities: ['modern', 'muslim', 'christian'],
    tags: ['navy', 'pink roses', 'save the date', 'night', 'dome'], styles: ['floral', 'watercolour', 'dark'],
    palettes: ['navy', 'plum', 'forest', 'wine'], legacy: { layout: 'floral-frame', motif: 'none', pattern: 'none' },
    type: 'petal', date: 'bars', divider: 'leaf', zone: { top: 330, bottom: 260, left: 210, right: 210 },
    chrome: (ctx) => ({
      bg: radial(ctx),
      under: [
        artEl('arch-panel', 170, 170, W - 340, H - 300, [mix(ctx.p.background, '#FFFFFF', 0.1), ctx.p.primary, ctx.p.accent], { locked: true, opts: { shape: 'dome' } }),
        corner('bloom-corner', 'tl', 470, ['#F3B6C6', '#C2185B', '#6E8B5A', '#F8D7DF'], { kind: 'peony' }, -40),
        corner('bloom-corner', 'br', 470, ['#F3B6C6', '#C2185B', '#6E8B5A', '#F8D7DF'], { kind: 'peony' }, -40),
        corner('bloom-corner', 'bl', 280, ['#F3B6C6', '#C2185B', '#6E8B5A', '#F8D7DF'], { kind: 'mixed' }, -20),
      ],
    }),
    hero: () => [],
  },
  // 9. Line-drawn wildflowers in sage (ref: Teddy & Olivia)
  {
    id: 'vine-sketch', name: 'Vine Sketch', category: 'wedding', eventTypes: [...ALL_WEDDINGS, 'baby-shower', 'birthday'], communities: ['modern'],
    tags: ['line art', 'wildflowers', 'sketch', 'sage', 'garden', 'minimal'], styles: ['line-art', 'minimal', 'floral'],
    palettes: ['sage', 'mint', 'ivory', 'linen'], legacy: { layout: 'botanical', motif: 'none', pattern: 'none' },
    type: 'boho', date: 'bars', divider: 'simple', zone: { top: 300, bottom: 260, left: 160, right: 160 },
    chrome: (ctx) => {
      const ink = isDarkColor(ctx.p.background) ? ctx.p.accent : mix(ctx.p.primary, ctx.p.background, 0.15);
      return plain(ctx, [
        artEl('line-flower', -40, -30, 470, 520, [ink], { locked: true, opts: { kind: 'wild' }, flipY: true }),
        artEl('line-flower', W - 300, 40, 300, 340, [ink], { locked: true, opts: { kind: 'lily' }, flipX: true, flipY: true, opacity: 0.8 }),
        artEl('line-flower', W - 440, H - 500, 470, 520, [ink], { locked: true, opts: { kind: 'wild' }, flipX: true }),
        artEl('line-flower', 0, H - 380, 300, 340, [ink], { locked: true, opts: { kind: 'rose' }, opacity: 0.8 }),
      ]);
    },
    hero: () => [],
  },
  // 10. Burgundy with an oval panel and tulips (ref: Ahmed & Dalia)
  {
    id: 'tulip-oval', name: 'Tulip Oval', category: 'wedding', eventTypes: ['nikah', 'wedding', 'engagement', 'reception', 'anniversary'], communities: ['muslim', 'hindu-north', 'modern'],
    tags: ['tulips', 'oval', 'burgundy', 'nikah', 'gold'], styles: ['floral', 'royal', 'dark'], premium: true,
    palettes: ['wine', 'kumkum', 'forest', 'navy'], legacy: { layout: 'floral-frame', motif: 'crescent', pattern: 'paisley' },
    type: 'mahal', date: 'rules', divider: 'ornate', zone: { top: 470, bottom: 420, left: 220, right: 220 },
    chrome: (ctx) => ({
      bg: radial(ctx, 'paisley', 0.06),
      under: [
        artEl('arch-panel', 150, 260, W - 300, H - 520, [mix(ctx.p.background, '#000000', 0.18), ctx.p.primary, ctx.p.accent], { locked: true, opts: { shape: 'oval' } }),
        corner('bloom-corner', 'tr', 460, [mix(ctx.p.primary, '#FFFFFF', 0.4), ctx.p.primary, '#5E7D4A', ctx.p.accent], { kind: 'tulip' }, -30),
        corner('bloom-corner', 'bl', 460, [mix(ctx.p.primary, '#FFFFFF', 0.4), ctx.p.primary, '#5E7D4A', ctx.p.accent], { kind: 'tulip' }, -30),
      ],
    }),
    hero: () => [],
  },
  // 11. White & gold leaves (ref: Olivia and Daniel)
  {
    id: 'golden-leaf', name: 'Golden Leaf', category: 'wedding', eventTypes: [...ALL_WEDDINGS, 'birthday', 'retirement', 'corporate'], communities: ['modern', 'christian'],
    tags: ['gold leaves', 'white and gold', 'minimal', 'elegant', 'luxury'], styles: ['minimal', 'luxury', 'floral'],
    palettes: ['champagne', 'ivory', 'blush', 'cream'], legacy: { layout: 'botanical', motif: 'none', pattern: 'none' },
    type: 'petal', date: 'rules', divider: 'simple', zone: { top: 260, bottom: 260, left: 170, right: 170 },
    chrome: (ctx) =>
      plain(ctx, [
        corner('greenery', 'tl', 520, [trueGold(ctx), mix(trueGold(ctx), '#FFFFFF', 0.4)], { kind: 'olive' }, -60, 0.75),
        corner('greenery', 'br', 520, [trueGold(ctx), mix(trueGold(ctx), '#FFFFFF', 0.4)], { kind: 'olive' }, -60, 0.75),
        artEl('stars', 60, 60, W - 120, H - 120, [trueGold(ctx)], { locked: true, opacity: 0.5, opts: { seed: 11 } }),
      ]),
    hero: () => [],
  },
  // 12. Dusty-blue hydrangeas (ref: Tahleem & Farha)
  {
    id: 'blue-hydrangea', name: 'Blue Hydrangea', category: 'wedding', eventTypes: ALL_WEDDINGS, communities: ['muslim', 'christian', 'modern'],
    tags: ['hydrangea', 'blue florals', 'nikah', 'watercolour', 'pastel'], styles: ['floral', 'watercolour', 'pastel'],
    palettes: ['dustyBlue', 'babyBlue', 'lavender', 'sage'], legacy: { layout: 'floral-frame', motif: 'none', pattern: 'none' },
    type: 'garden', date: 'rules', divider: 'leaf', zone: { top: 330, bottom: 300, left: 170, right: 170 },
    chrome: (ctx) =>
      plain(ctx, [
        shapeEl('rect', 70, 70, W - 140, H - 140, { stroke: goldOn(ctx), strokeW: 2 }),
        corner('bloom-corner', 'tl', 400, blooms(ctx), { kind: 'hydrangea' }, -20),
        corner('bloom-corner', 'tr', 400, blooms(ctx), { kind: 'hydrangea' }, -20),
        corner('bloom-corner', 'bl', 360, blooms(ctx), { kind: 'mixed' }, -20),
        corner('bloom-corner', 'br', 360, blooms(ctx), { kind: 'mixed' }, -20),
      ]),
    hero: () => [],
  },
  // 13. Beige & gold mandala Ganesha with lanterns (ref: Gold and Beige Traditional)
  {
    id: 'mandala-ganesha', name: 'Mandala Ganesha', category: 'wedding', eventTypes: [...WEDDINGS, ...SACRED, 'shop-opening'], communities: ['hindu-north', 'hindu-south', 'gujarati', 'marathi', 'marwari'],
    tags: ['ganesha', 'mandala', 'lanterns', 'gold', 'beige', 'griha pravesh', 'puja'], styles: ['traditional', 'religious', 'luxury'], premium: true,
    palettes: ['champagne', 'cream', 'butter', 'peach'], legacy: { layout: 'temple-heritage', motif: 'shree', pattern: 'mandala' },
    type: 'regal', date: 'rules', divider: 'lotus', zone: { top: 330, bottom: 230, left: 200, right: 200 },
    chrome: (ctx) =>
      plain(ctx, [
        artEl('mandala', -430, H / 2 - 430, 860, 860, [trueGold(ctx)], { locked: true, opacity: 0.55 }),
        artEl('mandala', W - 430, H / 2 - 430, 860, 860, [trueGold(ctx)], { locked: true, opacity: 0.55 }),
        artEl('mandala', W / 2 - 300, H - 300, 600, 600, [trueGold(ctx)], { locked: true, opacity: 0.4 }),
        ...lanterns(ctx, [210, W - 210], [300]),
        artEl('lantern', W / 2 - 40, 0, 80, 170, [trueGold(ctx), '#FFE29A'], { locked: true }),
      ]),
    hero: (ctx) => [{ ...ganesha(ctx, 200), colors: [trueGold(ctx), ctx.p.accent] }],
  },
  // 14. Photo in a floral wreath (ref: Daniel & Rachel)
  {
    id: 'photo-wreath', name: 'Photo Wreath', category: 'wedding', eventTypes: [...ALL_WEDDINGS, 'birthday', 'baby-shower'], communities: ['modern', 'christian'],
    tags: ['photo', 'wreath', 'blue florals', 'watercolour', 'couple photo'], styles: ['photo', 'floral', 'watercolour'],
    palettes: ['babyBlue', 'blush', 'sage', 'lavender'], legacy: { layout: 'photo-frame', motif: 'none', pattern: 'none' },
    type: 'garden', date: 'rules', divider: 'leaf', zone: { top: 140, bottom: 220, left: 160, right: 160 },
    chrome: (ctx) =>
      plain(ctx, [
        corner('bloom-corner', 'tl', 330, blooms(ctx), { kind: 'mixed' }, -20),
        corner('bloom-corner', 'br', 380, blooms(ctx), { kind: 'hydrangea' }, -20),
        corner('greenery', 'tr', 300, [goldOn(ctx), mix(goldOn(ctx), '#FFFFFF', 0.4)], { kind: 'olive' }, -30, 0.6),
        corner('greenery', 'bl', 300, [goldOn(ctx), mix(goldOn(ctx), '#FFFFFF', 0.4)], { kind: 'olive' }, -30, 0.6),
      ]),
    bands: () => [
      { t: 'text', role: 'eyebrow', bind: 'headline', gap: 0 },
      { t: 'photo', w: 520, h: 520, mask: 'circle', gap: 26 },
      ...coupleNames(0.8),
      ...whenWhere('rules', 'leaf'),
    ],
  },
  // 15. Save-the-date with a satin bow (ref: Pedro and Sacha)
  {
    id: 'satin-bow', name: 'Satin Bow', category: 'wedding', eventTypes: [...ALL_WEDDINGS, 'birthday'], communities: ['modern', 'christian'],
    tags: ['save the date', 'bow', 'ribbon', 'blue florals', 'pastel'], styles: ['floral', 'pastel', 'modern'],
    palettes: ['dustyBlue', 'blush', 'sage', 'lavender'], legacy: { layout: 'floral-frame', motif: 'none', pattern: 'none' },
    type: 'brush', date: 'bars', divider: 'simple', zone: { top: 300, bottom: 260, left: 330, right: 110 },
    chrome: (ctx) =>
      plain(ctx, [
        artEl('bow', 70, 0, 230, H, [mix(ctx.p.primary, '#FFFFFF', 0.55), mix(ctx.p.primary, '#FFFFFF', 0.2)], { locked: true }),
        corner('bloom-corner', 'tr', 460, blooms(ctx), { kind: 'hydrangea' }, -40),
        corner('bloom-corner', 'br', 380, blooms(ctx), { kind: 'peony' }, -30),
      ]),
    hero: () => [],
  },
  // 16. Monogram crest with sketched florals (ref: C A crest)
  {
    id: 'crest-monogram', name: 'Crest Monogram', category: 'wedding', eventTypes: [...ALL_WEDDINGS, 'anniversary'], communities: ['modern', 'christian'],
    tags: ['monogram', 'initials', 'crest', 'line art', 'ivory', 'classic'], styles: ['minimal', 'line-art', 'luxury'],
    palettes: ['ivory', 'champagne', 'sage', 'navy'], legacy: { layout: 'monogram', motif: 'none', pattern: 'none' },
    type: 'petal', date: 'rules', divider: 'deco', zone: { top: 230, bottom: 230, left: 170, right: 170 },
    chrome: (ctx) => {
      const ink = mix(goldOn(ctx), ctx.p.background, 0.35);
      return plain(ctx, [
        artEl('line-flower', -30, -20, 420, 470, [ink], { locked: true, opts: { kind: 'rose' }, flipY: true, opacity: 0.7 }),
        artEl('line-flower', W - 390, H - 450, 420, 470, [ink], { locked: true, opts: { kind: 'rose' }, flipX: true, opacity: 0.7 }),
        shapeEl('rect', 60, 60, W - 120, H - 120, { stroke: goldOn(ctx), strokeW: 1.5, opacity: 0.8 }),
      ]);
    },
    bands: (ctx) => [
      { t: 'text', role: 'eyebrow', bind: 'headline', gap: 0 },
      ...hoopMonogram(ctx, 360, 'arch-panel', { shape: 'oval', outline: true }),
      { t: 'art', asset: 'filigree', w: 160, h: 160, colors: [goldOn(ctx)], gap: -40 },
      { t: 'text', role: 'host', bind: 'hostLine', gap: 30 },
      ...coupleNames(0.75),
      ...whenWhere('rules', 'deco'),
    ],
  },
  // 17. Gold geometric frame with red roses (ref: Yousuf & Hanna)
  {
    id: 'geometric-bloom', name: 'Geometric Bloom', category: 'wedding', eventTypes: ALL_WEDDINGS, communities: ['muslim', 'hindu-north', 'modern'],
    tags: ['geometric', 'gold frame', 'roses', 'nikah', 'red'], styles: ['floral', 'modern', 'watercolour'],
    palettes: ['cream', 'ivory', 'blush', 'dustyRose'], legacy: { layout: 'floral-frame', motif: 'none', pattern: 'none' },
    type: 'petal', date: 'rules', divider: 'leaf', zone: { top: 360, bottom: 330, left: 210, right: 210 },
    chrome: (ctx) =>
      plain(ctx, [
        artEl('geo-frame', 130, 230, W - 260, H - 460, [goldOn(ctx)], { locked: true }),
        artEl('bloom-corner', 40, 120, 420, 420, ['#E57386', '#A8243A', '#5E7D4A', '#F4C7CF'], { locked: true, opts: { kind: 'peony' } }),
        artEl('bloom-corner', W - 460, H - 540, 420, 420, ['#E57386', '#A8243A', '#5E7D4A', '#F4C7CF'], { locked: true, opts: { kind: 'peony' }, flipX: true, flipY: true }),
      ]),
    hero: () => [],
  },
  // 18. Rajasthani yellow with royal umbrellas and a caricature couple (ref: Maanvita & Darsh)
  {
    id: 'shahi-chhatri', name: 'Shahi Chhatri', category: 'wedding', eventTypes: WEDDINGS, communities: ['marwari', 'hindu-north', 'gujarati'],
    tags: ['rajasthani', 'umbrella', 'couple', 'caricature', 'yellow', 'palace', 'ganesha'], styles: ['illustrated', 'caricature', 'traditional', 'bright'], premium: true,
    palettes: ['mustard', 'marigold', 'saffron', 'kumkum'], legacy: { layout: 'festive-pop', motif: 'shree', pattern: 'paisley' },
    type: 'regal', date: 'rules', divider: 'simple', zone: { top: 230, bottom: 70, left: 180, right: 180 },
    innerZone: { top: 300, bottom: 200, left: 180, right: 180 },
    textBg: (ctx) => ctx.p.surface,
    chrome: (ctx) => ({
      bg: radial(ctx, 'paisley', 0.18),
      under: [
        artEl('arch-panel', 110, 90, W - 220, H - 130, [ctx.p.surface, '#B5121B', goldOn(ctx)], { locked: true, opts: { shape: 'scallop' } }),
        artEl('chhatri', -10, H - 820, 280, 350, ['#C2185B', '#1B4F9C', '#E9B949'], { locked: true }),
        artEl('chhatri', W - 270, H - 820, 280, 350, ['#C2185B', '#1B4F9C', '#E9B949'], { locked: true, flipX: true }),
        artEl('genda-ladi', 20, 0, 130, 620, ['#F28C0F', '#FFC93C', '#2F7D32'], { locked: true, opts: { count: 2 } }),
        artEl('genda-ladi', W - 150, 0, 130, 620, ['#F28C0F', '#FFC93C', '#2F7D32'], { locked: true, opts: { count: 2 } }),
      ],
    }),
    bands: (ctx) => [
      { ...ganesha({ ...ctx, p: { ...ctx.p, background: ctx.p.surface } }, 120), colors: ['#B5121B', '#F2A900'] },
      { t: 'text', role: 'host', bind: 'hostLine', gap: 14, size: 30 },
      ...coupleNames(0.75),
      { t: 'date', style: 'rules', gap: 26 },
      { t: 'text', role: 'small', bind: 'fnM.venueFull', gap: 12 },
      couple(ctx, 'caricature', 'north', 400),
    ],
  },
  // 19. Marigold strings and a caricature couple (ref: Shubh Vivah)
  {
    id: 'genda-mandap', name: 'Genda Mandap', category: 'wedding', eventTypes: [...WEDDINGS, 'griha-pravesh', 'puja'], communities: ['hindu-north', 'marathi', 'gujarati', 'hindu-south'],
    tags: ['marigold', 'genda', 'couple', 'caricature', 'shubh vivah', 'haldi', 'bright'], styles: ['illustrated', 'caricature', 'traditional', 'bright'],
    palettes: ['ivory', 'peach', 'butter', 'mint'], legacy: { layout: 'floral-frame', motif: 'shree', pattern: 'none' },
    type: 'brush', date: 'rules', divider: 'simple', zone: { top: 320, bottom: 70, left: 170, right: 170 },
    innerZone: { top: 380, bottom: 200, left: 170, right: 170 },
    chrome: (ctx) =>
      plain(ctx, [
        artEl('genda-ladi', 0, 0, W, 330, ['#F28C0F', '#FFC93C', '#2F7D32'], { locked: true, opts: { count: 9 } }),
        artEl('toran', 0, 0, W, 210, [ctx.p.accent], { locked: true }),
        artEl('genda-ladi', 0, 300, 90, 900, ['#F28C0F', '#FFC93C', '#2F7D32'], { locked: true, opts: { count: 1 } }),
        artEl('genda-ladi', W - 90, 300, 90, 900, ['#F28C0F', '#FFC93C', '#2F7D32'], { locked: true, opts: { count: 1 } }),
        corner('greenery', 'bl', 360, ['#3E7B27', '#2F5A26'], { kind: 'fern' }, -30),
      ]),
    bands: (ctx) => [
      { t: 'text', role: 'invocation', bind: 'invocation', gap: 0 },
      { t: 'text', role: 'host', bind: 'hostLine', gap: 18, size: 30 },
      ...coupleNames(0.75),
      { t: 'date', style: 'rules', gap: 26 },
      { t: 'text', role: 'small', bind: 'fnM.venueFull', gap: 12 },
      couple(ctx, 'caricature', 'north', 420),
    ],
  },
  // 20. Hanging vines and a floral arch over the couple (ref: Manvita & Shiv)
  {
    id: 'phoolon-ka-jhoola', name: 'Phoolon ka Jhoola', category: 'wedding', eventTypes: [...WEDDINGS, 'baby-shower'], communities: ['hindu-north', 'punjabi', 'modern'],
    tags: ['vines', 'floral arch', 'couple', 'garden', 'mehendi', 'sangeet', 'green'], styles: ['illustrated', 'floral', 'caricature', 'watercolour'],
    palettes: ['mint', 'ivory', 'sage', 'blush'], legacy: { layout: 'botanical', motif: 'none', pattern: 'leaves' },
    type: 'garden', date: 'rules', divider: 'leaf', zone: { top: 330, bottom: 70, left: 170, right: 170 },
    innerZone: { top: 380, bottom: 200, left: 170, right: 170 },
    chrome: (ctx) =>
      plain(ctx, [
        artEl('greenery', -60, -40, 460, 460, ['#5E8C47', '#2F5A26'], { locked: true, opts: { kind: 'eucalyptus' }, flipY: true }),
        artEl('greenery', W / 2 - 230, -80, 460, 420, ['#6E9F4F', '#3F5A35'], { locked: true, opts: { kind: 'fern' }, flipY: true, rot: 45 }),
        artEl('greenery', W - 400, -40, 460, 460, ['#5E8C47', '#2F5A26'], { locked: true, opts: { kind: 'eucalyptus' }, flipX: true, flipY: true }),
        corner('bloom-corner', 'bl', 460, blooms(ctx, '#F4A6B7'), { kind: 'mixed' }, -20),
        corner('bloom-corner', 'br', 460, blooms(ctx, '#F4A6B7'), { kind: 'mixed' }, -20),
      ]),
    bands: (ctx) => [
      { t: 'text', role: 'invocation', bind: 'invocation', gap: 0 },
      { t: 'text', role: 'host', bind: 'hostLine', gap: 18, size: 30 },
      ...coupleNames(0.8),
      { t: 'date', style: 'rules', gap: 26 },
      { t: 'text', role: 'small', bind: 'fnM.venueFull', gap: 12 },
      couple(ctx, 'caricature', 'north', 420),
    ],
  },
  // 21. Ganesha with mandala corners and filigree (ref: Om Shree Ganeshay Namah covers)
  {
    id: 'om-shree', name: 'Om Shree', category: 'religious', eventTypes: [...SACRED, ...WEDDINGS, 'shop-opening'], communities: ['hindu-north', 'gujarati', 'marathi', 'marwari'],
    tags: ['ganesha', 'mandala', 'filigree', 'purple', 'puja', 'griha pravesh', 'om shree ganeshay namah'], styles: ['traditional', 'religious', 'royal'],
    palettes: ['plum', 'wine', 'peach', 'butter'], legacy: { layout: 'royal-arch', motif: 'shree', pattern: 'mandala' },
    type: 'regal', date: 'rules', divider: 'ornate', zone: { top: 300, bottom: 260, left: 190, right: 190 },
    chrome: (ctx) =>
      plain(ctx, [
        artEl('mandala', -300, -300, 600, 600, [trueGold(ctx)], { locked: true, opacity: 0.6 }),
        artEl('mandala', W - 300, -300, 600, 600, [trueGold(ctx)], { locked: true, opacity: 0.6 }),
        artEl('mandala', -300, H - 300, 600, 600, [trueGold(ctx)], { locked: true, opacity: 0.6 }),
        artEl('mandala', W - 300, H - 300, 600, 600, [trueGold(ctx)], { locked: true, opacity: 0.6 }),
        artEl('mandala', W / 2 - 480, H / 2 - 480, 960, 960, [trueGold(ctx)], { locked: true, opacity: 0.07 }),
      ]),
    hero: (ctx) => [{ ...ganesha(ctx, 220), colors: [trueGold(ctx), ctx.p.accent] }],
  },
];

/** Every layered family: newest collections first (Atelier, Celebration, Heritage, then the first set). */
export const ALL_DESIGN_FAMILIES: DesignFamily[] = [...PAINTED_FAMILIES, ...OCCASION_FAMILIES, ...ATELIER_FAMILIES, ...CELEBRATION_FAMILIES, ...HERITAGE_FAMILIES, ...DESIGN_FAMILIES];
