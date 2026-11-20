import { getLanguage, type LanguageCode } from '../constants/languages.js';
import type { EventCategory } from '../constants/event-types.js';
import { attireFor, faithMotif, markSuitsFaith, sacredMarkOf, type Faith } from '../constants/faith.js';
import type { Theme } from '../templates/types.js';
import { resolveBinding, type DesignData } from './bindings.js';
import { readableOn } from './color.js';
import { detectScript, EDITOR_FONTS, fontSupports } from './fonts.js';
import { DESIGN_H, DESIGN_W, type DesignElement, type PageBackground, type TextEffect, type TextElement } from './schema.js';

export type Palette = Theme['palette'];

export interface RecipeCtx {
  p: Palette;
  data: DesignData;
  language: LanguageCode;
  script: string;
  latin: boolean;
  langFonts: { display: string; body: string };
  eventType: string;
  category: EventCategory;
  people: 0 | 1 | 2;
  /** Whose sacred marks may appear (see constants/faith.ts). */
  faith: Faith;
  /** The family's tradition (picks regional couple attire). */
  community?: string | null;
}

export type Role =
  | 'invocation'
  | 'eyebrow'
  | 'headline'
  | 'names'
  | 'name'
  | 'connector'
  | 'detail'
  | 'host'
  | 'body'
  | 'date'
  | 'venue'
  | 'small'
  | 'big';

export interface RoleStyle {
  font: string;
  /** Font used when the invitation language isn't Latin script. */
  indic?: 'display' | 'body';
  size: number;
  weight?: number;
  italic?: boolean;
  upper?: boolean;
  ls?: number;
  lh?: number;
  tone?: Tone;
  effect?: TextEffect;
  /** Devanagari face for Hindi/Marathi text in this role (keeps the template's personality). */
  deva?: string;
}
export type Tone = 'ink' | 'accent' | 'muted';
export type TypeSet = Record<Role, RoleStyle>;
export interface Tones {
  ink: string;
  accent: string;
  muted: string;
}

export type Band =
  | { t: 'text'; role: Role; bind?: string; text?: string; size?: number; tone?: Tone; gap?: number; width?: number; effect?: TextEffect; font?: string; group?: string }
  | { t: 'art'; asset: string; w: number; h: number; colors?: string[]; opts?: Record<string, string | number | boolean>; gap?: number; anim?: 'drop' | 'zoom' | 'fade'; group?: string }
  | { t: 'divider'; style?: string; w?: number; gap?: number }
  | { t: 'date'; style: DateStyle; gap?: number }
  | { t: 'photo'; w: number; h: number; mask: 'circle' | 'arch' | 'rounded'; gap?: number }
  | { t: 'gap'; h: number };

/** strip: WEEKDAY — 14 — MONTH YEAR; bars: MONTH / WEEKDAY | 14 | TIME / YEAR. */
export type DateStyle = 'strip' | 'line' | 'stack' | 'boxed' | 'bars';

export interface Zone {
  top: number;
  bottom: number;
  left: number;
  right: number;
  /** Editorial layouts set the text flush left. */
  align?: 'left' | 'center';
}

// ---------------------------------------------------------------- type sets

const r = (font: string, size: number, rest: Partial<RoleStyle> = {}): RoleStyle => ({ font, size, ...rest });

