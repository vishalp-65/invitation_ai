import type { Community, EventTypeId } from '../constants/event-types.js';
import { type DesignFamily } from '../design/families.js';
import { ALL_DESIGN_FAMILIES } from '../design/families-heritage.js';
import { decorSchema, type Decor, type LayoutId, type MotifId, type PatternId, type TemplateDefinition, type Theme } from './types.js';

type Palette = Theme['palette'];

/** Colourways. Each family below ships in several of these. */
export const PALETTES = {
  maroon: { background: '#5B0F1B', backgroundAlt: '#3D0811', surface: '#FFF6E5', primary: '#E9B949', accent: '#F4D58D', text: '#FFF6E5', muted: '#E8C7A0' },
  ivory: { background: '#FFF8EC', backgroundAlt: '#F6E7CB', surface: '#FFFFFF', primary: '#9B1C31', accent: '#C9973F', text: '#3B1F14', muted: '#7A5A43' },
  royalBlue: { background: '#0E1F4D', backgroundAlt: '#08132F', surface: '#F5EFE0', primary: '#D9B26F', accent: '#F1D9A7', text: '#F5EFE0', muted: '#B9C3DD' },
  marigold: { background: '#FFB627', backgroundAlt: '#F28A0F', surface: '#FFF7E6', primary: '#8C1C13', accent: '#2F6B2F', text: '#3A1206', muted: '#6B2B12' },
  emerald: { background: '#0D3B2E', backgroundAlt: '#062319', surface: '#F3EBD8', primary: '#D4AF37', accent: '#E9D8A6', text: '#F3EBD8', muted: '#A9C5B4' },
  blush: { background: '#FCEEEE', backgroundAlt: '#F6D9DA', surface: '#FFFFFF', primary: '#B4485B', accent: '#D99AA5', text: '#4A2730', muted: '#8C6370' },
  sage: { background: '#EEF2EA', backgroundAlt: '#DCE5D3', surface: '#FFFFFF', primary: '#4E6B4F', accent: '#B49A62', text: '#25332A', muted: '#5F7262' },
  midnight: { background: '#121212', backgroundAlt: '#000000', surface: '#1E1E1E', primary: '#E5C07B', accent: '#F7E2B5', text: '#F5F0E6', muted: '#A69F92' },
  saffron: { background: '#FF7A1A', backgroundAlt: '#D9480F', surface: '#FFF4E6', primary: '#FFF4E6', accent: '#FFD43B', text: '#FFFFFF', muted: '#FFE3C4' },
  lavender: { background: '#F1ECFA', backgroundAlt: '#E1D6F5', surface: '#FFFFFF', primary: '#6A4C93', accent: '#E0A458', text: '#2D2142', muted: '#6E6185' },
  sky: { background: '#E7F5FF', backgroundAlt: '#C5E7FF', surface: '#FFFFFF', primary: '#1971C2', accent: '#FAB005', text: '#102A43', muted: '#486581' },
  candy: { background: '#FFF0F6', backgroundAlt: '#FFDEEB', surface: '#FFFFFF', primary: '#D6336C', accent: '#7048E8', text: '#3B1531', muted: '#8E5A7A' },
  temple: { background: '#7A1E0B', backgroundAlt: '#4F1205', surface: '#FFF1D6', primary: '#FFC94A', accent: '#FFE5A3', text: '#FFF1D6', muted: '#F2C48D' },
  teal: { background: '#0B4F4A', backgroundAlt: '#063532', surface: '#F4EEDC', primary: '#E8B04B', accent: '#F6DFA4', text: '#F4EEDC', muted: '#A7CFC8' },
  rose: { background: '#2B2024', backgroundAlt: '#1A1316', surface: '#F7EDEA', primary: '#E6A4B4', accent: '#F3D1D8', text: '#F7EDEA', muted: '#BFA6AC' },
  wine: { background: '#4A1028', backgroundAlt: '#2C0817', surface: '#FBEFF2', primary: '#E7B6C2', accent: '#D4AF37', text: '#FBEFF2', muted: '#D9A8B6' },
  plum: { background: '#3B1F4A', backgroundAlt: '#24112E', surface: '#F6EEF9', primary: '#E6C27A', accent: '#C9A7E0', text: '#F6EEF9', muted: '#C6B2D3' },
  navy: { background: '#0B1A33', backgroundAlt: '#050D1C', surface: '#F2F4F8', primary: '#C8A45D', accent: '#E7D3A4', text: '#F2F4F8', muted: '#9AA8C2' },
  onyx: { background: '#0E0E10', backgroundAlt: '#000000', surface: '#18181B', primary: '#D4AF37', accent: '#F5E6B3', text: '#F4F1EA', muted: '#9C968A' },
  jade: { background: '#E6F2EC', backgroundAlt: '#CDE6DA', surface: '#FFFFFF', primary: '#1F6F54', accent: '#C08B2C', text: '#13392C', muted: '#4D6E61' },
  peach: { background: '#FFF1E8', backgroundAlt: '#FFDCC7', surface: '#FFFFFF', primary: '#C2543A', accent: '#7B9E6B', text: '#45231A', muted: '#8A5A4A' },
  mint: { background: '#EAF8F3', backgroundAlt: '#D2F0E4', surface: '#FFFFFF', primary: '#2C8C6E', accent: '#F08A5D', text: '#173A2F', muted: '#4F7A6B' },
  mustard: { background: '#F6D365', backgroundAlt: '#E8B931', surface: '#FFFBEA', primary: '#5A1E0E', accent: '#1F5B3A', text: '#3A1A0A', muted: '#6D4A1E' },
  coral: { background: '#FFE8E3', backgroundAlt: '#FFCFC4', surface: '#FFFFFF', primary: '#E0533D', accent: '#2B6CB0', text: '#3D1A14', muted: '#8C5148' },
  cream: { background: '#FBF5EA', backgroundAlt: '#F1E4CC', surface: '#FFFFFF', primary: '#8E2A2A', accent: '#B08436', text: '#3B2A1A', muted: '#7D6650' },
  babyBlue: { background: '#EAF4FB', backgroundAlt: '#CFE6F5', surface: '#FFFFFF', primary: '#2F6FA3', accent: '#E58FAB', text: '#1D3550', muted: '#5C7690' },
  babyPink: { background: '#FDEEF2', backgroundAlt: '#F9D5DF', surface: '#FFFFFF', primary: '#B8466E', accent: '#E0A93B', text: '#4A2333', muted: '#8E5D6E' },
  butter: { background: '#FFF7DA', backgroundAlt: '#FBE7A6', surface: '#FFFFFF', primary: '#B3501A', accent: '#2E8B57', text: '#3D2A0E', muted: '#7A6234' },
  kumkum: { background: '#8E0F1F', backgroundAlt: '#5E0812', surface: '#FFF3E0', primary: '#FFC857', accent: '#FFE29A', text: '#FFF3E0', muted: '#F1C3A1' },
  forest: { background: '#13362B', backgroundAlt: '#0A2019', surface: '#F4EEDF', primary: '#E3C27A', accent: '#F2E2B3', text: '#F4EEDF', muted: '#A9C2B2' },
  linen: { background: '#F5F0E8', backgroundAlt: '#EAE2D4', surface: '#FFFFFF', primary: '#3A332B', accent: '#9A8670', text: '#2E2A25', muted: '#6F665B' },
  dustyRose: { background: '#F6EFEA', backgroundAlt: '#EBDDD5', surface: '#FFFFFF', primary: '#8E4A55', accent: '#B98A6B', text: '#4A2C2F', muted: '#806266' },
  dustyBlue: { background: '#EEF2F7', backgroundAlt: '#DCE4EF', surface: '#FFFFFF', primary: '#3F5577', accent: '#B49A62', text: '#25324A', muted: '#5D6C85' },
  champagne: { background: '#FFFDF8', backgroundAlt: '#F6EEDD', surface: '#FFFFFF', primary: '#A9844A', accent: '#C7A46A', text: '#5A4A34', muted: '#857358' },
  mauve: { background: '#8A6A66', backgroundAlt: '#6E5350', surface: '#F5EBDD', primary: '#B98A3E', accent: '#E58E6E', text: '#2E2523', muted: '#6B5A55' },
  parchment: { background: '#F4EEE3', backgroundAlt: '#EAE0D0', surface: '#FCF9F3', primary: '#8C7A5B', accent: '#B98F8A', text: '#4A4440', muted: '#6E6660' },
  iceBlue: { background: '#E6F4FC', backgroundAlt: '#C4E3F5', surface: '#FFFFFF', primary: '#2F7FA8', accent: '#5FB3D9', text: '#163444', muted: '#466879' },
} satisfies Record<string, Palette>;

