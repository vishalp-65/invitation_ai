import { artEl, shapeEl, solidBg, TYPE_SETS, type Band, type RecipeCtx, type TypeSetKey } from './builder.js';
import { isDarkColor, mix } from './color.js';
import { ALL_WEDDINGS, ganesha, goldOn, motif, radial, SACRED, trueGold, WEDDINGS, type DesignFamily } from './families.js';
import { DESIGN_H, DESIGN_W, type DesignElement } from './schema.js';

/**
 * "Atelier" collection (Nov 2026): premium suites drawn after the best-selling printed
 * invitations — maroon scalloped arches with lanterns and white peonies, lavender gardens with
 * butterflies and a floral gold ring, blue watercolour roses with brush-script names, pink
 * roses around a gold hoop. Each family pairs the reference's Latin type (see TYPE_SETS) with
 * a matching Devanagari set, so a Hindi card keeps the same mood.
 */

const W = DESIGN_W;
const H = DESIGN_H;

// ------------------------------------------------------------ helpers

export const WHITE_BLOOMS = ['#FFF9F0', '#E5D5BC', '#5E7D4A', '#E9B949'];
/** The palette as seen on its light surface (for gold that sits on a cream panel). */
export const onSurface = (ctx: RecipeCtx): RecipeCtx => ({ ...ctx, p: { ...ctx.p, background: ctx.p.surface } });

export function corner(asset: string, where: 'tl' | 'tr' | 'bl' | 'br', size: number, colors: string[], opts?: Record<string, string | number | boolean>, inset = 0, opacity = 1): DesignElement {
  const x = where === 'tl' || where === 'bl' ? inset : W - size - inset;
  const y = where === 'tl' || where === 'tr' ? inset : H - size - inset;
  return artEl(asset, x, y, size, size, colors, { opts, locked: true, flipX: where === 'tr' || where === 'br', flipY: where === 'bl' || where === 'br', opacity });
}

/** Watercolour petals from the palette (deep primaries are lifted so blooms stay soft). */
export function petals(ctx: RecipeCtx, base?: string, leaf = '#7A9A6B'): string[] {
  const p = base ?? mix(ctx.p.primary, '#FFFFFF', isDarkColor(ctx.p.primary) ? 0.4 : 0.18);
  return [p, mix(p, '#2A1420', 0.38), leaf, '#E9C46A'];
}

const lanterns = (ctx: RecipeCtx, xs: number[], lens: number[], w = 92): DesignElement[] =>
  xs.map((x, i) => artEl('lantern', x - w / 2, 0, w, lens[i % lens.length]!, [trueGold(ctx), '#FFE29A'], { locked: true }));

const laceBands = (ctx: RecipeCtx, h = 86): DesignElement[] => {
  const g = trueGold(ctx);
  return [
    artEl('lace-band', 0, 0, W, h, [g, mix(g, '#FFFFFF', 0.5)], { locked: true }),
    artEl('lace-band', 0, H - h, W, h, [g, mix(g, '#FFFFFF', 0.5)], { locked: true, flipY: true }),
  ];
};

/**
 * Names set inside a ring (floral gold ring, hoop): the ring band, then the names pulled back
 * up over it with a negative gap, then a spacer so the next band starts below the ring.
 */
export function namesInRing(type: TypeSetKey, ring: Extract<Band, { t: 'art' }>, nameSize: number): Band[] {
  const ts = TYPE_SETS[type];
  const nh = nameSize * (ts.names.lh ?? 1.25) * 1.08;
  const ch = ts.connector.size * 0.8 * (ts.connector.lh ?? 1.25) * 1.08;
  const block = nh * 2 + ch + 8;
  return [
    ring,
    { t: 'text', role: 'names', bind: 'name1', size: nameSize, gap: -(ring.h / 2 + block / 2) },
    { t: 'text', role: 'connector', bind: 'connector', size: ts.connector.size * 0.8, gap: 4 },
    { t: 'text', role: 'names', bind: 'name2', size: nameSize, gap: 4 },
    { t: 'gap', h: Math.max(0, ring.h / 2 - block / 2 - 30) },
  ];
}

export const coupleNames = (size?: number): Band[] => [
  { t: 'text', role: 'names', bind: 'name1', gap: 26, ...(size ? { size } : {}) },
  { t: 'text', role: 'connector', bind: 'connector', gap: 2 },
  { t: 'text', role: 'names', bind: 'name2', gap: 2, ...(size ? { size } : {}) },
];