const RAW_TYPE_SETS = {
  /** Gold calligraphy names, Cinzel caps, Cormorant body. */
  royal: {
    invocation: r('Cinzel', 30, { tone: 'accent', ls: 0.12, indic: 'display' }),
    eyebrow: r('Cinzel', 30, { upper: true, ls: 0.32, tone: 'accent', indic: 'body' }),
    headline: r('Cinzel', 44, { upper: true, ls: 0.22, tone: 'accent', weight: 600, indic: 'display' }),
    names: r('Great Vibes', 150, { tone: 'accent', effect: 'gold', lh: 1.05, indic: 'display' }),
    name: r('Great Vibes', 170, { tone: 'accent', effect: 'gold', lh: 1.05, indic: 'display' }),
    connector: r('Cormorant Garamond', 54, { italic: true, tone: 'ink', indic: 'body' }),
    detail: r('Cormorant Garamond', 30, { italic: true, tone: 'muted', lh: 1.3, indic: 'body' }),
    host: r('Cormorant Garamond', 38, { tone: 'ink', lh: 1.35, indic: 'body' }),
    body: r('Cormorant Garamond', 34, { tone: 'ink', lh: 1.4, indic: 'body' }),
    date: r('Cinzel', 34, { tone: 'accent', ls: 0.12, weight: 600, indic: 'display' }),
    venue: r('Cormorant Garamond', 38, { tone: 'ink', weight: 600, lh: 1.3, indic: 'body' }),
    small: r('Cormorant Garamond', 28, { tone: 'muted', lh: 1.35, indic: 'body' }),
    big: r('Cinzel', 96, { tone: 'accent', weight: 600, indic: 'display' }),
  },
  /** Timeless serif: Playfair names, Lora body. */
  classic: {
    invocation: r('Lora', 30, { italic: true, tone: 'accent', indic: 'display' }),
    eyebrow: r('Lora', 28, { upper: true, ls: 0.28, tone: 'muted', indic: 'body' }),
    headline: r('Playfair Display', 52, { tone: 'accent', italic: true, indic: 'display' }),
    names: r('Playfair Display', 112, { tone: 'ink', lh: 1.05, indic: 'display' }),
    name: r('Playfair Display', 140, { tone: 'ink', lh: 1.05, indic: 'display' }),
    connector: r('Playfair Display', 50, { italic: true, tone: 'accent', indic: 'body' }),
    detail: r('Lora', 28, { italic: true, tone: 'muted', lh: 1.35, indic: 'body' }),
    host: r('Lora', 34, { tone: 'ink', lh: 1.4, indic: 'body' }),
    body: r('Lora', 32, { tone: 'ink', lh: 1.45, indic: 'body' }),
    date: r('Playfair Display', 38, { tone: 'accent', indic: 'display' }),
    venue: r('Lora', 34, { tone: 'ink', weight: 600, lh: 1.3, indic: 'body' }),
    small: r('Lora', 27, { tone: 'muted', lh: 1.4, indic: 'body' }),
    big: r('Playfair Display', 100, { tone: 'accent', indic: 'display' }),
  },
  /** Fine copperplate script + Garamond: soft, romantic. */
  script: {
    invocation: r('EB Garamond', 30, { tone: 'accent', italic: true, indic: 'display' }),
    eyebrow: r('EB Garamond', 28, { upper: true, ls: 0.3, tone: 'muted', indic: 'body' }),
    headline: r('Pinyon Script', 72, { tone: 'accent', indic: 'display' }),
    names: r('Pinyon Script', 132, { tone: 'ink', lh: 1.1, indic: 'display' }),
    name: r('Pinyon Script', 160, { tone: 'ink', lh: 1.1, indic: 'display' }),
    connector: r('EB Garamond', 46, { italic: true, tone: 'accent', indic: 'body' }),
    detail: r('EB Garamond', 28, { italic: true, tone: 'muted', lh: 1.35, indic: 'body' }),
    host: r('EB Garamond', 34, { tone: 'ink', lh: 1.4, indic: 'body' }),
    body: r('EB Garamond', 33, { tone: 'ink', lh: 1.45, indic: 'body' }),
    date: r('EB Garamond', 36, { tone: 'accent', upper: true, ls: 0.18, indic: 'display' }),
    venue: r('EB Garamond', 34, { tone: 'ink', weight: 600, lh: 1.3, indic: 'body' }),
    small: r('EB Garamond', 27, { tone: 'muted', lh: 1.4, indic: 'body' }),
    big: r('EB Garamond', 104, { tone: 'accent', indic: 'display' }),
  },
  /** Editorial modern: Bodoni names, Montserrat spaced caps. */
  modern: {
    invocation: r('Montserrat', 22, { upper: true, ls: 0.4, tone: 'accent', indic: 'body' }),
    eyebrow: r('Montserrat', 24, { upper: true, ls: 0.42, tone: 'accent', weight: 500, indic: 'body' }),
    headline: r('Montserrat', 30, { upper: true, ls: 0.4, tone: 'ink', weight: 500, indic: 'display' }),
    names: r('Bodoni Moda', 112, { tone: 'ink', lh: 1, indic: 'display' }),
    name: r('Bodoni Moda', 140, { tone: 'ink', lh: 1, indic: 'display' }),
    connector: r('Bodoni Moda', 46, { italic: true, tone: 'accent', indic: 'body' }),
    detail: r('Montserrat', 22, { tone: 'muted', lh: 1.5, indic: 'body' }),
    host: r('Montserrat', 27, { tone: 'ink', lh: 1.6, indic: 'body' }),
    body: r('Montserrat', 26, { tone: 'ink', lh: 1.6, indic: 'body' }),
    date: r('Montserrat', 30, { upper: true, ls: 0.3, tone: 'ink', weight: 600, indic: 'display' }),
    venue: r('Montserrat', 27, { tone: 'ink', weight: 600, upper: true, ls: 0.16, lh: 1.5, indic: 'body' }),
    small: r('Montserrat', 23, { tone: 'muted', lh: 1.5, indic: 'body' }),
    big: r('Bodoni Moda', 110, { tone: 'accent', indic: 'display' }),
  },
  /** Art-deco caps: Marcellus + Tenor Sans, Italiana names. */
  deco: {
    invocation: r('Marcellus', 28, { tone: 'accent', ls: 0.14, indic: 'display' }),
    eyebrow: r('Tenor Sans', 26, { upper: true, ls: 0.4, tone: 'accent', indic: 'body' }),
    headline: r('Marcellus', 40, { upper: true, ls: 0.3, tone: 'accent', indic: 'display' }),
    names: r('Italiana', 116, { tone: 'ink', lh: 1.05, effect: 'gold', indic: 'display' }),
    name: r('Italiana', 140, { tone: 'ink', lh: 1.05, effect: 'gold', indic: 'display' }),
    connector: r('Marcellus', 40, { tone: 'accent', indic: 'body' }),
    detail: r('Tenor Sans', 24, { tone: 'muted', lh: 1.45, indic: 'body' }),
    host: r('Tenor Sans', 29, { tone: 'ink', lh: 1.55, indic: 'body' }),
    body: r('Tenor Sans', 28, { tone: 'ink', lh: 1.55, indic: 'body' }),
    date: r('Marcellus', 34, { upper: true, ls: 0.2, tone: 'accent', indic: 'display' }),
    venue: r('Tenor Sans', 29, { tone: 'ink', upper: true, ls: 0.14, lh: 1.45, indic: 'body' }),
    small: r('Tenor Sans', 24, { tone: 'muted', lh: 1.45, indic: 'body' }),
    big: r('Marcellus', 104, { tone: 'accent', indic: 'display' }),
  },
  /** Kids and parties: rounded, bouncy. */
  playful: {
    invocation: r('Fredoka', 30, { tone: 'accent', weight: 500, indic: 'body' }),
    eyebrow: r('Fredoka', 34, { tone: 'accent', weight: 600, ls: 0.06, indic: 'body' }),
    headline: r('Fredoka', 64, { tone: 'accent', weight: 700, lh: 1.05, indic: 'display' }),
    names: r('Pacifico', 104, { tone: 'ink', lh: 1.2, indic: 'display' }),
    name: r('Pacifico', 128, { tone: 'ink', lh: 1.2, effect: 'shadow', indic: 'display' }),
    connector: r('Fredoka', 44, { tone: 'accent', weight: 500, indic: 'body' }),
    detail: r('Fredoka', 32, { tone: 'muted', weight: 500, lh: 1.3, indic: 'body' }),
    host: r('Fredoka', 34, { tone: 'ink', lh: 1.35, indic: 'body' }),
    body: r('Fredoka', 32, { tone: 'ink', lh: 1.4, indic: 'body' }),
    date: r('Fredoka', 38, { tone: 'accent', weight: 600, indic: 'display' }),
    venue: r('Fredoka', 34, { tone: 'ink', weight: 600, lh: 1.3, indic: 'body' }),
    small: r('Fredoka', 28, { tone: 'muted', lh: 1.35, indic: 'body' }),
    big: r('Fredoka', 150, { tone: 'accent', weight: 700, effect: 'shadow', indic: 'display' }),
  },
  /** Desi festive: Rozha One headings, Yatra One accents, Mukta body. */
  desi: {
    invocation: r('Yatra One', 34, { tone: 'accent', indic: 'display' }),
    eyebrow: r('Mukta', 30, { tone: 'accent', weight: 600, ls: 0.1, indic: 'body' }),
    headline: r('Rozha One', 76, { tone: 'accent', lh: 1.1, effect: 'gold', indic: 'display' }),
    names: r('Rozha One', 100, { tone: 'ink', lh: 1.1, indic: 'display' }),
    name: r('Rozha One', 120, { tone: 'ink', lh: 1.1, indic: 'display' }),
    connector: r('Yatra One', 46, { tone: 'accent', indic: 'body' }),
    detail: r('Mukta', 30, { tone: 'muted', lh: 1.35, indic: 'body' }),
    host: r('Mukta', 34, { tone: 'ink', lh: 1.45, indic: 'body' }),
    body: r('Mukta', 32, { tone: 'ink', lh: 1.45, indic: 'body' }),
    date: r('Yatra One', 40, { tone: 'accent', indic: 'display' }),
    venue: r('Mukta', 34, { tone: 'ink', weight: 700, lh: 1.35, indic: 'body' }),
    small: r('Mukta', 28, { tone: 'muted', lh: 1.4, indic: 'body' }),
    big: r('Rozha One', 110, { tone: 'accent', indic: 'display' }),
  },
  /** Corporate: clean sans, strong hierarchy. */
  corporate: {
    invocation: r('Montserrat', 24, { upper: true, ls: 0.3, tone: 'accent', weight: 600, indic: 'body' }),
    eyebrow: r('Montserrat', 26, { upper: true, ls: 0.34, tone: 'accent', weight: 600, indic: 'body' }),
    headline: r('DM Serif Display', 92, { tone: 'ink', lh: 1.05, indic: 'display' }),
    names: r('DM Serif Display', 96, { tone: 'ink', lh: 1.05, indic: 'display' }),
    name: r('DM Serif Display', 110, { tone: 'ink', lh: 1.05, indic: 'display' }),
    connector: r('Montserrat', 34, { tone: 'accent', indic: 'body' }),
    detail: r('Montserrat', 26, { tone: 'muted', lh: 1.5, indic: 'body' }),
    host: r('Montserrat', 30, { tone: 'ink', lh: 1.55, indic: 'body' }),
    body: r('Montserrat', 29, { tone: 'ink', lh: 1.55, indic: 'body' }),
    date: r('Montserrat', 32, { tone: 'accent', weight: 700, upper: true, ls: 0.14, indic: 'display' }),
    venue: r('Montserrat', 30, { tone: 'ink', weight: 600, lh: 1.45, indic: 'body' }),
    small: r('Montserrat', 25, { tone: 'muted', lh: 1.5, indic: 'body' }),
    big: r('DM Serif Display', 110, { tone: 'accent', indic: 'display' }),
  },
  // ---- Atelier collection (Nov 2026): type matched to the reference invitations ----
  /** Maroon arch + lanterns: Monsieur La Doulaise swash names, Cormorant Garamond text and caps. */
  mahal: {
    invocation: r('Cormorant Garamond', 32, { tone: 'accent', ls: 0.06, indic: 'display' }),
    eyebrow: r('Cormorant Garamond', 30, { upper: true, ls: 0.26, tone: 'accent', weight: 500, indic: 'body' }),
    headline: r('Cormorant Garamond', 46, { upper: true, ls: 0.2, tone: 'accent', weight: 600, indic: 'display' }),
    names: r('Monsieur La Doulaise', 150, { tone: 'accent', lh: 1.12, indic: 'display' }),
    name: r('Monsieur La Doulaise', 172, { tone: 'accent', lh: 1.12, indic: 'display' }),
    connector: r('Monsieur La Doulaise', 84, { tone: 'accent', lh: 1, indic: 'body' }),
    detail: r('Cormorant Garamond', 30, { italic: true, tone: 'muted', lh: 1.3, indic: 'body' }),
    host: r('Cormorant Garamond', 38, { tone: 'ink', lh: 1.35, indic: 'body' }),
    body: r('Cormorant Garamond', 38, { italic: true, tone: 'ink', lh: 1.35, indic: 'body' }),
    date: r('Cormorant Garamond', 34, { upper: true, ls: 0.16, tone: 'ink', weight: 500, indic: 'display' }),
    venue: r('Cormorant Garamond', 34, { upper: true, ls: 0.08, tone: 'ink', weight: 500, lh: 1.35, indic: 'body' }),
    small: r('Cormorant Garamond', 30, { italic: true, tone: 'muted', lh: 1.35, indic: 'body' }),
    big: r('Cormorant Garamond', 108, { tone: 'ink', weight: 500, indic: 'display' }),
  },
  /** Lavender garden: Alex Brush gold names, Questrial (geometric sans) for everything else. */
  garden: {
    invocation: r('Questrial', 24, { tone: 'accent', ls: 0.16, upper: true, indic: 'display' }),
    eyebrow: r('Questrial', 36, { tone: 'ink', ls: 0.04, lh: 1.35, indic: 'body' }),
    headline: r('Questrial', 38, { upper: true, ls: 0.24, tone: 'ink', indic: 'display' }),
    names: r('Alex Brush', 140, { tone: 'accent', effect: 'gold', lh: 1.1, indic: 'display' }),
    name: r('Alex Brush', 164, { tone: 'accent', effect: 'gold', lh: 1.1, indic: 'display' }),
    connector: r('Alex Brush', 90, { tone: 'accent', effect: 'gold', lh: 1, indic: 'body' }),
    detail: r('Questrial', 24, { tone: 'muted', lh: 1.45, indic: 'body' }),
    host: r('Questrial', 30, { tone: 'ink', lh: 1.5, indic: 'body' }),
    body: r('Questrial', 30, { tone: 'ink', lh: 1.5, indic: 'body' }),
    date: r('Questrial', 32, { upper: true, ls: 0.14, tone: 'ink', indic: 'display' }),
    venue: r('Questrial', 32, { tone: 'ink', lh: 1.45, indic: 'body' }),
    small: r('Questrial', 26, { tone: 'muted', lh: 1.45, indic: 'body' }),
    big: r('Questrial', 124, { tone: 'ink', indic: 'display' }),
  },
  /** Blue watercolour: Ms Madi signature-brush names, Montserrat caps and text. */
  brush: {
    invocation: r('Montserrat', 22, { upper: true, ls: 0.36, tone: 'accent', indic: 'body' }),
    eyebrow: r('Montserrat', 26, { upper: true, ls: 0.3, tone: 'ink', weight: 500, indic: 'body' }),
    headline: r('Montserrat', 30, { upper: true, ls: 0.3, tone: 'ink', weight: 500, indic: 'display' }),
    names: r('Ms Madi', 172, { tone: 'accent', lh: 1.05, indic: 'display' }),
    name: r('Ms Madi', 196, { tone: 'accent', lh: 1.05, indic: 'display' }),
    connector: r('Ms Madi', 64, { tone: 'accent', lh: 1, indic: 'body' }),
    detail: r('Montserrat', 22, { tone: 'muted', lh: 1.5, indic: 'body' }),
    host: r('Montserrat', 28, { tone: 'ink', lh: 1.55, indic: 'body' }),
    body: r('Montserrat', 28, { tone: 'ink', lh: 1.55, indic: 'body' }),
    date: r('Montserrat', 30, { upper: true, ls: 0.12, tone: 'accent', weight: 700, indic: 'display' }),
    venue: r('Montserrat', 28, { tone: 'ink', lh: 1.5, indic: 'body' }),
    small: r('Montserrat', 24, { tone: 'muted', lh: 1.5, indic: 'body' }),
    big: r('Montserrat', 76, { tone: 'accent', weight: 700, indic: 'display' }),
  },
  /** Pink roses + gold ring: Cormorant caps names, Italianno connector, Cormorant text. */
  petal: {
    invocation: r('Cormorant', 30, { italic: true, tone: 'accent', indic: 'display' }),
    eyebrow: r('Cormorant', 32, { upper: true, ls: 0.12, tone: 'ink', weight: 500, lh: 1.3, indic: 'body' }),
    headline: r('Cormorant', 44, { upper: true, ls: 0.2, tone: 'ink', weight: 500, indic: 'display' }),
    names: r('Cormorant', 124, { upper: true, ls: 0.06, tone: 'ink', lh: 1.05, indic: 'display' }),
    name: r('Cormorant', 140, { upper: true, ls: 0.06, tone: 'ink', lh: 1.05, indic: 'display' }),
    connector: r('Italianno', 92, { tone: 'ink', lh: 0.9, indic: 'body' }),
    detail: r('Cormorant', 28, { italic: true, tone: 'muted', lh: 1.35, indic: 'body' }),
    host: r('Cormorant', 32, { upper: true, ls: 0.1, tone: 'ink', weight: 500, lh: 1.4, indic: 'body' }),
    body: r('Cormorant', 36, { tone: 'ink', lh: 1.4, indic: 'body' }),
    date: r('Cormorant', 36, { upper: true, ls: 0.16, tone: 'ink', weight: 500, indic: 'display' }),
    venue: r('Cormorant', 34, { upper: true, ls: 0.1, tone: 'ink', weight: 500, lh: 1.35, indic: 'body' }),
    small: r('Cormorant', 30, { tone: 'muted', lh: 1.4, indic: 'body' }),
    big: r('Cormorant', 112, { tone: 'ink', weight: 500, indic: 'display' }),
  },
  /** Regal heritage: Imperial Script gold names, Forum caps, Cormorant Garamond text. */
  regal: {
    invocation: r('Forum', 30, { tone: 'accent', ls: 0.12, indic: 'display' }),
    eyebrow: r('Forum', 28, { upper: true, ls: 0.34, tone: 'accent', indic: 'body' }),
    headline: r('Forum', 48, { upper: true, ls: 0.22, tone: 'accent', indic: 'display' }),
    names: r('Imperial Script', 140, { tone: 'accent', effect: 'gold', lh: 1.1, indic: 'display' }),
    name: r('Imperial Script', 164, { tone: 'accent', effect: 'gold', lh: 1.1, indic: 'display' }),
    connector: r('Forum', 46, { tone: 'ink', indic: 'body' }),
    detail: r('Cormorant Garamond', 30, { italic: true, tone: 'muted', lh: 1.3, indic: 'body' }),
    host: r('Cormorant Garamond', 36, { tone: 'ink', lh: 1.4, indic: 'body' }),
    body: r('Cormorant Garamond', 34, { italic: true, tone: 'ink', lh: 1.4, indic: 'body' }),
    date: r('Forum', 34, { upper: true, ls: 0.18, tone: 'accent', indic: 'display' }),
    venue: r('Forum', 32, { upper: true, ls: 0.12, tone: 'ink', lh: 1.4, indic: 'body' }),
    small: r('Cormorant Garamond', 29, { italic: true, tone: 'muted', lh: 1.35, indic: 'body' }),
    big: r('Forum', 108, { tone: 'accent', indic: 'display' }),
  },
  /** Boho modern: Mrs Saint Delafield names, Didact Gothic text. */
  boho: {
    invocation: r('Didact Gothic', 22, { upper: true, ls: 0.34, tone: 'accent', indic: 'body' }),
    eyebrow: r('Didact Gothic', 24, { upper: true, ls: 0.38, tone: 'accent', indic: 'body' }),
    headline: r('Didact Gothic', 32, { upper: true, ls: 0.36, tone: 'ink', indic: 'display' }),
    names: r('Mrs Saint Delafield', 150, { tone: 'ink', lh: 1.15, indic: 'display' }),
    name: r('Mrs Saint Delafield', 176, { tone: 'ink', lh: 1.15, indic: 'display' }),
    connector: r('Mrs Saint Delafield', 80, { tone: 'accent', lh: 1, indic: 'body' }),
    detail: r('Didact Gothic', 23, { tone: 'muted', lh: 1.5, indic: 'body' }),
    host: r('Didact Gothic', 27, { tone: 'ink', lh: 1.6, indic: 'body' }),
    body: r('Didact Gothic', 27, { tone: 'ink', lh: 1.6, indic: 'body' }),
    date: r('Didact Gothic', 28, { upper: true, ls: 0.24, tone: 'ink', indic: 'display' }),
    venue: r('Didact Gothic', 27, { upper: true, ls: 0.14, tone: 'ink', lh: 1.5, indic: 'body' }),
    small: r('Didact Gothic', 24, { tone: 'muted', lh: 1.5, indic: 'body' }),
    big: r('Didact Gothic', 110, { tone: 'accent', indic: 'display' }),
  },
} satisfies Record<string, TypeSet>;
export type TypeSetKey = keyof typeof RAW_TYPE_SETS;

