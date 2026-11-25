import { getPhotoLook, type PhotoLookId } from '../art/looks.js';
import { faithOf, type Faith } from '../constants/faith.js';
import type { SiteOpening } from './schema.js';
import { OCCASION_HEADLINERS } from '../design/families-occasions.js';

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
  // painted photo looks (art/looks.ts): same ids as their card families
  'gulab-bagh',
  'herbarium',
  'gulabi-syahi',
  'mahal-maroon',
  'harit',
  'kahani',
  'genda',
  'jharokha',
  'kamal',
  'roshni',
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
  'raat-mahal',
  'gulab-ring',
  'neel-gulab',
  'titli-bagh',
  'raat-ki-rani',
  'mr-mrs',
  'gulistan',
  'pampas-boho',
  'haldi-rasam',
  'gubbare',
  'sunehri-shaam',
  'chanda-mama',
  'sheesh-mahal',
  'mogra',
  'kesariya',
  'chandni',
  // Layout designs (Nov 2026): a different page structure, not just new art.
  'insta-stories',
  'premiere',
  'chat-story',
  'scrapbook',
  'boarding-pass',
  'front-page',
  'our-playlist',
  'level-up',
  'tasting-menu',
  'big-day-calendar',
  // Occasion packs (Nov 2026): same ids as each occasion's free card family.
  'haldi-sunshine',
  'mehendi-hands',
  'sangeet-nights',
  'ring-promise',
  'tilak-kumkum',
  'roka-shagun',
  'cocktail-hour',
  'bach-squad',
  'one-tiny',
  'golden-jubilee',
  'kitty-high-tea',
  'grad-capstone',
  'farewell-wings',
  'reunion-polaroid',
  'katha-kalash',
  'diwali-diya',
  'holi-rang',
  'xmas-joy',
  'ny-countdown',
  'rakhi-dhaga',
  'bhaidooj-tika',
  'eid-chand',
  'garba-raas',
  'ganpati-bappa',
  'lohri-bonfire',
  'patang-utsav',
  'onam-pookalam',
  'durga-dhak',
  'karva-chand',
  'krishna-flute',
  'gurpurab-prakash',
  'trip-wanderlust',
  'family-voyage',
  'holiday-postcard',
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
  'mahal-arch',
  'rose-ring',
  'blue-roses',
  'butterfly-garden',
  'noir-roses',
  'mauve-arch',
  'vintage-bloom',
  'pampas-arch',
  'haldi-marigold',
  'balloon-party',
  'gold-party',
  'moon-cradle',
  'jharokha-night',
  'champa-frame',
  'genda-toran',
  'moon-rings',
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

/**
 * Page structures beyond the scrolling invitation: tap-through stories with a profile page,
 * a streaming-show premiere, a chat that types itself, and a scrapbook with a magazine cover.
 * Website only: the card and the video keep their own designs (see videoDesignFor).
 */
export const SITE_LAYOUTS = ['stories', 'movie', 'chat', 'scrapbook', 'boarding', 'newspaper', 'playlist', 'arcade', 'menu', 'calendar'] as const;
export type SiteLayout = (typeof SITE_LAYOUTS)[number];

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
  scene: {
    kind: SceneKind;
    night: boolean;
    /** `modern`: crisp vector art over a plain gradient sky (no painted wobble, clouds or moon). */
    style?: 'painted' | 'modern';
    /** Cover text colour when the scene needs one of its own (e.g. cream on a maroon arch). */
    ink?: string;
    colors: ScenePalette;
  };
  /** Section backgrounds cycle through these (video 2 style colour blocks / video 1 paper tones). */
  bands: DesignBand[];
  /** Latin-script fonts. Other scripts keep their language fonts. */
  fonts: { script: string; serif: string; body: string };
  /** `none`: the page opens straight away (stories and chat layouts start themselves). */
  opening: SiteOpening;
  ambient: AmbientKind;
  divider: DividerKind;
  marker: MarkerKind;
  music: MusicMood;
  /** Painted art once it exists (public URLs). Missing slots fall back to the drawn placeholder. */
  paint: Partial<Record<PaintSlot, string>>;
  /** Photo-first pack: the hero is the host's photo in this painted look (no drawn scene). */
  look?: PhotoLookId;
  /** Layout design: the page (and video) take this structure instead of the scrolling bands. */
  layout?: SiteLayout;
}

const paper = (bg: string, ink: string, primary: string): DesignBand => ({ bg, ink, primary });

/** A website pack from a painted photo look: same paper, art, colours and fonts as the card. */
function photoPack(id: PhotoLookId, o: Pick<SiteDesign, 'region' | 'opening' | 'ambient' | 'divider' | 'marker' | 'music'>): SiteDesign {
  const l = getPhotoLook(id)!;
  return {
    id,
    name: l.name,
    blurb: l.blurb,
    faith: null,
    isNew: true,
    look: id,
    palette: { primary: l.primary, accent: l.accent, background: l.paperColor, surface: l.dark ? l.paperAlt : '#FFFFFF', text: l.ink },
    scene: {
      kind: 'minimal-arch',
      night: l.dark,
      style: 'modern',
      ink: l.ink,
      colors: { skyTop: l.paperColor, skyBottom: l.paperAlt, glow: l.dark ? l.primary : '#FFFFFF', far: l.paperAlt, mid: l.paperAlt, midShade: l.muted, trim: l.accent, near: l.accent, bloom: [l.primary, l.accent, l.muted, l.paperAlt], water: l.paperAlt },
    },
    bands: [paper(l.paperColor, l.ink, l.primary), paper(l.paperAlt, l.ink, l.primary), paper(l.paperColor, l.ink, l.primary)],
    fonts: l.fonts,
    paint: {},
    ...o,
  };
}

/** A layout design: plain modern scene (used only for small previews), its own palette and fonts. */
function layoutPack(
  o: Pick<SiteDesign, 'id' | 'name' | 'blurb' | 'layout' | 'opening' | 'music' | 'fonts'> & { night: boolean; primary: string; accent: string; bg: string; alt: string; ink: string },
): SiteDesign {
  return {
    id: o.id,
    name: o.name,
    blurb: o.blurb,
    region: 'Pan-India',
    faith: null,
    isNew: true,
    layout: o.layout,
    palette: { primary: o.primary, accent: o.accent, background: o.bg, surface: o.alt, text: o.ink },
    scene: {
      kind: 'minimal-arch',
      night: o.night,
      style: 'modern',
      ink: o.ink,
      colors: { skyTop: o.bg, skyBottom: o.alt, glow: o.accent, far: o.alt, mid: o.alt, midShade: o.alt, trim: o.accent, near: o.primary, bloom: [o.primary, o.accent, o.alt, o.bg], water: o.alt },
    },
    bands: [paper(o.bg, o.ink, o.primary), paper(o.alt, o.ink, o.primary), paper(o.bg, o.ink, o.primary)],
    fonts: o.fonts,
    opening: o.opening,
    ambient: 'none',
    divider: 'line',
    marker: 'dot',
    music: o.music,
    paint: {},
  };
}

