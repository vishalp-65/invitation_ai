import { BISMILLAH } from '../constants/faith.js';
import { artEl, shapeEl, solidBg, type Band, type RecipeCtx } from './builder.js';
import { isDarkColor, mix } from './color.js';
import { corner, coupleNames, namesInRing, onSurface, petals, soloOrNames, venue } from './families-atelier.js';
import { couple, goldOn, linear, radial, trueGold, WEDDINGS, type DesignFamily } from './families.js';
import { DESIGN_H, DESIGN_W } from './schema.js';

/**
 * "Celebration" collection (Nov 2026, second set of references): a mauve arch with rings and
 * the bride and groom in the corners, vintage florals around a name frame (Nikah), a photo
 * birthday with balloons and gifts, a black-and-gold party — plus photo-first designs whose
 * frames keep their exact crop and roundness (circle, arch, polaroid, rounded) and show the
 * person's initials until a photo is added.
 */

const W = DESIGN_W;
const H = DESIGN_H;

/** Photo frame that stays put before a photo is added (initials in the frame's own tint). */
const photoFrame = (
  ctx: RecipeCtx,
  o: { w: number; h: number; mask: 'circle' | 'arch' | 'rounded' | 'rect' | 'oval'; font: string; gap?: number; borderW?: number; border?: string; rot?: number },
): Band => ({
  t: 'photo',
  w: o.w,
  h: o.h,
  mask: o.mask,
  gap: o.gap ?? 24,
  borderW: o.borderW ?? 0,
  ...(o.border ? { border: o.border } : {}),
  ...(o.rot ? { rot: o.rot } : {}),
  empty: { bg: mix(ctx.p.primary, '#FFFFFF', isDarkColor(ctx.p.background) ? 0.35 : 0.72), ink: isDarkColor(ctx.p.background) ? ctx.p.background : ctx.p.primary, font: o.font },
});

/** Faith-correct opening line: Bismillah in Arabic calligraphy for a Muslim family, else the invocation. */
const opening = (ctx: RecipeCtx): Band =>
  ctx.faith === 'muslim' ? { t: 'text', role: 'invocation', text: BISMILLAH, font: 'Amiri', size: 58, gap: 0 } : { t: 'text', role: 'invocation', bind: 'invocation', gap: 0 };

const CORAL = ['#F2A488', '#C8553D', '#8FA06A', '#B8352A'];
const VINTAGE = ['#EBCBC4', '#B07A72', '#9AA77F', '#E8D8A8'];

