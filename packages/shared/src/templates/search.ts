import { EVENT_TYPES, type Community } from '../constants/event-types.js';
import type { TemplateDefinition, Theme } from './types.js';

/**
 * Template search: free text (English, Hindi, Hinglish) + filter chips.
 * Every template gets searchable metadata — styles, colour words, occasions, communities,
 * tags — derived from its definition, so marketplace templates are searchable too.
 */

// ------------------------------------------------------------ vocabularies

export const STYLE_FILTERS = [
  { id: 'traditional', label: 'Traditional', labelHi: 'पारंपरिक' },
  { id: 'floral', label: 'Floral', labelHi: 'फूलों वाला' },
  { id: 'watercolour', label: 'Watercolour', labelHi: 'वॉटरकलर' },
  { id: 'illustrated', label: 'Illustrated couple', labelHi: 'चित्र वाला' },
  { id: 'caricature', label: 'Cartoon / caricature', labelHi: 'कार्टून' },
  { id: 'royal', label: 'Royal', labelHi: 'शाही' },
  { id: 'arch', label: 'Arch / jharokha', labelHi: 'मेहराब' },
  { id: 'religious', label: 'Religious', labelHi: 'धार्मिक' },
  { id: 'minimal', label: 'Minimal', labelHi: 'सादा' },
  { id: 'modern', label: 'Modern', labelHi: 'मॉडर्न' },
  { id: 'line-art', label: 'Line art', labelHi: 'लाइन आर्ट' },
  { id: 'luxury', label: 'Luxury', labelHi: 'लग्ज़री' },
  { id: 'photo', label: 'With photo', labelHi: 'फ़ोटो वाला' },
  { id: 'pastel', label: 'Pastel', labelHi: 'हल्के रंग' },
  { id: 'bright', label: 'Bright & festive', labelHi: 'चटकीला' },
  { id: 'dark', label: 'Dark', labelHi: 'गहरा' },
] as const;
export type TemplateStyle = (typeof STYLE_FILTERS)[number]['id'];

export const COLOR_FILTERS = [
  { id: 'red', label: 'Red', labelHi: 'लाल', swatch: '#B5121B' },
  { id: 'maroon', label: 'Maroon', labelHi: 'मैरून', swatch: '#5B0F1B' },
  { id: 'pink', label: 'Pink', labelHi: 'गुलाबी', swatch: '#E58FAB' },
  { id: 'orange', label: 'Orange', labelHi: 'नारंगी', swatch: '#F28C0F' },
  { id: 'yellow', label: 'Yellow', labelHi: 'पीला', swatch: '#F6D365' },
  { id: 'gold', label: 'Gold', labelHi: 'सुनहरा', swatch: '#C9973F' },
  { id: 'green', label: 'Green', labelHi: 'हरा', swatch: '#4E7D3A' },
  { id: 'blue', label: 'Blue', labelHi: 'नीला', swatch: '#3F5577' },
  { id: 'navy', label: 'Navy', labelHi: 'गहरा नीला', swatch: '#0B1A33' },
  { id: 'purple', label: 'Purple', labelHi: 'बैंगनी', swatch: '#6A4C93' },
  { id: 'white', label: 'White & ivory', labelHi: 'सफ़ेद', swatch: '#FFF8EC' },
  { id: 'beige', label: 'Beige', labelHi: 'बेज', swatch: '#EAE2D4' },
  { id: 'black', label: 'Black', labelHi: 'काला', swatch: '#121212' },
] as const;
export type TemplateColor = (typeof COLOR_FILTERS)[number]['id'];