export type PaletteKey = keyof typeof PALETTES;

const VARIANT_NAMES: Record<PaletteKey, string> = {
  maroon: 'Maroon', ivory: 'Ivory', royalBlue: 'Royal Blue', marigold: 'Marigold', emerald: 'Emerald', blush: 'Blush',
  sage: 'Sage', midnight: 'Midnight', saffron: 'Saffron', lavender: 'Lavender', sky: 'Sky', candy: 'Candy',
  temple: 'Temple Red', teal: 'Teal', rose: 'Rose Noir', wine: 'Wine', plum: 'Plum', navy: 'Navy', onyx: 'Onyx',
  jade: 'Jade', peach: 'Peach', mint: 'Mint', mustard: 'Haldi', coral: 'Coral',
  cream: 'Cream', babyBlue: 'Baby Blue', babyPink: 'Baby Pink', butter: 'Butter', kumkum: 'Kumkum', forest: 'Forest',
  linen: 'Linen', dustyRose: 'Dusty Rose', dustyBlue: 'Dusty Blue', champagne: 'Champagne',
  mauve: 'Mauve', parchment: 'Parchment', iceBlue: 'Ice Blue',
};

interface Family {
  id: string;
  name: string;
  layout: LayoutId;
  motif: MotifId;
  pattern: PatternId;
  eventTypes: EventTypeId[] | 'all';
  communities?: Community[];
  tags?: string[];
  premium?: boolean;
  ornamentOpacity?: number;
  /** Premium ornament layer: illustration, flowers, toran, mandala, script names. */
  decor?: Partial<Decor>;
  /** Palette keys; an optional explicit id keeps template ids stable for saved events. */
  variants: Array<PaletteKey | [PaletteKey, string]>;
}