/**
 * Hindi/Marathi pairing for every type set: a calligraphic face for names, a display face
 * for headings and dates, and a text face for the rest. A Hindi card then keeps the template's
 * mood (swashy, royal, editorial, playful) instead of falling back to one generic font.
 */
export const DEVA_PAIRS: Record<TypeSetKey, { script: string; display: string; body: string }> = {
  royal: { script: 'Amita', display: 'Kurale', body: 'Sura' },
  classic: { script: 'Tiro Devanagari Sanskrit', display: 'Tiro Devanagari Sanskrit', body: 'Noto Serif Devanagari' },
  script: { script: 'Amita', display: 'Kurale', body: 'Sahitya' },
  modern: { script: 'Vesper Libre', display: 'Akshar', body: 'Palanquin' },
  deco: { script: 'Rhodium Libre', display: 'Rajdhani', body: 'Khula' },
  playful: { script: 'Modak', display: 'Baloo 2', body: 'Baloo 2' },
  desi: { script: 'Rozha One', display: 'Yatra One', body: 'Mukta' },
  corporate: { script: 'Vesper Libre', display: 'Akshar', body: 'Anek Devanagari' },
  mahal: { script: 'Amita', display: 'Tiro Devanagari Sanskrit', body: 'Sura' },
  garden: { script: 'Arya', display: 'Akshar', body: 'Palanquin' },
  brush: { script: 'Kalam', display: 'Khula', body: 'Khula' },
  petal: { script: 'Rozha One', display: 'Tiro Devanagari Hindi', body: 'Noto Serif Devanagari' },
  regal: { script: 'Kurale', display: 'Rhodium Libre', body: 'Sahitya' },
  boho: { script: 'Dekko', display: 'Biryani', body: 'Karma' },
};