/** Hindi / Hinglish / regional words → the canonical terms templates are tagged with. */
const SYNONYMS: Record<string, string[]> = {
  shaadi: ['wedding'], shadi: ['wedding'], vivah: ['wedding'], vivaah: ['wedding'], byah: ['wedding'], biyah: ['wedding'], lagna: ['wedding'], lagan: ['wedding'],
  kalyanam: ['wedding'], marriage: ['wedding'], biye: ['wedding'], शादी: ['wedding'], विवाह: ['wedding'], ब्याह: ['wedding'], लग्न: ['wedding'], 'shubh vivah': ['wedding'],
  mehndi: ['mehendi', 'mehndi'], mehandi: ['mehendi', 'mehndi'], मेहंदी: ['mehendi', 'mehndi'], haldi: ['haldi'], हल्दी: ['haldi'], pithi: ['haldi'],
  sagai: ['engagement'], mangni: ['engagement'], roka: ['engagement'], ring: ['engagement', 'rings'], सगाई: ['engagement'],
  nikaah: ['nikah'], निकाह: ['nikah'], walima: ['reception', 'nikah'], islamic: ['muslim'], muslim: ['muslim'], bismillah: ['nikah', 'muslim'],
  'griha pravesh': ['griha-pravesh'], grihapravesh: ['griha-pravesh'], housewarming: ['griha-pravesh'], 'house warming': ['griha-pravesh'], 'गृह प्रवेश': ['griha-pravesh'], vastu: ['griha-pravesh'],
  pooja: ['puja'], पूजा: ['puja'], katha: ['puja'], कथा: ['puja'], satyanarayan: ['puja'],
  janamdin: ['birthday'], bday: ['birthday'], जन्मदिन: ['birthday'], 'baby shower': ['baby-shower'], 'godh bharai': ['baby-shower'], seemantham: ['baby-shower'],
  naamkaran: ['naming-ceremony'], namkaran: ['naming-ceremony'], naming: ['naming-ceremony'], barsa: ['naming-ceremony'], मुंडन: ['mundan'],
  'mata ki chowki': ['jagran'], chowki: ['jagran'], जागरण: ['jagran'], opening: ['shop-opening'], inauguration: ['shop-opening'], udghatan: ['shop-opening'],
  ganpati: ['ganesha'], ganesh: ['ganesha'], vinayak: ['ganesha'], गणेश: ['ganesha'], 'om shree ganeshay namah': ['ganesha'],
  lal: ['red'], laal: ['red'], लाल: ['red'], peela: ['yellow'], pila: ['yellow'], पीला: ['yellow'], hara: ['green'], हरा: ['green'],
  neela: ['blue'], nila: ['blue'], नीला: ['blue'], gulabi: ['pink'], गुलाबी: ['pink'], sunehra: ['gold'], golden: ['gold'], sona: ['gold'], सुनहरा: ['gold'],
  kala: ['black'], काला: ['black'], safed: ['white'], सफ़ेद: ['white'], ivory: ['white'], cream: ['beige', 'white'], baingani: ['purple'], jamuni: ['purple'],
  lavender: ['purple', 'lavender'], burgundy: ['maroon'], wine: ['maroon'], kesari: ['orange'], kesariya: ['orange'], bhagwa: ['orange'], peach: ['orange', 'pastel'],
  phool: ['floral'], flowers: ['floral'], flower: ['floral'], floral: ['floral'], फूल: ['floral'],
  cartoon: ['caricature'], cute: ['caricature'], caricature: ['caricature'], couple: ['couple'], dulha: ['couple'], dulhan: ['couple'],
  simple: ['minimal'], minimalist: ['minimal'], plain: ['minimal'], shahi: ['royal'], royal: ['royal'], rajwada: ['royal'], rajasthani: ['marwari', 'rajasthani'],
  pic: ['photo'], picture: ['photo'], 'save the date': ['save the date'], 'south indian': ['hindu-south'], tamil: ['hindu-south'], telugu: ['hindu-south'],
  sikh: ['sikh'], punjabi: ['punjabi'], christian: ['christian'], church: ['christian'], bengali: ['bengali'], marathi: ['marathi'], gujarati: ['gujarati'],
  diwali: ['diya'], deepawali: ['diya'], lantern: ['lanterns'], kandil: ['lanterns'],
};

// ------------------------------------------------------------ colour words from a palette

function hsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function colourWords(hex: string): TemplateColor[] {
  const [h, s, l] = hsl(hex);
  if (l < 0.1) return ['black'];
  if (l > 0.9 && s < 0.6) return h > 20 && h < 60 && l < 0.97 ? ['white', 'beige'] : ['white'];
  if (l > 0.84 && s < 0.45 && h > 20 && h < 60) return ['beige'];
  if (s < 0.12) return l < 0.3 ? ['black'] : ['white'];
  if (h < 12 || h >= 345) return l < 0.32 ? ['maroon', 'red'] : l > 0.8 ? ['pink'] : ['red'];
  if (h < 38) return l > 0.82 ? ['orange', 'beige'] : ['orange'];
  if (h < 56) return s < 0.75 && l < 0.7 ? ['gold', 'yellow'] : ['yellow'];
  if (h < 170) return ['green'];
  if (h < 250) return l < 0.22 ? ['navy', 'blue'] : ['blue'];
  if (h < 295) return ['purple'];
  return l < 0.32 ? ['maroon', 'purple'] : ['pink'];
}

