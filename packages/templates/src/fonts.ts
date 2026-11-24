interface FontModule {
  getInfo: () => { fonts: Record<string, Record<string, unknown>>; subsets: string[] };
  loadFont: (style?: string, opts?: { weights?: string[]; subsets?: string[] }) => {
    waitUntilDone: () => Promise<unknown>;
  };
}

/**
 * Explicit allow-list. Importing `getAvailableFonts()` would pull ~1700 font chunks into the
 * bundle; static per-family imports keep the Remotion and Next.js bundles small.
 */
const FONT_LOADERS: Record<string, () => Promise<FontModule>> = {
  'Playfair Display': () => import('@remotion/google-fonts/PlayfairDisplay') as Promise<FontModule>,
  'Bebas Neue': () => import('@remotion/google-fonts/BebasNeue') as Promise<FontModule>,
  Caveat: () => import('@remotion/google-fonts/Caveat') as Promise<FontModule>,
  'Special Elite': () => import('@remotion/google-fonts/SpecialElite') as Promise<FontModule>,
  'Permanent Marker': () => import('@remotion/google-fonts/PermanentMarker') as Promise<FontModule>,
  'DM Sans': () => import('@remotion/google-fonts/DMSans') as Promise<FontModule>,
  Poppins: () => import('@remotion/google-fonts/Poppins') as Promise<FontModule>,
  'Cormorant Garamond': () => import('@remotion/google-fonts/CormorantGaramond') as Promise<FontModule>,
  'Great Vibes': () => import('@remotion/google-fonts/GreatVibes') as Promise<FontModule>,
  Cinzel: () => import('@remotion/google-fonts/Cinzel') as Promise<FontModule>,
  Marcellus: () => import('@remotion/google-fonts/Marcellus') as Promise<FontModule>,
  'DM Serif Display': () => import('@remotion/google-fonts/DMSerifDisplay') as Promise<FontModule>,
  Lora: () => import('@remotion/google-fonts/Lora') as Promise<FontModule>,
  Inter: () => import('@remotion/google-fonts/Inter') as Promise<FontModule>,
  'Noto Sans': () => import('@remotion/google-fonts/NotoSans') as Promise<FontModule>,
  'Tiro Devanagari Hindi': () => import('@remotion/google-fonts/TiroDevanagariHindi') as Promise<FontModule>,
  'Tiro Devanagari Marathi': () => import('@remotion/google-fonts/TiroDevanagariMarathi') as Promise<FontModule>,
  Mukta: () => import('@remotion/google-fonts/Mukta') as Promise<FontModule>,
  'Yatra One': () => import('@remotion/google-fonts/YatraOne') as Promise<FontModule>,
  Kalam: () => import('@remotion/google-fonts/Kalam') as Promise<FontModule>,
  'Baloo 2': () => import('@remotion/google-fonts/Baloo2') as Promise<FontModule>,
  'Noto Serif Gujarati': () => import('@remotion/google-fonts/NotoSerifGujarati') as Promise<FontModule>,
  'Hind Vadodara': () => import('@remotion/google-fonts/HindVadodara') as Promise<FontModule>,
  'Noto Serif Tamil': () => import('@remotion/google-fonts/NotoSerifTamil') as Promise<FontModule>,
  'Noto Sans Tamil': () => import('@remotion/google-fonts/NotoSansTamil') as Promise<FontModule>,
  'Noto Serif Telugu': () => import('@remotion/google-fonts/NotoSerifTelugu') as Promise<FontModule>,
  'Noto Sans Telugu': () => import('@remotion/google-fonts/NotoSansTelugu') as Promise<FontModule>,
  'Noto Serif Kannada': () => import('@remotion/google-fonts/NotoSerifKannada') as Promise<FontModule>,
  'Noto Sans Kannada': () => import('@remotion/google-fonts/NotoSansKannada') as Promise<FontModule>,
  'Noto Serif Malayalam': () => import('@remotion/google-fonts/NotoSerifMalayalam') as Promise<FontModule>,
  'Noto Sans Malayalam': () => import('@remotion/google-fonts/NotoSansMalayalam') as Promise<FontModule>,
  'Noto Serif Bengali': () => import('@remotion/google-fonts/NotoSerifBengali') as Promise<FontModule>,
  'Hind Siliguri': () => import('@remotion/google-fonts/HindSiliguri') as Promise<FontModule>,
  'Noto Serif Gurmukhi': () => import('@remotion/google-fonts/NotoSerifGurmukhi') as Promise<FontModule>,
  'Mukta Mahee': () => import('@remotion/google-fonts/MuktaMahee') as Promise<FontModule>,
  'Noto Serif Oriya': () => import('@remotion/google-fonts/NotoSerifOriya') as Promise<FontModule>,
  'Noto Sans Oriya': () => import('@remotion/google-fonts/NotoSansOriya') as Promise<FontModule>,
  'Noto Nastaliq Urdu': () => import('@remotion/google-fonts/NotoNastaliqUrdu') as Promise<FontModule>,
  Amiri: () => import('@remotion/google-fonts/Amiri') as Promise<FontModule>,
  'Pinyon Script': () => import('@remotion/google-fonts/PinyonScript') as Promise<FontModule>,
  Parisienne: () => import('@remotion/google-fonts/Parisienne') as Promise<FontModule>,
  Allura: () => import('@remotion/google-fonts/Allura') as Promise<FontModule>,
  'Alex Brush': () => import('@remotion/google-fonts/AlexBrush') as Promise<FontModule>,
  Tangerine: () => import('@remotion/google-fonts/Tangerine') as Promise<FontModule>,
  Sacramento: () => import('@remotion/google-fonts/Sacramento') as Promise<FontModule>,
  'Dancing Script': () => import('@remotion/google-fonts/DancingScript') as Promise<FontModule>,
  Satisfy: () => import('@remotion/google-fonts/Satisfy') as Promise<FontModule>,
  'Playfair Display SC': () => import('@remotion/google-fonts/PlayfairDisplaySC') as Promise<FontModule>,
  'EB Garamond': () => import('@remotion/google-fonts/EBGaramond') as Promise<FontModule>,
  'Bodoni Moda': () => import('@remotion/google-fonts/BodoniModa') as Promise<FontModule>,
  Italiana: () => import('@remotion/google-fonts/Italiana') as Promise<FontModule>,
  'Abril Fatface': () => import('@remotion/google-fonts/AbrilFatface') as Promise<FontModule>,
  'Yeseva One': () => import('@remotion/google-fonts/YesevaOne') as Promise<FontModule>,
  Philosopher: () => import('@remotion/google-fonts/Philosopher') as Promise<FontModule>,
  Montserrat: () => import('@remotion/google-fonts/Montserrat') as Promise<FontModule>,
  'Josefin Sans': () => import('@remotion/google-fonts/JosefinSans') as Promise<FontModule>,
  'Tenor Sans': () => import('@remotion/google-fonts/TenorSans') as Promise<FontModule>,
  Italianno: () => import('@remotion/google-fonts/Italianno') as Promise<FontModule>,
  Fredoka: () => import('@remotion/google-fonts/Fredoka') as Promise<FontModule>,
  Pacifico: () => import('@remotion/google-fonts/Pacifico') as Promise<FontModule>,
  'Rozha One': () => import('@remotion/google-fonts/RozhaOne') as Promise<FontModule>,
  Amita: () => import('@remotion/google-fonts/Amita') as Promise<FontModule>,
  Laila: () => import('@remotion/google-fonts/Laila') as Promise<FontModule>,
  Eczar: () => import('@remotion/google-fonts/Eczar') as Promise<FontModule>,
  Martel: () => import('@remotion/google-fonts/Martel') as Promise<FontModule>,
  Gotu: () => import('@remotion/google-fonts/Gotu') as Promise<FontModule>,
  Vidaloka: () => import('@remotion/google-fonts/Vidaloka') as Promise<FontModule>,
  Halant: () => import('@remotion/google-fonts/Halant') as Promise<FontModule>,
  Khand: () => import('@remotion/google-fonts/Khand') as Promise<FontModule>,
  Hind: () => import('@remotion/google-fonts/Hind') as Promise<FontModule>,
  'Noto Naskh Arabic': () => import('@remotion/google-fonts/NotoNaskhArabic') as Promise<FontModule>,
  'Monsieur La Doulaise': () => import('@remotion/google-fonts/MonsieurLaDoulaise') as Promise<FontModule>,
  'Mrs Saint Delafield': () => import('@remotion/google-fonts/MrsSaintDelafield') as Promise<FontModule>,
  'Ms Madi': () => import('@remotion/google-fonts/MsMadi') as Promise<FontModule>,
  'Imperial Script': () => import('@remotion/google-fonts/ImperialScript') as Promise<FontModule>,
  'Bonheur Royale': () => import('@remotion/google-fonts/BonheurRoyale') as Promise<FontModule>,
  Corinthia: () => import('@remotion/google-fonts/Corinthia') as Promise<FontModule>,
  Cormorant: () => import('@remotion/google-fonts/Cormorant') as Promise<FontModule>,
  Forum: () => import('@remotion/google-fonts/Forum') as Promise<FontModule>,
  'Noto Serif': () => import('@remotion/google-fonts/NotoSerif') as Promise<FontModule>,
  'Mea Culpa': () => import('@remotion/google-fonts/MeaCulpa') as Promise<FontModule>,
  Ephesis: () => import('@remotion/google-fonts/Ephesis') as Promise<FontModule>,
  Questrial: () => import('@remotion/google-fonts/Questrial') as Promise<FontModule>,
  'Didact Gothic': () => import('@remotion/google-fonts/DidactGothic') as Promise<FontModule>,
  Kurale: () => import('@remotion/google-fonts/Kurale') as Promise<FontModule>,
  Arya: () => import('@remotion/google-fonts/Arya') as Promise<FontModule>,
  Sura: () => import('@remotion/google-fonts/Sura') as Promise<FontModule>,
  Sumana: () => import('@remotion/google-fonts/Sumana') as Promise<FontModule>,
  Sahitya: () => import('@remotion/google-fonts/Sahitya') as Promise<FontModule>,
  'Tiro Devanagari Sanskrit': () => import('@remotion/google-fonts/TiroDevanagariSanskrit') as Promise<FontModule>,
  'Noto Serif Devanagari': () => import('@remotion/google-fonts/NotoSerifDevanagari') as Promise<FontModule>,
  'Noto Sans Devanagari': () => import('@remotion/google-fonts/NotoSansDevanagari') as Promise<FontModule>,
  'Rhodium Libre': () => import('@remotion/google-fonts/RhodiumLibre') as Promise<FontModule>,
  'Vesper Libre': () => import('@remotion/google-fonts/VesperLibre') as Promise<FontModule>,
  'Inknut Antiqua': () => import('@remotion/google-fonts/InknutAntiqua') as Promise<FontModule>,
  'Jaini Purva': () => import('@remotion/google-fonts/JainiPurva') as Promise<FontModule>,
  Sarpanch: () => import('@remotion/google-fonts/Sarpanch') as Promise<FontModule>,
  Modak: () => import('@remotion/google-fonts/Modak') as Promise<FontModule>,
  Dekko: () => import('@remotion/google-fonts/Dekko') as Promise<FontModule>,
  Palanquin: () => import('@remotion/google-fonts/Palanquin') as Promise<FontModule>,
  'Palanquin Dark': () => import('@remotion/google-fonts/PalanquinDark') as Promise<FontModule>,
  Akshar: () => import('@remotion/google-fonts/Akshar') as Promise<FontModule>,
  'Anek Devanagari': () => import('@remotion/google-fonts/AnekDevanagari') as Promise<FontModule>,
  Khula: () => import('@remotion/google-fonts/Khula') as Promise<FontModule>,
  Karma: () => import('@remotion/google-fonts/Karma') as Promise<FontModule>,
  Biryani: () => import('@remotion/google-fonts/Biryani') as Promise<FontModule>,
  Glegoo: () => import('@remotion/google-fonts/Glegoo') as Promise<FontModule>,
  Teko: () => import('@remotion/google-fonts/Teko') as Promise<FontModule>,
  Rajdhani: () => import('@remotion/google-fonts/Rajdhani') as Promise<FontModule>,
  'Pragati Narrow': () => import('@remotion/google-fonts/PragatiNarrow') as Promise<FontModule>,
  Sarala: () => import('@remotion/google-fonts/Sarala') as Promise<FontModule>,
  Amiko: () => import('@remotion/google-fonts/Amiko') as Promise<FontModule>,
};

