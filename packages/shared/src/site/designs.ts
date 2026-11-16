import { faithOf, type Faith } from '../constants/faith.js';

/**
 * Cinematic website designs ("design packs"). One pack = painted scene + palette + fonts +
 * opening + ambient motion + section bands + dividers + music mood. The same pack drives the
 * invitation website and the 9:16 video invite, so both always look alike.
 *
 * Art: every scene is drawn in code as a placeholder until its painted layers are added to
 * `paint` (WebP files under /designs/<id>/). Names, dates and venues are always live text on top
 * of the art, so every invite gets correct details in every language.
 *
 * Faith: packs never carry sacred marks. Blessings, deities and religious symbols still come
 * from the event's own faith (see constants/faith.ts). `faith` here only ranks the picker.
 */

export const SITE_DESIGN_IDS = [
  'royal-lanterns',
  'rose-seal',
  'temple-dawn',
  'alpana',
  'phulkari',
  'bandhani',
  'paithani',
  'nikah-emerald',
  'garden-chapel',
  'anand-karaj',
  'pastel-floral',
  'modern-minimal',
  'lake-palace',
  'goa-sunset',
  'kerala-backwaters',
  'banaras-ghats',
  'himalayan-pines',
  'blue-pottery',
  'bombay-deco',
  'pichwai-lotus',
] as const;
export type SiteDesignId = (typeof SITE_DESIGN_IDS)[number];

export const SCENE_KINDS = [
  'palace',
  'swan-lake',
  'temple-court',
  'riverside',
  'haveli',
  'stepwell',
  'fort',
  'mughal-garden',
  'rose-arbor',
  'marigold-court',
  'bloom-meadow',
  'minimal-arch',
  'lake-palace',
  'beach-sunset',
  'backwaters',
  'ghats',
  'mountains',
  'blue-tiles',
  'art-deco',
  'lotus-pond',
] as const;
export type SceneKind = (typeof SCENE_KINDS)[number];

export const AMBIENT_KINDS = ['lanterns', 'petals', 'fireflies', 'marigolds', 'butterflies', 'stars', 'fireworks', 'fairylights', 'none'] as const;
export type AmbientKind = (typeof AMBIENT_KINDS)[number];

export const DIVIDER_KINDS = ['torn', 'scallop', 'arches', 'wave', 'line'] as const;
export type DividerKind = (typeof DIVIDER_KINDS)[number];

export const MARKER_KINDS = ['rose', 'diya', 'lantern', 'marigold', 'lotus', 'leaf', 'star', 'dot'] as const;
export type MarkerKind = (typeof MARKER_KINDS)[number];

/** Layers of a painted scene, back to front. Each moves at its own speed on scroll. */
export const PAINT_LAYERS = ['sky', 'far', 'mid', 'near'] as const;
export type PaintLayer = (typeof PAINT_LAYERS)[number];
export type PaintSlot = `hero.${PaintLayer}` | 'venue' | 'closing' | 'dress';

export interface DesignBand {
  /** Section background. */
  bg: string;
  /** Body text on this band. */
  ink: string;
  /** Headings, buttons and ornaments on this band. */
  primary: string;
}

export interface ScenePalette {
  skyTop: string;
  skyBottom: string;
  /** Sun / moon / lantern glow. */
  glow: string;
  far: string;
  mid: string;
  midShade: string;
  /** Gold trim, window lights, outlines. */
  trim: string;
  near: string;
  /** Flowers in the foreground. */
  bloom: string[];
  water: string;
}

export const MUSIC_MOODS = ['shehnai', 'sitar', 'santoor', 'flute', 'piano', 'strings', 'qawwali', 'acoustic', 'dhol', 'ambient'] as const;
export type MusicMood = (typeof MUSIC_MOODS)[number];

