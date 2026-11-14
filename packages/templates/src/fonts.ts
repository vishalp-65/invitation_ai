import { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';

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
    await mod
      .loadFont('normal', {
        weights: weights.length ? weights : undefined,
        subsets: subsets.length ? subsets : undefined,
      })
      .waitUntilDone();
  })();

  loaded.set(key, promise);
  // Don't cache a failure: a transient network error would otherwise pin the fallback font for the session.
  promise.catch((err) => {
    console.warn(`[fonts] failed to load "${family}"`, err);
    loaded.delete(key);
  });
  return promise;
}

/** Blocks rendering (stills, video frames, Player) until fonts are ready. */
export function useInviteFonts(families: string[], script?: string): boolean {
  const [ready, setReady] = useState(false);
  const signature = families.join('|') + (script ?? '');

  useEffect(() => {
    let done = false;
    const handle = delayRender(`fonts:${signature}`, { timeoutInMilliseconds: 60_000 });
    const finish = () => {
      if (done) return;
      done = true;
      continueRender(handle);
    };
    Promise.allSettled(families.map((f) => loadFamily(f, script))).finally(() => {
      setReady(true);
      finish();
    });
    return finish;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `signature` already encodes families + script
  }, [signature]);

  return ready;
}
