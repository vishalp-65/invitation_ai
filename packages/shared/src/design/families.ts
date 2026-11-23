import type { Community, EventTypeId } from '../constants/event-types.js';
import type { LayoutId, MotifId, PatternId } from '../templates/types.js';
import { artEl, fullPage, shapeEl, solidBg, type Band, type DateStyle, type RecipeCtx, type Tones, type TypeSetKey, type Zone } from './builder.js';
import { contrast, isDarkColor, mix } from './color.js';
import { DESIGN_H, DESIGN_W } from './constants.js';
import type { DesignElement, PageBackground } from './schema.js';

/** Gallery groups (what the user picked in the brief). */
export const DESIGN_CATEGORIES = [
  { id: 'wedding', label: 'Wedding & functions' },
  { id: 'kids', label: 'Birthday & baby' },
  { id: 'religious', label: 'Home & religious' },
  { id: 'business', label: 'Business & others' },
] as const;
export type DesignCategory = (typeof DESIGN_CATEGORIES)[number]['id'];

export interface Chrome {
  bg: PageBackground;
  /** Layers under the text (frames, florals, illustrations). */
  under: DesignElement[];
  /** Layers above the text (rare: confetti, toran tassels). */
  over?: DesignElement[];
}

export interface DesignFamily {
  id: string;
  name: string;
  category: DesignCategory;
  eventTypes: EventTypeId[] | 'all';
  communities?: Community[];
  tags: string[];
  premium?: boolean;
  /** Palette keys from PALETTES. */
  palettes: string[];
  /** Fallback for the classic auto-layout renderer. */
  legacy: { layout: LayoutId; motif: MotifId; pattern: PatternId };
  type: TypeSetKey;
  date: DateStyle;
  divider?: string;
  zone: Zone;
  /** Colour the text sits on (defaults to the page background). */
  textBg?: (ctx: RecipeCtx) => string;
  chrome: (ctx: RecipeCtx, t: Tones) => Chrome;
  /** Illustration bands at the top of the cover. */
  hero?: (ctx: RecipeCtx, t: Tones) => Band[];
  /** Fully custom cover bands. */
  bands?: (ctx: RecipeCtx, t: Tones) => Band[];
  /** Chrome for inner pages (ceremonies, family, photo); defaults to the cover's. */
  inner?: (ctx: RecipeCtx, t: Tones) => Chrome;
  /** Text zone for inner pages; defaults to `zone`. */
  innerZone?: Zone;
  /** Chrome for the blessing page; defaults to the inner pages'. */
  blessing?: (ctx: RecipeCtx, t: Tones) => Chrome;
  /** Search metadata: visual style words (see templates/search.ts). */
  styles?: string[];
  /** Painted photo look behind this family (website and video use the same look). */
  look?: string;
  /** Language the gallery thumbnail is shown in (defaults: modern → English, else Hindi). */
  sampleLanguage?: 'en' | 'hi';
}

// ------------------------------------------------------------ helpers

const W = DESIGN_W;
const H = DESIGN_H;

/** Real metallic gold for sacred art and gilding (never a green/pink palette accent). */
export function trueGold(ctx: RecipeCtx): string {
  if (isDarkColor(ctx.p.background)) return isDarkColor(ctx.p.primary) ? '#E9B949' : ctx.p.primary;
  return '#A8741A';
}

/** Gold that reads on the page background. */
export function goldOn(ctx: RecipeCtx): string {
  const bg = ctx.p.background;
  if (isDarkColor(bg)) return ctx.p.primary;
  for (const c of [ctx.p.accent, ctx.p.primary]) if (contrast(bg, c) >= 2.2) return c;
  return '#A8741A';
}

export const radial = (ctx: RecipeCtx, pattern: PageBackground['pattern'] = 'none', opacity = 0.12) =>
  solidBg(ctx.p.background, ctx.p.backgroundAlt, 'radial', pattern, goldOn(ctx), opacity);
export const linear = (ctx: RecipeCtx, pattern: PageBackground['pattern'] = 'none', opacity = 0.12) =>
  solidBg(ctx.p.background, ctx.p.backgroundAlt, 'linear', pattern, goldOn(ctx), opacity);

/** Same corner piece in all four corners. */
export function corners4(asset: string, size: number, colors: string[], inset = 0, opts?: Record<string, string | number | boolean>): DesignElement[] {
  return [
    artEl(asset, inset, inset, size, size, colors, { opts, locked: true }),
    artEl(asset, W - inset - size, inset, size, size, colors, { opts, flipX: true, locked: true }),
    artEl(asset, inset, H - inset - size, size, size, colors, { opts, flipY: true, locked: true }),
    artEl(asset, W - inset - size, H - inset - size, size, size, colors, { opts, flipX: true, flipY: true, locked: true }),
  ];
}
export const bottomPair = (asset: string, size: number, colors: string[], opts?: Record<string, string | number | boolean>, dy = 0) => [
  artEl(asset, -size * 0.12, H - size * 0.92 + dy, size, size, colors, { opts, flipY: true, locked: true }),
  artEl(asset, W - size * 0.88, H - size * 0.92 + dy, size, size, colors, { opts, flipX: true, flipY: true, locked: true }),
];
export const topPair = (asset: string, size: number, colors: string[], opts?: Record<string, string | number | boolean>) => [
  artEl(asset, -size * 0.12, -size * 0.08, size, size, colors, { opts, locked: true }),
  artEl(asset, W - size * 0.88, -size * 0.08, size, size, colors, { opts, flipX: true, locked: true }),
];
export const ganesha = (ctx: RecipeCtx, size = 190): Band => ({
  t: 'art',
  asset: 'ganesha',
  w: size,
  h: size * 1.1,
  colors: [goldOn(ctx), ctx.p.accent],
  opts: { light: !isDarkColor(ctx.p.background) },
  gap: 18,
  anim: 'drop',
});
export const couple = (ctx: RecipeCtx, style: string, attire: string, w = 400): Band => ({
  t: 'art',
  asset: 'couple',
  w,
  h: w * 1.25,
  colors: [goldOn(ctx), ctx.p.backgroundAlt],
  opts: { style, attire },
  gap: 14,
  anim: 'zoom',
});
export const motif = (ctx: RecipeCtx, m: MotifId, size = 150): Band => ({ t: 'art', asset: 'motif', w: size, h: size, colors: [goldOn(ctx), ctx.p.accent], opts: { motif: m }, gap: 20, anim: 'drop' });
export const art = (asset: string, w: number, h: number, colors: string[], opts?: Record<string, string | number | boolean>, gap = 18): Band => ({ t: 'art', asset, w, h, colors, opts, gap, anim: 'zoom' });