const WEDDINGS: EventTypeId[] = ['wedding', 'engagement', 'reception', 'anniversary'];
const RELIGIOUS: EventTypeId[] = ['griha-pravesh', 'puja', 'jagran', 'bhandara', 'mundan', 'annaprashan', 'upanayana', 'naming-ceremony'];
const KIDS: EventTypeId[] = ['birthday', 'naming-ceremony', 'baby-shower', 'mundan', 'annaprashan'];

export const TEMPLATE_FAMILIES: Family[] = [
  // ==== Premium illustrated collection (vector art: couple, Ganesha, diya, flowers, toran) ====
  {
    id: 'genda-jharokha', name: 'Genda Jharokha', layout: 'jharokha', motif: 'none', pattern: 'paisley', eventTypes: WEDDINGS,
    communities: ['hindu-north', 'marwari', 'gujarati'], tags: ['ganesha', 'marigold', 'toran', 'palace'], premium: true,
    decor: { art: 'ganesha', toran: true, florals: 'marigold', floralPlacement: 'bottom', mandala: true, nameFont: 'Great Vibes' },
    variants: ['maroon', 'royalBlue', 'emerald', 'temple'],
  },
  {
    id: 'varmala', name: 'Varmala', layout: 'jharokha', motif: 'none', pattern: 'mandala', eventTypes: WEDDINGS,
    communities: ['hindu-north', 'marwari', 'punjabi'], tags: ['couple', 'watercolour', 'lehenga'], premium: true,
    decor: { art: 'couple', coupleStyle: 'watercolor', attire: 'north', florals: 'rose', floralPlacement: 'bottom', nameFont: 'Great Vibes' },
    variants: ['maroon', 'wine', 'emerald', 'royalBlue'],
  },
  {
    id: 'dulha-dulhan', name: 'Dulha Dulhan', layout: 'festive-pop', motif: 'none', pattern: 'paisley', eventTypes: WEDDINGS,
    tags: ['couple', 'caricature', 'cute'], premium: true,
    decor: { art: 'couple', coupleStyle: 'caricature', attire: 'north', toran: true, florals: 'marigold', floralPlacement: 'bottom' },
    variants: ['marigold', 'peach', 'mustard', 'candy'],
  },
  {
    id: 'balle-balle', name: 'Balle Balle', layout: 'festive-pop', motif: 'none', pattern: 'dots', eventTypes: ['anand-karaj', 'engagement', 'reception', 'wedding'],
    communities: ['sikh', 'punjabi'], tags: ['couple', 'caricature', 'sikh'], premium: true,
    decor: { art: 'couple', coupleStyle: 'caricature', attire: 'sikh', florals: 'marigold', floralPlacement: 'bottom' },
    variants: ['mustard', 'candy', 'sky'],
  },
  {
    id: 'golden-vows', name: 'Golden Vows', layout: 'art-deco', motif: 'none', pattern: 'none', eventTypes: [...WEDDINGS, 'reception'],
    communities: ['modern'], tags: ['couple', 'line art', 'luxury'], premium: true,
    decor: { art: 'couple', coupleStyle: 'lineart', attire: 'north', nameFont: 'Great Vibes' },
    variants: ['onyx', 'navy', 'wine', 'emerald'],
  },
  {
    id: 'kalyanam', name: 'Kalyanam', layout: 'temple-heritage', motif: 'none', pattern: 'jaali', eventTypes: WEDDINGS,
    communities: ['hindu-south'], tags: ['couple', 'south', 'jasmine', 'silk saree'], premium: true,
    decor: { art: 'couple', coupleStyle: 'watercolor', attire: 'south', florals: 'jasmine', floralPlacement: 'bottom' },
    variants: ['ivory', 'temple', 'teal'],
  },
  {
    id: 'shubho-bibaho', name: 'Shubho Bibaho', layout: 'jharokha', motif: 'none', pattern: 'dots', eventTypes: WEDDINGS,
    communities: ['bengali'], tags: ['couple', 'bengali', 'topor'], premium: true,
    decor: { art: 'couple', coupleStyle: 'watercolor', attire: 'bengali', florals: 'lotus', floralPlacement: 'bottom' },
    variants: ['maroon', 'temple', 'ivory'],
  },
  {
    id: 'shubh-mangal', name: 'Shubh Mangal', layout: 'floral-frame', motif: 'none', pattern: 'paisley', eventTypes: WEDDINGS,
    communities: ['marathi'], tags: ['couple', 'marathi', 'nauvari'], premium: true,
    decor: { art: 'couple', coupleStyle: 'watercolor', attire: 'marathi', toran: true, florals: 'marigold', floralPlacement: 'bottom' },
    variants: ['jade', 'mustard', 'peach'],
  },
  {
    id: 'anand-karaj-couple', name: 'Lavaan', layout: 'jharokha', motif: 'none', pattern: 'paisley', eventTypes: ['anand-karaj', 'engagement', 'reception'],
    communities: ['sikh', 'punjabi'], tags: ['couple', 'sikh'], premium: true,
    decor: { art: 'couple', coupleStyle: 'watercolor', attire: 'sikh', florals: 'marigold', floralPlacement: 'bottom' },
    variants: ['teal', 'royalBlue', 'maroon'],
  },
  {
    id: 'qubool', name: 'Qubool Hai', layout: 'jharokha', motif: 'none', pattern: 'jaali', eventTypes: ['nikah', 'engagement', 'reception'],
    communities: ['muslim'], tags: ['couple', 'nikah', 'sehra'], premium: true,
    decor: { art: 'couple', coupleStyle: 'watercolor', attire: 'muslim', florals: 'rose', floralPlacement: 'bottom', mandala: true, nameFont: 'Great Vibes' },
    variants: ['emerald', 'navy', 'wine'],
  },
  {
    id: 'forever', name: 'Forever & Always', layout: 'botanical', motif: 'none', pattern: 'none', eventTypes: ['christian-wedding', 'engagement', 'anniversary'],
    communities: ['christian'], tags: ['couple', 'church', 'roses'], premium: true,
    decor: { art: 'couple', coupleStyle: 'watercolor', attire: 'christian', florals: 'rose', floralPlacement: 'diagonal', nameFont: 'Great Vibes' },
    variants: ['blush', 'sky', 'sage'],
  },
  {
    id: 'silhouette', name: 'Gold Silhouette', layout: 'minimal-modern', motif: 'none', pattern: 'none', eventTypes: ['reception', 'anniversary', 'engagement', 'wedding'],
    communities: ['modern'], tags: ['couple', 'line art', 'minimal'],
    decor: { art: 'couple', coupleStyle: 'lineart', attire: 'north', nameFont: 'Great Vibes' },
    variants: ['midnight', 'wine', 'sage'],
  },
  {
    id: 'ganesh-vandana', name: 'Ganesh Vandana', layout: 'jharokha', motif: 'none', pattern: 'mandala',
    eventTypes: [...WEDDINGS, 'griha-pravesh', 'puja', 'mundan', 'upanayana', 'naming-ceremony', 'shop-opening'],
    communities: ['hindu-north', 'hindu-south', 'marathi', 'gujarati'], tags: ['ganesha', 'lotus', 'toran'], premium: true,
    decor: { art: 'ganesha', toran: true, florals: 'lotus', floralPlacement: 'bottom', mandala: true },
    variants: ['ivory', 'marigold', 'temple', 'royalBlue'],
  },
  {
    id: 'deepotsav', name: 'Deepotsav', layout: 'royal-arch', motif: 'none', pattern: 'mandala',
    eventTypes: ['griha-pravesh', 'puja', 'jagran', 'bhandara', 'shop-opening', 'wedding'],
    tags: ['diya', 'festive'],
    decor: { art: 'diya', florals: 'marigold', floralPlacement: 'bottom', mandala: true },
    variants: ['maroon', 'navy', 'plum'],
  },
  {
    id: 'vasant', name: 'Vasant Garden', layout: 'botanical', motif: 'lotus', pattern: 'none', eventTypes: [...WEDDINGS, 'baby-shower', 'birthday', 'naming-ceremony'],
    communities: ['modern'], tags: ['flowers', 'watercolour'],
    decor: { florals: 'mixed', floralPlacement: 'corners', nameFont: 'Great Vibes' },
    variants: ['peach', 'blush', 'jade'],
  },

  // ---- Weddings: traditional ----
  { id: 'shubh-vivah', decor: { art: 'ganesha', florals: 'marigold', floralPlacement: 'bottom', mandala: true },  name: 'Shubh Vivah', layout: 'royal-arch', motif: 'shree', pattern: 'mandala', eventTypes: WEDDINGS, communities: ['hindu-north', 'marwari'], tags: ['traditional', 'gold'], variants: [['maroon', 'shubh-vivah-maroon'], 'emerald', 'royalBlue', 'wine'] },
  { id: 'rajwada', decor: { art: 'ganesha', toran: true, mandala: true },  name: 'Rajwada Royal', layout: 'royal-arch', motif: 'kalash', pattern: 'jaali', eventTypes: WEDDINGS, communities: ['marwari', 'hindu-north'], tags: ['royal', 'palace'], premium: true, variants: [['royalBlue', 'rajwada-royal-blue'], 'plum', 'onyx'] },
  { id: 'marigold-mandap', decor: { toran: true, florals: 'marigold', floralPlacement: 'bottom' },  name: 'Marigold Mandap', layout: 'floral-frame', motif: 'shree', pattern: 'paisley', eventTypes: WEDDINGS, communities: ['hindu-north', 'gujarati', 'marathi'], tags: ['haldi', 'bright'], variants: [['marigold', 'marigold-mandap'], 'mustard', 'peach'] },
  { id: 'heritage', decor: { art: 'ganesha', florals: 'lotus', floralPlacement: 'bottom' },  name: 'Heritage', layout: 'temple-heritage', motif: 'om', pattern: 'mandala', eventTypes: WEDDINGS, communities: ['hindu-south', 'marathi'], tags: ['classic', 'light'], variants: [['ivory', 'ivory-heritage'], 'sage', 'blush'] },
  { id: 'kanjeevaram', decor: { art: 'diya', florals: 'jasmine', floralPlacement: 'bottom' },  name: 'Kanjeevaram', layout: 'temple-heritage', motif: 'diya', pattern: 'jaali', eventTypes: WEDDINGS, communities: ['hindu-south'], tags: ['south', 'temple'], premium: true, variants: [['temple', 'kanjeevaram-temple'], 'teal', 'wine'] },
  { id: 'nikah', decor: { florals: 'rose', mandala: true },  name: 'Noor Nikah', layout: 'royal-arch', motif: 'crescent', pattern: 'jaali', eventTypes: ['nikah', 'reception', 'engagement'], communities: ['muslim'], tags: ['nikah', 'elegant'], variants: [['emerald', 'emerald-nikah'], 'navy', 'ivory'] },
  { id: 'anand-karaj', name: 'Anand Karaj', layout: 'royal-arch', motif: 'khanda', pattern: 'paisley', eventTypes: ['anand-karaj', 'reception', 'engagement'], communities: ['sikh', 'punjabi'], tags: ['sikh'], variants: [['teal', 'anand-karaj-gold'], 'royalBlue', 'ivory'] },
  { id: 'holy-matrimony', decor: { florals: 'rose', nameFont: 'Great Vibes' },  name: 'Holy Matrimony', layout: 'floral-frame', motif: 'cross', pattern: 'leaves', eventTypes: ['christian-wedding', 'engagement', 'anniversary'], communities: ['christian'], tags: ['church', 'floral'], variants: [['blush', 'church-blush'], 'sky', 'sage'] },
  { id: 'alpana', name: 'Alpana', layout: 'temple-heritage', motif: 'lotus', pattern: 'dots', eventTypes: WEDDINGS, communities: ['bengali'], tags: ['bengali', 'alpana'], variants: [['maroon', 'bengali-alpana'], 'ivory', 'temple'] },
  { id: 'peacock', name: 'Peacock Mehendi', layout: 'floral-frame', motif: 'peacock', pattern: 'paisley', eventTypes: WEDDINGS, tags: ['mehendi', 'peacock'], premium: true, variants: [['teal', 'peacock-mehendi'], 'jade', 'plum'] },

  // ---- Weddings: modern / luxury ----
  { id: 'photo-arch', name: 'Photo Arch', layout: 'photo-frame', motif: 'none', pattern: 'dots', eventTypes: [...WEDDINGS, 'birthday'], communities: ['modern'], tags: ['photo', 'modern'], premium: true, ornamentOpacity: 0.1, variants: ['ivory', 'blush', 'midnight', 'sage'] },
  { id: 'deco', decor: { nameFont: 'Great Vibes' },  name: 'Gatsby Deco', layout: 'art-deco', motif: 'none', pattern: 'none', eventTypes: [...WEDDINGS, 'corporate', 'retirement'], communities: ['modern'], tags: ['luxury', 'art deco'], premium: true, variants: ['onyx', 'navy', 'emerald', 'wine'] },
  { id: 'monogram', decor: { nameFont: 'Great Vibes' },  name: 'Monogram', layout: 'monogram', motif: 'none', pattern: 'none', eventTypes: WEDDINGS, communities: ['modern'], tags: ['minimal', 'luxury'], premium: true, variants: ['ivory', 'wine', 'sage', 'onyx'] },
  { id: 'botanical', decor: { nameFont: 'Great Vibes' },  name: 'Botanical', layout: 'botanical', motif: 'lotus', pattern: 'none', eventTypes: [...WEDDINGS, 'baby-shower', 'birthday'], communities: ['modern'], tags: ['watercolour', 'garden'], variants: ['sage', 'blush', 'peach', 'jade'] },
  { id: 'pastel', decor: { florals: 'rose', nameFont: 'Great Vibes' },  name: 'Pastel Love', layout: 'minimal-modern', motif: 'heart', pattern: 'leaves', eventTypes: WEDDINGS, communities: ['modern'], tags: ['minimal', 'pastel'], variants: [['blush', 'pastel-blush-modern'], 'lavender', 'mint'] },
  { id: 'garden', name: 'Garden Minimal', layout: 'minimal-modern', motif: 'none', pattern: 'leaves', eventTypes: [...WEDDINGS, 'birthday', 'baby-shower'], communities: ['modern'], tags: ['minimal', 'garden'], variants: [['sage', 'sage-garden'], 'peach', 'jade'] },
  { id: 'midnight', name: 'Midnight Gold', layout: 'minimal-modern', motif: 'none', pattern: 'dots', eventTypes: [...WEDDINGS, 'corporate', 'retirement'], communities: ['modern'], tags: ['luxury', 'dark'], premium: true, variants: [['midnight', 'midnight-gold'], 'navy', 'wine'] },
  { id: 'dreams', decor: { florals: 'lotus', nameFont: 'Great Vibes' },  name: 'Lotus Dreams', layout: 'floral-frame', motif: 'lotus', pattern: 'leaves', eventTypes: [...WEDDINGS, 'baby-shower'], communities: ['modern'], tags: ['pastel'], variants: [['lavender', 'lavender-dreams'], 'coral', 'mint'] },
  { id: 'noir', name: 'Rose Noir', layout: 'minimal-modern', motif: 'heart', pattern: 'none', eventTypes: WEDDINGS, communities: ['modern'], tags: ['moody', 'modern'], variants: [['rose', 'rose-noir'], 'onyx', 'plum'] },

  // ---- Religious / family ----
  { id: 'kalash', decor: { toran: true, florals: 'marigold', floralPlacement: 'bottom' },  name: 'Shubh Kalash', layout: 'temple-heritage', motif: 'kalash', pattern: 'mandala', eventTypes: ['griha-pravesh', 'puja', 'shop-opening'], tags: ['housewarming'], variants: [['marigold', 'griha-pravesh-kalash'], 'ivory', 'sage'] },
  { id: 'jagran', name: 'Jagran Jyot', layout: 'festive-pop', motif: 'diya', pattern: 'mandala', eventTypes: ['jagran', 'bhandara', 'puja'], tags: ['devotional', 'bright'], variants: [['saffron', 'jagran-saffron'], 'temple', 'mustard'] },
  { id: 'katha', decor: { art: 'ganesha', mandala: true },  name: 'Katha', layout: 'temple-heritage', motif: 'om', pattern: 'jaali', eventTypes: RELIGIOUS, tags: ['puja'], variants: [['ivory', 'satyanarayan-ivory'], 'marigold', 'jade'] },
  { id: 'sanskar', name: 'Sanskar', layout: 'royal-arch', motif: 'om', pattern: 'mandala', eventTypes: RELIGIOUS, tags: ['sanskar'], variants: [['temple', 'sanskar-temple'], 'royalBlue', 'emerald'] },

  // ---- Celebrations / kids ----
  { id: 'confetti', name: 'Confetti Party', layout: 'festive-pop', motif: 'balloons', pattern: 'confetti', eventTypes: ['birthday', 'anniversary', 'retirement', 'other'], tags: ['party', 'fun'], variants: [['candy', 'birthday-confetti'], 'sky', 'mint', 'coral'] },
  { id: 'little-star', name: 'Little Star', layout: 'festive-pop', motif: 'balloons', pattern: 'dots', eventTypes: KIDS, tags: ['kids', 'baby'], variants: [['sky', 'little-star-sky'], 'peach', 'lavender'] },
  { id: 'baby-lotus', decor: { florals: 'lotus' },  name: 'Baby Lotus', layout: 'floral-frame', motif: 'lotus', pattern: 'leaves', eventTypes: ['baby-shower', 'naming-ceremony', 'annaprashan'], tags: ['baby'], variants: [['blush', 'baby-lotus-blush'], 'mint', 'lavender'] },

  // ---- Business ----
  { id: 'shubharambh', name: 'Shubharambh', layout: 'royal-arch', motif: 'shree', pattern: 'jaali', eventTypes: ['shop-opening', 'corporate'], tags: ['inauguration'], variants: [['royalBlue', 'shubharambh-royal'], 'maroon', 'emerald'] },
  { id: 'corporate', name: 'Corporate Clean', layout: 'minimal-modern', motif: 'none', pattern: 'none', eventTypes: ['corporate', 'retirement', 'other'], tags: ['corporate'], variants: [['midnight', 'corporate-midnight'], 'navy', 'ivory'] },
];