const SCRIPT_ROLES = new Set<Role>(['names', 'name', 'connector']);
const DISPLAY_ROLES = new Set<Role>(['headline', 'invocation', 'date', 'big']);

function withDeva(ts: TypeSet, pair: { script: string; display: string; body: string }): TypeSet {
  const out = {} as TypeSet;
  for (const role of Object.keys(ts) as Role[]) {
    out[role] = { ...ts[role], deva: ts[role].deva ?? (SCRIPT_ROLES.has(role) ? pair.script : DISPLAY_ROLES.has(role) ? pair.display : pair.body) };
  }
  return out;
}

export const TYPE_SETS = Object.fromEntries(
  (Object.keys(RAW_TYPE_SETS) as TypeSetKey[]).map((k) => [k, withDeva(RAW_TYPE_SETS[k], DEVA_PAIRS[k])]),
) as Record<TypeSetKey, TypeSet>;

// ---------------------------------------------------------------- helpers

export function tonesFor(bg: string, p: Palette): Tones {
  const ink = readableOn(bg, [p.text, p.primary, p.background]);
  return {
    ink,
    accent: readableOn(bg, [p.primary, p.accent, ink], 3),
    muted: readableOn(bg, [p.muted, ink], 3.2),
  };
}

export function makeCtx(input: {
  p: Palette;
  data: DesignData;
  language: LanguageCode;
  eventType: string;
  category: EventCategory;
  people: 0 | 1 | 2;
  faith?: Faith;
  community?: string | null;
}): RecipeCtx {
  const lang = getLanguage(input.language);
  return { ...input, faith: input.faith ?? 'hindu', script: lang.script, latin: lang.script === 'Latn', langFonts: lang.fonts };
}

