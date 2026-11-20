/**
 * Fonts offered in the card editor. Every family must also be in the Remotion allow-list
 * (@cardai/templates fonts.ts) so the worker renders exactly what the editor shows.
 */
export type FontGroup = 'script' | 'serif' | 'sans' | 'display' | 'fun' | 'indic';

export interface EditorFont {
  family: string;
  group: FontGroup;
  /** ISO 15924 scripts the font covers (Latin is assumed for Latin fonts). */
  scripts: string[];
}

const L = ['Latn'];
const D = ['Latn', 'Deva'];

export const EDITOR_FONTS: EditorFont[] = [
  // Calligraphy for names
  { family: 'Great Vibes', group: 'script', scripts: L },
  { family: 'Pinyon Script', group: 'script', scripts: L },
  { family: 'Parisienne', group: 'script', scripts: L },
  { family: 'Allura', group: 'script', scripts: L },
  { family: 'Alex Brush', group: 'script', scripts: L },
  { family: 'Tangerine', group: 'script', scripts: L },
  { family: 'Sacramento', group: 'script', scripts: L },
  { family: 'Dancing Script', group: 'script', scripts: L },
  { family: 'Satisfy', group: 'script', scripts: L },
  { family: 'Monsieur La Doulaise', group: 'script', scripts: L },
  { family: 'Mrs Saint Delafield', group: 'script', scripts: L },
  { family: 'Ms Madi', group: 'script', scripts: L },
  { family: 'Imperial Script', group: 'script', scripts: L },
  { family: 'Bonheur Royale', group: 'script', scripts: L },
  { family: 'Corinthia', group: 'script', scripts: L },
  { family: 'Italianno', group: 'script', scripts: L },
  { family: 'Mea Culpa', group: 'script', scripts: L },
  { family: 'Ephesis', group: 'script', scripts: L },
  // Elegant serifs
  { family: 'Cinzel', group: 'serif', scripts: L },
  { family: 'Cormorant Garamond', group: 'serif', scripts: L },
  { family: 'Cormorant', group: 'serif', scripts: L },
  { family: 'Forum', group: 'serif', scripts: L },
  { family: 'Noto Serif', group: 'serif', scripts: L },
  { family: 'Playfair Display', group: 'serif', scripts: L },
  { family: 'Playfair Display SC', group: 'serif', scripts: L },
  { family: 'EB Garamond', group: 'serif', scripts: L },
  { family: 'Bodoni Moda', group: 'serif', scripts: L },
  { family: 'Lora', group: 'serif', scripts: L },
  { family: 'Marcellus', group: 'serif', scripts: L },
  { family: 'Italiana', group: 'serif', scripts: L },
  { family: 'DM Serif Display', group: 'display', scripts: L },
  { family: 'Abril Fatface', group: 'display', scripts: L },
  { family: 'Yeseva One', group: 'display', scripts: L },
  { family: 'Philosopher', group: 'display', scripts: L },
  // Clean sans
  { family: 'Montserrat', group: 'sans', scripts: L },
  { family: 'Josefin Sans', group: 'sans', scripts: L },
  { family: 'Tenor Sans', group: 'sans', scripts: L },
  { family: 'Questrial', group: 'sans', scripts: L },
  { family: 'Didact Gothic', group: 'sans', scripts: L },
  { family: 'Poppins', group: 'sans', scripts: D },
  { family: 'Inter', group: 'sans', scripts: L },
  // Playful
  { family: 'Fredoka', group: 'fun', scripts: L },
  { family: 'Pacifico', group: 'fun', scripts: L },
  { family: 'Baloo 2', group: 'fun', scripts: D },
  // Indian scripts
  { family: 'Tiro Devanagari Hindi', group: 'indic', scripts: D },
  { family: 'Tiro Devanagari Marathi', group: 'indic', scripts: D },
  { family: 'Rozha One', group: 'indic', scripts: D },
  { family: 'Yatra One', group: 'indic', scripts: D },
  { family: 'Amita', group: 'indic', scripts: D },
  { family: 'Kalam', group: 'indic', scripts: D },
  { family: 'Laila', group: 'indic', scripts: D },
  { family: 'Eczar', group: 'indic', scripts: D },
  { family: 'Martel', group: 'indic', scripts: D },
  { family: 'Gotu', group: 'indic', scripts: D },
  { family: 'Vidaloka', group: 'serif', scripts: L },
  { family: 'Halant', group: 'indic', scripts: D },
  { family: 'Khand', group: 'indic', scripts: D },
  { family: 'Mukta', group: 'indic', scripts: D },
  { family: 'Hind', group: 'indic', scripts: D },
  // More Hindi / Devanagari faces: calligraphic, literary serifs, display and clean text.
  { family: 'Kurale', group: 'indic', scripts: D },
  { family: 'Arya', group: 'indic', scripts: D },
  { family: 'Sura', group: 'indic', scripts: D },
  { family: 'Sumana', group: 'indic', scripts: D },
  { family: 'Sahitya', group: 'indic', scripts: D },
  { family: 'Tiro Devanagari Sanskrit', group: 'indic', scripts: D },
  { family: 'Noto Serif Devanagari', group: 'indic', scripts: D },
  { family: 'Noto Sans Devanagari', group: 'indic', scripts: D },
  { family: 'Rhodium Libre', group: 'indic', scripts: D },
  { family: 'Vesper Libre', group: 'indic', scripts: D },
  { family: 'Inknut Antiqua', group: 'indic', scripts: D },
  { family: 'Jaini Purva', group: 'indic', scripts: D },
  { family: 'Sarpanch', group: 'indic', scripts: D },
  { family: 'Modak', group: 'indic', scripts: D },
  { family: 'Dekko', group: 'indic', scripts: D },
  { family: 'Palanquin', group: 'indic', scripts: D },
  { family: 'Palanquin Dark', group: 'indic', scripts: D },
  { family: 'Akshar', group: 'indic', scripts: D },
  { family: 'Anek Devanagari', group: 'indic', scripts: D },
  { family: 'Khula', group: 'indic', scripts: D },
  { family: 'Karma', group: 'indic', scripts: D },
  { family: 'Biryani', group: 'indic', scripts: D },
  { family: 'Glegoo', group: 'indic', scripts: D },
  { family: 'Teko', group: 'indic', scripts: D },
  { family: 'Rajdhani', group: 'indic', scripts: D },
  { family: 'Pragati Narrow', group: 'indic', scripts: D },
  { family: 'Sarala', group: 'indic', scripts: D },
  { family: 'Amiko', group: 'indic', scripts: D },
  { family: 'Noto Sans', group: 'sans', scripts: ['Latn', 'Deva'] },
  { family: 'Noto Serif Gujarati', group: 'indic', scripts: ['Latn', 'Gujr'] },
  { family: 'Hind Vadodara', group: 'indic', scripts: ['Latn', 'Gujr'] },
  { family: 'Noto Serif Tamil', group: 'indic', scripts: ['Latn', 'Taml'] },
  { family: 'Noto Sans Tamil', group: 'indic', scripts: ['Latn', 'Taml'] },
  { family: 'Noto Serif Telugu', group: 'indic', scripts: ['Latn', 'Telu'] },
  { family: 'Noto Sans Telugu', group: 'indic', scripts: ['Latn', 'Telu'] },
  { family: 'Noto Serif Kannada', group: 'indic', scripts: ['Latn', 'Knda'] },
  { family: 'Noto Sans Kannada', group: 'indic', scripts: ['Latn', 'Knda'] },
  { family: 'Noto Serif Malayalam', group: 'indic', scripts: ['Latn', 'Mlym'] },
  { family: 'Noto Sans Malayalam', group: 'indic', scripts: ['Latn', 'Mlym'] },
  { family: 'Noto Serif Bengali', group: 'indic', scripts: ['Latn', 'Beng'] },
  { family: 'Hind Siliguri', group: 'indic', scripts: ['Latn', 'Beng'] },
  { family: 'Noto Serif Gurmukhi', group: 'indic', scripts: ['Latn', 'Guru'] },
  { family: 'Mukta Mahee', group: 'indic', scripts: ['Latn', 'Guru'] },
  { family: 'Noto Serif Oriya', group: 'indic', scripts: ['Latn', 'Orya'] },
  { family: 'Noto Sans Oriya', group: 'indic', scripts: ['Latn', 'Orya'] },
  { family: 'Noto Nastaliq Urdu', group: 'indic', scripts: ['Latn', 'Arab'] },
  { family: 'Noto Naskh Arabic', group: 'indic', scripts: ['Latn', 'Arab'] },
  { family: 'Amiri', group: 'serif', scripts: ['Latn', 'Arab'] },
];

export function fontSupports(family: string, script: string): boolean {
  const f = EDITOR_FONTS.find((x) => x.family === family);
  return f ? f.scripts.includes(script) : script === 'Latn';
}

/** Detects the dominant non-Latin script of a string ('Latn' when none). */
export function detectScript(text: string): string {
  const ranges: Array<[RegExp, string]> = [
    [/[ऀ-ॿ]/, 'Deva'],
    [/[઀-૿]/, 'Gujr'],
    [/[஀-௿]/, 'Taml'],
    [/[ఀ-౿]/, 'Telu'],
    [/[ಀ-೿]/, 'Knda'],
    [/[ഀ-ൿ]/, 'Mlym'],
    [/[ঀ-৿]/, 'Beng'],
    [/[਀-੿]/, 'Guru'],
    [/[଀-୿]/, 'Orya'],
    [/[؀-ۿ]/, 'Arab'],
  ];
  for (const [re, s] of ranges) if (re.test(text)) return s;
  return 'Latn';
}