/** Colour words a shopper might type for this palette (background first). */
export function paletteColors(p: Theme['palette']): TemplateColor[] {
  const out = new Set<TemplateColor>([...colourWords(p.background), ...colourWords(p.primary)]);
  const [ph, ps, pl] = hsl(p.primary);
  const [ah, as, al] = hsl(p.accent);
  if ((ph > 30 && ph < 55 && ps > 0.3 && pl > 0.35 && pl < 0.8) || (ah > 30 && ah < 55 && as > 0.3 && al > 0.35 && al < 0.8)) out.add('gold');
  return [...out];
}

function paletteMood(p: Theme['palette']): TemplateStyle[] {
  const [, s, l] = hsl(p.background);
  if (l < 0.25) return ['dark'];
  if (l > 0.86 && s > 0.2) return ['pastel'];
  if (s > 0.65 && l > 0.45 && l < 0.75) return ['bright'];
  return [];
}

const LAYOUT_STYLES: Record<string, TemplateStyle[]> = {
  'royal-arch': ['traditional', 'royal', 'arch'],
  'floral-frame': ['floral'],
  'minimal-modern': ['minimal', 'modern'],
  'temple-heritage': ['traditional', 'religious'],
  'festive-pop': ['bright'],
  'photo-frame': ['photo'],
  botanical: ['floral', 'watercolour'],
  'art-deco': ['luxury', 'modern'],
  monogram: ['minimal', 'luxury'],
  jharokha: ['traditional', 'arch', 'royal'],
};

const TAG_STYLES: Array<[RegExp, TemplateStyle]> = [
  [/couple|dulha|lehenga/, 'illustrated'],
  [/caricature|cute|cartoon/, 'caricature'],
  [/line art|sketch/, 'line-art'],
  [/watercolou?r/, 'watercolour'],
  [/rose|flor|peony|marigold|lotus|jasmine|hydrangea|tulip|bloom/, 'floral'],
  [/ganesha|om|puja|kalash|diya|jagran|devotional/, 'religious'],
  [/luxury|gold foil|gala/, 'luxury'],
  [/minimal/, 'minimal'],
  [/photo/, 'photo'],
  [/royal|palace|rajwada/, 'royal'],
  [/arch|jharokha/, 'arch'],
];

/** Styles for any template: declared ones plus what its layout, decor, tags and colours imply. */
export function templateStyles(t: Pick<TemplateDefinition, 'layout' | 'theme' | 'tags'> & { styles?: string[] }): TemplateStyle[] {
  const out = new Set<TemplateStyle>((t.styles ?? []) as TemplateStyle[]);
  for (const s of LAYOUT_STYLES[t.layout] ?? []) out.add(s);
  const tags = t.tags.join(' ').toLowerCase();
  for (const [re, s] of TAG_STYLES) if (re.test(tags)) out.add(s);
  const d = t.theme.decor;
  if (d?.art === 'couple') out.add('illustrated');
  if (d?.art === 'couple' && d.coupleStyle === 'caricature') out.add('caricature');
  if (d?.art === 'couple' && d.coupleStyle === 'lineart') out.add('line-art');
  if (d?.art === 'ganesha' || d?.art === 'diya') out.add('religious');
  if (d?.florals && d.florals !== 'none') out.add('floral');
  for (const m of paletteMood(t.theme.palette)) out.add(m);
  return [...out];
}

// ------------------------------------------------------------ index + search

interface Indexed {
  t: TemplateDefinition;
  styles: TemplateStyle[];
  colors: TemplateColor[];
  /** Weighted search terms. */
  terms: Array<[string, number]>;
}

const cache = new WeakMap<TemplateDefinition, Indexed>();

