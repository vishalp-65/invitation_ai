import type { EventTypeId } from '../constants/event-types.js';
import { artEl, type Band, type DateStyle, type RecipeCtx, type TypeSetKey } from './builder.js';
import { isDarkColor, mix } from './color.js';
import { coupleNames, soloOrNames, venue } from './families-atelier.js';
import { goldOn, linear, radial, type DesignCategory, type DesignFamily } from './families.js';
import { DESIGN_H, DESIGN_W } from './constants.js';
import type { DesignElement } from './schema.js';

/**
 * Occasions collection (Nov 2026): two families for every wedding function (Haldi, Mehendi,
 * Sangeet…), celebration (first birthday, graduation, kitty party…), festival (Diwali, Holi,
 * Christmas, Eid, Raksha Bandhan…) and trip. Written as compact specs over three layouts:
 *
 *   hero  — a big illustration on top, the words below
 *   frame — a full-page frame or scattered art, a small emblem above the words
 *   photo — the host's photo in a frame, art around it
 *
 * Art comes from the shared library (assets.tsx + festive-art.tsx), recoloured per palette.
 * The first family of each occasion is free, the second Premium. Tags and styles feed search,
 * the gallery facets and the SEO pages.
 */

const W = DESIGN_W;
const H = DESIGN_H;

type At = 'top' | 'bottom' | 'center' | 'tl' | 'tr' | 'bl' | 'br' | 'left' | 'right' | 'page';

interface ArtSpec {
  a: string;
  w: number;
  h: number;
  at: At;
  /** Colours from the palette (omit to keep the art's own colours). */
  c?: (x: RecipeCtx) => string[];
  o?: Record<string, string | number | boolean>;
  /** Nudge down (px) from the anchor. */
  dy?: number;
  op?: number;
  flip?: boolean;
}

interface Spec {
  id: string;
  name: string;
  occ: EventTypeId[];
  recipe: 'hero' | 'frame' | 'photo';
  palettes: string[];
  type: TypeSetKey;
  date: DateStyle;
  art: ArtSpec[];
  /** Emblem drawn in the flow above the words (frame / photo layouts). */
  crest?: Omit<ArtSpec, 'at' | 'dy' | 'op' | 'flip'>;
  tags: string[];
  styles: string[];
  category: DesignCategory;
  premium?: boolean;
  pattern?: 'none' | 'mandala' | 'paisley' | 'jaali' | 'dots' | 'leaves' | 'confetti';
}

const gold = (x: RecipeCtx) => [goldOn(x)];
const gold2 = (x: RecipeCtx) => [goldOn(x), mix(goldOn(x), '#FFFFFF', 0.5)];
const soft = (x: RecipeCtx) => mix(x.p.primary, isDarkColor(x.p.background) ? '#FFFFFF' : x.p.background, 0.35);

function place(s: ArtSpec, x: RecipeCtx): DesignElement {
  const pad = 40;
  const pos: Record<At, [number, number]> = {
    top: [(W - s.w) / 2, 70],
    bottom: [(W - s.w) / 2, H - s.h - 60],
    center: [(W - s.w) / 2, (H - s.h) / 2],
    tl: [pad, pad],
    tr: [W - s.w - pad, pad],
    bl: [pad, H - s.h - pad],
    br: [W - s.w - pad, H - s.h - pad],
    left: [-s.w * 0.25, (H - s.h) / 2],
    right: [W - s.w * 0.75, (H - s.h) / 2],
    page: [0, 0],
  };
  const [px, py] = pos[s.at];
  const w = s.at === 'page' ? W : s.w;
  const h = s.at === 'page' ? H : s.h;
  return artEl(s.a, px, py + (s.dy ?? 0), w, h, s.c ? s.c(x) : [], { locked: true, ...(s.o ? { opts: s.o } : {}), ...(s.op !== undefined ? { opacity: s.op } : {}), ...(s.flip ? { flipX: true } : {}) });
}

/** The words: names for couples / one person, the big headline for festivals and trips. */
function words(x: RecipeCtx, s: Spec): Band[] {
  const crest: Band[] = s.crest ? [{ t: 'art', asset: s.crest.a, w: s.crest.w, h: s.crest.h, colors: s.crest.c ? s.crest.c(x) : [], ...(s.crest.o ? { opts: s.crest.o } : {}), gap: 0, anim: 'zoom' }] : [];
  const photo: Band[] =
    s.recipe === 'photo'
      ? [
          {
            t: 'photo',
            w: 520,
            h: 600,
            mask: 'arch',
            gap: 24,
            borderW: 10,
            border: '#FFFFFF',
            empty: { bg: mix(x.p.primary, '#FFFFFF', isDarkColor(x.p.background) ? 0.35 : 0.72), ink: isDarkColor(x.p.background) ? x.p.background : x.p.primary, font: 'Great Vibes' },
          },
        ]
      : [];
  if (x.people === 0)
    return [
      ...crest,
      ...photo,
      { t: 'text', role: 'headline', bind: 'headline', gap: crest.length || photo.length ? 30 : 0, size: 96 },
      { t: 'text', role: 'host', bind: 'hostLine', gap: 24 },
      { t: 'text', role: 'body', bind: 'message', gap: 18 },
      { t: 'date', style: s.date, gap: 28 },
      ...venue,
    ];
  return [
    ...crest,
    { t: 'text', role: 'eyebrow', bind: 'headline', gap: crest.length ? 24 : 0 },
    ...photo,
    ...(x.people === 2 ? coupleNames() : soloOrNames(x)),
    { t: 'text', role: 'host', bind: 'hostLine', gap: 22 },
    { t: 'date', style: s.date, gap: 28 },
    ...venue,
  ];
}

function family(s: Spec): DesignFamily {
  const tops = s.art.filter((a) => a.at === 'top');
  const top = tops.length ? Math.max(...tops.map((a) => 70 + a.h + (a.dy ?? 0))) + 30 : 230;
  const zone = { top: s.recipe === 'hero' ? top : Math.max(top, 220), bottom: 200, left: 140, right: 140 };
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    eventTypes: s.occ,
    tags: [...s.tags, 'new'],
    styles: s.styles,
    premium: s.premium ?? false,
    palettes: s.palettes,
    legacy: { layout: 'minimal-modern', motif: 'none', pattern: 'none' },
    type: s.type,
    date: s.date,
    divider: 'simple',
    zone,
    innerZone: { top: Math.max(300, zone.top * 0.6), bottom: 260, left: 150, right: 150 },
    sampleLanguage: 'en',
    chrome: (x) => ({
      bg: s.recipe === 'frame' ? linear(x, s.pattern ?? 'none', 0.1) : radial(x, s.pattern ?? 'none', 0.1),
      under: s.art.map((a) => place(a, x)),
    }),
    // Inner pages keep the corners and the page frame, not the big hero.
    inner: (x) => ({ bg: radial(x), under: s.art.filter((a) => a.at !== 'top' && a.at !== 'center').map((a) => place(a, x)) }),
    bands: (x) => words(x, s),
  };
}