/** One person (birthday, puja host) or none: a single name line, else the headline. */
export const soloOrNames = (ctx: RecipeCtx, size?: number): Band[] =>
  ctx.people === 2
    ? coupleNames(size)
    : ctx.people === 1
      ? [{ t: 'text', role: 'name', bind: 'name1', gap: 24 }, { t: 'text', role: 'detail', bind: 'detail1', gap: 6 }]
      : [{ t: 'text', role: 'headline', bind: 'headline', gap: 20, size: 70 }, { t: 'text', role: 'body', bind: 'message', gap: 18 }];

export const venue: Band[] = [
  { t: 'text', role: 'venue', bind: 'fnM.venue', gap: 26 },
  { t: 'text', role: 'small', bind: 'fnM.address', gap: 4 },
];

// ------------------------------------------------------------ families

export const ATELIER_FAMILIES: DesignFamily[] = [
  // 1. Maroon scalloped arch on cream damask, hanging lanterns, white peonies + mimosa, gold lace.
  {
    id: 'raat-mahal', name: 'Raat Mahal', category: 'wedding', eventTypes: ALL_WEDDINGS, communities: ['hindu-north', 'marwari', 'punjabi', 'gujarati'],
    tags: ['lanterns', 'scalloped arch', 'white peonies', 'mimosa', 'maroon', 'gold lace'], styles: ['traditional', 'floral', 'arch', 'luxury'], premium: true,
    palettes: ['maroon', 'wine', 'navy', 'forest'], legacy: { layout: 'jharokha', motif: 'none', pattern: 'mandala' },
    type: 'mahal', date: 'bars', divider: 'ornate', zone: { top: 430, bottom: 300, left: 300, right: 300 },
    innerZone: { top: 470, bottom: 300, left: 290, right: 290 },
    sampleLanguage: 'en',
    chrome: (ctx) => ({
      bg: solidBg(ctx.p.surface, mix(ctx.p.surface, ctx.p.accent, 0.22), 'radial', 'mandala', goldOn(onSurface(ctx)), 0.13),
      under: [
        ...laceBands(ctx, 80),
        artEl('arch-panel', 120, 112, W - 240, H - 176, [ctx.p.background, ctx.p.primary, ctx.p.accent], { locked: true, opts: { shape: 'scallop' } }),
        ...lanterns(ctx, [176, 254, W - 254, W - 176], [600, 470], 84),
        artEl('bloom-corner', -110, H * 0.4, 360, 360, WHITE_BLOOMS, { locked: true, opts: { kind: 'peony' }, flipY: true }),
        artEl('bloom-corner', W - 250, H * 0.4, 360, 360, WHITE_BLOOMS, { locked: true, opts: { kind: 'peony' }, flipX: true, flipY: true }),
        corner('bloom-corner', 'bl', 520, WHITE_BLOOMS, { kind: 'peony' }, -70),
        corner('bloom-corner', 'br', 520, WHITE_BLOOMS, { kind: 'peony' }, -70),
        corner('bloom-corner', 'tl', 330, WHITE_BLOOMS, { kind: 'daisy' }, -70),
        corner('bloom-corner', 'tr', 330, WHITE_BLOOMS, { kind: 'daisy' }, -70),
      ],
    }),
    textBg: (ctx) => ctx.p.background,
    bands: (ctx) => [
      { t: 'text', role: 'host', bind: 'hostLine', gap: 0 },
      ...soloOrNames(ctx),
      { t: 'divider', style: 'ornate', gap: 26, w: 360 },
      { t: 'text', role: 'body', bind: 'message', gap: 22 },
      { t: 'date', style: 'bars', gap: 34 },
      ...venue,
    ],
  },
  // 2. Lavender watercolour garden, butterflies, gold flecks, names inside a floral gold ring.
  {
    id: 'titli-bagh', name: 'Titli Bagh', category: 'wedding', eventTypes: ALL_WEDDINGS, communities: ['modern', 'christian', 'hindu-north'],
    tags: ['butterflies', 'lavender', 'watercolour', 'gold ring', 'hydrangea', 'pastel'], styles: ['floral', 'watercolour', 'pastel', 'luxury'], premium: true,
    palettes: ['lavender', 'babyBlue', 'blush', 'sage'], legacy: { layout: 'botanical', motif: 'none', pattern: 'none' },
    type: 'garden', date: 'bars', divider: 'leaf', zone: { top: 170, bottom: 190, left: 150, right: 150 },
    innerZone: { top: 300, bottom: 260, left: 170, right: 170 },
    sampleLanguage: 'en',
    chrome: (ctx) => {
      const leaf = mix(ctx.p.primary, '#FFFFFF', 0.35);
      const flowers = petals(ctx, undefined, mix(ctx.p.primary, '#6E8B5A', 0.5));
      const wing = mix(ctx.p.primary, '#FFFFFF', 0.15);
      return {
        bg: radial(ctx),
        under: [
          artEl('wash', -160, -120, 760, 720, [mix(ctx.p.primary, '#FFFFFF', 0.78), mix(ctx.p.accent, '#FFFFFF', 0.7)], { locked: true, opts: { seed: 4 } }),
          artEl('wash', W - 600, H - 640, 760, 720, [mix(ctx.p.primary, '#FFFFFF', 0.78), mix(ctx.p.accent, '#FFFFFF', 0.7)], { locked: true, opts: { seed: 9 } }),
          artEl('greenery', -80, H * 0.3, 420, 420, [leaf, mix(leaf, ctx.p.primary, 0.4)], { locked: true, opts: { kind: 'olive' }, opacity: 0.75 }),
          artEl('greenery', W - 340, H * 0.36, 420, 420, [leaf, mix(leaf, ctx.p.primary, 0.4)], { locked: true, opts: { kind: 'olive' }, flipX: true, opacity: 0.75 }),
          artEl('gold-dust', 520, 0, 560, 520, [trueGold(ctx)], { locked: true, opts: { seed: 3 } }),
          artEl('gold-dust', 0, H - 560, 560, 560, [trueGold(ctx)], { locked: true, opts: { seed: 8 } }),
          corner('bloom-corner', 'tl', 440, flowers, { kind: 'hydrangea' }, -50),
          corner('bloom-corner', 'br', 470, flowers, { kind: 'hydrangea' }, -50),
          corner('bloom-corner', 'tr', 280, flowers, { kind: 'peony' }, -40),
          corner('bloom-corner', 'bl', 300, flowers, { kind: 'peony' }, -40),
          artEl('butterfly', W - 330, 470, 170, 136, [wing, mix(wing, '#2A1A4A', 0.45), '#3B2A4A'], { locked: true, rot: 16 }),
          artEl('butterfly', 120, H - 700, 140, 112, [wing, mix(wing, '#2A1A4A', 0.45), '#3B2A4A'], { locked: true, rot: -18 }),
        ],
      };
    },
    bands: (ctx) => [
      { t: 'text', role: 'eyebrow', bind: 'headline', gap: 0 },
      ...(ctx.people === 2
        ? namesInRing('garden', { t: 'art', asset: 'bloom-ring', w: 640, h: 640, colors: [trueGold(ctx), ...petals(ctx).slice(0, 2), mix(ctx.p.primary, '#6E8B5A', 0.55)], opts: { kind: 'hydrangea', scale: 0.82 }, gap: 54, anim: 'zoom' }, 118)
        : soloOrNames(ctx)),
      { t: 'text', role: 'host', bind: 'hostLine', gap: 56 },
      { t: 'date', style: 'bars', gap: 30 },
      ...venue,
    ],
  },
  // 3. Dusty-blue watercolour wash, blue roses with olive leaves, signature-brush names.
  {
    id: 'neel-gulab', name: 'Neel Gulab', category: 'wedding', eventTypes: ALL_WEDDINGS, communities: ['modern', 'christian', 'muslim'],
    tags: ['blue roses', 'watercolour', 'brush script', 'dusty blue', 'minimal'], styles: ['floral', 'watercolour', 'minimal', 'modern'], premium: true,
    palettes: ['dustyBlue', 'babyBlue', 'sage', 'dustyRose'], legacy: { layout: 'botanical', motif: 'none', pattern: 'none' },
    type: 'brush', date: 'bars', divider: 'simple', zone: { top: 200, bottom: 200, left: 140, right: 140 },
    innerZone: { top: 300, bottom: 260, left: 170, right: 170 },
    sampleLanguage: 'en',
    chrome: (ctx) => {
      const rose = petals(ctx, mix(ctx.p.primary, '#FFFFFF', 0.32), '#8A8458');
      const wash = [mix(ctx.p.primary, '#FFFFFF', 0.72), mix(ctx.p.primary, '#FFFFFF', 0.86)];
      return {
        bg: solidBg(ctx.p.background === '#FFFFFF' ? '#FBFDFF' : mix(ctx.p.background, '#FFFFFF', 0.5)),
        under: [
          artEl('wash', W - 760, -160, 900, 860, wash, { locked: true, opts: { seed: 2 } }),
          artEl('wash', -260, H - 820, 980, 920, wash, { locked: true, opts: { seed: 7 } }),
          artEl('wash', -200, H * 0.3, 520, 520, wash, { locked: true, opts: { seed: 12 }, opacity: 0.6 }),
          corner('bloom-corner', 'tl', 380, rose, { kind: 'rose' }, -40),
          artEl('bloom-corner', W - 280, H * 0.38, 330, 330, rose, { locked: true, opts: { kind: 'rose' }, flipX: true }),
          corner('bloom-corner', 'br', 300, rose, { kind: 'rose' }, -30),
        ],
      };
    },
    bands: (ctx) => [
      { t: 'text', role: 'eyebrow', bind: 'headline', gap: 0 },
      ...soloOrNames(ctx),
      { t: 'text', role: 'host', bind: 'hostLine', gap: 30 },
      { t: 'date', style: 'bars', gap: 46 },
      ...venue,
    ],
  },
  // 4. Pink watercolour roses climbing a gold hoop; Cormorant capitals with an Italianno "and".
  {
    id: 'gulab-ring', name: 'Gulab Ring', category: 'wedding', eventTypes: ALL_WEDDINGS, communities: ['modern', 'christian', 'hindu-north'],
    tags: ['pink roses', 'gold ring', 'watercolour', 'blush', 'romantic'], styles: ['floral', 'watercolour', 'pastel', 'luxury'], premium: true,
    palettes: ['blush', 'babyPink', 'champagne', 'dustyRose'], legacy: { layout: 'botanical', motif: 'none', pattern: 'none' },
    type: 'petal', date: 'bars', divider: 'simple', zone: { top: 110, bottom: 230, left: 140, right: 140 },
    innerZone: { top: 300, bottom: 300, left: 170, right: 170 },
    sampleLanguage: 'en',
    chrome: (ctx) => {
      const rose = petals(ctx, mix(ctx.p.primary, '#E9799A', 0.55), '#8C9A7A');
      const wash = [mix(rose[0]!, '#FFFFFF', 0.62), mix(rose[0]!, '#FFFFFF', 0.82)];
      return {
        bg: radial(ctx),
        under: [
          artEl('wash', W - 520, 120, 700, 820, wash, { locked: true, opts: { seed: 5 } }),
          artEl('wash', -240, H - 760, 820, 860, wash, { locked: true, opts: { seed: 11 } }),
          artEl('wash', -140, 380, 420, 520, wash, { locked: true, opts: { seed: 14 }, opacity: 0.7 }),
          corner('bloom-corner', 'bl', 380, rose, { kind: 'rose' }, -40),
          corner('bloom-corner', 'br', 330, rose, { kind: 'rose' }, -40),
        ],
      };
    },
    bands: (ctx) => {
      const rose = petals(ctx, mix(ctx.p.primary, '#E9799A', 0.55), '#8C9A7A');
      return [
        ...(ctx.people === 2
          ? namesInRing('petal', { t: 'art', asset: 'bloom-ring', w: 700, h: 700, colors: [trueGold(ctx), rose[0]!, rose[1]!, '#8C9A7A'], opts: { kind: 'rose', layout: 'left', scale: 0.85 }, gap: 0, anim: 'zoom' }, 96)
          : soloOrNames(ctx)),
        { t: 'text', role: 'host', bind: 'hostLine', gap: 24 },
        { t: 'date', style: 'bars', gap: 30 },
        ...venue,
        { t: 'text', role: 'connector', bind: 'closing', gap: 22, size: 64 },
      ];
    },
  },
  // 5. Navy/emerald Mughal arch in gold, lace bands, lanterns, gold flecks, Ganesha.
  {
    id: 'sheesh-mahal', name: 'Sheesh Mahal', category: 'wedding', eventTypes: WEDDINGS, communities: ['hindu-north', 'marwari', 'gujarati', 'punjabi'],
    tags: ['royal', 'gold', 'mughal arch', 'lanterns', 'ganesha', 'night'], styles: ['royal', 'traditional', 'luxury', 'dark', 'arch'], premium: true,
    palettes: ['navy', 'emerald', 'plum', 'onyx'], legacy: { layout: 'royal-arch', motif: 'shree', pattern: 'jaali' },
    type: 'regal', date: 'strip', divider: 'ornate', zone: { top: 330, bottom: 250, left: 200, right: 200 },
    chrome: (ctx) => {
      const g = trueGold(ctx);
      return {
        bg: radial(ctx, 'jaali', 0.07),
        under: [
          artEl('mandala', W / 2 - 480, H / 2 - 420, 960, 960, [g], { locked: true, opacity: 0.08 }),
          artEl('gold-dust', 0, 0, W, 640, [g], { locked: true, opts: { seed: 21 }, opacity: 0.85 }),
          artEl('arch-panel', 110, 150, W - 220, H - 270, [mix(ctx.p.background, '#FFFFFF', 0.05), g, ctx.p.accent], { locked: true, opts: { shape: 'mughal' } }),
          ...laceBands(ctx, 76),
          ...lanterns(ctx, [118, W - 118], [470], 84),
          corner('greenery', 'bl', 400, [g, mix(g, '#FFFFFF', 0.4)], { kind: 'olive' }, -40, 0.75),
          corner('greenery', 'br', 400, [g, mix(g, '#FFFFFF', 0.4)], { kind: 'olive' }, -40, 0.75),
        ],
      };
    },
    hero: (ctx) => [{ ...ganesha(ctx, 150), colors: [trueGold(ctx), ctx.p.accent] }],
  },
  // 6. Blush palace window: white scalloped arch, rose bouquets at its base, butterflies.
  {
    id: 'gulabi-jharokha', name: 'Gulabi Jharokha', category: 'wedding', eventTypes: WEDDINGS, communities: ['hindu-north', 'marwari', 'gujarati', 'punjabi'],
    tags: ['scalloped arch', 'roses', 'butterflies', 'blush', 'jharokha', 'ganesha'], styles: ['traditional', 'floral', 'arch', 'pastel'], premium: true,
    palettes: ['blush', 'peach', 'dustyRose', 'cream'], legacy: { layout: 'jharokha', motif: 'shree', pattern: 'paisley' },
    type: 'mahal', date: 'bars', divider: 'ornate', zone: { top: 400, bottom: 300, left: 210, right: 210 },
    textBg: (ctx) => ctx.p.surface,
    chrome: (ctx) => {
      const rose = petals(ctx, mix(ctx.p.primary, '#E9799A', 0.45));
      const g = trueGold(onSurface(ctx));
      return {
        bg: radial(ctx, 'paisley', 0.09),
        under: [
          artEl('arch-panel', 110, 130, W - 220, H - 200, [ctx.p.surface, g, ctx.p.primary], { locked: true, opts: { shape: 'scallop' } }),
          artEl('gold-dust', 140, 120, W - 280, 420, [g], { locked: true, opts: { seed: 31 }, opacity: 0.7 }),
          corner('bloom-corner', 'bl', 470, rose, { kind: 'rose' }, -40),
          corner('bloom-corner', 'br', 470, rose, { kind: 'rose' }, -40),
          corner('bloom-corner', 'tl', 300, rose, { kind: 'peony' }, -40),
          corner('bloom-corner', 'tr', 300, rose, { kind: 'peony' }, -40),
          artEl('butterfly', W - 330, 300, 130, 104, [mix(ctx.p.primary, '#FFFFFF', 0.2), ctx.p.primary, '#4A2730'], { locked: true, rot: 14 }),
          artEl('butterfly', 200, 360, 100, 80, [mix(ctx.p.primary, '#FFFFFF', 0.2), ctx.p.primary, '#4A2730'], { locked: true, rot: -12 }),
        ],
      };
    },
    bands: (ctx) => [
      { ...ganesha(onSurface(ctx), 110), colors: [trueGold(onSurface(ctx)), ctx.p.accent], opts: { light: true } },
      { t: 'text', role: 'invocation', bind: 'invocation', gap: 10 },
      { t: 'text', role: 'host', bind: 'hostLine', gap: 18 },
      ...soloOrNames(ctx),
      { t: 'divider', style: 'ornate', gap: 22, w: 340 },
      { t: 'date', style: 'bars', gap: 26 },
      ...venue,
    ],
  },
  // 7. Nikah under a gold dome, lanterns and stars, white blooms.
  {
    id: 'sunehri-nikah', name: 'Sunehri Nikah', category: 'wedding', eventTypes: ['nikah', 'engagement', 'reception', 'wedding'], communities: ['muslim'],
    tags: ['nikah', 'lanterns', 'dome', 'gold', 'crescent', 'walima'], styles: ['royal', 'arch', 'luxury', 'dark'], premium: true,
    palettes: ['emerald', 'navy', 'wine', 'teal'], legacy: { layout: 'royal-arch', motif: 'crescent', pattern: 'jaali' },
    type: 'mahal', date: 'bars', divider: 'ornate', zone: { top: 470, bottom: 330, left: 230, right: 230 },
    sampleLanguage: 'en',
    chrome: (ctx) => {
      const g = trueGold(ctx);
      return {
        bg: radial(ctx, 'jaali', 0.08),
        under: [
          artEl('stars', 0, 0, W, 760, [g], { locked: true, opacity: 0.6, opts: { seed: 4 } }),
          artEl('arch-panel', 150, 190, W - 300, H - 340, [mix(ctx.p.background, '#000000', 0.18), g, ctx.p.accent], { locked: true, opts: { shape: 'dome' } }),
          ...lanterns(ctx, [140, 250, W - 250, W - 140], [600, 420], 92),
          artEl('gold-dust', 160, H - 620, W - 320, 420, [g], { locked: true, opts: { seed: 17 }, opacity: 0.7 }),
          corner('bloom-corner', 'bl', 420, WHITE_BLOOMS, { kind: 'peony' }, -50),
          corner('bloom-corner', 'br', 420, WHITE_BLOOMS, { kind: 'peony' }, -50),
        ],
      };
    },
    bands: (ctx) => [
      motif(ctx, 'crescent', 96),
      { t: 'text', role: 'invocation', bind: 'invocation', gap: 12 },
      { t: 'text', role: 'host', bind: 'hostLine', gap: 18 },
      ...soloOrNames(ctx, 136),
      { t: 'divider', style: 'ornate', gap: 24, w: 340 },
      { t: 'date', style: 'bars', gap: 26 },
      ...venue,
    ],
  },
  // 8. Kerala kasavu: cream with gold border stripes, temple bells, jasmine and kolam.
  {
    id: 'kasavu', name: 'Kasavu', category: 'wedding', eventTypes: WEDDINGS, communities: ['hindu-south'],
    tags: ['kerala', 'kasavu', 'south', 'jasmine', 'temple bells', 'gold'], styles: ['traditional', 'minimal', 'luxury'], premium: true,
    palettes: ['cream', 'ivory', 'butter', 'champagne'], legacy: { layout: 'temple-heritage', motif: 'diya', pattern: 'none' },
    type: 'regal', date: 'strip', divider: 'lotus', zone: { top: 330, bottom: 340, left: 190, right: 190 },
    sampleLanguage: 'en',
    chrome: (ctx) => {
      const g = trueGold(ctx);
      const stripes = (x: number, flip: boolean): DesignElement[] => [
        shapeEl('rect', flip ? W - x - 30 : x, 0, 30, H, { fill: g, opacity: 0.9 }),
        shapeEl('rect', flip ? W - x - 52 : x + 44, 0, 6, H, { fill: g, opacity: 0.7 }),
        shapeEl('rect', flip ? W - x - 66 : x + 60, 0, 3, H, { fill: ctx.p.primary, opacity: 0.6 }),
      ];
      return {
        bg: solidBg(ctx.p.background, mix(ctx.p.background, '#FFFFFF', 0.4), 'radial'),
        under: [
          ...stripes(34, false),
          ...stripes(34, true),
          artEl('bells', 130, 70, 150, 270, [g], { locked: true }),
          artEl('bells', W - 280, 70, 150, 270, [g], { locked: true, flipX: true }),
          artEl('bloom-corner', 80, H - 400, 380, 380, WHITE_BLOOMS, { locked: true, opts: { kind: 'daisy' }, flipY: true }),
          artEl('bloom-corner', W - 460, H - 400, 380, 380, WHITE_BLOOMS, { locked: true, opts: { kind: 'daisy' }, flipX: true, flipY: true }),
          artEl('rangoli', W / 2 - 180, H - 290, 360, 250, [g, ctx.p.primary, '#FFFFFF'], { locked: true, opts: { style: 'kolam' }, opacity: 0.8 }),
        ],
      };
    },
    hero: (ctx) => [{ t: 'art', asset: 'diya', w: 170, h: 110, colors: [trueGold(ctx)], gap: 16, anim: 'drop' }],
  },
  // 9. Boho: dried-flower line art around a soft dome, signature names, airy sans.
  {
    id: 'pampas-boho', name: 'Pampas Boho', category: 'wedding', eventTypes: [...ALL_WEDDINGS, 'birthday', 'baby-shower'], communities: ['modern'],
    tags: ['boho', 'pampas', 'line art', 'neutral', 'minimal', 'arch'], styles: ['minimal', 'modern', 'line-art', 'arch'],
    palettes: ['linen', 'champagne', 'dustyRose', 'sage'], legacy: { layout: 'minimal-modern', motif: 'none', pattern: 'none' },
    type: 'boho', date: 'bars', divider: 'simple', zone: { top: 330, bottom: 300, left: 210, right: 210 },
    sampleLanguage: 'en',
    chrome: (ctx) => {
      const ink = isDarkColor(ctx.p.background) ? ctx.p.accent : mix(ctx.p.accent, ctx.p.text, 0.25);
      const dome = mix(ctx.p.backgroundAlt, ctx.p.background, 0.2);
      return {
        bg: solidBg(ctx.p.background),
        under: [
          artEl('arch-panel', 170, 210, W - 340, H - 400, [dome, dome, dome], { locked: true, opts: { shape: 'dome' } }),
          artEl('line-flower', W - 460, -10, 460, 520, [ink], { locked: true, opts: { kind: 'poppy' }, flipX: true, rot: 180, opacity: 0.85 }),
          corner('greenery', 'bl', 460, [mix(ink, ctx.p.background, 0.3), ink], { kind: 'fern' }, -30, 0.8),
          artEl('line-flower', W - 360, H - 470, 380, 440, [ink], { locked: true, opts: { kind: 'wild' }, flipX: true, opacity: 0.8 }),
        ],
      };
    },
    bands: (ctx) => [
      { t: 'text', role: 'eyebrow', bind: 'headline', gap: 0 },
      ...soloOrNames(ctx),
      { t: 'text', role: 'host', bind: 'hostLine', gap: 26 },
      { t: 'date', style: 'bars', gap: 34 },
      ...venue,
    ],
  },
  // 10. Midnight roses: blush roses and gold flecks on a dark ground, fine double frame.
  {
    id: 'raat-ki-rani', name: 'Raat ki Rani', category: 'wedding', eventTypes: [...ALL_WEDDINGS, 'birthday'], communities: ['modern', 'christian', 'muslim', 'hindu-north'],
    tags: ['dark', 'roses', 'gold', 'luxury', 'reception', 'moody'], styles: ['floral', 'dark', 'luxury', 'watercolour'], premium: true,
    palettes: ['onyx', 'wine', 'navy', 'forest'], legacy: { layout: 'botanical', motif: 'none', pattern: 'none' },
    type: 'petal', date: 'bars', divider: 'simple', zone: { top: 300, bottom: 320, left: 180, right: 180 },
    sampleLanguage: 'en',
    chrome: (ctx) => {
      const g = trueGold(ctx);
      const rose = ['#F3C6CF', '#B4485B', '#5E7D4A', g];
      return {
        bg: radial(ctx),
        under: [
          artEl('gold-dust', 0, 0, W, H, [g], { locked: true, opts: { seed: 41 }, opacity: 0.55 }),
          shapeEl('rect', 64, 64, W - 128, H - 128, { stroke: g, strokeW: 2 }),
          shapeEl('rect', 82, 82, W - 164, H - 164, { stroke: g, strokeW: 1, opacity: 0.6 }),
          corner('bloom-corner', 'tl', 460, rose, { kind: 'rose' }, -50),
          corner('bloom-corner', 'br', 480, rose, { kind: 'rose' }, -50),
          corner('bloom-corner', 'bl', 280, rose, { kind: 'mixed' }, -30, 0.9),
        ],
      };
    },
    bands: (ctx) => [
      { t: 'text', role: 'eyebrow', bind: 'headline', gap: 0 },
      ...soloOrNames(ctx, 116),
      { t: 'text', role: 'host', bind: 'hostLine', gap: 26 },
      { t: 'date', style: 'bars', gap: 32 },
      ...venue,
      { t: 'text', role: 'connector', bind: 'closing', gap: 20, size: 60 },
    ],
  },
  // 11. Butterflies for birthdays and baby showers.
  {
    id: 'titli', name: 'Titli', category: 'kids', eventTypes: ['birthday', 'baby-shower', 'naming-ceremony'], communities: ['modern'],
    tags: ['butterflies', 'pastel', 'kids', 'baby shower', 'watercolour', 'girl'], styles: ['watercolour', 'pastel', 'floral'],
    palettes: ['babyPink', 'lavender', 'mint', 'butter'], legacy: { layout: 'festive-pop', motif: 'none', pattern: 'none' },
    type: 'garden', date: 'bars', divider: 'stars', zone: { top: 330, bottom: 300, left: 150, right: 150 },
    sampleLanguage: 'en',
    chrome: (ctx) => {
      const wing = (t: number) => mix(ctx.p.primary, '#FFFFFF', t);
      const fly = (x: number, y: number, s: number, rot: number, t: number) =>
        artEl('butterfly', x, y, s, s * 0.8, [wing(t), ctx.p.primary, mix(ctx.p.text, '#000000', 0.2)], { locked: true, rot });
      const flowers = petals(ctx, undefined, '#7A9A6B');
      return {
        bg: radial(ctx),
        under: [
          artEl('wash', -200, -160, 820, 760, [wing(0.75), mix(ctx.p.accent, '#FFFFFF', 0.7)], { locked: true, opts: { seed: 6 } }),
          artEl('wash', W - 640, H - 720, 820, 820, [wing(0.75), mix(ctx.p.accent, '#FFFFFF', 0.7)], { locked: true, opts: { seed: 13 } }),
          artEl('gold-dust', 0, 0, W, 600, [trueGold(ctx)], { locked: true, opts: { seed: 2 }, opacity: 0.7 }),
          corner('bloom-corner', 'bl', 400, flowers, { kind: 'daisy' }, -40),
          corner('bloom-corner', 'tr', 330, flowers, { kind: 'daisy' }, -40),
          fly(120, 120, 190, -16, 0.1),
          fly(W - 330, 300, 140, 20, 0.3),
          fly(380, 70, 100, 8, 0.45),
          fly(W - 260, H - 520, 170, -10, 0.2),
        ],
      };
    },
    bands: (ctx) => [
      { t: 'text', role: 'eyebrow', bind: 'headline', gap: 0 },
      ...soloOrNames(ctx),
      { t: 'text', role: 'body', bind: 'message', gap: 22 },
      { t: 'date', style: 'bars', gap: 30 },
      ...venue,
    ],
  },
  // 12. Puja / griha pravesh: gold lace, mandala, Ganesha, lotus and a row of diyas.
  {
    id: 'kamal-deep', name: 'Kamal Deep', category: 'religious', eventTypes: [...SACRED, 'shop-opening'], communities: ['hindu-north', 'gujarati', 'marathi', 'marwari'],
    tags: ['puja', 'griha pravesh', 'lotus', 'diya', 'ganesha', 'gold'], styles: ['traditional', 'religious', 'luxury'], premium: true,
    palettes: ['champagne', 'cream', 'kumkum', 'emerald'], legacy: { layout: 'temple-heritage', motif: 'shree', pattern: 'mandala' },
    type: 'regal', date: 'strip', divider: 'lotus', zone: { top: 210, bottom: 440, left: 180, right: 180 },
    chrome: (ctx) => {
      const g = trueGold(ctx);
      return {
        bg: radial(ctx, 'mandala', 0.08),
        under: [
          ...laceBands(ctx, 76),
          artEl('mandala', W / 2 - 500, 260, 1000, 1000, [g], { locked: true, opacity: 0.09 }),
          artEl('bells', 60, 60, 150, 280, [g], { locked: true }),
          artEl('bells', W - 210, 60, 150, 280, [g], { locked: true, flipX: true }),
          artEl('lotus', W / 2 - 280, H - 450, 560, 300, ['#F4A6B7', '#5D8C4A', g], { locked: true }),
          artEl('diya-row', 90, H - 250, W - 180, 160, [g, '#FFB627'], { locked: true }),
        ],
      };
    },
    hero: (ctx) => [{ ...ganesha(ctx, 180), colors: [trueGold(ctx), ctx.p.accent] }],
  },
];