/**
 * Occasion packs (wedding functions, celebrations, festivals, trips): an existing painted scene in
 * the occasion's own colours, ambient, opening and music. Scene colours are derived from the
 * palette so every pack stays consistent. The id matches the occasion's free card family.
 */
function occasionPack(o: {
  id: SiteDesignId;
  name: string;
  region: string;
  faith: Faith | null;
  kind: SceneKind;
  night: boolean;
  primary: string;
  accent: string;
  bg: string;
  text: string;
  ambient: AmbientKind;
  opening: SiteOpening;
  music: MusicMood;
  fonts: SiteDesign['fonts'];
  marker: MarkerKind;
}): SiteDesign {
  const lift = (c: string, k: number) => mixHex(c, '#FFFFFF', k);
  const sink = (c: string, k: number) => mixHex(c, '#000000', k);
  const alt = o.night ? lift(o.bg, 0.08) : mixHex(o.bg, o.accent, 0.12);
  return {
    id: o.id,
    name: o.name,
    blurb: `${o.region}: ${o.name.toLowerCase()} in its own colours, music and opening`,
    region: o.region,
    faith: o.faith,
    isNew: true,
    palette: { primary: o.primary, accent: o.accent, background: o.bg, surface: o.night ? alt : '#FFFFFF', text: o.text },
    scene: {
      kind: o.kind,
      night: o.night,
      style: 'modern',
      ...(o.night ? { ink: lift(o.accent, 0.3) } : {}),
      colors: {
        skyTop: o.night ? mixHex(o.bg, o.primary, 0.22) : lift(o.bg, 0.5),
        skyBottom: o.night ? o.bg : mixHex(o.bg, o.accent, 0.25),
        glow: o.accent,
        far: mixHex(o.primary, o.bg, 0.6),
        mid: o.primary,
        midShade: sink(o.primary, 0.25),
        trim: o.accent,
        near: o.night ? o.primary : lift(o.primary, 0.25),
        bloom: [o.primary, o.accent, lift(o.primary, 0.5), o.night ? lift(o.accent, 0.3) : o.bg],
        water: mixHex(o.bg, o.accent, 0.3),
      },
    },
    bands: [paper(o.bg, o.text, o.primary), paper(alt, o.text, o.primary)],
    fonts: o.fonts,
    opening: o.opening,
    ambient: o.ambient,
    divider: 'scallop',
    marker: o.marker,
    music: o.music,
    paint: {},
  };
}

/** Hex colour a k of the way from `a` to `b`. */
function mixHex(a: string, b: string, k: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i]! - v) * k).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