function expand(f: Family): TemplateDefinition[] {
  return f.variants.map((v) => {
    const [key, explicitId] = Array.isArray(v) ? v : [v, undefined];
    return {
      id: explicitId ?? `${f.id}-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
      name: `${f.name} · ${VARIANT_NAMES[key]}`,
      layout: f.layout,
      theme: {
        palette: PALETTES[key],
        motif: f.motif,
        pattern: f.pattern,
        ornamentOpacity: f.ornamentOpacity ?? 0.18,
        ...(f.decor ? { decor: decorSchema.parse(f.decor) } : {}),
      },
      eventTypes: f.eventTypes,
      communities: f.communities ?? [],
      tags: f.tags ?? [],
      premium: f.premium ?? false,
      source: 'builtin' as const,
      family: { id: f.id, name: f.name, variant: VARIANT_NAMES[key] },
    };
  });
}

const LEGACY_CATEGORY = (types: EventTypeId[] | 'all'): TemplateDefinition['category'] => {
  if (types === 'all') return 'business';
  if (types.some((t) => ['wedding', 'engagement', 'reception', 'nikah', 'christian-wedding', 'anand-karaj'].includes(t))) return 'wedding';
  if (types.some((t) => ['birthday', 'baby-shower', 'naming-ceremony'].includes(t))) return 'kids';
  if (types.some((t) => ['griha-pravesh', 'puja', 'jagran', 'bhandara', 'mundan', 'upanayana', 'annaprashan'].includes(t))) return 'religious';
  return 'business';
};

function expandDesign(f: DesignFamily): TemplateDefinition[] {
  return f.palettes.map((key) => {
    const k = key as PaletteKey;
    return {
      id: `${f.id}-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
      name: `${f.name} · ${VARIANT_NAMES[k]}`,
      layout: f.legacy.layout,
      theme: { palette: PALETTES[k], motif: f.legacy.motif, pattern: f.legacy.pattern, ornamentOpacity: 0.14 },
      eventTypes: f.eventTypes,
      communities: f.communities ?? [],
      tags: f.tags,
      premium: f.premium ?? false,
      source: 'builtin' as const,
      family: { id: f.id, name: f.name, variant: VARIANT_NAMES[k] },
      design: f.id,
      category: f.category,
      ...(f.styles ? { styles: f.styles } : {}),
      ...(f.sampleLanguage ? { sampleLanguage: f.sampleLanguage } : {}),
      ...(RETIRED_DESIGNS.has(f.id) ? { retired: true } : {}),
    };
  });
}