const GROUP_WIDTH: Record<string, number> = { script: 0.38, serif: 0.5, display: 0.56, sans: 0.58, fun: 0.56, indic: 0.6 };
const SCRIPT_LIKE = new Set(['Great Vibes', 'Pinyon Script', 'Parisienne', 'Allura', 'Alex Brush', 'Tangerine', 'Sacramento', 'Pacifico', 'Italiana']);

/** Rough average glyph width as a fraction of font size (for layout estimates only). */
function glyphWidth(font: string, upper: boolean, ls: number): number {
  const g = EDITOR_FONTS.find((f) => f.family === font)?.group ?? 'serif';
  let k = SCRIPT_LIKE.has(font) ? GROUP_WIDTH.script! : (GROUP_WIDTH[g] ?? 0.52);
  if (upper) k *= 1.22;
  return k + ls;
}

export function estimateTextHeight(text: string, size: number, width: number, font: string, upper = false, ls = 0, lh = 1.2): number {
  const k = glyphWidth(font, upper, ls);
  const perLine = Math.max(1, Math.floor(width / (size * k)));
  const lines = text.split('\n').reduce((n, para) => n + Math.max(1, Math.ceil([...para].length / perLine)), 0);
  return lines * size * lh;
}

let seq = 0;
export const resetIds = () => {
  seq = 0;
};
/**
 * The template's own font when it can draw the invitation's script; for Hindi/Marathi the type
 * set's Devanagari pairing; otherwise the language's font.
 */