const WED_FN: DesignCategory = 'wedding';

const SPECS: Spec[] = [
  // ---------------- Wedding functions ----------------
  { id: 'haldi-sunshine', name: 'Haldi Sunshine', occ: ['haldi', 'wedding'], recipe: 'hero', palettes: ['marigold', 'butter', 'mustard'], type: 'desi', date: 'bars', category: WED_FN,
    art: [{ a: 'genda-ladi', w: 1080, h: 260, at: 'top', dy: -70, o: { count: 7 } }, { a: 'fn-icon', w: 300, h: 300, at: 'top', dy: 170, o: { icon: 'haldi' }, c: gold2 }, { a: 'sunburst', w: 900, h: 900, at: 'center', op: 0.18, c: gold }],
    tags: ['haldi', 'haldi ceremony', 'pithi', 'yellow', 'marigold', 'turmeric', 'haldi invitation card'], styles: ['traditional', 'floral', 'festive'] },
  { id: 'haldi-genda', name: 'Genda Haldi', occ: ['haldi'], recipe: 'frame', palettes: ['butter', 'saffron', 'mint'], type: 'script', date: 'rules', category: WED_FN, premium: true,
    art: [{ a: 'toran', w: 1080, h: 200, at: 'top', dy: -70, c: (x) => [mix(goldOn(x), '#FFC93C', 0.5)] }, { a: 'bandhanwar', w: 1000, h: 160, at: 'bottom', dy: 40 }, { a: 'gold-dust', w: 1080, h: 1920, at: 'page', op: 0.5, c: gold }],
    crest: { a: 'fn-icon', w: 220, h: 220, o: { icon: 'haldi' }, c: gold2 },
    tags: ['haldi', 'genda', 'marigold toran', 'turmeric ceremony', 'yellow'], styles: ['traditional', 'festive', 'floral'] },
  { id: 'mehendi-hands', name: 'Mehendi Hands', occ: ['mehendi', 'wedding', 'nikah'], recipe: 'hero', palettes: ['sage', 'jade', 'forest'], type: 'brush', date: 'line', category: WED_FN,
    art: [{ a: 'henna-hand', w: 360, h: 500, at: 'top', dy: -10 }, { a: 'greenery', w: 360, h: 360, at: 'bl', o: { kind: 'fern' }, op: 0.7 }, { a: 'greenery', w: 360, h: 360, at: 'br', o: { kind: 'fern' }, op: 0.7, flip: true }],
    tags: ['mehendi', 'mehndi', 'henna', 'green', 'mehendi ceremony', 'mehndi invitation card'], styles: ['illustrated', 'traditional', 'floral'] },
  { id: 'mehendi-bel', name: 'Mehendi Bel', occ: ['mehendi', 'nikah'], recipe: 'frame', palettes: ['mint', 'emerald', 'parchment'], type: 'mahal', date: 'rules', category: WED_FN, premium: true, pattern: 'paisley',
    art: [{ a: 'mandala', w: 1300, h: 1300, at: 'center', op: 0.14, c: gold }, { a: 'corner', w: 260, h: 260, at: 'tl', c: gold }, { a: 'corner', w: 260, h: 260, at: 'tr', c: gold, flip: true }],
    crest: { a: 'henna-hand', w: 200, h: 280 },
    tags: ['mehendi', 'mehndi night', 'paisley', 'mandala', 'green and gold'], styles: ['traditional', 'luxury', 'mandala'] },
  { id: 'sangeet-nights', name: 'Sangeet Nights', occ: ['sangeet', 'wedding', 'reception'], recipe: 'hero', palettes: ['midnight', 'plum', 'navy'], type: 'gala', date: 'strip', category: WED_FN,
    art: [{ a: 'fn-icon', w: 300, h: 300, at: 'top', dy: 40, o: { icon: 'sangeet' }, c: gold2 }, { a: 'stars', w: 1080, h: 600, at: 'top', dy: -70, c: gold, op: 0.8 }, { a: 'streamers', w: 500, h: 500, at: 'br', c: gold2, op: 0.6 }],
    tags: ['sangeet', 'sangeet night', 'music', 'dance', 'cocktail', 'night'], styles: ['party', 'night', 'luxury'] },
  { id: 'sangeet-dhol', name: 'Dhol Baaje', occ: ['sangeet'], recipe: 'frame', palettes: ['candy', 'saffron', 'coral'], type: 'playful', date: 'bars', category: WED_FN, premium: true,
    art: [{ a: 'bunting', w: 1080, h: 260, at: 'top', dy: -70 }, { a: 'confetti', w: 1080, h: 1920, at: 'page', op: 0.55 }],
    crest: { a: 'fn-icon', w: 220, h: 220, o: { icon: 'sangeet' }, c: (x) => [x.p.primary, mix(x.p.primary, '#FFFFFF', 0.6)] },
    tags: ['sangeet', 'dhol', 'bollywood', 'colourful', 'dance night'], styles: ['party', 'modern', 'festive'] },
  { id: 'ring-promise', name: 'The Promise', occ: ['ring-ceremony', 'engagement', 'roka'], recipe: 'hero', palettes: ['champagne', 'blush', 'onyx'], type: 'deco', date: 'rules', category: WED_FN,
    art: [{ a: 'rings', w: 440, h: 330, at: 'top', dy: 40, c: gold2 }, { a: 'gold-dust', w: 1080, h: 1920, at: 'page', op: 0.45, c: gold }],
    tags: ['ring ceremony', 'engagement', 'sagai', 'rings', 'gold', 'minimal'], styles: ['minimal', 'luxury', 'modern'] },
  { id: 'ring-bloom', name: 'Bloom Ring', occ: ['ring-ceremony', 'engagement'], recipe: 'frame', palettes: ['dustyRose', 'cream', 'lavender'], type: 'sage', date: 'line', category: WED_FN, premium: true,
    art: [{ a: 'bloom-corner', w: 420, h: 420, at: 'tl', o: { kind: 'peony' } }, { a: 'bloom-corner', w: 420, h: 420, at: 'br', o: { kind: 'rose' }, flip: true }],
    crest: { a: 'bloom-ring', w: 360, h: 360, o: { kind: 'rose' } },
    tags: ['ring ceremony', 'engagement', 'floral', 'roses', 'pastel'], styles: ['floral', 'watercolour', 'romantic'] },
  { id: 'tilak-kumkum', name: 'Kumkum Tilak', occ: ['tilak', 'roka'], recipe: 'hero', palettes: ['kumkum', 'temple', 'ivory'], type: 'royal', date: 'bars', category: WED_FN,
    art: [{ a: 'thali', w: 440, h: 290, at: 'top', dy: 60 }, { a: 'toran', w: 1080, h: 180, at: 'top', dy: -70, c: gold }, { a: 'mandala', w: 1200, h: 1200, at: 'center', op: 0.1, c: gold }],
    tags: ['tilak', 'tilak ceremony', 'roka', 'kumkum', 'red and gold', 'traditional'], styles: ['traditional', 'royal', 'mandala'] },
  { id: 'tilak-mangal', name: 'Mangal Tilak', occ: ['tilak'], recipe: 'frame', palettes: ['marigold', 'maroon', 'cream'], type: 'desi', date: 'rules', category: WED_FN, premium: true, pattern: 'jaali',
    art: [{ a: 'diya-row', w: 900, h: 210, at: 'bottom', dy: 10, c: gold2 }, { a: 'border', w: 1080, h: 1920, at: 'page', c: gold2 }],
    crest: { a: 'kalash', w: 200, h: 260 },
    tags: ['tilak', 'kalash', 'diyas', 'auspicious'], styles: ['traditional', 'royal'] },
  { id: 'roka-shagun', name: 'Shagun', occ: ['roka', 'engagement', 'tilak'], recipe: 'hero', palettes: ['peach', 'blush', 'mint'], type: 'sage', date: 'line', category: WED_FN,
    art: [{ a: 'gift', w: 300, h: 300, at: 'top', dy: 50, c: (x) => [x.p.primary, goldOn(x)] }, { a: 'bandhanwar', w: 1080, h: 170, at: 'top', dy: -70 }],
    tags: ['roka', 'shagun', 'rishta', 'pastel', 'gift'], styles: ['modern', 'pastel', 'minimal'] },
  { id: 'roka-rishta', name: 'Rishta Pakka', occ: ['roka'], recipe: 'photo', palettes: ['wine', 'royalBlue', 'forest'], type: 'regal', date: 'bars', category: WED_FN, premium: true,
    art: [{ a: 'corner', w: 280, h: 280, at: 'tl', c: gold }, { a: 'corner', w: 280, h: 280, at: 'br', c: gold, flip: true }, { a: 'gold-dust', w: 1080, h: 1920, at: 'page', op: 0.35, c: gold }],
    tags: ['roka', 'photo', 'couple photo', 'rishta pakka', 'royal'], styles: ['photo', 'royal', 'luxury'] },
  { id: 'cocktail-hour', name: 'Cocktail Hour', occ: ['cocktail', 'reception', 'new-year'], recipe: 'hero', palettes: ['onyx', 'midnight', 'plum'], type: 'deco', date: 'strip', category: WED_FN,
    art: [{ a: 'cocktail', w: 420, h: 390, at: 'top', dy: 40, c: (x) => [goldOn(x), '#7CB342'] }, { a: 'gold-dust', w: 1080, h: 1920, at: 'page', op: 0.5, c: gold }],
    tags: ['cocktail party', 'cocktail night', 'drinks', 'black and gold', 'party'], styles: ['party', 'night', 'luxury'] },
  { id: 'cocktail-fizz', name: 'Fizz & Sparkle', occ: ['cocktail', 'bachelorette'], recipe: 'frame', palettes: ['coral', 'candy', 'iceBlue'], type: 'party', date: 'rules', category: WED_FN, premium: true,
    art: [{ a: 'champagne', w: 260, h: 390, at: 'tl', dy: 20 }, { a: 'confetti', w: 1080, h: 1920, at: 'page', op: 0.5 }],
    crest: { a: 'stars', w: 300, h: 160, c: gold },
    tags: ['cocktail', 'champagne', 'fizz', 'party', 'bright'], styles: ['party', 'modern'] },
  { id: 'bach-squad', name: 'Bride Squad', occ: ['bachelorette'], recipe: 'hero', palettes: ['babyPink', 'lavender', 'candy'], type: 'playful', date: 'bars', category: WED_FN,
    art: [{ a: 'glossy-balloons', w: 520, h: 520, at: 'top', dy: -20, o: { bunch: 'cluster' }, c: (x) => [x.p.primary, mix(x.p.primary, '#FFFFFF', 0.4), goldOn(x)] }, { a: 'streamers', w: 500, h: 500, at: 'bl', c: gold2, op: 0.7 }],
    tags: ['bachelorette', 'bachelor party', 'bride squad', 'girls night', 'balloons'], styles: ['party', 'modern', 'pastel'] },
  { id: 'bach-lastfling', name: 'Last Fling', occ: ['bachelorette'], recipe: 'frame', palettes: ['onyx', 'navy', 'wine'], type: 'modern', date: 'strip', category: WED_FN, premium: true,
    art: [{ a: 'stars', w: 1080, h: 700, at: 'top', dy: -70, c: gold }, { a: 'geo-frame', w: 1080, h: 1920, at: 'page', c: gold }],
    crest: { a: 'cocktail', w: 240, h: 220, c: (x) => [goldOn(x), '#E85D75'] },
    tags: ['bachelor', 'bachelorette', 'last night', 'black and gold', 'party'], styles: ['party', 'night', 'minimal'] },

  // ---------------- Celebrations ----------------
  { id: 'one-tiny', name: 'Turning One', occ: ['first-birthday', 'birthday'], recipe: 'hero', palettes: ['babyBlue', 'babyPink', 'butter'], type: 'playful', date: 'bars', category: 'kids',
    art: [{ a: 'cake', w: 360, h: 360, at: 'top', dy: 50 }, { a: 'glossy-balloons', w: 360, h: 420, at: 'tl', o: { bunch: 'trio' } }, { a: 'glossy-balloons', w: 360, h: 420, at: 'tr', o: { bunch: 'pair' }, flip: true }],
    tags: ['first birthday', '1st birthday', 'baby birthday', 'cake', 'balloons', 'pastel'], styles: ['playful', 'pastel', 'kids'] },
  { id: 'one-moon', name: 'Moon & Stars One', occ: ['first-birthday', 'naming-ceremony', 'baby-shower'], recipe: 'photo', palettes: ['navy', 'lavender', 'iceBlue'], type: 'garden', date: 'line', category: 'kids', premium: true,
    art: [{ a: 'baby-moon', w: 360, h: 360, at: 'tr' }, { a: 'stars', w: 1080, h: 1920, at: 'page', c: gold, op: 0.6 }, { a: 'clouds', w: 1080, h: 360, at: 'bottom', dy: 60, op: 0.8 }],
    tags: ['first birthday', 'moon', 'stars', 'twinkle', 'baby photo', 'night'], styles: ['photo', 'kids', 'night'] },
  { id: 'golden-jubilee', name: 'Golden Jubilee', occ: ['milestone-birthday', 'anniversary', 'retirement'], recipe: 'hero', palettes: ['champagne', 'onyx', 'royalBlue'], type: 'deco', date: 'rules', category: 'kids',
    art: [{ a: 'gold-ring', w: 440, h: 440, at: 'top', dy: 20, c: gold }, { a: 'gold-dust', w: 1080, h: 1920, at: 'page', op: 0.45, c: gold }, { a: 'streamers', w: 480, h: 480, at: 'br', c: gold2, op: 0.5 }],
    tags: ['50th birthday', '60th birthday', 'milestone birthday', 'golden jubilee', 'gold', 'elegant'], styles: ['luxury', 'minimal', 'modern'] },
  { id: 'shashti-poorti', name: 'Shashti Poorti', occ: ['milestone-birthday', 'anniversary'], recipe: 'frame', palettes: ['temple', 'maroon', 'teal'], type: 'royal', date: 'bars', category: 'kids', premium: true, pattern: 'mandala',
    art: [{ a: 'toran', w: 1080, h: 200, at: 'top', dy: -70, c: gold }, { a: 'diya-row', w: 900, h: 210, at: 'bottom', dy: 10, c: gold2 }],
    crest: { a: 'kalash', w: 200, h: 260 },
    tags: ['shashti poorti', '60th birthday', 'sashtiabdapurthi', 'traditional', 'south indian'], styles: ['traditional', 'royal'] },
  { id: 'kitty-high-tea', name: 'High Tea', occ: ['kitty-party', 'birthday', 'reunion'], recipe: 'hero', palettes: ['mint', 'peach', 'lavender'], type: 'sage', date: 'line', category: 'business',
    art: [{ a: 'cake', w: 320, h: 320, at: 'top', dy: 60, c: (x) => ['#FFF4E6', x.p.primary, goldOn(x)] }, { a: 'bunting', w: 1080, h: 240, at: 'top', dy: -70, c: (x) => [x.p.primary, soft(x), goldOn(x)] }],
    tags: ['kitty party', 'ladies kitty', 'high tea', 'brunch', 'pastel'], styles: ['pastel', 'modern', 'playful'] },
  { id: 'kitty-glam', name: 'Glam Kitty', occ: ['kitty-party', 'bachelorette'], recipe: 'frame', palettes: ['onyx', 'wine', 'plum'], type: 'gala', date: 'strip', category: 'business', premium: true,
    art: [{ a: 'glossy-balloons', w: 420, h: 480, at: 'tr', o: { bunch: 'cluster', metal: true }, c: (x) => [goldOn(x), mix(goldOn(x), '#FFFFFF', 0.3), mix(goldOn(x), '#000000', 0.2)] }, { a: 'confetti', w: 1080, h: 1920, at: 'page', op: 0.35, c: (x) => [goldOn(x), x.p.accent, '#FFFFFF'] }],
    crest: { a: 'stars', w: 300, h: 160, c: gold },
    tags: ['kitty party', 'theme party', 'glam', 'black and gold'], styles: ['party', 'luxury', 'night'] },
  { id: 'grad-capstone', name: 'Capstone', occ: ['graduation', 'farewell'], recipe: 'hero', palettes: ['navy', 'forest', 'onyx'], type: 'corporate', date: 'rules', category: 'business',
    art: [{ a: 'grad-cap', w: 420, h: 320, at: 'top', dy: 50, c: (x) => [isDarkColor(x.p.background) ? '#111111' : x.p.primary, goldOn(x)] }, { a: 'confetti', w: 1080, h: 900, at: 'top', dy: -70, op: 0.4, c: (x) => [goldOn(x), '#FFFFFF', x.p.accent] }],
    tags: ['graduation', 'graduation party', 'convocation', 'class of', 'cap'], styles: ['modern', 'minimal', 'party'] },
  { id: 'grad-confetti', name: 'Confetti Cap', occ: ['graduation'], recipe: 'photo', palettes: ['sky', 'coral', 'butter'], type: 'playful', date: 'bars', category: 'business', premium: true,
    art: [{ a: 'streamers', w: 500, h: 500, at: 'tl', c: gold2 }, { a: 'confetti', w: 1080, h: 1920, at: 'page', op: 0.5 }],
    crest: { a: 'grad-cap', w: 220, h: 170 },
    tags: ['graduation', 'photo', 'graduate', 'celebration', 'bright'], styles: ['photo', 'playful', 'party'] },
  { id: 'farewell-wings', name: 'New Wings', occ: ['farewell', 'retirement', 'family-trip'], recipe: 'hero', palettes: ['dustyBlue', 'sky', 'parchment'], type: 'sage', date: 'line', category: 'business',
    art: [{ a: 'doves', w: 440, h: 300, at: 'top', dy: 60, c: (x) => ['#FFFFFF', goldOn(x)] }, { a: 'clouds', w: 1080, h: 380, at: 'top', dy: -70, op: 0.85 }],
    tags: ['farewell', 'farewell party', 'send off', 'goodbye', 'new beginnings', 'retirement'], styles: ['minimal', 'pastel', 'modern'] },
  { id: 'cheers-farewell', name: 'Cheers to You', occ: ['farewell', 'retirement'], recipe: 'frame', palettes: ['navy', 'wine', 'forest'], type: 'modern', date: 'strip', category: 'business', premium: true,
    art: [{ a: 'champagne', w: 260, h: 390, at: 'tr', dy: 20 }, { a: 'gold-dust', w: 1080, h: 1920, at: 'page', op: 0.4, c: gold }],
    crest: { a: 'stars', w: 300, h: 160, c: gold },
    tags: ['farewell', 'cheers', 'office farewell', 'champagne'], styles: ['party', 'modern', 'luxury'] },
  { id: 'reunion-polaroid', name: 'Old Friends', occ: ['reunion', 'family-trip', 'kitty-party'], recipe: 'photo', palettes: ['linen', 'mustard', 'coral'], type: 'vintage', date: 'rules', category: 'business',
    art: [{ a: 'bunting', w: 1080, h: 240, at: 'top', dy: -70, c: (x) => [x.p.primary, soft(x), goldOn(x)] }],
    tags: ['reunion', 'alumni meet', 'school reunion', 'college reunion', 'friends', 'photo'], styles: ['photo', 'vintage'] },
  { id: 'reunion-yearbook', name: 'Yearbook', occ: ['reunion'], recipe: 'frame', palettes: ['navy', 'royalBlue', 'teal'], type: 'classic', date: 'bars', category: 'business', premium: true,
    art: [{ a: 'stars', w: 1080, h: 600, at: 'top', dy: -70, c: gold, op: 0.7 }, { a: 'border', w: 1080, h: 1920, at: 'page', c: gold2 }],
    crest: { a: 'grad-cap', w: 200, h: 160, c: (x) => [goldOn(x), '#FFFFFF'] },
    tags: ['reunion', 'batch reunion', 'yearbook', 'alumni'], styles: ['classic', 'minimal'] },
  { id: 'katha-kalash', name: 'Katha Kalash', occ: ['satyanarayan-katha', 'puja', 'griha-pravesh'], recipe: 'hero', palettes: ['saffron', 'marigold', 'ivory'], type: 'royal', date: 'bars', category: 'religious',
    art: [{ a: 'kalash', w: 320, h: 416, at: 'top', dy: 30 }, { a: 'bells', w: 150, h: 260, at: 'tl', c: gold }, { a: 'bells', w: 150, h: 260, at: 'tr', c: gold, flip: true }],
    tags: ['satyanarayan katha', 'satyanarayan puja', 'katha', 'kalash', 'puja invitation'], styles: ['traditional', 'devotional'] },
  { id: 'katha-deep', name: 'Deep Katha', occ: ['satyanarayan-katha', 'puja'], recipe: 'frame', palettes: ['temple', 'kumkum', 'cream'], type: 'desi', date: 'rules', category: 'religious', premium: true, pattern: 'mandala',
    art: [{ a: 'toran', w: 1080, h: 200, at: 'top', dy: -70, c: gold }, { a: 'diya-row', w: 900, h: 210, at: 'bottom', dy: 10, c: gold2 }],
    crest: { a: 'motif', w: 200, h: 200, o: { motif: 'om' }, c: gold2 },
    tags: ['katha', 'puja', 'diya', 'om', 'devotional'], styles: ['traditional', 'devotional', 'mandala'] },

  // ---------------- Festivals ----------------
  { id: 'diwali-diya', name: 'Diya Lights', occ: ['diwali', 'bhai-dooj'], recipe: 'hero', palettes: ['midnight', 'maroon', 'navy'], type: 'royal', date: 'bars', category: 'festival',
    art: [{ a: 'lantern', w: 200, h: 320, at: 'tl', dy: -40, c: gold2 }, { a: 'lantern', w: 200, h: 320, at: 'tr', dy: -40, c: gold2, flip: true }, { a: 'diya', w: 360, h: 230, at: 'top', dy: 150, c: gold }, { a: 'diya-row', w: 960, h: 230, at: 'bottom', dy: 20, c: gold2 }, { a: 'gold-dust', w: 1080, h: 1920, at: 'page', op: 0.35, c: gold }],
    tags: ['diwali', 'deepavali', 'happy diwali', 'diya', 'lights', 'diwali greeting card', 'diwali party invitation'], styles: ['traditional', 'festive', 'night'] },
  { id: 'diwali-rangoli', name: 'Rangoli Diwali', occ: ['diwali'], recipe: 'frame', palettes: ['marigold', 'kumkum', 'plum'], type: 'desi', date: 'rules', category: 'festival', premium: true,
    art: [{ a: 'fireworks', w: 560, h: 455, at: 'tl', dy: -20 }, { a: 'rangoli', w: 520, h: 520, at: 'bottom', dy: 120, op: 0.9 }, { a: 'toran', w: 1080, h: 180, at: 'top', dy: -70, c: gold }],
    crest: { a: 'diya', w: 260, h: 160, c: gold },
    tags: ['diwali', 'rangoli', 'fireworks', 'festival of lights', 'colourful'], styles: ['festive', 'colourful', 'traditional'] },
  { id: 'holi-rang', name: 'Rang Barse', occ: ['holi'], recipe: 'hero', palettes: ['linen', 'cream', 'butter'], type: 'playful', date: 'bars', category: 'festival',
    art: [{ a: 'color-burst', w: 760, h: 760, at: 'top', dy: -120 }, { a: 'color-burst', w: 420, h: 420, at: 'br', op: 0.7 }],
    tags: ['holi', 'happy holi', 'rang', 'colours', 'gulal', 'holi party invitation', 'holi greeting'], styles: ['colourful', 'festive', 'playful'] },
  { id: 'holi-gulal', name: 'Gulal', occ: ['holi'], recipe: 'frame', palettes: ['candy', 'lavender', 'mint'], type: 'party', date: 'rules', category: 'festival', premium: true,
    art: [{ a: 'color-burst', w: 520, h: 520, at: 'tl', dy: -80 }, { a: 'color-burst', w: 520, h: 520, at: 'br', dy: 80 }, { a: 'confetti', w: 1080, h: 1920, at: 'page', op: 0.3 }],
    crest: { a: 'color-burst', w: 220, h: 220 },
    tags: ['holi', 'holi milan', 'holika', 'colour party', 'pastel'], styles: ['colourful', 'party', 'pastel'] },
  { id: 'xmas-joy', name: 'Christmas Joy', occ: ['christmas', 'new-year', 'holiday-greeting'], recipe: 'hero', palettes: ['forest', 'kumkum', 'navy'], type: 'classic', date: 'bars', category: 'festival',
    art: [{ a: 'xmas-tree', w: 380, h: 494, at: 'top', dy: 10, c: (x) => ['#2E7D4F', goldOn(x), '#C62828'] }, { a: 'snowflake', w: 120, h: 120, at: 'tl', c: () => ['#FFFFFF'], op: 0.8 }, { a: 'snowflake', w: 90, h: 90, at: 'tr', dy: 140, c: () => ['#FFFFFF'], op: 0.7 }, { a: 'stars', w: 1080, h: 1920, at: 'page', op: 0.4, c: gold }],
    tags: ['christmas', 'merry christmas', 'xmas', 'christmas tree', 'christmas party invitation', 'christmas greeting card'], styles: ['festive', 'classic', 'illustrated'] },
  { id: 'xmas-snow', name: 'Snowy Night', occ: ['christmas', 'holiday-greeting'], recipe: 'frame', palettes: ['iceBlue', 'midnight', 'champagne'], type: 'garden', date: 'line', category: 'festival', premium: true,
    art: [{ a: 'wreath', w: 1080, h: 1080, at: 'center', dy: -200, op: 0.25, c: (x) => ['#4E7A5B', goldOn(x)] }, { a: 'snowflake', w: 140, h: 140, at: 'tl', c: () => ['#FFFFFF'] }, { a: 'snowflake', w: 110, h: 110, at: 'br', c: () => ['#FFFFFF'] }, { a: 'stars', w: 1080, h: 700, at: 'top', dy: -70, c: gold }],
    crest: { a: 'wreath', w: 280, h: 280, c: (x) => ['#4E7A5B', goldOn(x)] },
    tags: ['christmas', 'winter', 'snow', 'wreath', 'holiday season'], styles: ['minimal', 'night', 'elegant'] },
  { id: 'ny-countdown', name: 'Countdown', occ: ['new-year', 'cocktail'], recipe: 'hero', palettes: ['onyx', 'midnight', 'navy'], type: 'deco', date: 'strip', category: 'festival',
    art: [{ a: 'fireworks', w: 900, h: 730, at: 'top', dy: -90, c: (x) => [goldOn(x), '#F06292', '#FFFFFF'] }, { a: 'champagne', w: 220, h: 330, at: 'br' }],
    tags: ['new year', 'happy new year', 'nye', 'new year party', 'countdown', 'fireworks', '2027'], styles: ['party', 'night', 'luxury'] },
  { id: 'ny-confetti', name: 'Confetti Drop', occ: ['new-year'], recipe: 'frame', palettes: ['champagne', 'plum', 'royalBlue'], type: 'gala', date: 'bars', category: 'festival', premium: true,
    art: [{ a: 'streamers', w: 560, h: 560, at: 'tl', c: gold2 }, { a: 'confetti', w: 1080, h: 1920, at: 'page', op: 0.5, c: (x) => [goldOn(x), x.p.accent, '#FFFFFF'] }, { a: 'gold-dust', w: 1080, h: 1920, at: 'page', op: 0.4, c: gold }],
    crest: { a: 'champagne', w: 160, h: 240 },
    tags: ['new year', 'new year eve', 'confetti', 'gold'], styles: ['party', 'luxury'] },
  { id: 'rakhi-dhaga', name: 'Pyara Dhaga', occ: ['raksha-bandhan'], recipe: 'hero', palettes: ['peach', 'saffron', 'blush'], type: 'desi', date: 'bars', category: 'festival',
    art: [{ a: 'rakhi', w: 760, h: 355, at: 'top', dy: 60 }, { a: 'gold-dust', w: 1080, h: 1920, at: 'page', op: 0.35, c: gold }],
    tags: ['raksha bandhan', 'rakhi', 'happy rakhi', 'brother sister', 'rakhi greeting card'], styles: ['festive', 'traditional', 'illustrated'] },
  { id: 'rakhi-thali', name: 'Rakhi Thali', occ: ['raksha-bandhan', 'bhai-dooj'], recipe: 'frame', palettes: ['kumkum', 'royalBlue', 'mint'], type: 'royal', date: 'rules', category: 'festival', premium: true, pattern: 'paisley',
    art: [{ a: 'bloom-corner', w: 380, h: 380, at: 'tl', o: { kind: 'mixed' } }, { a: 'bloom-corner', w: 380, h: 380, at: 'br', o: { kind: 'mixed' }, flip: true }],
    crest: { a: 'thali', w: 340, h: 220 },
    tags: ['raksha bandhan', 'rakhi thali', 'puja thali', 'sibling'], styles: ['traditional', 'floral'] },
  { id: 'bhaidooj-tika', name: 'Tika', occ: ['bhai-dooj', 'raksha-bandhan'], recipe: 'hero', palettes: ['marigold', 'temple', 'peach'], type: 'desi', date: 'bars', category: 'festival',
    art: [{ a: 'thali', w: 480, h: 310, at: 'top', dy: 70 }, { a: 'genda-ladi', w: 1080, h: 240, at: 'top', dy: -70, o: { count: 6 } }],
    tags: ['bhai dooj', 'bhaiya dooj', 'bhau beej', 'tika', 'brother', 'bhai dooj greeting'], styles: ['traditional', 'festive'] },
  { id: 'bhaidooj-bond', name: 'Bhai Behen', occ: ['bhai-dooj'], recipe: 'photo', palettes: ['plum', 'teal', 'ivory'], type: 'script', date: 'rules', category: 'festival', premium: true,
    art: [{ a: 'diya-row', w: 900, h: 210, at: 'bottom', dy: 10, c: gold2 }, { a: 'gold-dust', w: 1080, h: 1920, at: 'page', op: 0.35, c: gold }],
    tags: ['bhai dooj', 'siblings', 'photo', 'brother sister photo'], styles: ['photo', 'traditional'] },
  { id: 'eid-chand', name: 'Chand Raat', occ: ['eid', 'nikah'], recipe: 'hero', palettes: ['emerald', 'navy', 'midnight'], type: 'regal', date: 'rules', category: 'festival',
    art: [{ a: 'motif', w: 300, h: 300, at: 'top', dy: 40, o: { motif: 'crescent' }, c: gold2 }, { a: 'lantern', w: 190, h: 300, at: 'tl', dy: -40, c: gold2 }, { a: 'lantern', w: 190, h: 300, at: 'tr', dy: -40, c: gold2, flip: true }, { a: 'stars', w: 1080, h: 1920, at: 'page', op: 0.4, c: gold }],
    tags: ['eid', 'eid mubarak', 'eid ul fitr', 'eid al adha', 'chand raat', 'crescent', 'eid greeting card'], styles: ['traditional', 'night', 'luxury'] },
  { id: 'eid-mubarak', name: 'Eid Jaali', occ: ['eid'], recipe: 'frame', palettes: ['jade', 'teal', 'parchment'], type: 'mahal', date: 'bars', category: 'festival', premium: true, pattern: 'jaali',
    art: [{ a: 'geo-frame', w: 1080, h: 1920, at: 'page', c: gold }, { a: 'lantern', w: 170, h: 270, at: 'bl', c: gold2 }],
    crest: { a: 'motif', w: 200, h: 200, o: { motif: 'crescent' }, c: gold2 },
    tags: ['eid', 'eid milan', 'jaali', 'geometric', 'mughal'], styles: ['traditional', 'geometric', 'luxury'] },
  { id: 'garba-raas', name: 'Garba Raas', occ: ['navratri'], recipe: 'hero', palettes: ['saffron', 'candy', 'marigold'], type: 'playful', date: 'bars', category: 'festival',
    art: [{ a: 'dandiya', w: 480, h: 443, at: 'top', dy: 30 }, { a: 'confetti', w: 1080, h: 1920, at: 'page', op: 0.35 }],
    tags: ['navratri', 'garba', 'dandiya', 'garba night', 'dandiya night invitation', 'navratri greeting'], styles: ['festive', 'colourful', 'party'] },
  { id: 'navratri-shakti', name: 'Nav Shakti', occ: ['navratri', 'durga-puja', 'jagran'], recipe: 'frame', palettes: ['kumkum', 'plum', 'temple'], type: 'royal', date: 'rules', category: 'festival', premium: true, pattern: 'mandala',
    art: [{ a: 'mandala', w: 1300, h: 1300, at: 'center', op: 0.14, c: gold }, { a: 'toran', w: 1080, h: 190, at: 'top', dy: -70, c: gold }],
    crest: { a: 'diya', w: 260, h: 160, c: gold },
    tags: ['navratri', 'shakti', 'durga', 'mata', 'nine nights'], styles: ['traditional', 'devotional', 'mandala'] },
  { id: 'ganpati-bappa', name: 'Ganpati Bappa', occ: ['ganesh-chaturthi'], recipe: 'hero', palettes: ['saffron', 'marigold', 'kumkum'], type: 'royal', date: 'bars', category: 'festival',
    art: [{ a: 'ganesha', w: 380, h: 380, at: 'top', dy: 40, c: gold2 }, { a: 'genda-ladi', w: 1080, h: 240, at: 'top', dy: -70, o: { count: 7 } }],
    tags: ['ganesh chaturthi', 'ganpati', 'ganpati bappa morya', 'vinayaka chaturthi', 'ganpati invitation', 'ganesh visarjan'], styles: ['traditional', 'devotional', 'festive'] },
  { id: 'ganesh-modak', name: 'Modak Utsav', occ: ['ganesh-chaturthi'], recipe: 'frame', palettes: ['maroon', 'teal', 'butter'], type: 'desi', date: 'rules', category: 'festival', premium: true,
    art: [{ a: 'lotus', w: 420, h: 300, at: 'bottom', dy: 20 }, { a: 'border', w: 1080, h: 1920, at: 'page', c: gold2 }],
    crest: { a: 'ganesha', w: 240, h: 240, c: gold2 },
    tags: ['ganesh chaturthi', 'modak', 'ganeshotsav', 'lotus'], styles: ['traditional', 'devotional'] },
  { id: 'lohri-bonfire', name: 'Lohri Di Raat', occ: ['lohri', 'sankranti'], recipe: 'hero', palettes: ['midnight', 'wine', 'forest'], type: 'desi', date: 'bars', category: 'festival',
    art: [{ a: 'bonfire', w: 400, h: 400, at: 'top', dy: 50 }, { a: 'kite', w: 160, h: 240, at: 'tr', dy: 20 }, { a: 'stars', w: 1080, h: 700, at: 'top', dy: -70, c: gold, op: 0.7 }],
    tags: ['lohri', 'happy lohri', 'lohri di lakh lakh vadhaiyan', 'bonfire', 'punjabi', 'lohri party invitation'], styles: ['festive', 'night', 'illustrated'] },
  { id: 'lohri-phulkari', name: 'Phulkari Lohri', occ: ['lohri'], recipe: 'frame', palettes: ['mustard', 'kumkum', 'emerald'], type: 'playful', date: 'rules', category: 'festival', premium: true,
    art: [{ a: 'geo-frame', w: 1080, h: 1920, at: 'page', c: (x) => [x.p.accent] }, { a: 'confetti', w: 1080, h: 1920, at: 'page', op: 0.3 }],
    crest: { a: 'bonfire', w: 220, h: 220 },
    tags: ['lohri', 'phulkari', 'punjabi', 'dhol', 'colourful'], styles: ['colourful', 'traditional', 'festive'] },
  { id: 'patang-utsav', name: 'Patang Utsav', occ: ['sankranti'], recipe: 'hero', palettes: ['sky', 'iceBlue', 'butter'], type: 'playful', date: 'bars', category: 'festival',
    art: [{ a: 'kite', w: 260, h: 390, at: 'top', dy: 10 }, { a: 'kite', w: 170, h: 255, at: 'tl', dy: 140, c: () => ['#1E88E5', '#FFFFFF', '#5D4037'] }, { a: 'kite', w: 150, h: 225, at: 'tr', dy: 260, c: () => ['#43A047', '#FDD835', '#5D4037'] }, { a: 'clouds', w: 1080, h: 360, at: 'bottom', dy: 40, op: 0.8 }],
    tags: ['makar sankranti', 'uttarayan', 'kite festival', 'patang', 'sankranti greeting'], styles: ['playful', 'colourful', 'illustrated'] },
  { id: 'pongal-sweet', name: 'Pongal O Pongal', occ: ['sankranti', 'onam'], recipe: 'frame', palettes: ['marigold', 'forest', 'ivory'], type: 'desi', date: 'rules', category: 'festival', premium: true,
    art: [{ a: 'rangoli', w: 520, h: 520, at: 'bottom', dy: 140, op: 0.9 }, { a: 'bandhanwar', w: 1080, h: 170, at: 'top', dy: -70 }],
    crest: { a: 'pongal-pot', w: 280, h: 280 },
    tags: ['pongal', 'happy pongal', 'thai pongal', 'kolam', 'sugarcane', 'tamil'], styles: ['traditional', 'festive'] },
  { id: 'onam-pookalam', name: 'Pookalam', occ: ['onam'], recipe: 'hero', palettes: ['cream', 'ivory', 'parchment'], type: 'royal', date: 'bars', category: 'festival',
    art: [{ a: 'rangoli', w: 560, h: 560, at: 'top', dy: 20, c: () => ['#F28C0F', '#FFC93C', '#C62828'] }, { a: 'border', w: 1080, h: 1920, at: 'page', c: gold2 }],
    tags: ['onam', 'happy onam', 'pookalam', 'kasavu', 'kerala', 'onam sadya', 'onam greeting'], styles: ['traditional', 'festive', 'minimal'] },
  { id: 'onam-sadya', name: 'Onam Sadya', occ: ['onam'], recipe: 'frame', palettes: ['mint', 'butter', 'forest'], type: 'garden', date: 'rules', category: 'festival', premium: true,
    art: [{ a: 'lotus', w: 420, h: 300, at: 'bottom', dy: 20 }, { a: 'greenery', w: 360, h: 360, at: 'tl', o: { kind: 'fern' } }, { a: 'greenery', w: 360, h: 360, at: 'tr', o: { kind: 'fern' }, flip: true }],
    crest: { a: 'diya', w: 260, h: 160, c: gold },
    tags: ['onam', 'sadya', 'banana leaf', 'kerala', 'feast'], styles: ['traditional', 'floral'] },
  { id: 'durga-dhak', name: 'Dhak & Shankh', occ: ['durga-puja', 'navratri'], recipe: 'hero', palettes: ['kumkum', 'temple', 'ivory'], type: 'royal', date: 'bars', category: 'festival',
    art: [{ a: 'shankh', w: 420, h: 290, at: 'top', dy: 60 }, { a: 'lotus', w: 300, h: 215, at: 'bl' }, { a: 'lotus', w: 300, h: 215, at: 'br', flip: true }, { a: 'mandala', w: 1200, h: 1200, at: 'center', op: 0.1, c: gold }],
    tags: ['durga puja', 'shubho bijoya', 'pujo', 'bengali', 'dhak', 'shankh', 'durga puja greeting'], styles: ['traditional', 'devotional'] },
  { id: 'durga-pandal', name: 'Pandal Nights', occ: ['durga-puja'], recipe: 'frame', palettes: ['maroon', 'midnight', 'marigold'], type: 'mahal', date: 'rules', category: 'festival', premium: true,
    art: [{ a: 'toran', w: 1080, h: 200, at: 'top', dy: -70, c: gold }, { a: 'lantern', w: 180, h: 290, at: 'bl', c: gold2 }, { a: 'lantern', w: 180, h: 290, at: 'br', c: gold2, flip: true }],
    crest: { a: 'shankh', w: 260, h: 180 },
    tags: ['durga puja', 'pandal', 'pujo nights', 'kolkata'], styles: ['traditional', 'night'] },
  { id: 'karva-chand', name: 'Chand Dekh', occ: ['karva-chauth'], recipe: 'hero', palettes: ['navy', 'wine', 'midnight'], type: 'script', date: 'rules', category: 'festival',
    art: [{ a: 'baby-moon', w: 420, h: 420, at: 'top', dy: 20, c: (x) => ['#F8D57E', goldOn(x), '#FFFFFF'] }, { a: 'stars', w: 1080, h: 1920, at: 'page', op: 0.45, c: gold }],
    tags: ['karva chauth', 'karwa chauth', 'moon', 'chand', 'suhaag', 'karva chauth greeting'], styles: ['night', 'traditional', 'romantic'] },
  { id: 'karva-shringaar', name: 'Solah Shringaar', occ: ['karva-chauth', 'anniversary'], recipe: 'photo', palettes: ['kumkum', 'blush', 'maroon'], type: 'regal', date: 'bars', category: 'festival', premium: true,
    art: [{ a: 'bloom-corner', w: 380, h: 380, at: 'tl', o: { kind: 'rose' } }, { a: 'thali', w: 300, h: 195, at: 'bottom', dy: 20 }],
    tags: ['karva chauth', 'couple photo', 'shringaar', 'red'], styles: ['photo', 'romantic', 'traditional'] },
  { id: 'krishna-flute', name: 'Bansuri', occ: ['janmashtami'], recipe: 'hero', palettes: ['royalBlue', 'teal', 'navy'], type: 'royal', date: 'bars', category: 'festival',
    art: [{ a: 'flute', w: 600, h: 375, at: 'top', dy: 40, c: (x) => [goldOn(x), '#1565C0', '#2E7D32'] }, { a: 'peacock', w: 300, h: 300, at: 'br', op: 0.6 }, { a: 'gold-dust', w: 1080, h: 1920, at: 'page', op: 0.3, c: gold }],
    tags: ['janmashtami', 'krishna janmashtami', 'gokulashtami', 'bansuri', 'peacock feather', 'janmashtami greeting'], styles: ['devotional', 'traditional', 'illustrated'] },
  { id: 'janmashtami-matki', name: 'Makhan Matki', occ: ['janmashtami'], recipe: 'frame', palettes: ['mustard', 'butter', 'iceBlue'], type: 'desi', date: 'rules', category: 'festival', premium: true,
    art: [{ a: 'peacock', w: 380, h: 380, at: 'tl' }, { a: 'border', w: 1080, h: 1920, at: 'page', c: gold2 }],
    crest: { a: 'flute', w: 320, h: 200 },
    tags: ['janmashtami', 'dahi handi', 'matki', 'peacock'], styles: ['traditional', 'devotional'] },
  { id: 'gurpurab-prakash', name: 'Prakash Purab', occ: ['gurpurab', 'anand-karaj'], recipe: 'hero', palettes: ['saffron', 'navy', 'ivory'], type: 'royal', date: 'bars', category: 'festival',
    art: [{ a: 'motif', w: 300, h: 300, at: 'top', dy: 40, o: { motif: 'khanda' }, c: gold2 }, { a: 'diya-row', w: 960, h: 230, at: 'bottom', dy: 20, c: gold2 }],
    tags: ['gurpurab', 'guru nanak jayanti', 'prakash purab', 'khanda', 'sikh', 'gurpurab greeting'], styles: ['devotional', 'traditional'] },
  { id: 'gurpurab-seva', name: 'Seva Simran', occ: ['gurpurab'], recipe: 'frame', palettes: ['ivory', 'forest', 'mustard'], type: 'classic', date: 'rules', category: 'festival', premium: true,
    art: [{ a: 'geo-frame', w: 1080, h: 1920, at: 'page', c: gold }],
    crest: { a: 'motif', w: 200, h: 200, o: { motif: 'khanda' }, c: gold2 },
    tags: ['gurpurab', 'langar', 'seva', 'kirtan', 'sikh'], styles: ['devotional', 'minimal', 'geometric'] },

  // ---------------- Trips & holidays ----------------
  { id: 'trip-wanderlust', name: 'Wanderlust', occ: ['group-trip', 'family-trip', 'bachelorette'], recipe: 'hero', palettes: ['sky', 'iceBlue', 'peach'], type: 'modern', date: 'strip', category: 'travel',
    art: [{ a: 'palm', w: 340, h: 397, at: 'top', dy: 10 }, { a: 'suitcase', w: 220, h: 240, at: 'tl', dy: 200 }, { a: 'clouds', w: 1080, h: 360, at: 'top', dy: -70, op: 0.8 }],
    tags: ['group trip', 'trip invite', 'getaway', 'goa trip', 'vacation', 'travel', 'itinerary'], styles: ['modern', 'illustrated', 'pastel'] },
  { id: 'trip-roadtrip', name: 'Road Trip', occ: ['group-trip', 'reunion'], recipe: 'frame', palettes: ['mustard', 'teal', 'coral'], type: 'playful', date: 'bars', category: 'travel', premium: true,
    art: [{ a: 'suitcase', w: 260, h: 284, at: 'br' }, { a: 'bunting', w: 1080, h: 240, at: 'top', dy: -70, c: (x) => [x.p.primary, soft(x), goldOn(x)] }],
    crest: { a: 'palm', w: 200, h: 233 },
    tags: ['road trip', 'weekend getaway', 'friends trip', 'adventure'], styles: ['playful', 'colourful'] },
  { id: 'family-voyage', name: 'Family Voyage', occ: ['family-trip', 'reunion'], recipe: 'photo', palettes: ['mint', 'butter', 'sky'], type: 'sage', date: 'line', category: 'travel',
    art: [{ a: 'palm', w: 280, h: 327, at: 'br' }, { a: 'clouds', w: 1080, h: 360, at: 'top', dy: -70, op: 0.8 }],
    tags: ['family trip', 'family reunion trip', 'family vacation', 'photo', 'holiday'], styles: ['photo', 'pastel', 'modern'] },
  { id: 'family-postcard', name: 'Postcard Home', occ: ['family-trip', 'holiday-greeting'], recipe: 'frame', palettes: ['parchment', 'linen', 'dustyBlue'], type: 'vintage', date: 'rules', category: 'travel', premium: true,
    art: [{ a: 'border', w: 1080, h: 1920, at: 'page', c: (x) => [x.p.primary, x.p.accent] }, { a: 'suitcase', w: 220, h: 240, at: 'bl' }],
    crest: { a: 'stars', w: 300, h: 160, c: gold },
    tags: ['postcard', 'travel', 'vintage', 'holiday'], styles: ['vintage', 'minimal'] },
  { id: 'holiday-postcard', name: 'Wish You Were Here', occ: ['holiday-greeting', 'family-trip'], recipe: 'photo', palettes: ['peach', 'sky', 'coral'], type: 'modern', date: 'line', category: 'travel',
    art: [{ a: 'palm', w: 300, h: 350, at: 'bl' }, { a: 'suitcase', w: 200, h: 218, at: 'tr' }],
    tags: ['holiday greeting', 'summer holidays', 'vacation photo', 'travel memories', 'we are back'], styles: ['photo', 'modern', 'pastel'] },
  { id: 'holiday-season', name: "Season's Greetings", occ: ['holiday-greeting', 'christmas', 'new-year'], recipe: 'hero', palettes: ['midnight', 'forest', 'champagne'], type: 'gala', date: 'rules', category: 'travel', premium: true,
    art: [{ a: 'snowflake', w: 260, h: 260, at: 'top', dy: 60, c: (x) => [goldOn(x)] }, { a: 'stars', w: 1080, h: 1920, at: 'page', op: 0.45, c: gold }, { a: 'gold-dust', w: 1080, h: 1920, at: 'page', op: 0.4, c: gold }],
    tags: ["season's greetings", 'happy holidays', 'winter holidays', 'corporate greeting'], styles: ['minimal', 'night', 'luxury'] },
];

export const OCCASION_FAMILIES: DesignFamily[] = SPECS.map(family);
/** Occasion → the free family made for it (its matching video / website design shares the id). */
export const OCCASION_HEADLINERS: Record<string, string> = Object.fromEntries(SPECS.filter((s) => !s.premium).map((s) => [s.occ[0]!, s.id]));