/**
 * Layered families from the first collection that read as too plain next to the Atelier and
 * Heritage suites (sparse layouts, little art). Retired from the gallery, not deleted.
 */
const RETIRED_DESIGNS = new Set(['line-of-love', 'ring-ceremony', 'golden-years', 'photo-story', 'cloud-nine', 'clean-slate', 'black-tie', 'farewell-cheers', 'milestone-gold']);

/**
 * Every built-in template, including retired ones. Use it to resolve a template by id
 * (saved invitations, admin console); use BUILTIN_TEMPLATES for anything a customer browses.
 * The classic auto-layout catalogue (TEMPLATE_FAMILIES) is retired as a whole (Nov 2026).
 */
export const ALL_BUILTIN_TEMPLATES: TemplateDefinition[] = [
  ...ALL_DESIGN_FAMILIES.flatMap(expandDesign),
  ...TEMPLATE_FAMILIES.flatMap(expand).map((t) => ({ ...t, category: LEGACY_CATEGORY(t.eventTypes), retired: true })),
];

/** The gallery: newest premium collections first, retired designs left out. */
export const BUILTIN_TEMPLATES: TemplateDefinition[] = ALL_BUILTIN_TEMPLATES.filter((t) => !t.retired);

const BY_ID = new Map(ALL_BUILTIN_TEMPLATES.map((t) => [t.id, t]));

/** A built-in template by id, retired ones included (old invitations keep working). */
export function findBuiltinTemplate(id: string | null | undefined): TemplateDefinition | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function templateSupportsEvent(template: TemplateDefinition, eventType: string): boolean {
  return template.eventTypes === 'all' || (template.eventTypes as string[]).includes(eventType);
}

/** Groups templates into families (marketplace templates become single-variant families). */
export function groupByFamily(templates: TemplateDefinition[]): Array<{ id: string; name: string; variants: TemplateDefinition[] }> {
  const map = new Map<string, { id: string; name: string; variants: TemplateDefinition[] }>();
  for (const t of templates) {
    const id = t.family?.id ?? t.id;
    const entry = map.get(id) ?? { id, name: t.family?.name ?? t.name, variants: [] };
    entry.variants.push(t);
    map.set(id, entry);
  }
  return [...map.values()];
}