export function roleFont(style: RoleStyle, ctx: Pick<RecipeCtx, 'latin' | 'script' | 'langFonts'>): string {
  if (ctx.latin) return style.font;
  if (ctx.script === 'Deva' && style.deva) return style.deva;
  if (fontSupports(style.font, ctx.script)) return style.font;
  return style.indic === 'body' ? ctx.langFonts.body : ctx.langFonts.display;
}

/** A band's explicit font only when it can draw its text (a Latin script face can't write Hindi). */
function fontFor(explicit: string | undefined, style: RoleStyle, ctx: RecipeCtx, text: string): string {
  const script = detectScript(text);
  if (explicit && fontSupports(explicit, script)) return explicit;
  // English words on a Hindi card (names typed in English) keep the template's Latin face;
  // the renderer still falls back per script if the text is later changed to Hindi.
  if (!ctx.latin && script === 'Latn' && /[A-Za-z]/.test(text)) return style.font;
  return roleFont(style, ctx);
}

export const nextId = (prefix = 'e') => `${prefix}${(seq++).toString(36)}`;

export function textEl(
  style: RoleStyle,
  ctx: RecipeCtx,
  tones: Tones,
  o: { x: number; y: number; w: number; h: number; text: string; bind?: string; size?: number; tone?: Tone; effect?: TextEffect; align?: 'left' | 'center' | 'right'; font?: string; group?: string },
): TextElement {
  const font = fontFor(o.font, style, ctx, o.text);
  return {
    id: nextId('t'),
    type: 'text',
    x: o.x,
    y: o.y,
    w: o.w,
    h: o.h,
    rot: 0,
    opacity: 1,
    auto: true,
    text: o.text,
    bind: o.bind,
    font,
    size: Math.round(o.size ?? style.size),
    weight: style.weight ?? 400,
    italic: ctx.latin ? (style.italic ?? false) : false,
    color: tones[o.tone ?? style.tone ?? 'ink'],
    align: o.align ?? 'center',
    lh: style.lh ?? 1.25,
    ls: ctx.latin ? (style.ls ?? 0) : 0,
    upper: ctx.latin ? (style.upper ?? false) : false,
    effect: o.effect ?? style.effect ?? 'none',
    fit: true,
    ...(o.group ? { group: o.group } : {}),
  };
}

export function artEl(asset: string, x: number, y: number, w: number, h: number, colors: string[] = [], extra: Partial<Extract<DesignElement, { type: 'art' }>> = {}): DesignElement {
  return { id: nextId('a'), type: 'art', asset, x, y, w, h, rot: 0, opacity: 1, colors, auto: true, ...extra };
}

export function shapeEl(shape: 'rect' | 'ellipse' | 'line', x: number, y: number, w: number, h: number, o: { fill?: string | null; fillOpacity?: number; stroke?: string | null; strokeW?: number; radius?: number; opacity?: number } = {}): DesignElement {
  return {
    id: nextId('s'),
    type: 'shape',
    shape,
    x,
    y,
    w,
    h,
    rot: 0,
    opacity: o.opacity ?? 1,
    fill: o.fill ?? null,
    fillOpacity: o.fillOpacity ?? 1,
    stroke: o.stroke ?? null,
    strokeW: o.strokeW ?? 0,
    radius: o.radius ?? 0,
    auto: true,
  };
}

export const fullPage = (asset: string, colors: string[] = [], opts?: Record<string, string | number | boolean>, extra: Partial<Extract<DesignElement, { type: 'art' }>> = {}) =>
  artEl(asset, 0, 0, DESIGN_W, DESIGN_H, colors, { opts, locked: true, ...extra });

export function solidBg(color: string, color2?: string, gradient: PageBackground['gradient'] = color2 ? 'radial' : 'none', pattern: PageBackground['pattern'] = 'none', patternColor?: string, patternOpacity = 0.14): PageBackground {
  return { color, color2, gradient, pattern, patternColor, patternAccent: patternColor, patternOpacity, image: null };
}

// ---------------------------------------------------------------- stacking

interface Placed {
  h: number;
  gap: number;
  make: (y: number) => DesignElement[];
}

/**
 * Lays bands out top-to-bottom inside `zone`, shrinking everything proportionally when it
 * doesn't fit and spreading leftover space so the card always looks composed.
 */