const norm = (s: string) => s.toLowerCase().normalize('NFKC').replace(/[·•,|/]+/g, ' ').replace(/\s+/g, ' ').trim();

function index(t: TemplateDefinition): Indexed {
  const hit = cache.get(t);
  if (hit) return hit;
  const styles = templateStyles(t);
  const colors = paletteColors(t.theme.palette);
  const events = t.eventTypes === 'all' ? EVENT_TYPES.map((e) => e.id) : t.eventTypes;
  const terms: Array<[string, number]> = [
    [norm(t.name), 5],
    [norm(t.family?.name ?? ''), 5],
    [norm(t.family?.variant ?? ''), 4],
    ...t.tags.map((x) => [norm(x), 3] as [string, number]),
    ...styles.map((x) => [x, 3] as [string, number]),
    ...colors.map((x) => [x, 3] as [string, number]),
    ...events.flatMap((id) => {
      const e = EVENT_TYPES.find((x) => x.id === id);
      return [[id, 3], [norm(e?.label ?? ''), 2], [norm(e?.labelHi ?? ''), 2]] as Array<[string, number]>;
    }),
    ...t.communities.map((c) => [c, 2] as [string, number]),
    [t.category ?? '', 1],
    [t.premium ? 'premium' : 'free', 1],
    [t.designer?.name ? norm(t.designer.name) : '', 1],
  ];
  const out = { t, styles, colors, terms: terms.filter(([s]) => s) };
  cache.set(t, out);
  return out;
}

/** Splits a query into alternatives per word (multi-word synonyms such as "griha pravesh" are kept together). */
function queryGroups(q: string): string[][] {
  let rest = ` ${norm(q)} `;
  const groups: string[][] = [];
  for (const phrase of Object.keys(SYNONYMS).filter((k) => k.includes(' ')).sort((a, b) => b.length - a.length)) {
    if (rest.includes(` ${phrase} `)) {
      groups.push([phrase, ...SYNONYMS[phrase]!]);
      rest = rest.replace(` ${phrase} `, ' ');
    }
  }
  for (const w of rest.split(' ').filter((x) => x.length > 1)) groups.push([w, ...(SYNONYMS[w] ?? [])]);
  return groups;
}

export interface TemplateFilters {
  q?: string;
  eventType?: string;
  styles?: string[];
  colors?: string[];
  community?: Community | string;
  premium?: boolean;
}

export interface TemplateHit {
  template: TemplateDefinition;
  score: number;
}

/**
 * Filters and ranks templates. Every query word (or one of its synonyms) must match;
 * chips are AND across groups and OR within a group (e.g. red OR maroon).
 */
export function searchTemplates(list: TemplateDefinition[], f: TemplateFilters): TemplateHit[] {
  const groups = f.q ? queryGroups(f.q) : [];
  const hits: TemplateHit[] = [];
  for (const t of list) {
    if (f.eventType && t.eventTypes !== 'all' && !(t.eventTypes as string[]).includes(f.eventType)) continue;
    if (f.premium !== undefined && t.premium !== f.premium) continue;
    if (f.community && t.communities.length && !(t.communities as string[]).includes(f.community)) continue;
    const ix = index(t);
    if (f.styles?.length && !f.styles.some((s) => (ix.styles as string[]).includes(s))) continue;
    if (f.colors?.length && !f.colors.some((c) => (ix.colors as string[]).includes(c))) continue;
    let score = 0;
    let ok = true;
    for (const alts of groups) {
      let best = 0;
      for (const a of alts) {
        for (const [term, weight] of ix.terms) {
          if (term === a) best = Math.max(best, weight * 2);
          else if (a.length >= 3 && term.includes(a)) best = Math.max(best, weight);
          else if (term.length >= 4 && a.includes(term)) best = Math.max(best, weight * 0.5);
        }
      }
      if (!best) {
        ok = false;
        break;
      }
      score += best;
    }
    if (ok) hits.push({ template: t, score });
  }
  return groups.length ? hits.sort((a, b) => b.score - a.score) : hits;
}

/** Search metadata for a template (used by the API and the gallery chips). */
export function templateMeta(t: TemplateDefinition): { styles: TemplateStyle[]; colors: TemplateColor[] } {
  const ix = index(t);
  return { styles: ix.styles, colors: ix.colors };
}