export const SITE_DESIGNS: readonly SiteDesign[] = [
  // ---------------- Layout designs (Nov 2026): new page structures ----------------
  layoutPack({
    id: 'chat-story',
    name: 'Chat Story',
    blurb: 'Your invitation as a chat that types itself as guests scroll, RSVP as a reply',
    layout: 'chat',
    opening: 'notification',
    music: 'acoustic',
    fonts: { script: 'Dancing Script', serif: 'DM Serif Display', body: 'Inter' },
    night: false,
    primary: '#0B7A66',
    accent: '#25D366',
    bg: '#EFE7DD',
    alt: '#F7F3EE',
    ink: '#1F2C34',
  }),
  layoutPack({
    id: 'insta-stories',
    name: 'Story Mode',
    blurb: 'Tap-through full-screen stories, then a profile page with highlights and a photo grid',
    layout: 'stories',
    opening: 'story',
    music: 'piano',
    fonts: { script: 'Dancing Script', serif: 'DM Serif Display', body: 'DM Sans' },
    night: false,
    primary: '#C1356F',
    accent: '#F58529',
    bg: '#FFFFFF',
    alt: '#FAF5F8',
    ink: '#161616',
  }),
  layoutPack({
    id: 'boarding-pass',
    name: 'Boarding Pass',
    blurb: 'A flight ticket to your celebration: boarding pass, itinerary of functions, gate and seat',
    layout: 'boarding',
    opening: 'boarding',
    music: 'acoustic',
    fonts: { script: 'Great Vibes', serif: 'Poppins', body: 'Inter' },
    night: false,
    primary: '#1F4E9C',
    accent: '#F2B705',
    bg: '#EEF3F9',
    alt: '#FFFFFF',
    ink: '#18223A',
  }),
  layoutPack({
    id: 'front-page',
    name: 'Front Page',
    blurb: 'Your news on the front page of a classic newspaper: headline, photo, events calendar, classifieds',
    layout: 'newspaper',
    opening: 'newspaper',
    music: 'piano',
    fonts: { script: 'Pinyon Script', serif: 'Playfair Display', body: 'EB Garamond' },
    night: false,
    primary: '#1B1B1B',
    accent: '#B3261E',
    bg: '#F1ECE1',
    alt: '#E8E1D2',
    ink: '#1B1B1B',
  }),
  layoutPack({
    id: 'our-playlist',
    name: 'Our Playlist',
    blurb: 'A music player: your photo as the album cover, functions as tracks, a lyric card and a vinyl opening',
    layout: 'playlist',
    opening: 'vinyl',
    music: 'acoustic',
    fonts: { script: 'Dancing Script', serif: 'Poppins', body: 'Inter' },
    night: true,
    primary: '#E8336D',
    accent: '#FFB547',
    bg: '#121212',
    alt: '#1E1E1E',
    ink: '#F5F5F5',
  }),
  layoutPack({
    id: 'level-up',
    name: 'Level Up',
    blurb: 'An 8-bit game: Player 1 and Player 2, functions as levels on a map, press start to RSVP',
    layout: 'arcade',
    opening: 'arcade',
    music: 'dhol',
    fonts: { script: 'Press Start 2P', serif: 'Press Start 2P', body: 'Inter' },
    night: true,
    primary: '#E8336D',
    accent: '#FFD84A',
    bg: '#0A0820',
    alt: '#151238',
    ink: '#F2F2FF',
  }),
  layoutPack({
    id: 'tasting-menu',
    name: 'Tasting Menu',
    blurb: "A fine-dining menu card: functions as courses, a chef's note and a bill paid in blessings",
    layout: 'menu',
    opening: 'menu',
    music: 'strings',
    fonts: { script: 'Pinyon Script', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' },
    night: false,
    primary: '#5E1A2B',
    accent: '#C9A45C',
    bg: '#F7F1E6',
    alt: '#EFE6D4',
    ink: '#2B1D16',
  }),
  layoutPack({
    id: 'big-day-calendar',
    name: 'The Big Day',
    blurb: 'A wall calendar with your date circled, a sticky note, a live countdown and add-to-calendar',
    layout: 'calendar',
    opening: 'calendar',
    music: 'piano',
    fonts: { script: 'Caveat', serif: 'DM Serif Display', body: 'DM Sans' },
    night: false,
    primary: '#D9473B',
    accent: '#F2C14E',
    bg: '#FBF7F0',
    alt: '#FFFFFF',
    ink: '#2A2A2A',
  }),
  layoutPack({
    id: 'premiere',
    name: 'Premiere Night',
    blurb: 'A streaming-show premiere: your names as the title, functions as episodes, family as the cast',
    layout: 'movie',
    opening: 'curtain',
    music: 'strings',
    fonts: { script: 'Great Vibes', serif: 'Bebas Neue', body: 'Inter' },
    night: true,
    primary: '#E2363E',
    accent: '#E7C27D',
    bg: '#0B0B0F',
    alt: '#16161D',
    ink: '#F4F1EA',
  }),
  layoutPack({
    id: 'scrapbook',
    name: 'Scrapbook Diary',
    blurb: 'A magazine cover, then polaroids, washi tape and handwritten notes on kraft paper',
    layout: 'scrapbook',
    opening: 'envelope',
    music: 'acoustic',
    fonts: { script: 'Caveat', serif: 'Abril Fatface', body: 'Special Elite' },
    night: false,
    primary: '#B8402B',
    accent: '#E0A93B',
    bg: '#EFE3CF',
    alt: '#F7F0E2',
    ink: '#2B2622',
  }),

  // ---------------- Painted photo collection (Nov 2026): your photo inside painted art ----------------
  photoPack('gulab-bagh', { region: 'Pan-India', opening: 'seal', ambient: 'petals', divider: 'scallop', marker: 'rose', music: 'piano' }),
  photoPack('kahani', { region: 'Pan-India', opening: 'seal', ambient: 'petals', divider: 'torn', marker: 'leaf', music: 'acoustic' }),
  photoPack('jharokha', { region: 'Rajasthan', opening: 'doors', ambient: 'fireflies', divider: 'arches', marker: 'lantern', music: 'shehnai' }),
  photoPack('mahal-maroon', { region: 'North India', opening: 'doors', ambient: 'fireflies', divider: 'arches', marker: 'rose', music: 'shehnai' }),
  photoPack('gulabi-syahi', { region: 'Pan-India', opening: 'seal', ambient: 'petals', divider: 'line', marker: 'rose', music: 'strings' }),
  photoPack('genda', { region: 'Pan-India', opening: 'doors', ambient: 'marigolds', divider: 'scallop', marker: 'marigold', music: 'dhol' }),
  photoPack('herbarium', { region: 'Pan-India', opening: 'envelope', ambient: 'butterflies', divider: 'line', marker: 'leaf', music: 'acoustic' }),
  photoPack('harit', { region: 'Pan-India', opening: 'envelope', ambient: 'butterflies', divider: 'wave', marker: 'leaf', music: 'flute' }),
  photoPack('kamal', { region: 'Pan-India', opening: 'petals', ambient: 'petals', divider: 'wave', marker: 'lotus', music: 'santoor' }),
  photoPack('roshni', { region: 'Pan-India', opening: 'lanterns', ambient: 'fairylights', divider: 'line', marker: 'star', music: 'strings' }),

  // ---------------- Premium collection (Nov 2026): website-first luxury looks ----------------
  {
    id: 'sheesh-mahal',
    name: 'Sheesh Mahal',
    blurb: 'Gold Mughal arch, lanterns and starlight on emerald',
    region: 'Rajasthan',
    faith: null,
    isNew: true,
    palette: { primary: '#0F4D3A', accent: '#D4AF37', background: '#F7F1E3', surface: '#FFFDF6', text: '#14261F' },
    scene: {
      kind: 'jharokha-night',
      night: true,
      style: 'modern',
      colors: { skyTop: '#06201A', skyBottom: '#0F3A2D', glow: '#FFE3A1', far: '#D4AF37', mid: '#124535', midShade: '#0A2B22', trim: '#D4AF37', near: '#2F5D43', bloom: ['#F6EFE0', '#E5D3B0', '#2F5D43', '#D4AF37'], water: '#124535' },
    },
    bands: [paper('#0F3A2D', '#F4EBD6', '#E2C26A'), paper('#F7F1E3', '#14261F', '#0F4D3A'), paper('#12372B', '#F4EBD6', '#E2C26A')],
    fonts: { script: 'Great Vibes', serif: 'Cinzel', body: 'Cormorant Garamond' },
    opening: 'doors',
    ambient: 'fireflies',
    divider: 'arches',
    marker: 'lantern',
    music: 'shehnai',
    paint: {},
  },
  {
    id: 'mogra',
    name: 'Mogra',
    blurb: 'Ivory and champagne inside a garden frame of roses',
    region: 'Pan-India',
    faith: null,
    isNew: true,
    palette: { primary: '#7C6A4E', accent: '#C9A96E', background: '#FBF8F2', surface: '#FFFFFF', text: '#2E2A24' },
    scene: {
      kind: 'champa-frame',
      night: false,
      style: 'modern',
      colors: { skyTop: '#FBF8F2', skyBottom: '#F3EDE2', glow: '#FFFFFF', far: '#EDE4D3', mid: '#FFFDF8', midShade: '#6F7F5E', trim: '#C9A96E', near: '#9AA77F', bloom: ['#F2E6D8', '#D8C3A5', '#9AA77F', '#E8D8A8'], water: '#EDE4D3' },
    },
    bands: [paper('#FBF8F2', '#2E2A24', '#7C6A4E'), paper('#F1EADD', '#2E2A24', '#7C6A4E'), paper('#E5EAE0', '#2B3326', '#56664A')],
    fonts: { script: 'Parisienne', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' },
    opening: 'envelope',
    ambient: 'petals',
    divider: 'scallop',
    marker: 'rose',
    music: 'piano',
    paint: {},
  },
  {
    id: 'kesariya',
    name: 'Kesariya',
    blurb: 'Saffron dusk, marigold torans and brass lanterns',
    region: 'Rajasthan',
    faith: null,
    isNew: true,
    palette: { primary: '#B33A1E', accent: '#F2B33D', background: '#FFF4E3', surface: '#FFFBF3', text: '#3A1608' },
    scene: {
      kind: 'genda-toran',
      night: false,
      style: 'modern',
      colors: { skyTop: '#FFE6BF', skyBottom: '#FFD08A', glow: '#FFF3D6', far: '#F7A85A', mid: '#B33A1E', midShade: '#8E2A14', trim: '#C98A1E', near: '#2F7D32', bloom: ['#F28C0F', '#FFC93C', '#2F7D32', '#E2553D'], water: '#F7C07A' },
    },
    bands: [paper('#FFF4E3', '#3A1608', '#B33A1E'), paper('#B33A1E', '#FFF1DE', '#FFD27A'), paper('#FDE3B3', '#3A1608', '#8E2A14')],
    fonts: { script: 'Pinyon Script', serif: 'Yeseva One', body: 'Cormorant Garamond' },
    opening: 'scroll',
    ambient: 'marigolds',
    divider: 'scallop',
    marker: 'marigold',
    music: 'dhol',
    paint: {},
  },
  {
    id: 'chandni',
    name: 'Chandni',
    blurb: 'Moonlit indigo, gold rings and drifting clouds',
    region: 'Pan-India',
    faith: null,
    isNew: true,
    palette: { primary: '#1F2A5C', accent: '#D9B86A', background: '#F3F1F8', surface: '#FFFFFF', text: '#151A33' },
    scene: {
      kind: 'moon-rings',
      night: true,
      style: 'modern',
      colors: { skyTop: '#0D1433', skyBottom: '#27346B', glow: '#F7E7B5', far: '#F7E7B5', mid: '#3A4A86', midShade: '#2A3670', trim: '#D9B86A', near: '#46559A', bloom: ['#F1E4F0', '#C9B3D9', '#6B7BB0', '#D9B86A'], water: '#27346B' },
    },
    bands: [paper('#151D45', '#EEF0FA', '#E3C77F'), paper('#F3F1F8', '#151A33', '#1F2A5C'), paper('#232F66', '#EEF0FA', '#E3C77F')],
    fonts: { script: 'Allura', serif: 'Marcellus', body: 'Cormorant Garamond' },
    opening: 'petals',
    ambient: 'stars',
    divider: 'wave',
    marker: 'star',
    music: 'santoor',
    paint: {},
  },
  // ---------------- Modern collection (Nov 2026): crisp, card-matched designs ----------------
  // Each pack shares its id, art and type with the card family of the same name, so the card,
  // the website and the video invite look like one suite.
  {
    id: 'raat-mahal',
    name: 'Raat Mahal',
    blurb: 'Maroon scalloped arch, hanging lanterns and white peonies',
    region: 'Modern',
    faith: null,
    isNew: true,
    palette: { primary: '#7A1F2B', accent: '#D9B26F', background: '#F7EEDC', surface: '#FFFAF0', text: '#2E1A16' },
    scene: {
      kind: 'mahal-arch',
      night: false,
      style: 'modern',
      ink: '#FBEFD9',
      colors: { skyTop: '#F7EEDC', skyBottom: '#EFE0C4', glow: '#FFE7B0', far: '#E8D6B4', mid: '#5B0F1B', midShade: '#3D0811', trim: '#D9B26F', near: '#5E7D4A', bloom: ['#FFF9F0', '#E5D5BC', '#5E7D4A', '#E9B949'], water: '#E9B949' },
    },
    bands: [paper('#5B0F1B', '#FBEFD9', '#E9C98F'), paper('#F7EEDC', '#2E1A16', '#7A1F2B')],
    fonts: { script: 'Monsieur La Doulaise', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' },
    opening: 'doors',
    ambient: 'petals',
    divider: 'scallop',
    marker: 'lantern',
    music: 'shehnai',
    paint: {},
  },
  {
    id: 'gulab-ring',
    name: 'Gulab Ring',
    blurb: 'Pink watercolour roses climbing a fine gold ring',
    region: 'Modern',
    faith: null,
    isNew: true,
    palette: { primary: '#9C3D57', accent: '#C9A24E', background: '#FBF1F2', surface: '#FFFFFF', text: '#3A2329' },
    scene: {
      kind: 'rose-ring',
      night: false,
      style: 'modern',
      colors: { skyTop: '#FDF6F6', skyBottom: '#F7E1E6', glow: '#FFFFFF', far: '#F3C5D0', mid: '#C9A24E', midShade: '#E9799A', trim: '#C9A24E', near: '#8C9A7A', bloom: ['#EE8FA8', '#A8243A', '#8C9A7A', '#E9C46A'], water: '#F3C5D0' },
    },
    bands: [paper('#FBF1F2', '#3A2329', '#9C3D57'), paper('#F6E3E7', '#3A2329', '#9C3D57')],
    fonts: { script: 'Italianno', serif: 'Cormorant', body: 'Cormorant Garamond' },
    opening: 'envelope',
    ambient: 'petals',
    divider: 'wave',
    marker: 'rose',
    music: 'piano',
    paint: {},
  },
  {
    id: 'neel-gulab',
    name: 'Neel Gulab',
    blurb: 'Dusty-blue roses on a soft watercolour wash',
    region: 'Modern',
    faith: null,
    isNew: true,
    palette: { primary: '#3F5F84', accent: '#B49A62', background: '#F7FAFD', surface: '#FFFFFF', text: '#22324A' },
    scene: {
      kind: 'blue-roses',
      night: false,
      style: 'modern',
      colors: { skyTop: '#FBFDFF', skyBottom: '#EAF1F8', glow: '#FFFFFF', far: '#C9DBEB', mid: '#DCE8F3', midShade: '#8FAAC6', trim: '#B49A62', near: '#8A8458', bloom: ['#8FAAC6', '#3F5F84', '#8A8458', '#E9C46A'], water: '#C9DBEB' },
    },
    bands: [paper('#F7FAFD', '#22324A', '#3F5F84'), paper('#E9F0F7', '#22324A', '#3F5F84')],
    fonts: { script: 'Ms Madi', serif: 'Montserrat', body: 'Montserrat' },
    opening: 'curtain',
    ambient: 'petals',
    divider: 'line',
    marker: 'leaf',
    music: 'acoustic',
    paint: {},
  },
  {
    id: 'titli-bagh',
    name: 'Titli Bagh',
    blurb: 'Lavender hydrangeas, butterflies and gold flecks',
    region: 'Modern',
    faith: null,
    isNew: true,
    palette: { primary: '#5B3F8C', accent: '#C9A24E', background: '#F6F2FB', surface: '#FFFFFF', text: '#2D2142' },
    scene: {
      kind: 'butterfly-garden',
      night: false,
      style: 'modern',
      colors: { skyTop: '#F8F5FC', skyBottom: '#E6DCF4', glow: '#FFFFFF', far: '#DCCDF0', mid: '#B9A3DC', midShade: '#7E63AD', trim: '#C9A24E', near: '#8C9A7A', bloom: ['#B58FD1', '#6A4C93', '#8C9A7A', '#E9C46A'], water: '#DCCDF0' },
    },
    bands: [paper('#F6F2FB', '#2D2142', '#5B3F8C'), paper('#ECE4F7', '#2D2142', '#5B3F8C')],
    fonts: { script: 'Alex Brush', serif: 'Questrial', body: 'Questrial' },
    opening: 'petals',
    ambient: 'butterflies',
    divider: 'wave',
    marker: 'leaf',
    music: 'strings',
    paint: {},
  },
  {
    id: 'raat-ki-rani',
    name: 'Raat ki Rani',
    blurb: 'Blush roses and gold flecks on black',
    region: 'Modern',
    faith: null,
    isNew: true,
    palette: { primary: '#D4AF37', accent: '#F3C6CF', background: '#121012', surface: '#1C1719', text: '#F4EDE4' },
    scene: {
      kind: 'noir-roses',
      night: true,
      style: 'modern',
      ink: '#F2D9A0',
      colors: { skyTop: '#0E0C0E', skyBottom: '#231A1E', glow: '#D4AF37', far: '#D4AF37', mid: '#D4AF37', midShade: '#8E6E2A', trim: '#D4AF37', near: '#5E7D4A', bloom: ['#F3C6CF', '#B4485B', '#5E7D4A', '#D4AF37'], water: '#2A2024' },
    },
    bands: [paper('#121012', '#F4EDE4', '#D4AF37'), paper('#1F1A1C', '#F4EDE4', '#F3C6CF')],
    fonts: { script: 'Monsieur La Doulaise', serif: 'Cormorant', body: 'Cormorant Garamond' },
    opening: 'seal',
    ambient: 'stars',
    divider: 'line',
    marker: 'star',
    music: 'piano',
    paint: {},
  },
  {
    id: 'mr-mrs',
    name: 'Mr & Mrs',
    blurb: 'Cream arch on mauve, coral blooms and gold rings',
    region: 'Modern',
    faith: null,
    isNew: true,
    palette: { primary: '#6E4A44', accent: '#E58E6E', background: '#F5EBDD', surface: '#FFFAF2', text: '#2E2523' },
    scene: {
      kind: 'mauve-arch',
      night: false,
      style: 'modern',
      ink: '#3A2C29',
      colors: { skyTop: '#8A6A66', skyBottom: '#6E5350', glow: '#F5EBDD', far: '#7C5E5A', mid: '#F5EBDD', midShade: '#E9DCC8', trim: '#C9A24E', near: '#8FA06A', bloom: ['#F2A488', '#C8553D', '#8FA06A', '#B8352A'], water: '#F5EBDD' },
    },
    bands: [paper('#F5EBDD', '#2E2523', '#6E4A44'), paper('#8A6A66', '#FFF6EC', '#F6D3B8')],
    fonts: { script: 'Mea Culpa', serif: 'Noto Serif', body: 'Noto Serif' },
    opening: 'envelope',
    ambient: 'petals',
    divider: 'arches',
    marker: 'rose',
    music: 'piano',
    paint: {},
  },
  {
    id: 'gulistan',
    name: 'Gulistan',
    blurb: 'Vintage daisies and roses around a floral name frame',
    region: 'Modern',
    faith: 'muslim',
    isNew: true,
    palette: { primary: '#6B5B4E', accent: '#B98F8A', background: '#F5EFE4', surface: '#FCF9F3', text: '#4A4440' },
    scene: {
      kind: 'vintage-bloom',
      night: false,
      style: 'modern',
      colors: { skyTop: '#F7F2E8', skyBottom: '#EDE3D2', glow: '#FFFFFF', far: '#DCD3BF', mid: '#FCF9F3', midShade: '#B07A72', trim: '#A9B48D', near: '#9AA77F', bloom: ['#EBCBC4', '#B07A72', '#9AA77F', '#E8D8A8'], water: '#E8D8A8' },
    },
    bands: [paper('#F5EFE4', '#4A4440', '#6B5B4E'), paper('#EDE4D4', '#4A4440', '#6B5B4E')],
    fonts: { script: 'Allura', serif: 'Poppins', body: 'Poppins' },
    opening: 'scroll',
    ambient: 'petals',
    divider: 'scallop',
    marker: 'rose',
    music: 'qawwali',
    paint: {},
  },
  {
    id: 'pampas-boho',
    name: 'Pampas Boho',
    blurb: 'Soft dome, dried pampas and fine line flowers',
    region: 'Modern',
    faith: null,
    isNew: true,
    palette: { primary: '#6F5E50', accent: '#B49A7A', background: '#F5F0E8', surface: '#FFFFFF', text: '#2E2A25' },
    scene: {
      kind: 'pampas-arch',
      night: false,
      style: 'modern',
      colors: { skyTop: '#F7F3EC', skyBottom: '#EAE2D4', glow: '#FFFFFF', far: '#E9DFD0', mid: '#E3D6C3', midShade: '#B49A7A', trim: '#8C7A66', near: '#B49A7A', bloom: ['#E3C9B0', '#B49A7A', '#8C7A66', '#E8D8A8'], water: '#E9DFD0' },
    },
    bands: [paper('#F5F0E8', '#2E2A25', '#6F5E50'), paper('#EAE2D4', '#2E2A25', '#6F5E50')],
    fonts: { script: 'Mrs Saint Delafield', serif: 'Didact Gothic', body: 'Didact Gothic' },
    opening: 'scroll',
    ambient: 'none',
    divider: 'line',
    marker: 'leaf',
    music: 'acoustic',
    paint: {},
  },
  {
    id: 'haldi-rasam',
    name: 'Haldi Rasam',
    blurb: 'Turmeric wash, marigold strings and bright blooms',
    region: 'Modern',
    faith: 'hindu',
    isNew: true,
    palette: { primary: '#9A4A0C', accent: '#2F7D32', background: '#FFF6D6', surface: '#FFFCEF', text: '#3A2208' },
    scene: {
      kind: 'haldi-marigold',
      night: false,
      style: 'modern',
      colors: { skyTop: '#FFF8DE', skyBottom: '#FFE89A', glow: '#FFFFFF', far: '#FFD54A', mid: '#F28C0F', midShade: '#FFC93C', trim: '#2F7D32', near: '#2F7D32', bloom: ['#F28C0F', '#FFC93C', '#2F7D32', '#E2553D'], water: '#FFE98A' },
    },
    bands: [paper('#FFF6D6', '#3A2208', '#9A4A0C'), paper('#F9C846', '#3A2208', '#7A2E0A')],
    fonts: { script: 'Ms Madi', serif: 'Montserrat', body: 'Montserrat' },
    opening: 'curtain',
    ambient: 'marigolds',
    divider: 'scallop',
    marker: 'marigold',
    music: 'dhol',
    paint: {},
  },
  {
    id: 'gubbare',
    name: 'Gubbare',
    blurb: 'Bunting, glossy balloons and gift boxes',
    region: 'Birthday',
    faith: null,
    isNew: true,
    palette: { primary: '#1F6F95', accent: '#5FB3D9', background: '#EEF8FD', surface: '#FFFFFF', text: '#163444' },
    scene: {
      kind: 'balloon-party',
      night: false,
      style: 'modern',
      colors: { skyTop: '#F4FAFE', skyBottom: '#CDE8F7', glow: '#FFFFFF', far: '#A9D3EC', mid: '#5FA8D3', midShade: '#2F7FA8', trim: '#2F7FA8', near: '#F6F0E8', bloom: ['#5FA8D3', '#9CCBE6', '#2F7FA8', '#F6F0E8'], water: '#CDE8F7' },
    },
    bands: [paper('#EEF8FD', '#163444', '#1F6F95'), paper('#D8EEF9', '#163444', '#1F6F95')],
    fonts: { script: 'Ephesis', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' },
    opening: 'curtain',
    ambient: 'fairylights',
    divider: 'scallop',
    marker: 'star',
    music: 'acoustic',
    paint: {},
  },
  {
    id: 'sunehri-shaam',
    name: 'Sunehri Shaam',
    blurb: 'Black and gold party with foil balloons and streamers',
    region: 'Party',
    faith: null,
    isNew: true,
    palette: { primary: '#D4A63A', accent: '#F6E2A8', background: '#140C0A', surface: '#211512', text: '#F6EBDD' },
    scene: {
      kind: 'gold-party',
      night: true,
      style: 'modern',
      ink: '#F2D38A',
      colors: { skyTop: '#3A120A', skyBottom: '#0B0706', glow: '#D4A63A', far: '#D4A63A', mid: '#D4A63A', midShade: '#A47A26', trim: '#D4A63A', near: '#D4A63A', bloom: ['#D4A63A', '#E8C66A', '#A47A26', '#F6E2A8'], water: '#211512' },
    },
    bands: [paper('#140C0A', '#F6EBDD', '#D4A63A'), paper('#2A1410', '#F6EBDD', '#F6E2A8')],
    fonts: { script: 'Monsieur La Doulaise', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' },
    opening: 'curtain',
    ambient: 'fireworks',
    divider: 'line',
    marker: 'star',
    music: 'ambient',
    paint: {},
  },
  {
    id: 'chanda-mama',
    name: 'Chanda Mama',
    blurb: 'Crescent moon, stars and soft clouds for little ones',
    region: 'Baby',
    faith: null,
    isNew: true,
    palette: { primary: '#2F5F8F', accent: '#E9B949', background: '#EEF5FC', surface: '#FFFFFF', text: '#1D3550' },
    scene: {
      kind: 'moon-cradle',
      night: false,
      style: 'modern',
      colors: { skyTop: '#D9E9F8', skyBottom: '#F3F8FE', glow: '#FFF6D8', far: '#E9B949', mid: '#FFFFFF', midShade: '#DCE9F6', trim: '#E9B949', near: '#FFFFFF', bloom: ['#F8D57E', '#C08B2C', '#FFFFFF', '#DCE9F6'], water: '#DCE9F6' },
    },
    bands: [paper('#EEF5FC', '#1D3550', '#2F5F8F'), paper('#DCE9F6', '#1D3550', '#2F5F8F')],
    fonts: { script: 'Alex Brush', serif: 'Questrial', body: 'Questrial' },
    opening: 'petals',
    ambient: 'stars',
    divider: 'wave',
    marker: 'star',
    music: 'santoor',
    paint: {},
  },
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
  // ---------------- Occasion packs (Nov 2026) ----------------
  occasionPack({ id: 'haldi-sunshine', name: 'Haldi Sunshine', region: 'Haldi', faith: null, kind: 'haldi-marigold', night: false, primary: '#B5651D', accent: '#F2A900', bg: '#FFF6D6', text: '#4A2C0A', ambient: 'marigolds', opening: 'doors', music: 'dhol', fonts: { script: 'Great Vibes', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' }, marker: 'marigold' }),
  occasionPack({ id: 'mehendi-hands', name: 'Mehendi Hands', region: 'Mehendi', faith: null, kind: 'genda-toran', night: false, primary: '#2F6B3A', accent: '#C9973F', bg: '#EEF4E6', text: '#1E3A24', ambient: 'petals', opening: 'doors', music: 'sitar', fonts: { script: 'Alex Brush', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' }, marker: 'leaf' }),
  occasionPack({ id: 'sangeet-nights', name: 'Sangeet Nights', region: 'Sangeet', faith: null, kind: 'gold-party', night: true, primary: '#D4A63A', accent: '#F6E2A8', bg: '#120B1F', text: '#F6EBDD', ambient: 'fairylights', opening: 'curtain', music: 'dhol', fonts: { script: 'Monsieur La Doulaise', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' }, marker: 'star' }),
  occasionPack({ id: 'ring-promise', name: 'The Promise', region: 'Ring ceremony', faith: null, kind: 'moon-rings', night: true, primary: '#C9A45C', accent: '#F7E2A6', bg: '#1C1712', text: '#F6EBDD', ambient: 'stars', opening: 'seal', music: 'piano', fonts: { script: 'Pinyon Script', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' }, marker: 'star' }),
  occasionPack({ id: 'tilak-kumkum', name: 'Kumkum Tilak', region: 'Tilak', faith: 'hindu', kind: 'temple-court', night: false, primary: '#8E0F1F', accent: '#FFC857', bg: '#FFF3E0', text: '#3B0A10', ambient: 'marigolds', opening: 'doors', music: 'shehnai', fonts: { script: 'Great Vibes', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' }, marker: 'diya' }),
  occasionPack({ id: 'roka-shagun', name: 'Shagun', region: 'Roka', faith: null, kind: 'champa-frame', night: false, primary: '#C2543A', accent: '#E0A93B', bg: '#FFF1E8', text: '#45231A', ambient: 'petals', opening: 'seal', music: 'santoor', fonts: { script: 'Alex Brush', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' }, marker: 'rose' }),
  occasionPack({ id: 'cocktail-hour', name: 'Cocktail Hour', region: 'Cocktail', faith: null, kind: 'art-deco', night: true, primary: '#D4A63A', accent: '#F6E2A8', bg: '#0E0E10', text: '#F4F1EA', ambient: 'fireworks', opening: 'curtain', music: 'strings', fonts: { script: 'Great Vibes', serif: 'Playfair Display', body: 'Poppins' }, marker: 'star' }),
  occasionPack({ id: 'bach-squad', name: 'Bride Squad', region: 'Bachelorette', faith: null, kind: 'balloon-party', night: false, primary: '#D6336C', accent: '#F2A900', bg: '#FFF0F6', text: '#3B1531', ambient: 'fairylights', opening: 'curtain', music: 'acoustic', fonts: { script: 'Dancing Script', serif: 'Playfair Display', body: 'Poppins' }, marker: 'star' }),
  occasionPack({ id: 'one-tiny', name: 'Turning One', region: 'First birthday', faith: null, kind: 'balloon-party', night: false, primary: '#2F6FA3', accent: '#E58FAB', bg: '#EAF4FB', text: '#1D3550', ambient: 'fairylights', opening: 'curtain', music: 'acoustic', fonts: { script: 'Dancing Script', serif: 'Playfair Display', body: 'Poppins' }, marker: 'star' }),
  occasionPack({ id: 'golden-jubilee', name: 'Golden Jubilee', region: 'Milestone birthday', faith: null, kind: 'gold-party', night: true, primary: '#D4AF37', accent: '#F5E6B3', bg: '#0E0E10', text: '#F4F1EA', ambient: 'fireworks', opening: 'curtain', music: 'piano', fonts: { script: 'Pinyon Script', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' }, marker: 'star' }),
  occasionPack({ id: 'kitty-high-tea', name: 'High Tea', region: 'Kitty party', faith: null, kind: 'vintage-bloom', night: false, primary: '#2C8C6E', accent: '#F08A5D', bg: '#EAF8F3', text: '#173A2F', ambient: 'petals', opening: 'envelope', music: 'acoustic', fonts: { script: 'Dancing Script', serif: 'Playfair Display', body: 'Poppins' }, marker: 'rose' }),
  occasionPack({ id: 'grad-capstone', name: 'Capstone', region: 'Graduation', faith: null, kind: 'art-deco', night: true, primary: '#C8A45D', accent: '#E7D3A4', bg: '#0B1A33', text: '#F2F4F8', ambient: 'fireworks', opening: 'curtain', music: 'strings', fonts: { script: 'Great Vibes', serif: 'Playfair Display', body: 'Poppins' }, marker: 'star' }),
  occasionPack({ id: 'farewell-wings', name: 'New Wings', region: 'Farewell', faith: null, kind: 'mountains', night: false, primary: '#3F5577', accent: '#B49A62', bg: '#EEF2F7', text: '#25324A', ambient: 'butterflies', opening: 'envelope', music: 'piano', fonts: { script: 'Dancing Script', serif: 'Playfair Display', body: 'Poppins' }, marker: 'leaf' }),
  occasionPack({ id: 'reunion-polaroid', name: 'Old Friends', region: 'Reunion', faith: null, kind: 'riverside', night: false, primary: '#5A1E0E', accent: '#E8B931', bg: '#F6EDD8', text: '#3A1A0A', ambient: 'fairylights', opening: 'envelope', music: 'acoustic', fonts: { script: 'Dancing Script', serif: 'Playfair Display', body: 'Poppins' }, marker: 'star' }),
  occasionPack({ id: 'katha-kalash', name: 'Katha Kalash', region: 'Satyanarayan katha', faith: 'hindu', kind: 'temple-court', night: false, primary: '#8C1C13', accent: '#FFB627', bg: '#FFF7E6', text: '#3A1206', ambient: 'marigolds', opening: 'doors', music: 'flute', fonts: { script: 'Great Vibes', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' }, marker: 'diya' }),
  occasionPack({ id: 'diwali-diya', name: 'Diya Lights', region: 'Diwali', faith: 'hindu', kind: 'jharokha-night', night: true, primary: '#E9B949', accent: '#FFE29A', bg: '#1A0F24', text: '#FFF6E5', ambient: 'lanterns', opening: 'lanterns', music: 'sitar', fonts: { script: 'Great Vibes', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' }, marker: 'diya' }),
  occasionPack({ id: 'holi-rang', name: 'Rang Barse', region: 'Holi', faith: 'hindu', kind: 'bloom-meadow', night: false, primary: '#D6336C', accent: '#F2A900', bg: '#FFFBF2', text: '#3B1531', ambient: 'petals', opening: 'petals', music: 'dhol', fonts: { script: 'Dancing Script', serif: 'Playfair Display', body: 'Poppins' }, marker: 'marigold' }),
  occasionPack({ id: 'xmas-joy', name: 'Christmas Joy', region: 'Christmas', faith: 'christian', kind: 'mountains', night: true, primary: '#C62828', accent: '#E8B84A', bg: '#0F2A1C', text: '#F4F1EA', ambient: 'stars', opening: 'envelope', music: 'piano', fonts: { script: 'Great Vibes', serif: 'Playfair Display', body: 'Poppins' }, marker: 'star' }),
  occasionPack({ id: 'ny-countdown', name: 'Countdown', region: 'New Year', faith: null, kind: 'art-deco', night: true, primary: '#D4AF37', accent: '#F06292', bg: '#0E0E10', text: '#F4F1EA', ambient: 'fireworks', opening: 'curtain', music: 'strings', fonts: { script: 'Great Vibes', serif: 'Playfair Display', body: 'Poppins' }, marker: 'star' }),
  occasionPack({ id: 'rakhi-dhaga', name: 'Pyara Dhaga', region: 'Raksha Bandhan', faith: 'hindu', kind: 'champa-frame', night: false, primary: '#C2543A', accent: '#E8B84A', bg: '#FFF1E8', text: '#45231A', ambient: 'petals', opening: 'seal', music: 'santoor', fonts: { script: 'Alex Brush', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' }, marker: 'rose' }),
  occasionPack({ id: 'bhaidooj-tika', name: 'Tika', region: 'Bhai Dooj', faith: 'hindu', kind: 'genda-toran', night: false, primary: '#8C1C13', accent: '#FFB627', bg: '#FFF7E6', text: '#3A1206', ambient: 'marigolds', opening: 'doors', music: 'shehnai', fonts: { script: 'Great Vibes', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' }, marker: 'diya' }),
  occasionPack({ id: 'eid-chand', name: 'Chand Raat', region: 'Eid', faith: 'muslim', kind: 'mughal-garden', night: true, primary: '#D4AF37', accent: '#E9D8A6', bg: '#0D3B2E', text: '#F3EBD8', ambient: 'lanterns', opening: 'lanterns', music: 'qawwali', fonts: { script: 'Great Vibes', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' }, marker: 'lantern' }),
  occasionPack({ id: 'garba-raas', name: 'Garba Raas', region: 'Navratri', faith: 'hindu', kind: 'marigold-court', night: true, primary: '#E8336D', accent: '#FFC93C', bg: '#2A0F2E', text: '#FFF3E0', ambient: 'fireworks', opening: 'doors', music: 'dhol', fonts: { script: 'Dancing Script', serif: 'Playfair Display', body: 'Poppins' }, marker: 'marigold' }),
  occasionPack({ id: 'ganpati-bappa', name: 'Ganpati Bappa', region: 'Ganesh Chaturthi', faith: 'hindu', kind: 'temple-court', night: false, primary: '#C2410C', accent: '#FFC93C', bg: '#FFF4E6', text: '#3A1206', ambient: 'marigolds', opening: 'doors', music: 'shehnai', fonts: { script: 'Great Vibes', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' }, marker: 'marigold' }),
  occasionPack({ id: 'lohri-bonfire', name: 'Lohri Di Raat', region: 'Lohri', faith: null, kind: 'haveli', night: true, primary: '#F4511E', accent: '#FFCA28', bg: '#1A0E12', text: '#FFF3E0', ambient: 'fireflies', opening: 'lanterns', music: 'dhol', fonts: { script: 'Dancing Script', serif: 'Playfair Display', body: 'Poppins' }, marker: 'star' }),
  occasionPack({ id: 'patang-utsav', name: 'Patang Utsav', region: 'Sankranti', faith: 'hindu', kind: 'riverside', night: false, primary: '#1E88E5', accent: '#FDD835', bg: '#E7F5FF', text: '#102A43', ambient: 'butterflies', opening: 'petals', music: 'flute', fonts: { script: 'Dancing Script', serif: 'Playfair Display', body: 'Poppins' }, marker: 'star' }),
  occasionPack({ id: 'onam-pookalam', name: 'Pookalam', region: 'Onam', faith: null, kind: 'backwaters', night: false, primary: '#B5891E', accent: '#C62828', bg: '#FBF5EA', text: '#3B2A1A', ambient: 'petals', opening: 'petals', music: 'flute', fonts: { script: 'Great Vibes', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' }, marker: 'lotus' }),
  occasionPack({ id: 'durga-dhak', name: 'Dhak & Shankh', region: 'Durga Puja', faith: 'hindu', kind: 'temple-court', night: true, primary: '#C62828', accent: '#E8B84A', bg: '#2A0808', text: '#FFF1D6', ambient: 'lanterns', opening: 'doors', music: 'shehnai', fonts: { script: 'Great Vibes', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' }, marker: 'lotus' }),
  occasionPack({ id: 'karva-chand', name: 'Chand Dekh', region: 'Karva Chauth', faith: 'hindu', kind: 'moon-rings', night: true, primary: '#F8D57E', accent: '#C9973F', bg: '#0B1A33', text: '#FBEFD9', ambient: 'stars', opening: 'seal', music: 'santoor', fonts: { script: 'Pinyon Script', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' }, marker: 'star' }),
  occasionPack({ id: 'krishna-flute', name: 'Bansuri', region: 'Janmashtami', faith: 'hindu', kind: 'lotus-pond', night: true, primary: '#E8B84A', accent: '#4FC3F7', bg: '#0B1F3A', text: '#F2F4F8', ambient: 'fireflies', opening: 'lanterns', music: 'flute', fonts: { script: 'Great Vibes', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' }, marker: 'lotus' }),
  occasionPack({ id: 'gurpurab-prakash', name: 'Prakash Purab', region: 'Gurpurab', faith: 'sikh', kind: 'lake-palace', night: true, primary: '#F2A900', accent: '#FFE29A', bg: '#0B1A33', text: '#FFF6E5', ambient: 'lanterns', opening: 'lanterns', music: 'ambient', fonts: { script: 'Great Vibes', serif: 'Cormorant Garamond', body: 'Cormorant Garamond' }, marker: 'diya' }),
  occasionPack({ id: 'trip-wanderlust', name: 'Wanderlust', region: 'Trip', faith: null, kind: 'beach-sunset', night: false, primary: '#E07A5F', accent: '#81B29A', bg: '#FFF1E8', text: '#3D1A14', ambient: 'butterflies', opening: 'envelope', music: 'acoustic', fonts: { script: 'Dancing Script', serif: 'Playfair Display', body: 'Poppins' }, marker: 'star' }),
  occasionPack({ id: 'family-voyage', name: 'Family Voyage', region: 'Family trip', faith: null, kind: 'mountains', night: false, primary: '#2C8C6E', accent: '#F2A900', bg: '#EAF8F3', text: '#173A2F', ambient: 'butterflies', opening: 'envelope', music: 'acoustic', fonts: { script: 'Dancing Script', serif: 'Playfair Display', body: 'Poppins' }, marker: 'leaf' }),
  occasionPack({ id: 'holiday-postcard', name: 'Wish You Were Here', region: 'Holidays', faith: null, kind: 'beach-sunset', night: false, primary: '#2F7FA8', accent: '#F08A5D', bg: '#E6F4FC', text: '#163444', ambient: 'butterflies', opening: 'envelope', music: 'acoustic', fonts: { script: 'Dancing Script', serif: 'Playfair Display', body: 'Poppins' }, marker: 'star' }),
];

/** Packs made for one occasion (the free card family of each new occasion shares its id). */
let occasionPacks: Set<string> | null = null;
// Built on first use: the design and site modules import each other (no init-order surprises).
const isOccasionPack = (id: string) => (occasionPacks ??= new Set(Object.values(OCCASION_HEADLINERS))).has(id);

export function getSiteDesign(id: string | null | undefined): SiteDesign | null {
  if (!id) return null;
  return SITE_DESIGNS.find((d) => d.id === id) ?? null;
}

/**
 * Packs for this event: the one matching the card's design family first (same name and art),
 * then the event's own faith, then neutral ones, then the rest. Never hides any.
 */
export function designsFor(eventType: string, community?: string | null, cardDesign?: string | null): SiteDesign[] {
  const faith = faithOf(eventType, community);
  const own = OCCASION_HEADLINERS[eventType];
  // Occasion packs (Diwali, Haldi, trips…) lead for their own occasion and trail for every other.
  const rank = (d: SiteDesign) =>
    cardDesign && d.id === cardDesign ? -2 : d.id === own ? -1 : (d.faith === faith ? 0 : d.faith === null ? 1 : 2) + (isOccasionPack(d.id) ? 3 : 0);
  return SITE_DESIGNS.filter((d) => !isRetiredDesign(d.id)).sort((a, b) => rank(a) - rank(b));
}

/** Plain/minimal packs retired from the picker (Nov 2026). Pages that already use one keep it. */
export const RETIRED_SITE_DESIGNS: readonly SiteDesignId[] = ['modern-minimal', 'pampas-boho', 'mr-mrs'];
export const isRetiredDesign = (id: string | null | undefined) => RETIRED_SITE_DESIGNS.includes(id as SiteDesignId);

/** Every page has a design now (the plain "classic" look is gone): the best one for this event. */
export function defaultDesignFor(eventType: string, community?: string | null, cardDesign?: string | null): SiteDesignId {
  // Layout designs (chat, stories…) are website-only picks, never the automatic default.
  return designsFor(eventType, community, cardDesign).find((d) => !d.layout)!.id;
}

/**
 * Design the video is made from. Layout designs are website-only: their video uses the
 * card's matching cinematic design, else the occasion's default.
 */
export function videoDesignFor(siteDesign: string | null | undefined, eventType: string, community?: string | null, cardDesign?: string | null): SiteDesignId {
  const d = getSiteDesign(siteDesign);
  return d && !d.layout ? d.id : defaultDesignFor(eventType, community, cardDesign);
}

/** Cover text colour over the design's scene. */
export function heroInk(design: SiteDesign): string {
  return design.scene.ink ?? (design.scene.night ? '#FFF8EC' : design.palette.primary);
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