/** Surface panel the text sits on. */
export const panel = (ctx: RecipeCtx, x: number, y: number, w: number, h: number, radius = 36, opacity = 0.94) =>
  // Modern card: soft translucent surface with a hairline rim (no heavy outline).
  shapeEl('rect', x, y, w, h, { fill: ctx.p.surface, fillOpacity: Math.min(opacity, 0.9), radius: Math.min(radius, 28), stroke: goldOn(ctx), strokeW: 1.5 });

export const WEDDINGS: EventTypeId[] = ['wedding', 'engagement', 'reception', 'anniversary'];
export const ALL_WEDDINGS: EventTypeId[] = [...WEDDINGS, 'nikah', 'christian-wedding', 'anand-karaj'];
export const KIDS: EventTypeId[] = ['birthday', 'baby-shower', 'naming-ceremony', 'mundan', 'annaprashan'];
export const SACRED: EventTypeId[] = ['griha-pravesh', 'puja', 'jagran', 'bhandara', 'upanayana', 'mundan', 'annaprashan', 'naming-ceremony'];
export const BUSINESS: EventTypeId[] = ['shop-opening', 'corporate', 'retirement', 'other'];

// ------------------------------------------------------------ families

export const DESIGN_FAMILIES: DesignFamily[] = [
  // ======================= Wedding & functions =======================
  {
    id: 'rajwada-gold', name: 'Rajwada Gold', category: 'wedding', eventTypes: WEDDINGS, communities: ['hindu-north', 'marwari', 'gujarati'],
    tags: ['ganesha', 'royal', 'toran', 'gold foil'], premium: true, palettes: ['maroon', 'royalBlue', 'emerald', 'kumkum'],
    legacy: { layout: 'royal-arch', motif: 'shree', pattern: 'paisley' }, type: 'regal', date: 'rules', divider: 'ornate',
    zone: { top: 330, bottom: 170, left: 140, right: 140 },
    chrome: (ctx) => ({
      bg: radial(ctx, 'paisley', 0.07),
      under: [
        fullPage('border', [goldOn(ctx), ctx.p.accent], { style: 'double' }),
        ...corners4('corner', 230, [goldOn(ctx)], 34),
        artEl('toran', 0, 0, W, 300, [ctx.p.accent], { locked: true }),
        artEl('mandala', W / 2 - 430, 560, 860, 860, [goldOn(ctx)], { opacity: 0.08, locked: true }),
      ],
    }),
    hero: (ctx) => [ganesha(ctx, 170)],
  },
  {
    id: 'mughal-arch', name: 'Mughal Arch', category: 'wedding', eventTypes: [...WEDDINGS, 'nikah'], communities: ['hindu-north', 'muslim', 'punjabi'],
    tags: ['arch', 'roses', 'palace'], premium: true, palettes: ['wine', 'navy', 'plum', 'teal'],
    legacy: { layout: 'jharokha', motif: 'none', pattern: 'jaali' }, type: 'mahal', date: 'bars', divider: 'lotus',
    zone: { top: 400, bottom: 360, left: 200, right: 200 },
    textBg: (ctx) => ctx.p.surface,
    chrome: (ctx) => ({
      bg: linear(ctx, 'jaali', 0.08),
      under: [
        artEl('arch', 110, 130, W - 220, H - 300, [goldOn(ctx), ctx.p.surface], { locked: true }),
        ...bottomPair('floral-cluster', 440, [], { kind: 'rose' }, 40),
      ],
    }),
    hero: (ctx) => [{ ...ganesha({ ...ctx, p: { ...ctx.p, background: ctx.p.surface } }, 150), colors: ['#A8741A', ctx.p.accent], opts: { light: true } }],
  },
  {
    id: 'genda-phool', name: 'Genda Phool', category: 'wedding', eventTypes: [...WEDDINGS, ...SACRED], communities: ['hindu-north', 'gujarati', 'marathi'],
    tags: ['marigold', 'haldi', 'bright', 'bandhanwar'], palettes: ['marigold', 'mustard', 'saffron', 'butter'],
    legacy: { layout: 'floral-frame', motif: 'shree', pattern: 'paisley' }, type: 'regal', date: 'rules', divider: 'simple',
    zone: { top: 380, bottom: 260, left: 150, right: 150 },
    textBg: (ctx) => ctx.p.surface,
    chrome: (ctx) => ({
      bg: radial(ctx, 'paisley', 0.12),
      under: [
        panel(ctx, 90, 250, W - 180, H - 400, 48),
        artEl('bandhanwar', 0, 0, W, 300, ['#2F7D32', '#F28C0F'], { locked: true }),
        ...bottomPair('floral-cluster', 400, [], { kind: 'marigold' }, 60),
      ],
    }),
    hero: (ctx) => [{ ...ganesha({ ...ctx, p: { ...ctx.p, background: ctx.p.surface } }, 150), colors: ['#B5121B', '#F2A900'], opts: { light: true } }],
  },
  {
    id: 'shubh-varmala', name: 'Shubh Varmala', category: 'wedding', eventTypes: WEDDINGS, communities: ['hindu-north', 'marwari', 'punjabi'],
    tags: ['couple', 'watercolour', 'lehenga', 'roses'], premium: true, palettes: ['ivory', 'blush', 'cream', 'sage'],
    legacy: { layout: 'botanical', motif: 'none', pattern: 'none' }, type: 'mahal', date: 'bars', divider: 'leaf',
    zone: { top: 120, bottom: 150, left: 130, right: 130 },
    chrome: (ctx) => ({
      bg: radial(ctx),
      under: [...topPair('floral-cluster', 400, [], { kind: 'rose' }), ...bottomPair('sprig', 330, ['#6E8B5A', ctx.p.accent])],
    }),
    hero: (ctx) => [couple(ctx, 'watercolor', 'north', 430)],
  },
  {
    id: 'dulha-dulhan-cute', name: 'Dulha Dulhan', category: 'wedding', eventTypes: WEDDINGS, tags: ['couple', 'cute', 'caricature', 'fun'],
    palettes: ['babyPink', 'peach', 'mint', 'marigold'], legacy: { layout: 'festive-pop', motif: 'heart', pattern: 'dots' },
    type: 'party', date: 'rules', divider: 'simple', zone: { top: 260, bottom: 150, left: 120, right: 120 },
    chrome: (ctx) => ({
      bg: radial(ctx, 'dots', 0.1),
      under: [artEl('bandhanwar', 0, 0, W, 260, ['#2F7D32', '#F28C0F'], { locked: true }), ...bottomPair('floral-cluster', 330, [], { kind: 'marigold' }, 40)],
    }),
    hero: (ctx) => [couple(ctx, 'caricature', 'north', 380)],
  },
  {
    id: 'line-of-love', name: 'Line of Love', category: 'wedding', eventTypes: [...WEDDINGS], communities: ['modern'], tags: ['couple', 'line art', 'minimal', 'luxury'],
    premium: true, palettes: ['onyx', 'ivory', 'navy', 'sage'], legacy: { layout: 'minimal-modern', motif: 'none', pattern: 'none' },
    type: 'modern', date: 'stack', divider: 'simple', zone: { top: 150, bottom: 150, left: 150, right: 150 },
    chrome: (ctx) => ({
      bg: solidBg(ctx.p.background),
      under: [shapeEl('rect', 60, 60, W - 120, H - 120, { stroke: goldOn(ctx), strokeW: 2 }), shapeEl('rect', 78, 78, W - 156, H - 156, { stroke: goldOn(ctx), strokeW: 1, opacity: 0.6 })],
    }),
    hero: (ctx) => [couple(ctx, 'lineart', 'north', 300)],
  },
  {
    id: 'kalyana-mandapam', name: 'Kalyana Mandapam', category: 'wedding', eventTypes: WEDDINGS, communities: ['hindu-south'],
    tags: ['south', 'temple bells', 'kolam', 'jasmine'], premium: true, palettes: ['temple', 'kumkum', 'emerald', 'cream'],
    legacy: { layout: 'temple-heritage', motif: 'diya', pattern: 'jaali' }, type: 'regal', date: 'rules', divider: 'lotus',
    zone: { top: 300, bottom: 300, left: 140, right: 140 },
    chrome: (ctx) => ({
      bg: radial(ctx, 'jaali', 0.08),
      under: [
        fullPage('border', [goldOn(ctx), ctx.p.accent], { style: 'temple' }),
        artEl('bandhanwar', 0, 0, W, 240, ['#2F7D32', '#FFF8E1'], { locked: true, opts: { flowers: 'jasmine' } }),
        artEl('bells', 60, 150, 170, 300, [goldOn(ctx)], { locked: true }),
        artEl('bells', W - 230, 150, 170, 300, [goldOn(ctx)], { locked: true, flipX: true }),
        artEl('rangoli', W / 2 - 200, H - 330, 400, 260, [goldOn(ctx), ctx.p.accent, '#FFFFFF'], { locked: true, opts: { style: 'kolam' } }),
      ],
    }),
    hero: (ctx) => [couple(ctx, 'watercolor', 'south', 330)],
  },
  {
    id: 'alpona', name: 'Alpona', category: 'wedding', eventTypes: WEDDINGS, communities: ['bengali'], tags: ['bengali', 'alpona', 'red and white', 'topor'],
    palettes: ['ivory', 'kumkum', 'cream'], legacy: { layout: 'temple-heritage', motif: 'lotus', pattern: 'dots' }, type: 'petal', date: 'bars', divider: 'simple',
    zone: { top: 160, bottom: 330, left: 130, right: 130 },
    chrome: (ctx) => ({
      bg: radial(ctx),
      under: [
        artEl('rangoli', -120, H - 380, 560, 460, [ctx.p.primary, goldOn(ctx), ctx.p.surface], { locked: true, opts: { style: 'alpona' } }),
        artEl('rangoli', W - 440, H - 380, 560, 460, [ctx.p.primary, goldOn(ctx), ctx.p.surface], { locked: true, opts: { style: 'alpona' } }),
        artEl('rangoli', W / 2 - 160, -150, 320, 300, [ctx.p.primary, goldOn(ctx), ctx.p.surface], { locked: true, opts: { style: 'alpona' } }),
      ],
    }),
    hero: (ctx) => [couple(ctx, 'watercolor', 'bengali', 380)],
  },
  {
    id: 'paithani', name: 'Paithani', category: 'wedding', eventTypes: WEDDINGS, communities: ['marathi'], tags: ['marathi', 'peacock', 'nauvari'],
    premium: true, palettes: ['emerald', 'plum', 'mustard', 'teal'], legacy: { layout: 'floral-frame', motif: 'peacock', pattern: 'paisley' },
    type: 'regal', date: 'rules', divider: 'ornate', zone: { top: 300, bottom: 220, left: 130, right: 130 },
    chrome: (ctx) => ({
      bg: radial(ctx, 'paisley', 0.08),
      under: [
        fullPage('border', [goldOn(ctx), ctx.p.accent], { style: 'paithani' }),
        artEl('peacock', -40, 20, 360, 360, ['#1B4F9C', '#2E8B57', goldOn(ctx)], { locked: true }),
        artEl('peacock', W - 320, 20, 360, 360, ['#1B4F9C', '#2E8B57', goldOn(ctx)], { locked: true, flipX: true }),
      ],
    }),
    hero: (ctx) => [couple(ctx, 'watercolor', 'marathi', 360)],
  },
  {
    id: 'phulkari', name: 'Phulkari', category: 'wedding', eventTypes: ['anand-karaj', 'wedding', 'engagement', 'reception'], communities: ['sikh', 'punjabi'],
    tags: ['sikh', 'phulkari', 'bright'], palettes: ['saffron', 'mustard', 'royalBlue', 'kumkum'], legacy: { layout: 'royal-arch', motif: 'khanda', pattern: 'paisley' },
    type: 'regal', date: 'rules', divider: 'simple', zone: { top: 200, bottom: 230, left: 140, right: 140 },
    chrome: (ctx) => ({
      bg: radial(ctx, 'confetti', 0.06),
      under: [fullPage('border', [goldOn(ctx), ctx.p.accent, '#2E8B57'], { style: 'phulkari' })],
    }),
    hero: (ctx) => [motif(ctx, 'khanda', 120), couple(ctx, 'caricature', 'sikh', 300)],
  },
  {
    id: 'noor-e-nikah', name: 'Noor-e-Nikah', category: 'wedding', eventTypes: ['nikah', 'engagement', 'reception'], communities: ['muslim'],
    tags: ['nikah', 'lanterns', 'crescent', 'mosque'], premium: true, palettes: ['emerald', 'navy', 'teal', 'onyx'],
    legacy: { layout: 'royal-arch', motif: 'crescent', pattern: 'jaali' }, type: 'mahal', date: 'rules', divider: 'ornate',
    zone: { top: 390, bottom: 430, left: 140, right: 140 },
    chrome: (ctx) => ({
      bg: linear(ctx, 'jaali', 0.08),
      under: [
        artEl('stars', 0, 0, W, H * 0.6, [goldOn(ctx)], { locked: true, opacity: 0.8 }),
        artEl('lantern', 90, 0, 150, 380, [goldOn(ctx), ctx.p.accent], { locked: true }),
        artEl('lantern', W - 240, 0, 150, 330, [goldOn(ctx), ctx.p.accent], { locked: true }),
        artEl('lantern', 270, 0, 110, 250, [goldOn(ctx), ctx.p.accent], { locked: true }),
        artEl('lantern', W - 380, 0, 110, 210, [goldOn(ctx), ctx.p.accent], { locked: true }),
        artEl('skyline', 0, H - 400, W, 400, [mix(ctx.p.backgroundAlt, '#000000', 0.25), goldOn(ctx)], { locked: true }),
      ],
    }),
    hero: (ctx) => [motif(ctx, 'crescent', 140)],
  },
  {
    id: 'wedding-bells', name: 'Wedding Bells', category: 'wedding', eventTypes: ['christian-wedding', 'engagement', 'anniversary'], communities: ['christian'],
    tags: ['church', 'doves', 'wreath', 'white'], palettes: ['ivory', 'sky', 'sage', 'blush'], legacy: { layout: 'botanical', motif: 'cross', pattern: 'none' },
    type: 'garden', date: 'rules', divider: 'leaf', zone: { top: 180, bottom: 170, left: 150, right: 150 },
    chrome: (ctx) => ({
      bg: radial(ctx),
      under: [
        artEl('wreath', W / 2 - 470, 120, 940, 940, ['#7A9A6B', ctx.p.accent], { locked: true, opacity: 0.32 }),
        ...bottomPair('floral-cluster', 360, [], { kind: 'jasmine' }, 30),
      ],
    }),
    hero: (ctx) => [art('doves', 260, 180, [ctx.p.surface === '#FFFFFF' ? '#FFFFFF' : ctx.p.surface, goldOn(ctx)])],
  },
  {
    id: 'haathi-baraat', name: 'Haathi Baraat', category: 'wedding', eventTypes: [...WEDDINGS, 'griha-pravesh', 'shop-opening'], communities: ['hindu-north', 'marwari', 'gujarati'],
    tags: ['elephant', 'royal', 'rajasthani'], premium: true, palettes: ['royalBlue', 'kumkum', 'teal', 'maroon'],
    legacy: { layout: 'royal-arch', motif: 'kalash', pattern: 'paisley' }, type: 'regal', date: 'rules', divider: 'ornate',
    zone: { top: 300, bottom: 440, left: 140, right: 140 },
    chrome: (ctx) => ({
      bg: radial(ctx, 'paisley', 0.08),
      under: [
        artEl('toran', 0, 0, W, 280, [ctx.p.accent], { locked: true }),
        artEl('elephant', 30, H - 420, 420, 380, [mix(ctx.p.background, '#FFFFFF', 0.12), ctx.p.accent, goldOn(ctx)], { locked: true }),
        artEl('elephant', W - 450, H - 420, 420, 380, [mix(ctx.p.background, '#FFFFFF', 0.12), ctx.p.accent, goldOn(ctx)], { locked: true, flipX: true }),
        shapeEl('line', 80, H - 50, W - 160, 3, { fill: goldOn(ctx) }),
      ],
    }),
    hero: (ctx) => [ganesha(ctx, 150)],
  },
  {
    id: 'mor-bagh', name: 'Mor Bagh', category: 'wedding', eventTypes: [...WEDDINGS, 'baby-shower'], tags: ['peacock', 'lotus', 'garden', 'mehendi'],
    palettes: ['teal', 'forest', 'navy', 'jade'], legacy: { layout: 'floral-frame', motif: 'peacock', pattern: 'leaves' }, type: 'mahal', date: 'bars', divider: 'lotus',
    zone: { top: 220, bottom: 380, left: 140, right: 140 },
    chrome: (ctx) => ({
      bg: radial(ctx, 'leaves', 0.08),
      under: [
        artEl('peacock', W - 420, H - 470, 460, 460, ['#1B6FB5', '#2E8B57', goldOn(ctx)], { locked: true, flipX: true }),
        artEl('lotus', 20, H - 300, 360, 260, ['#F4A6B7', '#2E8B57', goldOn(ctx)], { locked: true }),
        ...topPair('corner', 260, [goldOn(ctx)]),
      ],
    }),
    hero: (ctx) => [motif(ctx, 'peacock', 160)],
  },
  {
    id: 'haldi-mehndi', name: 'Haldi & Mehndi', category: 'wedding', eventTypes: WEDDINGS, tags: ['haldi', 'mehndi', 'leaves', 'marigold'],
    palettes: ['butter', 'mustard', 'sage', 'jade'], legacy: { layout: 'botanical', motif: 'lotus', pattern: 'leaves' }, type: 'brush', date: 'bars', divider: 'leaf',
    zone: { top: 330, bottom: 300, left: 140, right: 140 },
    chrome: (ctx) => ({
      bg: radial(ctx, 'leaves', 0.1),
      under: [
        artEl('bandhanwar', 0, 0, W, 280, ['#3E7B27', '#F2A900'], { locked: true }),
        ...bottomPair('sprig', 380, ['#3E7B27', '#F2A900']),
        artEl('rangoli', W / 2 - 150, H - 260, 300, 220, ['#F2A900', '#3E7B27', '#E2553D'], { locked: true, opts: { style: 'flower' } }),
      ],
    }),
    hero: (ctx) => [art('kalash', 150, 190, [goldOn(ctx), '#3E7B27', ctx.p.primary])],
  },
  {
    id: 'sangeet-night', name: 'Sangeet Night', category: 'wedding', eventTypes: [...WEDDINGS, 'birthday', 'corporate'], tags: ['sangeet', 'party', 'night', 'sparkle'],
    premium: true, palettes: ['onyx', 'plum', 'midnight', 'wine'], legacy: { layout: 'art-deco', motif: 'none', pattern: 'confetti' }, type: 'gala', date: 'rules', divider: 'deco',
    zone: { top: 260, bottom: 220, left: 140, right: 140 },
    chrome: (ctx) => ({
      bg: radial(ctx),
      under: [
        artEl('stars', 0, 0, W, H, [goldOn(ctx)], { locked: true }),
        artEl('sunburst', W / 2 - 520, 120, 1040, 1040, [goldOn(ctx)], { locked: true, opacity: 0.18 }),
        fullPage('border', [goldOn(ctx), ctx.p.accent], { style: 'deco' }),
      ],
      over: [artEl('confetti', 0, 0, W, 520, [goldOn(ctx), ctx.p.accent, '#FFFFFF'], { locked: true, opacity: 0.9 })],
    }),
  },
  {
    id: 'ring-ceremony', name: 'Ring Ceremony', category: 'wedding', eventTypes: ['engagement', 'anniversary', 'reception'], tags: ['engagement', 'rings', 'roses', 'pastel'],
    palettes: ['blush', 'lavender', 'wine', 'cream'], legacy: { layout: 'minimal-modern', motif: 'heart', pattern: 'none' }, type: 'script', date: 'line', divider: 'hearts',
    zone: { top: 200, bottom: 260, left: 150, right: 150 },
    chrome: (ctx) => ({
      bg: radial(ctx),
      under: [...corners4('floral-cluster', 330, [], -20, { kind: 'rose' })],
    }),
    hero: (ctx) => [art('rings', 230, 170, [goldOn(ctx), ctx.p.accent])],
  },
  {
    id: 'golden-years', name: 'Golden Years', category: 'wedding', eventTypes: ['anniversary', 'birthday', 'retirement'], tags: ['anniversary', 'gold', 'wreath', 'luxury'],
    premium: true, palettes: ['onyx', 'wine', 'navy', 'forest'], legacy: { layout: 'art-deco', motif: 'heart', pattern: 'none' }, type: 'deco', date: 'strip', divider: 'deco',
    zone: { top: 260, bottom: 240, left: 150, right: 150 },
    chrome: (ctx) => ({
      bg: radial(ctx),
      under: [
        fullPage('border', [goldOn(ctx), ctx.p.accent], { style: 'deco' }),
        artEl('wreath', W / 2 - 330, 170, 660, 660, [goldOn(ctx), ctx.p.accent], { locked: true, opacity: 0.6 }),
      ],
    }),
  },
  {
    id: 'photo-story', name: 'Photo Story', category: 'wedding', eventTypes: [...WEDDINGS, 'birthday', 'baby-shower', 'retirement'], communities: ['modern'],
    tags: ['photo', 'modern', 'arch'], premium: true, palettes: ['ivory', 'sage', 'blush', 'navy'], legacy: { layout: 'photo-frame', motif: 'none', pattern: 'none' },
    type: 'modern', date: 'line', divider: 'simple', zone: { top: 110, bottom: 130, left: 130, right: 130 },
    chrome: (ctx) => ({ bg: linear(ctx), under: [...bottomPair('sprig', 300, ['#7A9A6B', ctx.p.accent])] }),
    hero: () => [{ t: 'photo', w: 560, h: 700, mask: 'arch', gap: 30 }],
  },

  // ======================= Birthday & baby =======================
  {
    id: 'balloon-bash', name: 'Balloon Bash', category: 'kids', eventTypes: ['birthday', 'other'], tags: ['balloons', 'party', 'kids', 'confetti'],
    palettes: ['sky', 'candy', 'mint', 'butter'], legacy: { layout: 'festive-pop', motif: 'balloons', pattern: 'confetti' }, type: 'party', date: 'rules', divider: 'simple',
    zone: { top: 420, bottom: 170, left: 120, right: 120 },
    chrome: (ctx) => ({
      bg: radial(ctx, 'dots', 0.12),
      under: [
        artEl('glossy-balloons', -50, -10, 420, 588, [ctx.p.primary, ctx.p.accent, mix(ctx.p.primary, '#666666', 0.5)], { locked: true, opts: { bunch: 'cluster' } }),
        artEl('glossy-balloons', W - 380, 50, 400, 560, [ctx.p.accent, ctx.p.primary, mix(ctx.p.primary, '#666666', 0.5)], { locked: true, flipX: true, opts: { bunch: 'trio' } }),
      ],
      over: [artEl('confetti', 0, H - 520, W, 520, [ctx.p.primary, ctx.p.accent, '#FFB627'], { locked: true })],
    }),
  },
  {
    id: 'twinkle-star', name: 'Twinkle Twinkle', category: 'kids', eventTypes: KIDS, tags: ['baby', 'moon', 'stars', 'pastel'],
    palettes: ['babyBlue', 'babyPink', 'lavender', 'navy'], legacy: { layout: 'festive-pop', motif: 'balloons', pattern: 'dots' }, type: 'garden', date: 'rules', divider: 'stars',
    zone: { top: 160, bottom: 260, left: 130, right: 130 },
    chrome: (ctx) => ({
      bg: linear(ctx),
      under: [
        artEl('stars', 0, 0, W, H, [goldOn(ctx)], { locked: true, opacity: 0.7 }),
        artEl('clouds', 0, H - 330, W, 330, ['#FFFFFF', mix(ctx.p.backgroundAlt, '#FFFFFF', 0.4)], { locked: true }),
      ],
    }),
    hero: (ctx) => [art('baby-moon', 330, 300, ['#F8D57E', goldOn(ctx), '#FFFFFF'])],
  },
  {
    id: 'cake-party', name: 'Cake Party', category: 'kids', eventTypes: ['birthday', 'anniversary', 'retirement'], tags: ['cake', 'birthday', 'party'],
    palettes: ['candy', 'peach', 'mint', 'coral'], legacy: { layout: 'festive-pop', motif: 'balloons', pattern: 'confetti' }, type: 'party', date: 'rules', divider: 'simple',
    zone: { top: 130, bottom: 160, left: 120, right: 120 },
    chrome: (ctx) => ({
      bg: radial(ctx, 'confetti', 0.1),
      under: [
        artEl('glossy-balloons', -30, -10, 300, 420, [ctx.p.primary, ctx.p.accent, mix(ctx.p.primary, '#666666', 0.5)], { locked: true, opts: { bunch: 'trio' } }),
        artEl('glossy-balloons', W - 270, -10, 300, 420, [ctx.p.accent, ctx.p.primary, mix(ctx.p.primary, '#666666', 0.5)], { locked: true, flipX: true, opts: { bunch: 'trio' } }),
      ],
      over: [artEl('confetti', 0, 0, W, 420, [ctx.p.primary, ctx.p.accent, '#FFB627'], { locked: true, opacity: 0.9 })],
    }),
    hero: (ctx) => [art('cake', 340, 360, ['#FFF4E6', ctx.p.primary, ctx.p.accent])],
  },
  {
    id: 'godh-bharai', name: 'Godh Bharai', category: 'kids', eventTypes: ['baby-shower'], communities: ['hindu-north', 'gujarati', 'marathi'],
    tags: ['baby shower', 'marigold', 'lotus', 'traditional'], premium: true, palettes: ['babyPink', 'peach', 'marigold', 'lavender'],
    legacy: { layout: 'floral-frame', motif: 'lotus', pattern: 'paisley' }, type: 'mahal', date: 'bars', divider: 'lotus',
    zone: { top: 330, bottom: 290, left: 150, right: 150 },
    textBg: (ctx) => ctx.p.surface,
    chrome: (ctx) => ({
      bg: radial(ctx, 'paisley', 0.1),
      under: [
        panel(ctx, 100, 230, W - 200, H - 390, 60, 0.9),
        artEl('bandhanwar', 0, 0, W, 260, ['#2F7D32', '#F28C0F'], { locked: true }),
        ...bottomPair('floral-cluster', 360, [], { kind: 'lotus' }, 50),
      ],
    }),
    hero: () => [art('baby-moon', 240, 220, ['#F8D57E', '#C08B2C', '#FFFFFF'])],
  },
  {
    id: 'naamkaran-palna', name: 'Naamkaran Palna', category: 'kids', eventTypes: ['naming-ceremony', 'annaprashan', 'mundan'],
    tags: ['naming ceremony', 'cradle', 'kalash'], palettes: ['butter', 'babyBlue', 'mint', 'cream'], legacy: { layout: 'temple-heritage', motif: 'kalash', pattern: 'mandala' },
    type: 'garden', date: 'rules', divider: 'simple', zone: { top: 300, bottom: 220, left: 140, right: 140 },
    chrome: (ctx) => ({
      bg: radial(ctx, 'mandala', 0.08),
      under: [artEl('bandhanwar', 0, 0, W, 260, ['#2F7D32', '#F28C0F'], { locked: true }), ...bottomPair('floral-cluster', 300, [], { kind: 'mixed' }, 30)],
    }),
    hero: (ctx) => [art('cradle', 320, 260, [goldOn(ctx), ctx.p.primary, '#FFFFFF'])],
  },
  {
    id: 'milestone-gold', name: 'Milestone Gold', category: 'kids', eventTypes: ['birthday', 'anniversary', 'retirement', 'corporate'], communities: ['modern'],
    tags: ['50th', 'milestone', 'luxury', 'sparkle'], premium: true, palettes: ['onyx', 'navy', 'wine', 'emerald'], legacy: { layout: 'art-deco', motif: 'none', pattern: 'none' },
    type: 'deco', date: 'stack', divider: 'deco', zone: { top: 230, bottom: 220, left: 150, right: 150 },
    chrome: (ctx) => ({
      bg: radial(ctx),
      under: [artEl('sunburst', W / 2 - 600, -200, 1200, 1200, [goldOn(ctx)], { locked: true, opacity: 0.16 }), artEl('stars', 0, 0, W, H, [goldOn(ctx)], { locked: true, opacity: 0.8 })],
      over: [artEl('confetti', 0, H - 460, W, 460, [goldOn(ctx), ctx.p.accent, '#FFFFFF'], { locked: true, opacity: 0.85 })],
    }),
  },
  {
    id: 'cloud-nine', name: 'Cloud Nine', category: 'kids', eventTypes: KIDS, tags: ['kids', 'clouds', 'rainbow', 'modern'],
    palettes: ['sky', 'mint', 'babyPink', 'butter'], legacy: { layout: 'minimal-modern', motif: 'balloons', pattern: 'dots' }, type: 'playful', date: 'line', divider: 'stars',
    zone: { top: 200, bottom: 380, left: 120, right: 120 },
    chrome: (ctx) => ({
      bg: linear(ctx),
      under: [
        artEl('rainbow', W / 2 - 330, 60, 660, 360, ['#F28B82', '#FBBC04', '#81C995', '#8AB4F8'], { locked: true, opacity: 0.9 }),
        artEl('clouds', 0, H - 420, W, 420, ['#FFFFFF', mix(ctx.p.backgroundAlt, '#FFFFFF', 0.5)], { locked: true }),
      ],
    }),
  },

  // ======================= Home & religious =======================
  {
    id: 'naya-ghar', name: 'Naya Ghar', category: 'religious', eventTypes: ['griha-pravesh', 'puja'], tags: ['housewarming', 'home', 'kalash', 'bandhanwar'],
    premium: true, palettes: ['marigold', 'kumkum', 'butter', 'emerald'], legacy: { layout: 'temple-heritage', motif: 'kalash', pattern: 'mandala' }, type: 'regal', date: 'rules', divider: 'simple',
    zone: { top: 300, bottom: 200, left: 140, right: 140 },
    chrome: (ctx) => ({
      bg: radial(ctx, 'mandala', 0.08),
      under: [artEl('bandhanwar', 0, 0, W, 270, ['#2F7D32', '#F28C0F'], { locked: true }), ...bottomPair('floral-cluster', 320, [], { kind: 'marigold' }, 40)],
    }),
    hero: (ctx) => [art('house', 380, 330, [ctx.p.surface, ctx.p.primary, goldOn(ctx)])],
  },
  {
    id: 'mangal-kalash', name: 'Mangal Kalash', category: 'religious', eventTypes: SACRED, tags: ['puja', 'katha', 'kalash', 'bells', 'rangoli'],
    palettes: ['saffron', 'temple', 'kumkum', 'mustard'], legacy: { layout: 'royal-arch', motif: 'kalash', pattern: 'mandala' }, type: 'regal', date: 'rules', divider: 'lotus',
    zone: { top: 260, bottom: 320, left: 150, right: 150 },
    chrome: (ctx) => ({
      bg: radial(ctx, 'mandala', 0.1),
      under: [
        artEl('bells', 40, 0, 190, 360, [goldOn(ctx)], { locked: true }),
        artEl('bells', W - 230, 0, 190, 360, [goldOn(ctx)], { locked: true, flipX: true }),
        artEl('rangoli', W / 2 - 260, H - 330, 520, 300, [goldOn(ctx), '#FFFFFF', ctx.p.accent], { locked: true, opts: { style: 'flower' } }),
      ],
    }),
    hero: (ctx) => [art('kalash', 210, 260, [goldOn(ctx), '#2F7D32', ctx.p.accent])],
  },
  {
    id: 'mata-ki-chowki', name: 'Mata ki Chowki', category: 'religious', eventTypes: ['jagran', 'bhandara', 'puja'], tags: ['jagran', 'diya', 'devotional', 'red'],
    palettes: ['kumkum', 'temple', 'saffron'], legacy: { layout: 'festive-pop', motif: 'diya', pattern: 'mandala' }, type: 'regal', date: 'rules', divider: 'simple',
    zone: { top: 300, bottom: 360, left: 140, right: 140 },
    chrome: (ctx) => ({
      bg: radial(ctx, 'mandala', 0.1),
      under: [
        artEl('sunburst', W / 2 - 520, -120, 1040, 1040, [goldOn(ctx)], { locked: true, opacity: 0.2 }),
        artEl('toran', 0, 0, W, 260, [ctx.p.accent], { locked: true }),
        artEl('diya-row', 60, H - 300, W - 120, 220, [goldOn(ctx), '#FFB627'], { locked: true }),
      ],
    }),
    hero: (ctx) => [motif(ctx, 'diya', 170)],
  },
  {
    id: 'deep-jyoti', name: 'Deep Jyoti', category: 'religious', eventTypes: [...SACRED, 'other', 'shop-opening'], tags: ['diwali', 'diya', 'lights', 'festival'],
    premium: true, palettes: ['onyx', 'plum', 'navy', 'maroon'], legacy: { layout: 'royal-arch', motif: 'diya', pattern: 'mandala' }, type: 'gala', date: 'rules', divider: 'ornate',
    zone: { top: 230, bottom: 450, left: 150, right: 150 },
    chrome: (ctx) => ({
      bg: radial(ctx, 'mandala', 0.06),
      under: [
        artEl('stars', 0, 0, W, H * 0.7, [goldOn(ctx)], { locked: true, opacity: 0.7 }),
        artEl('rangoli', W / 2 - 330, H - 420, 660, 420, [goldOn(ctx), '#E2553D', '#FFB627'], { locked: true, opts: { style: 'flower' }, opacity: 0.9 }),
        artEl('diya-row', 80, H - 250, W - 160, 200, [goldOn(ctx), '#FFB627'], { locked: true }),
      ],
    }),
    hero: (ctx) => [art('diya', 200, 200, [goldOn(ctx)])],
  },
  {
    id: 'om-kamal', name: 'Om Kamal', category: 'religious', eventTypes: SACRED, tags: ['om', 'lotus', 'minimal', 'puja'],
    palettes: ['ivory', 'cream', 'sage', 'saffron'], legacy: { layout: 'temple-heritage', motif: 'om', pattern: 'none' }, type: 'petal', date: 'rules', divider: 'lotus',
    zone: { top: 170, bottom: 330, left: 160, right: 160 },
    chrome: (ctx) => ({
      bg: radial(ctx),
      under: [
        artEl('mandala', W / 2 - 480, 80, 960, 960, [goldOn(ctx)], { locked: true, opacity: 0.08 }),
        artEl('lotus', W / 2 - 280, H - 330, 560, 300, ['#F4A6B7', '#5D8C4A', goldOn(ctx)], { locked: true }),
      ],
    }),
    hero: (ctx) => [motif(ctx, 'om', 170)],
  },
  {
    id: 'eid-milan', name: 'Eid Milan', category: 'religious', eventTypes: ['other', 'nikah', 'bhandara'], communities: ['muslim'], tags: ['eid', 'lanterns', 'crescent', 'dawat'],
    palettes: ['emerald', 'navy', 'teal'], legacy: { layout: 'royal-arch', motif: 'crescent', pattern: 'jaali' }, type: 'mahal', date: 'rules', divider: 'ornate',
    zone: { top: 380, bottom: 360, left: 150, right: 150 },
    chrome: (ctx) => ({
      bg: linear(ctx, 'jaali', 0.1),
      under: [
        artEl('lantern', 150, 0, 140, 360, [goldOn(ctx), ctx.p.accent], { locked: true }),
        artEl('lantern', W / 2 - 60, 0, 120, 260, [goldOn(ctx), ctx.p.accent], { locked: true }),
        artEl('lantern', W - 290, 0, 140, 320, [goldOn(ctx), ctx.p.accent], { locked: true }),
        artEl('skyline', 0, H - 330, W, 330, [mix(ctx.p.backgroundAlt, '#000000', 0.2), goldOn(ctx)], { locked: true }),
      ],
    }),
    hero: (ctx) => [motif(ctx, 'crescent', 130)],
  },
  {
    id: 'yagnopavit', name: 'Yagnopavit', category: 'religious', eventTypes: ['upanayana', 'mundan', 'naming-ceremony', 'puja'], communities: ['hindu-north', 'hindu-south', 'marathi'],
    tags: ['upanayan', 'sacred', 'sun'], palettes: ['saffron', 'mustard', 'temple', 'cream'], legacy: { layout: 'royal-arch', motif: 'om', pattern: 'mandala' }, type: 'regal', date: 'rules', divider: 'ornate',
    zone: { top: 260, bottom: 200, left: 150, right: 150 },
    chrome: (ctx) => ({
      bg: radial(ctx, 'mandala', 0.08),
      under: [artEl('sunburst', W / 2 - 480, -260, 960, 960, [goldOn(ctx)], { locked: true, opacity: 0.22 }), fullPage('border', [goldOn(ctx), ctx.p.accent], { style: 'temple' })],
    }),
    hero: (ctx) => [ganesha(ctx, 160)],
  },

  // ======================= Business & others =======================
  {
    id: 'grand-opening', name: 'Grand Opening', category: 'business', eventTypes: ['shop-opening', 'corporate'], tags: ['inauguration', 'ribbon', 'launch'],
    premium: true, palettes: ['royalBlue', 'kumkum', 'emerald', 'onyx'], legacy: { layout: 'royal-arch', motif: 'shree', pattern: 'none' }, type: 'corporate', date: 'rules', divider: 'simple',
    zone: { top: 470, bottom: 200, left: 130, right: 130 },
    chrome: (ctx) => ({
      bg: radial(ctx),
      under: [artEl('ribbon', 0, 160, W, 360, [ctx.p.primary === ctx.p.accent ? '#C8102E' : '#C8102E', goldOn(ctx)], { locked: true }), artEl('stars', 0, 0, W, H, [goldOn(ctx)], { locked: true, opacity: 0.5 })],
      over: [artEl('confetti', 0, 0, W, 480, [goldOn(ctx), '#FFFFFF', ctx.p.accent], { locked: true, opacity: 0.85 })],
    }),
  },
  {
    id: 'shubh-labh', name: 'Shubh Labh', category: 'business', eventTypes: ['shop-opening', 'griha-pravesh', 'puja'], communities: ['marwari', 'gujarati', 'hindu-north'],
    tags: ['shubh labh', 'ganesha', 'bandhanwar', 'muhurat'], palettes: ['marigold', 'kumkum', 'butter'], legacy: { layout: 'temple-heritage', motif: 'shree', pattern: 'paisley' },
    type: 'regal', date: 'rules', divider: 'simple', zone: { top: 300, bottom: 220, left: 140, right: 140 },
    chrome: (ctx) => ({
      bg: radial(ctx, 'paisley', 0.1),
      under: [
        artEl('bandhanwar', 0, 0, W, 270, ['#2F7D32', '#F28C0F'], { locked: true }),
        artEl('motif', 60, 300, 150, 150, [goldOn(ctx), ctx.p.accent], { locked: true, opts: { motif: 'kalash' } }),
        artEl('motif', W - 210, 300, 150, 150, [goldOn(ctx), ctx.p.accent], { locked: true, opts: { motif: 'kalash' } }),
        ...bottomPair('floral-cluster', 300, [], { kind: 'marigold' }, 30),
      ],
    }),
    hero: (ctx) => [ganesha(ctx, 160)],
  },
  {
    id: 'black-tie', name: 'Black Tie', category: 'business', eventTypes: ['corporate', 'retirement', 'anniversary', 'other'], communities: ['modern'], tags: ['gala', 'corporate', 'luxury'],
    premium: true, palettes: ['onyx', 'navy', 'teal'], legacy: { layout: 'art-deco', motif: 'none', pattern: 'none' }, type: 'deco', date: 'stack', divider: 'deco',
    zone: { top: 260, bottom: 240, left: 160, right: 160 },
    chrome: (ctx) => ({ bg: linear(ctx), under: [fullPage('border', [goldOn(ctx), ctx.p.accent], { style: 'deco' })] }),
  },
  {
    id: 'clean-slate', name: 'Clean Slate', category: 'business', eventTypes: BUSINESS, communities: ['modern'], tags: ['minimal', 'modern', 'corporate'],
    palettes: ['ivory', 'sky', 'sage', 'coral'], legacy: { layout: 'minimal-modern', motif: 'none', pattern: 'none' }, type: 'corporate', date: 'line', divider: 'simple',
    zone: { top: 260, bottom: 240, left: 130, right: 130 },
    chrome: (ctx) => ({
      bg: solidBg(ctx.p.background),
      under: [
        shapeEl('rect', 0, 0, W, 150, { fill: ctx.p.primary }),
        shapeEl('ellipse', W - 340, -180, 520, 520, { fill: ctx.p.accent, fillOpacity: 0.35 }),
        shapeEl('rect', 0, H - 70, W, 70, { fill: ctx.p.primary }),
      ],
    }),
  },
  {
    id: 'farewell-cheers', name: 'Cheers', category: 'business', eventTypes: ['retirement', 'other', 'corporate', 'birthday'], tags: ['retirement', 'farewell', 'party'],
    palettes: ['navy', 'forest', 'wine', 'peach'], legacy: { layout: 'botanical', motif: 'none', pattern: 'none' }, type: 'classic', date: 'strip', divider: 'leaf',
    zone: { top: 240, bottom: 260, left: 150, right: 150 },
    chrome: (ctx) => ({
      bg: radial(ctx),
      under: [...corners4('sprig', 300, [isDarkColor(ctx.p.background) ? goldOn(ctx) : '#6E8B5A', ctx.p.accent], -10)],
      over: [artEl('confetti', 0, 0, W, 420, [goldOn(ctx), ctx.p.accent, '#FFFFFF'], { locked: true, opacity: 0.8 })],
    }),
    hero: (ctx) => [art('gift', 200, 200, [ctx.p.primary, goldOn(ctx)])],
  },
];