export const CELEBRATION_FAMILIES: DesignFamily[] = [
  // 1. Mauve card, cream arch with a gold rim, coral blooms, "Mr & Mrs" flags, rings, bride and groom in the corners.
  {
    id: 'mr-mrs', name: 'Mr & Mrs', category: 'wedding', eventTypes: [...WEDDINGS, 'christian-wedding'], communities: ['modern', 'christian', 'hindu-north'],
    tags: ['arch', 'couple', 'rings', 'coral flowers', 'mauve', 'bunting'], styles: ['illustrated', 'floral', 'arch', 'modern'], premium: true,
    palettes: ['mauve', 'dustyRose', 'sage', 'navy'], legacy: { layout: 'jharokha', motif: 'heart', pattern: 'none' },
    type: 'vintage', date: 'bars', divider: 'simple', zone: { top: 330, bottom: 210, left: 250, right: 250 },
    innerZone: { top: 360, bottom: 260, left: 220, right: 220 },
    sampleLanguage: 'en',
    textBg: (ctx) => ctx.p.surface,
    chrome: (ctx) => ({
      bg: solidBg(ctx.p.background, ctx.p.backgroundAlt, 'radial'),
      under: [
        artEl('arch-panel', 92, 150, W - 184, H - 110, [ctx.p.surface, trueGold(onSurface(ctx)), ctx.p.accent], { locked: true, opts: { shape: 'dome' } }),
        corner('bloom-corner', 'tl', 430, CORAL, { kind: 'peony' }, -50),
        corner('bloom-corner', 'tr', 430, CORAL, { kind: 'peony' }, -50),
        artEl('bunting', W / 2 - 200, 0, 400, 200, [mix(ctx.p.surface, ctx.p.accent, 0.15), mix(ctx.p.background, '#000000', 0.2), ctx.p.muted], { locked: true, opts: { style: 'banner', swags: 1 } }),
        artEl('couple', -20, H - 640, 250, 640, [goldOn(ctx), ctx.p.surface], { locked: true, opts: { style: 'watercolor', attire: 'christian', only: 'bride' } }),
        artEl('couple', W - 250, H - 660, 270, 660, [goldOn(ctx), ctx.p.surface], { locked: true, opts: { style: 'watercolor', attire: 'christian', only: 'groom' } }),
      ],
    }),
    bands: (ctx) => [
      { t: 'text', role: 'eyebrow', bind: 'headline', gap: 0 },
      ...(ctx.people === 2
        ? ([
            { t: 'text', role: 'names', bind: 'name1', gap: 20 },
            { t: 'text', role: 'connector', bind: 'connector', gap: 0, size: 80 },
            { t: 'text', role: 'names', bind: 'name2', gap: 0 },
            { t: 'art', asset: 'rings', w: 170, h: 128, colors: [trueGold(onSurface(ctx)), '#F7E2A6'], gap: 6, anim: 'zoom' },
          ] satisfies Band[])
        : soloOrNames(ctx)),
      { t: 'text', role: 'body', bind: 'message', gap: 26 },
      { t: 'date', style: 'bars', gap: 30 },
      ...venue,
    ],
  },
  // 2. Vintage florals on parchment, Bismillah, names on a floral hexagon frame.
  {
    id: 'gulistan', name: 'Gulistan', category: 'wedding', eventTypes: ['nikah', 'wedding', 'engagement', 'reception', 'anniversary'], communities: ['muslim', 'modern', 'christian'],
    tags: ['nikah', 'vintage florals', 'bismillah', 'daisies', 'parchment', 'frame'], styles: ['floral', 'minimal', 'watercolour'], premium: true,
    palettes: ['parchment', 'cream', 'sage', 'dustyRose'], legacy: { layout: 'botanical', motif: 'crescent', pattern: 'none' },
    type: 'sage', date: 'rules', divider: 'leaf', zone: { top: 140, bottom: 200, left: 150, right: 150 },
    innerZone: { top: 300, bottom: 300, left: 170, right: 170 },
    sampleLanguage: 'en',
    chrome: (ctx) => ({
      bg: radial(ctx),
      under: [
        corner('bloom-corner', 'tl', 400, VINTAGE, { kind: 'daisy' }, -50),
        corner('bloom-corner', 'tr', 400, VINTAGE, { kind: 'daisy' }, -50),
        corner('bloom-corner', 'bl', 420, VINTAGE, { kind: 'rose' }, -50),
        corner('bloom-corner', 'br', 420, VINTAGE, { kind: 'rose' }, -50),
        artEl('greenery', -60, H * 0.32, 300, 300, ['#A9B48D', '#7F8A66'], { locked: true, opts: { kind: 'olive' }, opacity: 0.55 }),
        artEl('greenery', W - 240, H * 0.32, 300, 300, ['#A9B48D', '#7F8A66'], { locked: true, opts: { kind: 'olive' }, flipX: true, opacity: 0.55 }),
      ],
    }),
    bands: (ctx) => [
      opening(ctx),
      { t: 'text', role: 'eyebrow', bind: 'headline', gap: 24 },
      ...(ctx.people === 2
        ? namesInRing('sage', { t: 'art', asset: 'bloom-frame', w: 660, h: 528, colors: [ctx.p.surface, ...VINTAGE.slice(0, 2), '#9AA77F'], opts: { shape: 'hex' }, gap: 26, anim: 'zoom' }, 100)
        : soloOrNames(ctx)),
      { t: 'date', style: 'rules', gap: 34 },
      ...venue,
    ],
  },
  // 3. Photo birthday: bunting, a circular photo between balloons, arched heading, gifts below.
  {
    id: 'gubbare', name: 'Gubbare', category: 'kids', eventTypes: ['birthday', 'baby-shower', 'naming-ceremony', 'anniversary', 'retirement'], communities: ['modern'],
    tags: ['photo', 'birthday', 'balloons', 'gifts', 'bunting', 'blue'], styles: ['photo', 'modern', 'pastel'], premium: true,
    palettes: ['iceBlue', 'babyPink', 'lavender', 'mint'], legacy: { layout: 'photo-frame', motif: 'balloons', pattern: 'none' },
    type: 'party', date: 'rules', divider: 'simple', zone: { top: 230, bottom: 420, left: 150, right: 150 },
    innerZone: { top: 330, bottom: 380, left: 170, right: 170 },
    sampleLanguage: 'en',
    chrome: (ctx) => {
      const pale = mix(ctx.p.primary, '#FFFFFF', 0.55);
      const mid = mix(ctx.p.primary, '#FFFFFF', 0.25);
      return {
        bg: solidBg(mix(ctx.p.background, '#FFFFFF', 0.4), ctx.p.backgroundAlt, 'linear'),
        under: [
          artEl('glossy-balloons', -90, 820, 320, 448, [pale, mix(pale, '#FFFFFF', 0.3), mid], { locked: true, opacity: 0.55, opts: { bunch: 'single' } }),
          artEl('glossy-balloons', W - 220, 900, 300, 420, [pale, mix(pale, '#FFFFFF', 0.3), mid], { locked: true, opacity: 0.55, opts: { bunch: 'single' } }),
          artEl('glossy-balloons', 30, 330, 270, 378, [mid, pale, ctx.p.muted], { locked: true, opts: { bunch: 'pair' } }),
          artEl('glossy-balloons', W - 300, 330, 270, 378, [mid, pale, ctx.p.muted], { locked: true, opts: { bunch: 'pair' }, flipX: true }),
          artEl('bunting', 0, 0, W, 260, [ctx.p.primary, mid, ctx.p.primary], { locked: true, opts: { swags: 2 } }),
          artEl('gift-boxes', -20, H - 360, W + 40, 360, ['#F6F0E8', ctx.p.primary, '#ECE4D9'], { locked: true }),
        ],
      };
    },
    bands: (ctx) => [
      { t: 'text', role: 'eyebrow', bind: 'headline', gap: 0, curve: 34, size: 34 },
      photoFrame(ctx, { w: 470, h: 470, mask: 'circle', font: 'Ephesis', gap: 8 }),
      ...(ctx.people === 2 ? coupleNames(110) : soloOrNames(ctx)),
      ...(ctx.people === 0 ? [] : ([{ t: 'text', role: 'headline', bind: 'message', gap: 16, size: 40 }] satisfies Band[])),
      { t: 'date', style: 'rules', gap: 26 },
      ...venue,
    ],
  },
  // 4. Black and gold party: warm glow, gold confetti and streamers, foil balloons.
  {
    id: 'sunehri-shaam', name: 'Sunehri Shaam', category: 'kids', eventTypes: ['birthday', 'anniversary', 'retirement', 'corporate', 'other', 'reception'], communities: ['modern'],
    tags: ['black and gold', 'party', 'balloons', 'confetti', 'birthday', 'luxury'], styles: ['dark', 'luxury', 'modern'], premium: true,
    palettes: ['onyx', 'navy', 'wine', 'plum'], legacy: { layout: 'art-deco', motif: 'balloons', pattern: 'confetti' },
    type: 'gala', date: 'rules', divider: 'deco', zone: { top: 300, bottom: 330, left: 200, right: 200 },
    sampleLanguage: 'en',
    chrome: (ctx) => {
      const g = trueGold(ctx);
      const foil = [g, mix(g, '#FFFFFF', 0.3), mix(g, '#000000', 0.2)];
      return {
        bg: solidBg(mix(ctx.p.background, '#6B1E0E', 0.45), ctx.p.backgroundAlt, 'radial'),
        under: [
          artEl('stars', 0, 0, W, 520, [g], { locked: true, opts: { seed: 9 } }),
          artEl('gold-dust', 0, 0, W, 460, [g], { locked: true, opts: { seed: 12 } }),
          // Streamers hang in the side margins only, never over the text.
          artEl('streamers', 0, 0, 220, 1000, foil, { locked: true, opts: { seed: 5 } }),
          artEl('streamers', W - 220, 0, 220, 1000, foil, { locked: true, opts: { seed: 8 } }),
          artEl('glossy-balloons', -110, H - 640, 460, 644, foil, { locked: true, opts: { bunch: 'cluster', metal: true } }),
          artEl('glossy-balloons', W - 350, H - 640, 460, 644, foil, { locked: true, opts: { bunch: 'cluster', metal: true }, flipX: true }),
        ],
      };
    },
    bands: (ctx) => [
      { t: 'text', role: 'eyebrow', bind: ctx.people === 0 ? 'hostLine' : 'headline', gap: 0 },
      ...soloOrNames(ctx),
      ...(ctx.people === 0 ? [] : ([{ t: 'text', role: 'body', bind: 'message', gap: 22 }] satisfies Band[])),
      { t: 'date', style: 'rules', gap: 34 },
      ...venue,
      { t: 'text', role: 'small', bind: 'rsvpContacts', gap: 20 },
    ],
  },
  // 5. Couple photo in a gold-rimmed arch, roses and a soft wash.
  {
    id: 'tasveer', name: 'Tasveer', category: 'wedding', eventTypes: [...WEDDINGS, 'christian-wedding', 'nikah'], communities: ['modern', 'hindu-north', 'christian'],
    tags: ['photo', 'arch', 'couple photo', 'roses', 'save the date', 'romantic'], styles: ['photo', 'floral', 'arch', 'watercolour'], premium: true,
    palettes: ['ivory', 'blush', 'champagne', 'sage'], legacy: { layout: 'photo-frame', motif: 'none', pattern: 'none' },
    type: 'mahal', date: 'bars', divider: 'leaf', zone: { top: 140, bottom: 180, left: 170, right: 170 },
    innerZone: { top: 300, bottom: 300, left: 190, right: 190 },
    sampleLanguage: 'en',
    chrome: (ctx) => {
      const rose = petals(ctx, mix(ctx.p.primary, '#E9799A', 0.45), '#8C9A7A');
      return {
        bg: radial(ctx),
        under: [
          artEl('wash', W - 620, -120, 760, 760, [mix(rose[0]!, '#FFFFFF', 0.6), mix(rose[0]!, '#FFFFFF', 0.82)], { locked: true, opts: { seed: 3 } }),
          artEl('wash', -200, H - 720, 820, 820, [mix(rose[0]!, '#FFFFFF', 0.6), mix(rose[0]!, '#FFFFFF', 0.82)], { locked: true, opts: { seed: 8 } }),
          corner('bloom-corner', 'tl', 380, rose, { kind: 'rose' }, -40),
          corner('bloom-corner', 'br', 400, rose, { kind: 'rose' }, -40),
          artEl('gold-dust', 0, 0, W, H, [trueGold(ctx)], { locked: true, opts: { seed: 23 }, opacity: 0.45 }),
        ],
      };
    },
    bands: (ctx) => [
      { t: 'text', role: 'eyebrow', bind: 'headline', gap: 0 },
      photoFrame(ctx, { w: 560, h: 720, mask: 'arch', font: 'Monsieur La Doulaise', borderW: 10, border: trueGold(ctx), gap: 26 }),
      ...(ctx.people === 2 ? coupleNames(118) : soloOrNames(ctx)),
      { t: 'date', style: 'bars', gap: 30 },
      ...venue,
    ],
  },
  // 6. Polaroid snapshot on soft paper with pressed flowers (anniversaries, birthdays, farewells).
  {
    id: 'yaadein', name: 'Yaadein', category: 'kids', eventTypes: ['anniversary', 'birthday', 'retirement', 'engagement', 'reception'], communities: ['modern'],
    tags: ['photo', 'polaroid', 'memories', 'anniversary', 'boho', 'pressed flowers'], styles: ['photo', 'minimal', 'modern', 'line-art'],
    palettes: ['peach', 'linen', 'babyBlue', 'mint'], legacy: { layout: 'photo-frame', motif: 'heart', pattern: 'none' },
    type: 'boho', date: 'bars', divider: 'simple', zone: { top: 150, bottom: 190, left: 160, right: 160 },
    innerZone: { top: 300, bottom: 300, left: 180, right: 180 },
    sampleLanguage: 'en',
    chrome: (ctx) => {
      const ink = isDarkColor(ctx.p.background) ? ctx.p.accent : mix(ctx.p.primary, ctx.p.text, 0.3);
      return {
        bg: solidBg(ctx.p.background, ctx.p.backgroundAlt, 'linear'),
        under: [
          artEl('line-flower', -30, -20, 380, 430, [ink], { locked: true, opts: { kind: 'wild' }, flipY: true, opacity: 0.7 }),
          artEl('line-flower', W - 360, H - 470, 380, 430, [ink], { locked: true, opts: { kind: 'lily' }, flipX: true, opacity: 0.7 }),
          artEl('gold-dust', 0, 0, W, H, [mix(ctx.p.primary, '#FFFFFF', 0.2)], { locked: true, opts: { seed: 31 }, opacity: 0.4 }),
        ],
      };
    },
    bands: (ctx) => [
      { t: 'text', role: 'eyebrow', bind: 'headline', gap: 0 },
      photoFrame(ctx, { w: 600, h: 640, mask: 'rect', font: 'Mrs Saint Delafield', borderW: 26, border: '#FFFFFF', rot: -3, gap: 40 }),
      ...(ctx.people === 2 ? coupleNames(120) : soloOrNames(ctx)),
      { t: 'date', style: 'bars', gap: 30 },
      ...venue,
    ],
  },
  // 7. Moon, stars and clouds around a round photo (baby shower, naamkaran, first birthday).
  {
    id: 'chanda-mama', name: 'Chanda Mama', category: 'kids', eventTypes: ['baby-shower', 'naming-ceremony', 'birthday', 'annaprashan', 'mundan'], communities: ['modern', 'hindu-north'],
    tags: ['photo', 'baby', 'moon', 'stars', 'clouds', 'naamkaran', 'godh bharai'], styles: ['photo', 'pastel', 'illustrated'],
    palettes: ['babyBlue', 'lavender', 'babyPink', 'navy'], legacy: { layout: 'photo-frame', motif: 'balloons', pattern: 'dots' },
    type: 'garden', date: 'rules', divider: 'stars', zone: { top: 170, bottom: 330, left: 150, right: 150 },
    sampleLanguage: 'en',
    chrome: (ctx) => ({
      bg: linear(ctx),
      under: [
        artEl('stars', 0, 0, W, H * 0.7, [goldOn(ctx)], { locked: true, opacity: 0.8, opts: { seed: 6 } }),
        artEl('baby-moon', W - 330, 40, 300, 272, ['#F8D57E', '#C08B2C', '#FFFFFF'], { locked: true }),
        artEl('clouds', 0, H - 380, W, 380, ['#FFFFFF', mix(ctx.p.backgroundAlt, '#FFFFFF', 0.5)], { locked: true }),
        artEl('clouds', -200, 260, 520, 160, ['#FFFFFF', mix(ctx.p.backgroundAlt, '#FFFFFF', 0.5)], { locked: true, opacity: 0.8 }),
      ],
    }),
    bands: (ctx) => [
      { t: 'text', role: 'eyebrow', bind: 'headline', gap: 0 },
      photoFrame(ctx, { w: 470, h: 470, mask: 'circle', font: 'Alex Brush', borderW: 12, border: trueGold(ctx), gap: 28 }),
      ...(ctx.people === 2 ? coupleNames(110) : soloOrNames(ctx)),
      ...(ctx.people === 0 ? [] : ([{ t: 'text', role: 'body', bind: 'message', gap: 18 }] satisfies Band[])),
      { t: 'date', style: 'rules', gap: 26 },
      ...venue,
    ],
  },
  // 8. Haldi / mehndi: turmeric wash, marigold strings, a cheerful couple.
  {
    id: 'haldi-rasam', name: 'Haldi Rasam', category: 'wedding', eventTypes: ['wedding', 'engagement'], communities: ['hindu-north', 'gujarati', 'marathi', 'punjabi'],
    tags: ['haldi', 'mehndi', 'sangeet', 'marigold', 'yellow', 'couple', 'caricature'], styles: ['illustrated', 'caricature', 'bright', 'traditional'], premium: true,
    palettes: ['butter', 'mustard', 'peach', 'mint'], legacy: { layout: 'festive-pop', motif: 'shree', pattern: 'none' },
    type: 'brush', date: 'bars', divider: 'dots', zone: { top: 330, bottom: 80, left: 160, right: 160 },
    innerZone: { top: 380, bottom: 260, left: 170, right: 170 },
    chrome: (ctx) => ({
      bg: radial(ctx),
      under: [
        artEl('wash', -200, 200, 760, 760, ['#FFD54A', '#FFE98A'], { locked: true, opts: { seed: 2 }, opacity: 0.7 }),
        artEl('wash', W - 560, H - 900, 760, 760, ['#FFD54A', '#FFE98A'], { locked: true, opts: { seed: 9 }, opacity: 0.7 }),
        artEl('genda-ladi', 0, 0, W, 320, ['#F28C0F', '#FFC93C', '#2F7D32'], { locked: true, opts: { count: 8 } }),
        artEl('floral-cluster', -60, H - 380, 380, 380, [], { locked: true, opts: { kind: 'marigold' }, flipY: true }),
        artEl('floral-cluster', W - 320, H - 380, 380, 380, [], { locked: true, opts: { kind: 'marigold' }, flipX: true, flipY: true }),
      ],
    }),
    bands: (ctx) => [
      { t: 'text', role: 'invocation', bind: 'invocation', gap: 0 },
      { t: 'text', role: 'eyebrow', bind: 'headline', gap: 14 },
      ...(ctx.people === 2 ? coupleNames(130) : soloOrNames(ctx)),
      { t: 'date', style: 'bars', gap: 24 },
      { t: 'text', role: 'small', bind: 'fnM.venueFull', gap: 14 },
      couple(ctx, 'caricature', 'north', 400),
    ],
  },
  // 9. Evening gala: deco frame, sunburst, gold flecks (corporate, retirement, launches).
  {
    id: 'mehfil', name: 'Mehfil', category: 'business', eventTypes: ['corporate', 'retirement', 'shop-opening', 'other', 'reception', 'anniversary'], communities: ['modern'],
    tags: ['gala', 'corporate', 'retirement', 'launch', 'gold', 'deco'], styles: ['luxury', 'dark', 'modern'], premium: true,
    palettes: ['navy', 'onyx', 'emerald', 'wine'], legacy: { layout: 'art-deco', motif: 'none', pattern: 'none' },
    type: 'regal', date: 'rules', divider: 'deco', zone: { top: 330, bottom: 280, left: 190, right: 190 },
    sampleLanguage: 'en',
    chrome: (ctx) => {
      const g = trueGold(ctx);
      return {
        bg: radial(ctx),
        under: [
          artEl('sunburst', W / 2 - 560, -360, 1120, 1120, [g], { locked: true, opacity: 0.16 }),
          artEl('gold-dust', 0, 0, W, 700, [g], { locked: true, opts: { seed: 51 }, opacity: 0.7 }),
          shapeEl('rect', 60, 60, W - 120, H - 120, { stroke: g, strokeW: 3 }),
          shapeEl('rect', 82, 82, W - 164, H - 164, { stroke: g, strokeW: 1.2, opacity: 0.7 }),
          artEl('corner', 60, 60, 200, 200, [g], { locked: true }),
          artEl('corner', W - 260, 60, 200, 200, [g], { locked: true, flipX: true }),
          artEl('corner', 60, H - 260, 200, 200, [g], { locked: true, flipY: true }),
          artEl('corner', W - 260, H - 260, 200, 200, [g], { locked: true, flipX: true, flipY: true }),
        ],
      };
    },
    bands: (ctx) => [
      { t: 'text', role: 'eyebrow', bind: 'hostLine', gap: 0 },
      ...soloOrNames(ctx),
      { t: 'divider', style: 'deco', gap: 26, w: 360 },
      { t: 'date', style: 'rules', gap: 30 },
      ...venue,
      { t: 'text', role: 'small', bind: 'rsvpContacts', gap: 18 },
    ],
  },
  // 10. Save the date: a large rounded photo on top, brush-script names below.
  {
    id: 'save-the-date', name: 'Save the Date', category: 'wedding', eventTypes: ['engagement', 'wedding', 'christian-wedding', 'reception', 'nikah'], communities: ['modern', 'christian', 'hindu-north'],
    tags: ['photo', 'save the date', 'engagement', 'minimal', 'modern'], styles: ['photo', 'minimal', 'modern'],
    palettes: ['linen', 'dustyBlue', 'sage', 'blush'], legacy: { layout: 'photo-frame', motif: 'none', pattern: 'none' },
    type: 'brush', date: 'bars', divider: 'simple', zone: { top: 90, bottom: 150, left: 120, right: 120 },
    innerZone: { top: 260, bottom: 260, left: 170, right: 170 },
    sampleLanguage: 'en',
    chrome: (ctx) => ({
      bg: solidBg(ctx.p.background),
      under: [
        artEl('greenery', -60, H - 420, 420, 420, [mix(ctx.p.primary, '#FFFFFF', 0.3), ctx.p.primary], { locked: true, opts: { kind: 'eucalyptus' }, opacity: 0.6 }),
        artEl('greenery', W - 300, H - 360, 360, 360, [mix(ctx.p.primary, '#FFFFFF', 0.3), ctx.p.primary], { locked: true, opts: { kind: 'fern' }, flipX: true, opacity: 0.5 }),
      ],
    }),
    bands: (ctx) => [
      photoFrame(ctx, { w: 840, h: 860, mask: 'rounded', font: 'Ms Madi', gap: 0 }),
      { t: 'text', role: 'eyebrow', bind: 'headline', gap: 34 },
      ...(ctx.people === 2 ? coupleNames(140) : soloOrNames(ctx)),
      { t: 'date', style: 'bars', gap: 28 },
      ...venue,
    ],
  },
];