export function stack(bands: Band[], zone: Zone, ctx: RecipeCtx, ts: TypeSet, tones: Tones, dividerColors?: string[]): DesignElement[] {
  const zw = DESIGN_W - zone.left - zone.right;
  const avail = DESIGN_H - zone.top - zone.bottom;
  const cx = zone.left + zw / 2;
  const left = zone.align === 'left';
  /** x of a box of width w: centred, or flush with the zone's left edge. */
  const at = (w: number) => (left ? zone.left : cx - w / 2);

  const visible = faithBands(bands, ctx.faith, ctx.community).filter((b) => {
    if (b.t !== 'text') return true;
    const value = b.bind ? resolveBinding(b.bind, ctx.data) : b.text;
    return Boolean(value && value.trim());
  });

  const plan = (k: number): Placed[] =>
    visible.map((b): Placed => {
      const gap = ('gap' in b && b.gap !== undefined ? b.gap : 26) * Math.min(1, k + 0.15);
      switch (b.t) {
        case 'gap':
          return { h: b.h * k, gap: 0, make: () => [] };
        case 'text': {
          const style = ts[b.role];
          const value = (b.bind ? resolveBinding(b.bind, ctx.data) : b.text) ?? '';
          const w = zw * (b.width ?? 1);
          const font = fontFor(b.font, style, ctx, value);
          const upper = ctx.latin && (style.upper ?? false);
          const ls = ctx.latin ? (style.ls ?? 0) : 0;
          let size = (b.size ?? style.size) * k;
          // Names should stay on one line where possible.
          if (b.role === 'names' || b.role === 'name' || b.role === 'big') {
            const one = w / (Math.max(1, [...value].length) * glyphWidth(font, upper, ls));
            size = Math.max(size * 0.55, Math.min(size, one));
          }
          const lh = style.lh ?? 1.25;
          const h = estimateTextHeight(value, size, w, font, upper, ls, lh) * 1.08;
          return {
            h,
            gap,
            make: (y) => [textEl(style, ctx, tones, { x: at(w), y, w, h, text: value, bind: b.bind, size, tone: b.tone, effect: b.effect, font: b.font, group: b.group, align: left ? 'left' : 'center' })],
          };
        }
        case 'art': {
          const w = b.w * k;
          const h = b.h * k;
          return { h, gap, make: (y) => [artEl(b.asset, at(w), y, w, h, b.colors, { opts: b.opts, anim: b.anim, ...(b.group ? { group: b.group } : {}) })] };
        }
        case 'photo': {
          // No photo yet: a line-art illustration keeps the card complete (the editor can swap in a photo).
          if (!ctx.data.photos[0]) {
            const aw = (ctx.people === 2 ? 340 : 300) * k;
            const ah = ctx.people === 2 ? aw * 1.25 : aw;
            const asset = ctx.people === 2 ? 'couple' : 'wreath';
            return {
              h: ah,
              gap,
              make: (y) => [artEl(asset, at(aw), y, aw, ah, [tones.accent, ctx.p.backgroundAlt], { opts: ctx.people === 2 ? { style: 'lineart', attire: attireFor(ctx.faith, ctx.community) } : undefined, anim: 'zoom' })],
            };
          }
          const w = b.w * k;
          const h = b.h * k;
          return {
            h,
            gap,
            make: (y) => [
              {
                id: nextId('i'),
                type: 'image',
                x: at(w),
                y,
                w,
                h,
                rot: 0,
                opacity: 1,
                src: null,
                bind: 'photo.0',
                mask: b.mask,
                border: tones.accent,
                borderW: 8,
                auto: true,
              },
            ],
          };
        }
        case 'divider': {
          const w = (b.w ?? 420) * Math.min(1, k + 0.1);
          const h = 46 * Math.min(1, k + 0.1);
          return { h, gap, make: (y) => [artEl('divider', at(w), y, w, h, dividerColors ?? [tones.accent], { opts: { style: b.style ?? 'ornate' } })] };
        }
        case 'date':
          return dateBand(b.style, ctx, ts, tones, zone, k, gap);
      }
    });

  let k = 1;
  let items = plan(k);
  const total = (list: Placed[]) => list.reduce((s, it, i) => s + it.h + (i ? it.gap : 0), 0);
  for (let i = 0; i < 6 && total(items) > avail; i++) {
    k *= Math.max(0.7, avail / total(items));
    items = plan(k);
  }
  // Spread leftover space: first into gaps (up to 2×), then centre the block.
  const free = avail - total(items);
  const gapCount = Math.max(1, items.length - 1);
  const extra = Math.max(0, Math.min(free * 0.55, items.reduce((s, it, i) => s + (i ? it.gap : 0), 0))) / gapCount;
  let y = zone.top + Math.max(0, (free - extra * gapCount) / 2);
  const out: DesignElement[] = [];
  items.forEach((it, i) => {
    if (i) y += it.gap + extra;
    out.push(...it.make(y));
    y += it.h;
  });
  return out;
}