/** Families a designer may pick in the theme editor. */
export const INVITE_FONT_FAMILIES = Object.keys(FONT_LOADERS);

const SCRIPT_SUBSETS: Record<string, string> = {
  Deva: 'devanagari',
  Gujr: 'gujarati',
  Taml: 'tamil',
  Telu: 'telugu',
  Knda: 'kannada',
  Mlym: 'malayalam',
  Beng: 'bengali',
  Guru: 'gurmukhi',
  Orya: 'oriya',
  Arab: 'arabic',
};

const ITALIC_FAMILIES = new Set(['Cormorant Garamond', 'Cormorant', 'EB Garamond', 'Playfair Display', 'Lora', 'Bodoni Moda']);

const loaded = new Map<string, Promise<void>>();

/** Loads one family with only the weights/subsets we use. Cached per family+script. */
export function loadFamily(family: string, script?: string): Promise<void> {
  const key = `${family}|${script ?? ''}`;
  const existing = loaded.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const loader = FONT_LOADERS[family];
    if (!loader) {
      console.warn(`[fonts] "${family}" is not in the allow-list; using fallback fonts`);
      return;
    }
    const mod = await loader();
    const info = mod.getInfo();
    const normal = info.fonts.normal ?? {};
    const weights = ['400', '500', '600', '700'].filter((w) => w in normal);
    const wanted = ['latin', script ? SCRIPT_SUBSETS[script] : undefined].filter(Boolean) as string[];
    const subsets = wanted.filter((s) => info.subsets.includes(s));
    const jobs = [
      mod.loadFont('normal', {
        weights: weights.length ? weights : undefined,
        subsets: subsets.length ? subsets : undefined,
      }),
    ];
    // Text serifs used in italic on templates get their real italic (not a slanted roman).
    if (ITALIC_FAMILIES.has(family) && info.fonts.italic && '400' in info.fonts.italic) {
      jobs.push(mod.loadFont('italic', { weights: ['400'], subsets: subsets.length ? subsets : undefined }));
    }
    await Promise.all(jobs.map((j) => j.waitUntilDone()));
  })();

  loaded.set(key, promise);
  // Don't cache a failure: a transient network error would otherwise pin the fallback font for the session.
  promise.catch((err) => {
    console.warn(`[fonts] failed to load "${family}"`, err);
    loaded.delete(key);
  });
  return promise;
}