export interface SiteDesign {
  id: SiteDesignId;
  name: string;
  /** Short line under the name in the picker. */
  blurb: string;
  region: string;
  /** Ranks the picker for this faith first; never hides a pack. */
  faith: Faith | null;
  /** Shows a "New" badge in the picker. */
  isNew?: boolean;
  palette: { primary: string; accent: string; background: string; surface: string; text: string };
  scene: { kind: SceneKind; night: boolean; colors: ScenePalette };
  /** Section backgrounds cycle through these (video 2 style colour blocks / video 1 paper tones). */
  bands: DesignBand[];
  /** Latin-script fonts. Other scripts keep their language fonts. */
  fonts: { script: string; serif: string; body: string };
  opening: 'seal' | 'lanterns' | 'doors' | 'curtain' | 'envelope' | 'petals' | 'scroll';
  ambient: AmbientKind;
  divider: DividerKind;
  marker: MarkerKind;
  music: MusicMood;
  /** Painted art once it exists (public URLs). Missing slots fall back to the drawn placeholder. */
  paint: Partial<Record<PaintSlot, string>>;
}

const paper = (bg: string, ink: string, primary: string): DesignBand => ({ bg, ink, primary });

export const SITE_DESIGNS: readonly SiteDesign[] = [
  {
    id: 'royal-lanterns',
    name: 'Royal Lanterns',
    blurb: 'Sky lanterns over a Rajasthani palace at dusk',
    region: 'Rajasthan',
    faith: null,
    palette: { primary: '#B4472B', accent: '#E9A23B', background: '#F6EBDA', surface: '#FFF8EC', text: '#2B1A12' },
    scene: {
      kind: 'palace',
      night: true,
      colors: { skyTop: '#16264F', skyBottom: '#3E5C9A', glow: '#FFB547', far: '#2D4479', mid: '#E9C98F', midShade: '#C99A5B', trim: '#8C3B22', near: '#6B2E1C', bloom: ['#F2A541', '#E86A3A', '#FFD27A'], water: '#2F7F86' },
    },
    bands: [paper('#2E7C80', '#F4EEE2', '#F7D79B'), paper('#E7B4C4', '#3A1B26', '#7D2A47'), paper('#E2B744', '#33240A', '#7A2E14'), paper('#1B2A55', '#EFE6D6', '#F2B65A')],
    fonts: { script: 'Pinyon Script', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' },
    opening: 'lanterns',
    ambient: 'lanterns',
    divider: 'arches',
    marker: 'lantern',
    music: 'shehnai',
    paint: {},
  },
  {
    id: 'rose-seal',
    name: 'Burgundy Rose',
    blurb: 'Wax-sealed envelope, swans and watercolour roses',
    region: 'Classic',
    faith: null,
    palette: { primary: '#7A1F2B', accent: '#C9A27A', background: '#F7EFEA', surface: '#FFFAF6', text: '#3A1E22' },
    scene: {
      kind: 'swan-lake',
      night: false,
      colors: { skyTop: '#EFE4D8', skyBottom: '#F7EFE6', glow: '#FFF4E2', far: '#C9CDB8', mid: '#EDE3D2', midShade: '#CDBEA6', trim: '#B49A78', near: '#5E7A55', bloom: ['#8E1E2E', '#C4475A', '#F1C6C2', '#F7E2D0'], water: '#B9C8C2' },
    },
    bands: [paper('#F7EFEA', '#3A1E22', '#7A1F2B'), paper('#F2E5DD', '#3A1E22', '#7A1F2B')],
    fonts: { script: 'Great Vibes', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' },
    opening: 'seal',
    ambient: 'petals',
    divider: 'torn',
    marker: 'rose',
    music: 'piano',
    paint: {},
  },
  {
    id: 'temple-dawn',
    name: 'Temple Dawn',
    blurb: 'Pillared mandapam, brass lamps and coconut palms',
    region: 'South India',
    faith: 'hindu',
    palette: { primary: '#8A1C1C', accent: '#D4A017', background: '#FBF1DC', surface: '#FFF9EC', text: '#2E1A0E' },
    scene: {
      kind: 'temple-court',
      night: false,
      colors: { skyTop: '#F6C27A', skyBottom: '#FCE7C2', glow: '#FFE3A1', far: '#8FAE7A', mid: '#E7CFA0', midShade: '#B98E54', trim: '#8A1C1C', near: '#2F6B3A', bloom: ['#F4A31B', '#FFFFFF', '#E8572A'], water: '#7FB0A8' },
    },
    bands: [paper('#FBF1DC', '#2E1A0E', '#8A1C1C'), paper('#1F5A3A', '#FBF1DC', '#F2C14E'), paper('#8A1C1C', '#FFF3DC', '#F2C14E')],
    fonts: { script: 'Italianno', serif: 'Cinzel', body: 'Cormorant Garamond' },
    opening: 'doors',
    ambient: 'marigolds',
    divider: 'scallop',
    marker: 'diya',
    music: 'flute',
    paint: {},
  },
  {
    id: 'alpana',
    name: 'Alpana Red',
    blurb: 'Red and white alpana, terracotta pavilion by the river',
    region: 'Bengal',
    faith: 'hindu',
    palette: { primary: '#B3121B', accent: '#E8B04A', background: '#FFF8F1', surface: '#FFFFFF', text: '#2A0E0E' },
    scene: {
      kind: 'riverside',
      night: false,
      colors: { skyTop: '#F7D8C4', skyBottom: '#FFF1E6', glow: '#FFE0B8', far: '#B8C7B2', mid: '#C2643E', midShade: '#93452A', trim: '#FFF3E4', near: '#3E6B3C', bloom: ['#B3121B', '#FFFFFF', '#F2B33D'], water: '#9FC1C4' },
    },
    bands: [paper('#FFF8F1', '#2A0E0E', '#B3121B'), paper('#B3121B', '#FFF5EC', '#FFFFFF')],
    fonts: { script: 'Parisienne', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' },
    opening: 'scroll',
    ambient: 'petals',
    divider: 'scallop',
    marker: 'lotus',
    music: 'flute',
    paint: {},
  },
  {
    id: 'phulkari',
    name: 'Phulkari Haveli',
    blurb: 'Bright phulkari colours and mustard fields',
    region: 'Punjab',
    faith: null,
    palette: { primary: '#C2185B', accent: '#F9A825', background: '#FFF6EC', surface: '#FFFFFF', text: '#2B1020' },
    scene: {
      kind: 'haveli',
      night: false,
      colors: { skyTop: '#9FD3E8', skyBottom: '#FFF0C9', glow: '#FFE07A', far: '#E9C54A', mid: '#E7A97E', midShade: '#B8714A', trim: '#C2185B', near: '#E3B21C', bloom: ['#C2185B', '#F57C00', '#F9A825'], water: '#8CC5D8' },
    },
    bands: [paper('#FFF6EC', '#2B1020', '#C2185B'), paper('#F57C00', '#2A1205', '#5B0D2E'), paper('#C2185B', '#FFF3F8', '#FFD54F')],
    fonts: { script: 'Great Vibes', serif: 'Marcellus', body: 'Cormorant Garamond' },
    opening: 'curtain',
    ambient: 'marigolds',
    divider: 'wave',
    marker: 'marigold',
    music: 'dhol',
    paint: {},
  },
  {
    id: 'bandhani',
    name: 'Bandhani Stepwell',
    blurb: 'Tie-dye dots, toran and a carved stepwell',
    region: 'Gujarat',
    faith: null,
    palette: { primary: '#B71C1C', accent: '#FBC02D', background: '#FFF7EE', surface: '#FFFFFF', text: '#2A0F0A' },
    scene: {
      kind: 'stepwell',
      night: false,
      colors: { skyTop: '#F7B267', skyBottom: '#FDE3B5', glow: '#FFD580', far: '#D9A66C', mid: '#E2B57C', midShade: '#A9713E', trim: '#B71C1C', near: '#2E7D32', bloom: ['#B71C1C', '#FBC02D', '#1565C0'], water: '#4E9EA6' },
    },
    bands: [paper('#FFF7EE', '#2A0F0A', '#B71C1C'), paper('#B71C1C', '#FFF4E8', '#FBC02D'), paper('#14457A', '#F4F1EA', '#FBC02D')],
    fonts: { script: 'Allura', serif: 'Cinzel', body: 'Cormorant Garamond' },
    opening: 'doors',
    ambient: 'marigolds',
    divider: 'arches',
    marker: 'marigold',
    music: 'santoor',
    paint: {},
  },
  {
    id: 'paithani',
    name: 'Paithani Peacock',
    blurb: 'Peacock green, royal purple and a hill fort',
    region: 'Maharashtra',
    faith: null,
    palette: { primary: '#5B1E6B', accent: '#D4A21E', background: '#F5F2E8', surface: '#FFFFFF', text: '#1F1424' },
    scene: {
      kind: 'fort',
      night: false,
      colors: { skyTop: '#C9A7D9', skyBottom: '#F6E6D2', glow: '#FFE2A6', far: '#7E9C7A', mid: '#A88C6C', midShade: '#7B6249', trim: '#D4A21E', near: '#0F6B5C', bloom: ['#0F6B5C', '#5B1E6B', '#D4A21E'], water: '#7AA9A0' },
    },
    bands: [paper('#F5F2E8', '#1F1424', '#5B1E6B'), paper('#0F6B5C', '#F3EEDF', '#E7C25A'), paper('#5B1E6B', '#F6EEF8', '#E7C25A')],
    fonts: { script: 'Pinyon Script', serif: 'Marcellus', body: 'Cormorant Garamond' },
    opening: 'curtain',
    ambient: 'petals',
    divider: 'scallop',
    marker: 'lotus',
    music: 'sitar',
    paint: {},
  },
  {
    id: 'nikah-emerald',
    name: 'Emerald Mughal Garden',
    blurb: 'Cusped arches, cypress trees and hanging lanterns',
    region: 'Mughal',
    faith: 'muslim',
    palette: { primary: '#0E5A43', accent: '#C9A646', background: '#F4F1E6', surface: '#FFFFFF', text: '#13261F' },
    scene: {
      kind: 'mughal-garden',
      night: true,
      colors: { skyTop: '#0B1E2D', skyBottom: '#1D4A52', glow: '#F4D27A', far: '#163A40', mid: '#EFE6D2', midShade: '#C7B791', trim: '#C9A646', near: '#0E3B2C', bloom: ['#F4D27A', '#FFFFFF', '#C9A646'], water: '#1F5E63' },
    },
    bands: [paper('#F4F1E6', '#13261F', '#0E5A43'), paper('#0E3B2C', '#F2EEDF', '#E2C46A')],
    fonts: { script: 'Italianno', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' },
    opening: 'doors',
    ambient: 'stars',
    divider: 'arches',
    marker: 'star',
    music: 'qawwali',
    paint: {},
  },
  {
    id: 'garden-chapel',
    name: 'Garden Arbour',
    blurb: 'White roses on a garden arch, soft sage greens',
    region: 'Garden',
    faith: 'christian',
    palette: { primary: '#4F6B4A', accent: '#C8A97E', background: '#F8F6F0', surface: '#FFFFFF', text: '#232A21' },
    scene: {
      kind: 'rose-arbor',
      night: false,
      colors: { skyTop: '#DCE8E6', skyBottom: '#F7F5EE', glow: '#FFF6DE', far: '#B8CBB4', mid: '#F3EFE6', midShade: '#D3CBB8', trim: '#C8A97E', near: '#4F6B4A', bloom: ['#FFFFFF', '#F4DCD6', '#E8C9A7'], water: '#C9DAD6' },
    },
    bands: [paper('#F8F6F0', '#232A21', '#4F6B4A'), paper('#E9EFE6', '#232A21', '#4F6B4A')],
    fonts: { script: 'Great Vibes', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' },
    opening: 'seal',
    ambient: 'butterflies',
    divider: 'torn',
    marker: 'leaf',
    music: 'strings',
    paint: {},
  },
  {
    id: 'anand-karaj',
    name: 'Saffron Courtyard',
    blurb: 'Marigold strings, saffron and royal blue courtyard',
    region: 'Punjab',
    faith: 'sikh',
    palette: { primary: '#1A3A7A', accent: '#F28C0F', background: '#FFF7EA', surface: '#FFFFFF', text: '#121A33' },
    scene: {
      kind: 'marigold-court',
      night: false,
      colors: { skyTop: '#FFC98A', skyBottom: '#FFF0D6', glow: '#FFE3A8', far: '#E8C9A0', mid: '#F4E6CF', midShade: '#CDB18A', trim: '#1A3A7A', near: '#F28C0F', bloom: ['#F28C0F', '#FFC107', '#E65100'], water: '#9CC3D5' },
    },
    bands: [paper('#FFF7EA', '#121A33', '#1A3A7A'), paper('#1A3A7A', '#FFF3E0', '#FFB74D'), paper('#F28C0F', '#1C1206', '#14306A')],
    fonts: { script: 'Allura', serif: 'Cinzel', body: 'Cormorant Garamond' },
    opening: 'doors',
    ambient: 'marigolds',
    divider: 'wave',
    marker: 'marigold',
    music: 'acoustic',
    paint: {},
  },
  {
    id: 'pastel-floral',
    name: 'Pastel Bloom',
    blurb: 'Blush and peach flowers in a soft meadow',
    region: 'Modern',
    faith: null,
    palette: { primary: '#B4637A', accent: '#E8B4A0', background: '#FFF7F4', surface: '#FFFFFF', text: '#3A2329' },
    scene: {
      kind: 'bloom-meadow',
      night: false,
      colors: { skyTop: '#F9DDE2', skyBottom: '#FFF6EF', glow: '#FFF0E0', far: '#E9D5DA', mid: '#F3E2DC', midShade: '#DDBFB8', trim: '#B4637A', near: '#9DB59A', bloom: ['#F2B5C4', '#F8CBA6', '#FFFFFF', '#C9B6E4'], water: '#D9E6EC' },
    },
    bands: [paper('#FFF7F4', '#3A2329', '#B4637A'), paper('#FBEAEA', '#3A2329', '#B4637A')],
    fonts: { script: 'Parisienne', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' },
    opening: 'petals',
    ambient: 'butterflies',
    divider: 'wave',
    marker: 'rose',
    music: 'acoustic',
    paint: {},
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    blurb: 'Ivory paper, a single arch and quiet type',
    region: 'Modern',
    faith: null,
    palette: { primary: '#2B2B2B', accent: '#B89B72', background: '#F7F4EE', surface: '#FFFFFF', text: '#1E1E1E' },
    scene: {
      kind: 'minimal-arch',
      night: false,
      colors: { skyTop: '#F1ECE3', skyBottom: '#F7F4EE', glow: '#E8D7BC', far: '#E6DFD2', mid: '#EFE9DF', midShade: '#D9CFBE', trim: '#B89B72', near: '#2B2B2B', bloom: ['#B89B72', '#D9CFBE'], water: '#E6DFD2' },
    },
    bands: [paper('#F7F4EE', '#1E1E1E', '#2B2B2B'), paper('#EDE7DC', '#1E1E1E', '#2B2B2B')],
    fonts: { script: 'Italianno', serif: 'Tenor Sans', body: 'Tenor Sans' },
    opening: 'envelope',
    ambient: 'none',
    divider: 'line',
    marker: 'dot',
    music: 'piano',
    paint: {},
  },
  // ---- 2026 premium collection: destination, heritage-craft and luxe looks ----
  {
    id: 'lake-palace',
    name: 'Lake Palace Nights',
    blurb: 'A white palace on a moonlit lake, fireworks overhead',
    region: 'Udaipur',
    faith: null,
    isNew: true,
    palette: { primary: '#2A2F6B', accent: '#D9B25F', background: '#F6F1E7', surface: '#FFFFFF', text: '#1B1D3A' },
    scene: {
      kind: 'lake-palace',
      night: true,
      colors: { skyTop: '#0E1236', skyBottom: '#33407A', glow: '#FFD98A', far: '#1E2550', mid: '#F3EBDD', midShade: '#C9BBA2', trim: '#D9B25F', near: '#141A3D', bloom: ['#FFD98A', '#F28FAD', '#FFFFFF'], water: '#1C2A5C' },
    },
    bands: [paper('#F6F1E7', '#1B1D3A', '#2A2F6B'), paper('#2A2F6B', '#F4EFE4', '#E8C77A'), paper('#E9D9E6', '#2A1B33', '#6A2A5C')],
    fonts: { script: 'Pinyon Script', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' },
    opening: 'doors',
    ambient: 'fireworks',
    divider: 'arches',
    marker: 'lantern',
    music: 'sitar',
    paint: {},
  },
  {
    id: 'goa-sunset',
    name: 'Goa Sunset',
    blurb: 'Beach mandap, string lights and a coral sunset',
    region: 'Destination',
    faith: null,
    isNew: true,
    palette: { primary: '#C2553A', accent: '#2F8F8A', background: '#FFF6EE', surface: '#FFFFFF', text: '#2A1912' },
    scene: {
      kind: 'beach-sunset',
      night: false,
      colors: { skyTop: '#F7A27B', skyBottom: '#FFE2B8', glow: '#FFD27A', far: '#3E9AA0', mid: '#F3D9B1', midShade: '#D7B285', trim: '#FFFFFF', near: '#2F6B4A', bloom: ['#FFD27A', '#FFFFFF', '#F28C6A'], water: '#2F8F8A' },
    },
    bands: [paper('#FFF6EE', '#2A1912', '#C2553A'), paper('#2F8F8A', '#F2FBF8', '#FFE0B5'), paper('#F7D3C0', '#2A1912', '#9C3B25')],
    fonts: { script: 'Parisienne', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' },
    opening: 'envelope',
    ambient: 'fairylights',
    divider: 'wave',
    marker: 'leaf',
    music: 'acoustic',
    paint: {},
  },
  {
    id: 'kerala-backwaters',
    name: 'Backwater Bliss',
    blurb: 'Houseboat, coconut palms and still green water',
    region: 'Kerala',
    faith: null,
    isNew: true,
    palette: { primary: '#1F5A3A', accent: '#D4A33B', background: '#F7F4E8', surface: '#FFFFFF', text: '#14251B' },
    scene: {
      kind: 'backwaters',
      night: false,
      colors: { skyTop: '#F6D49A', skyBottom: '#FBF0D4', glow: '#FFE7A8', far: '#4F7F4A', mid: '#8A5A33', midShade: '#5E3B20', trim: '#E9C873', near: '#2E6B3A', bloom: ['#F4A31B', '#FFFFFF', '#E86A8E'], water: '#6E9A7E' },
    },
    bands: [paper('#F7F4E8', '#14251B', '#1F5A3A'), paper('#1F5A3A', '#F4F1E2', '#E9C873'), paper('#F3E2BC', '#2A1C0C', '#7A4A1E')],
    fonts: { script: 'Italianno', serif: 'Marcellus', body: 'Cormorant Garamond' },
    opening: 'scroll',
    ambient: 'fireflies',
    divider: 'wave',
    marker: 'leaf',
    music: 'flute',
    paint: {},
  },
  {
    id: 'banaras-ghats',
    name: 'Ghats at Dusk',
    blurb: 'Stone ghats, boats and floating diyas on the river',
    region: 'Varanasi',
    faith: 'hindu',
    isNew: true,
    palette: { primary: '#7A2E12', accent: '#E8A33A', background: '#FBF2E4', surface: '#FFFFFF', text: '#2A150C' },
    scene: {
      kind: 'ghats',
      night: true,
      colors: { skyTop: '#2B1D3F', skyBottom: '#C9744A', glow: '#FFC266', far: '#5A3A44', mid: '#C9A17A', midShade: '#8F6A4C', trim: '#E8A33A', near: '#3A2216', bloom: ['#F28C0F', '#FFC107', '#FFFFFF'], water: '#3E3554' },
    },
    bands: [paper('#FBF2E4', '#2A150C', '#7A2E12'), paper('#3E2A4F', '#F7EEE2', '#F2B65A'), paper('#E8A33A', '#2A150C', '#5A1E08')],
    fonts: { script: 'Allura', serif: 'Cinzel', body: 'Cormorant Garamond' },
    opening: 'lanterns',
    ambient: 'fireflies',
    divider: 'scallop',
    marker: 'diya',
    music: 'shehnai',
    paint: {},
  },
  {
    id: 'himalayan-pines',
    name: 'Mountain Mist',
    blurb: 'Snowy peaks, pine forest and fairy lights',
    region: 'Hills',
    faith: null,
    isNew: true,
    palette: { primary: '#2F4A45', accent: '#B9965A', background: '#F4F5F1', surface: '#FFFFFF', text: '#1A2624' },
    scene: {
      kind: 'mountains',
      night: false,
      colors: { skyTop: '#B9CFDA', skyBottom: '#EEF2F1', glow: '#FFF3D6', far: '#8FA6B2', mid: '#2F4A45', midShade: '#5B4433', trim: '#FFD98A', near: '#22392F', bloom: ['#FFFFFF', '#E8D9B5', '#C9A9D9'], water: '#A9C1C9' },
    },
    bands: [paper('#F4F5F1', '#1A2624', '#2F4A45'), paper('#E3EAE6', '#1A2624', '#2F4A45'), paper('#2F4A45', '#F1F3EE', '#E5CC94')],
    fonts: { script: 'Great Vibes', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' },
    opening: 'curtain',
    ambient: 'fairylights',
    divider: 'torn',
    marker: 'star',
    music: 'ambient',
    paint: {},
  },
  {
    id: 'blue-pottery',
    name: 'Blue Pottery',
    blurb: 'Jaipur blue-and-white tiles, vases and florals',
    region: 'Jaipur craft',
    faith: null,
    isNew: true,
    palette: { primary: '#1E4E8C', accent: '#5FA3C9', background: '#F7F9FC', surface: '#FFFFFF', text: '#13233D' },
    scene: {
      kind: 'blue-tiles',
      night: false,
      colors: { skyTop: '#E8F0F8', skyBottom: '#FAFCFE', glow: '#FFFFFF', far: '#CFE0EF', mid: '#FFFFFF', midShade: '#5FA3C9', trim: '#1E4E8C', near: '#1E4E8C', bloom: ['#1E4E8C', '#5FA3C9', '#FFFFFF'], water: '#CFE0EF' },
    },
    bands: [paper('#F7F9FC', '#13233D', '#1E4E8C'), paper('#1E4E8C', '#F2F7FC', '#CFE6F5'), paper('#E3EEF8', '#13233D', '#1E4E8C')],
    fonts: { script: 'Pinyon Script', serif: 'Marcellus', body: 'Cormorant Garamond' },
    opening: 'seal',
    ambient: 'petals',
    divider: 'scallop',
    marker: 'lotus',
    music: 'santoor',
    paint: {},
  },
  {
    id: 'bombay-deco',
    name: 'Bombay Deco',
    blurb: 'Black and gold art deco with a city skyline at night',
    region: 'Mumbai',
    faith: null,
    isNew: true,
    palette: { primary: '#B8934A', accent: '#E6CF95', background: '#111111', surface: '#1C1C1C', text: '#F3EBDA' },
    scene: {
      kind: 'art-deco',
      night: true,
      colors: { skyTop: '#07070A', skyBottom: '#1B1B26', glow: '#E6CF95', far: '#22222E', mid: '#15151C', midShade: '#2A2A36', trim: '#C9A55C', near: '#C9A55C', bloom: ['#E6CF95', '#C9A55C', '#FFFFFF'], water: '#1B1B26' },
    },
    bands: [paper('#111111', '#F3EBDA', '#D4B26A'), paper('#1C1A16', '#F3EBDA', '#E6CF95'), paper('#F3EBDA', '#161310', '#8E6C2C')],
    fonts: { script: 'Italianno', serif: 'Tenor Sans', body: 'Tenor Sans' },
    opening: 'curtain',
    ambient: 'stars',
    divider: 'line',
    marker: 'star',
    music: 'piano',
    paint: {},
  },
  {
    id: 'pichwai-lotus',
    name: 'Pichwai Lotus',
    blurb: 'Lotus pond, cranes and gold dots in Pichwai style',
    region: 'Rajasthan craft',
    faith: 'hindu',
    isNew: true,
    palette: { primary: '#8E1B2C', accent: '#D4A53A', background: '#FBF3E6', surface: '#FFFFFF', text: '#2A0F14' },
    scene: {
      kind: 'lotus-pond',
      // Dark painted ground: light lettering on the cover.
      night: true,
      colors: { skyTop: '#1E4A3A', skyBottom: '#2E6B52', glow: '#F2D27A', far: '#174034', mid: '#2E6B52', midShade: '#1E4A3A', trim: '#D4A53A', near: '#123628', bloom: ['#F2A7B8', '#E86A8E', '#FFFFFF'], water: '#21564A' },
    },
    bands: [paper('#FBF3E6', '#2A0F14', '#8E1B2C'), paper('#1E4A3A', '#F7F0E0', '#E9C873'), paper('#8E1B2C', '#FBEFE8', '#F2D27A')],
    fonts: { script: 'Allura', serif: 'Cinzel', body: 'Cormorant Garamond' },
    opening: 'scroll',
    ambient: 'petals',
    divider: 'scallop',
    marker: 'lotus',
    music: 'flute',
    paint: {},
  },
];

export function getSiteDesign(id: string | null | undefined): SiteDesign | null {
  if (!id) return null;
  return SITE_DESIGNS.find((d) => d.id === id) ?? null;
}

/** Packs for this event: the event's own faith first, then neutral ones, then the rest. Never hides any. */
export function designsFor(eventType: string, community?: string | null): SiteDesign[] {
  const faith = faithOf(eventType, community);
  const rank = (d: SiteDesign) => (d.faith === faith ? 0 : d.faith === null ? 1 : 2);
  return [...SITE_DESIGNS].sort((a, b) => rank(a) - rank(b));
}

// ---------------- music ----------------

export interface MusicTrack {
  id: string;
  title: string;
  mood: MusicMood;
  /** Object-storage key. Upload royalty-free files here (see packages/db/src/seed.ts). */
  storageKey: string;
  durationSec: number;
}

/** Library tracks seeded into `music_tracks`; designs pick one by mood. */
export const MUSIC_TRACKS: readonly MusicTrack[] = [
  { id: 'shehnai-welcome', title: 'Shehnai welcome', mood: 'shehnai', storageKey: 'music/shehnai-welcome.mp3', durationSec: 90 },
  { id: 'sitar-evening', title: 'Sitar evening', mood: 'sitar', storageKey: 'music/sitar-evening.mp3', durationSec: 90 },
  { id: 'santoor-morning', title: 'Santoor morning', mood: 'santoor', storageKey: 'music/santoor-morning.mp3', durationSec: 90 },
  { id: 'bansuri-dawn', title: 'Bansuri at dawn', mood: 'flute', storageKey: 'music/bansuri-dawn.mp3', durationSec: 90 },
  { id: 'piano-vows', title: 'Piano vows', mood: 'piano', storageKey: 'music/piano-vows.mp3', durationSec: 90 },
  { id: 'strings-garden', title: 'Garden strings', mood: 'strings', storageKey: 'music/strings-garden.mp3', durationSec: 90 },
  { id: 'qawwali-night', title: 'Qawwali night', mood: 'qawwali', storageKey: 'music/qawwali-night.mp3', durationSec: 90 },
  { id: 'acoustic-sunlight', title: 'Acoustic sunlight', mood: 'acoustic', storageKey: 'music/acoustic-sunlight.mp3', durationSec: 90 },
  { id: 'dhol-baraat', title: 'Dhol baraat', mood: 'dhol', storageKey: 'music/dhol-baraat.mp3', durationSec: 75 },
  { id: 'ambient-glow', title: 'Ambient glow', mood: 'ambient', storageKey: 'music/ambient-glow.mp3', durationSec: 90 },
];
export const MUSIC_TRACK_IDS = MUSIC_TRACKS.map((t) => t.id) as [string, ...string[]];

/** Track id a design plays by default. */
export function designTrackId(design: SiteDesign | null): string | null {
  return design ? (MUSIC_TRACKS.find((t) => t.mood === design.music)?.id ?? null) : null;
}

/**
 * Music the page (and the video) plays, in order: the host's uploaded song, a track picked on
 * the website, "no music", then (auto) the card's track from the Edit tab, then the design's
 * mood track. `library` maps track ids to URLs.
 */
export function siteMusicUrl(opts: { uploaded: string | null | undefined; track: string; eventTrackUrl: string | null; design: SiteDesign | null; library: Record<string, string> }): string | null {
  if (opts.uploaded) return opts.uploaded;
  if (opts.track === 'none') return null;
  if (opts.track !== 'auto') return opts.library[opts.track] ?? null;
  if (opts.eventTrackUrl) return opts.eventTrackUrl;
  const id = designTrackId(opts.design);
  return id ? (opts.library[id] ?? null) : null;
}