function dateBand(style: DateStyle, ctx: RecipeCtx, ts: TypeSet, tones: Tones, zone: Zone, k: number, gap: number): Placed {
  const zw = DESIGN_W - zone.left - zone.right;
  const cx = zone.left + zw / 2;
  const fn = ctx.data.functions[ctx.data.mainFunction];
  if (!fn) return { h: 0, gap: 0, make: () => [] };
  const t = (role: Role, o: Parameters<typeof textEl>[3]) => textEl(ts[role], ctx, tones, o);

  if (style === 'line' || zone.align === 'left') {
    const size = ts.date.size * k;
    const w = zw;
    const h1 = estimateTextHeight(fn.dateLabel, size, w, ts.date.font, ts.date.upper, ts.date.ls, 1.3);
    const size2 = ts.small.size * k * 1.1;
    const align = zone.align === 'left' ? ('left' as const) : ('center' as const);
    const x = align === 'left' ? zone.left : cx - w / 2;
    return {
      h: h1 + size2 * 1.5,
      gap,
      make: (y) => [
        t('date', { x, y, w, h: h1, text: fn.dateLabel, bind: 'fnM.date', size, align }),
        t('small', { x, y: y + h1 + 4, w, h: size2 * 1.4, text: fn.timeLabel, bind: 'fnM.time', size: size2, align }),
      ],
    };
  }

  if (style === 'stack') {
    // Big day number with month above and weekday + time below.
    const big = ts.big.size * 1.1 * k;
    const small = ts.date.size * 0.9 * k;
    const w = zw * 0.8;
    const h = small * 1.4 + big * 1.05 + small * 1.4;
    return {
      h,
      gap,
      make: (y) => [
        t('date', { x: cx - w / 2, y, w, h: small * 1.4, text: fn.parts.month, bind: 'fnM.monthYear', size: small }),
        t('big', { x: cx - w / 2, y: y + small * 1.4, w, h: big * 1.05, text: fn.parts.day, bind: 'fnM.day', size: big }),
        t('date', { x: cx - w / 2, y: y + small * 1.4 + big * 1.05, w, h: small * 1.4, text: `${fn.parts.weekday}, ${fn.timeLabel}`, bind: 'fnM.weekday', size: small }),
      ],
    };
  }

  if (style === 'bars') {
    // Invitation-suite classic:      JULY
    //                       SUNDAY | 28 | AT 8 PM
    //                                2024
    const big = ts.big.size * 0.92 * k;
    const side = ts.date.size * 0.86 * k;
    const lineH = side * 1.45;
    const colW = zw * 0.36;
    const midW = Math.max(big * 1.5, zw * 0.2);
    const rowH = big * 1.08;
    const barW = Math.max(2, 2.4 * k);
    const h = lineH + rowH + lineH;
    return {
      h,
      gap,
      make: (y) => {
        const row = y + lineH;
        const lx = cx - midW / 2 - colW;
        const rx = cx + midW / 2;
        const sideY = row + rowH / 2 - lineH / 2;
        return [
          t('date', { x: cx - zw / 2, y, w: zw, h: lineH, text: fn.parts.month, bind: 'fnM.month', size: side }),
          shapeEl('line', cx - midW / 2, row + rowH * 0.12, barW, rowH * 0.76, { fill: tones.accent, opacity: 0.85 }),
          shapeEl('line', cx + midW / 2 - barW, row + rowH * 0.12, barW, rowH * 0.76, { fill: tones.accent, opacity: 0.85 }),
          t('date', { x: lx, y: sideY, w: colW - 18, h: lineH, text: fn.parts.weekday, bind: 'fnM.weekday', size: side, align: 'right' }),
          t('big', { x: cx - midW / 2, y: row, w: midW, h: rowH, text: fn.parts.day, bind: 'fnM.day', size: big }),
          t('date', { x: rx + 18, y: sideY, w: colW - 18, h: lineH, text: fn.timeLabel, bind: 'fnM.time', size: side, align: 'left' }),
          t('date', { x: cx - zw / 2, y: row + rowH, w: zw, h: lineH, text: fn.parts.year, bind: 'fnM.year', size: side }),
        ];
      },
    };
  }

  // strip / boxed: WEEKDAY | 14 | MONTH YEAR, with time underneath
  const big = ts.big.size * k;
  const side = ts.date.size * 0.82 * k;
  const colW = zw * 0.32;
  const midW = zw * 0.24;
  const rowH = big * 1.12;
  const timeS = ts.small.size * k;
  const h = rowH + timeS * 1.6;
  const lineW = Math.max(2, 2.5 * k);
  return {
    h,
    gap,
    make: (y) => {
      const out: DesignElement[] = [];
      const lx = cx - midW / 2 - colW;
      const rx = cx + midW / 2;
      if (style === 'boxed') {
        out.push(shapeEl('rect', cx - zw * 0.44, y - 10, zw * 0.88, rowH + 20, { stroke: tones.accent, strokeW: lineW, radius: 18 }));
      } else {
        for (const x of [lx + 20, rx]) {
          out.push(shapeEl('line', x, y + rowH * 0.22, colW - 20, lineW, { fill: tones.accent, opacity: 0.8 }));
          out.push(shapeEl('line', x, y + rowH * 0.78, colW - 20, lineW, { fill: tones.accent, opacity: 0.8 }));
        }
      }
      out.push(t('date', { x: lx, y: y + rowH * 0.3, w: colW, h: rowH * 0.4, text: fn.parts.weekday, bind: 'fnM.weekday', size: side }));
      out.push(t('big', { x: cx - midW / 2, y, w: midW, h: rowH, text: fn.parts.day, bind: 'fnM.day', size: big }));
      out.push(t('date', { x: rx, y: y + rowH * 0.3, w: colW, h: rowH * 0.4, text: `${fn.parts.month} ${fn.parts.year}`, bind: 'fnM.monthYear', size: side }));
      out.push(t('small', { x: cx - zw / 2, y: y + rowH + timeS * 0.25, w: zw, h: timeS * 1.35, text: fn.timeLabel, bind: 'fnM.time', size: timeS }));
      return out;
    },
  };
}

/**
 * Sacred art of another faith (a Ganesha on a Nikah card, a crescent on a Hindu one) becomes this
 * faith's own motif, or is dropped on secular cards. Cultural decoration is left alone.
 */
export function faithBands(bands: Band[], faith: Faith, community?: string | null): Band[] {
  const out: Band[] = [];
  for (const b of bands) {
    if (b.t === 'art' && b.asset === 'couple') {
      out.push({ ...b, opts: { ...b.opts, attire: attireFor(faith, community, String(b.opts?.attire ?? '')) } });
      continue;
    }
    const mark = b.t === 'art' ? sacredMarkOf(b.asset, b.opts) : null;
    if (b.t !== 'art' || !mark || markSuitsFaith(mark, faith)) {
      out.push(b);
      continue;
    }
    const own = faithMotif(faith);
    if (!own) continue;
    // Motifs are square; Ganesha is tall. Keep the footprint modest.
    const size = Math.min(b.w, b.h, 200);
    out.push({ ...b, asset: 'motif', w: size, h: size, opts: { motif: own } });
  }
  return out;
}

/** Same rule for loose art elements (chrome decoration, published layouts). */
export function faithElements(elements: DesignElement[], faith: Faith, community?: string | null): DesignElement[] {
  const out: DesignElement[] = [];
  for (const e of elements) {
    if (e.type === 'art' && e.asset === 'couple') {
      out.push({ ...e, opts: { ...e.opts, attire: attireFor(faith, community, String(e.opts?.attire ?? '')) } });
      continue;
    }
    const mark = e.type === 'art' ? sacredMarkOf(e.asset, e.opts) : null;
    if (e.type !== 'art' || !mark || markSuitsFaith(mark, faith)) {
      out.push(e);
      continue;
    }
    const own = faithMotif(faith);
    if (!own) continue;
    const size = Math.min(e.w, e.h);
    out.push({ ...e, asset: 'motif', x: e.x + (e.w - size) / 2, y: e.y + (e.h - size) / 2, w: size, h: size, opts: { motif: own } });
  }
  return out;
}
