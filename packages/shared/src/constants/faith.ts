import type { LanguageCode } from './languages.js';
import type { Community } from './event-types.js';

/**
 * The faith a card speaks for. It decides every sacred mark on the card: the blessing page, the
 * blessing line, the Ganesha / Om / Khanda / cross / crescent art and sacred decoration.
 *
 * It comes from the EVENT (occasion + the family's tradition), never from the template: a Hindu
 * family may pick an arch design first drawn for a Nikah, and must still get a Ganesha blessing.
 */
export const FAITHS = ['hindu', 'muslim', 'christian', 'sikh', 'jain', 'buddhist', 'secular'] as const;
export type Faith = (typeof FAITHS)[number];

/** Occasions that are themselves a faith's ceremony. */
const EVENT_FAITH: Record<string, Faith> = {
  nikah: 'muslim',
  'christian-wedding': 'christian',
  'anand-karaj': 'sikh',
  // Hindu sanskars and rituals.
  puja: 'hindu',
  jagran: 'hindu',
  bhandara: 'hindu',
  upanayana: 'hindu',
  mundan: 'hindu',
  annaprashan: 'hindu',
  'satyanarayan-katha': 'hindu',
  // Festivals of one faith (marks follow the festival, whatever the family's tradition).
  diwali: 'hindu',
  holi: 'hindu',
  navratri: 'hindu',
  'ganesh-chaturthi': 'hindu',
  'durga-puja': 'hindu',
  'karva-chauth': 'hindu',
  janmashtami: 'hindu',
  'raksha-bandhan': 'hindu',
  'bhai-dooj': 'hindu',
  sankranti: 'hindu',
  christmas: 'christian',
  eid: 'muslim',
  gurpurab: 'sikh',
};

const COMMUNITY_FAITH: Record<Community, Faith> = {
  'hindu-north': 'hindu',
  'hindu-south': 'hindu',
  marwari: 'hindu',
  gujarati: 'hindu',
  marathi: 'hindu',
  bengali: 'hindu',
  punjabi: 'hindu',
  sikh: 'sikh',
  muslim: 'muslim',
  christian: 'christian',
  jain: 'jain',
  buddhist: 'buddhist',
  modern: 'secular',
};

/** Occasions that carry no blessing, whatever the family's faith. */
const NON_RITUAL_EVENTS = new Set(['birthday', 'corporate', 'retirement', 'other', 'cocktail', 'bachelorette', 'first-birthday', 'milestone-birthday', 'kitty-party', 'graduation', 'farewell', 'reunion', 'new-year', 'lohri', 'onam', 'group-trip', 'family-trip', 'holiday-greeting']);

/**
 * Faith for an event. A faith's own ceremony (Nikah, Anand Karaj…) wins; then the tradition the
 * family chose; otherwise ritual and wedding occasions default to Hindu (they are Hindu-coded:
 * Haldi/Mehendi functions, "Shubh Vivah") and parties to secular.
 */
export function faithOf(eventType: string, community?: string | null): Faith {
  const own = EVENT_FAITH[eventType];
  // A Jain or Buddhist family's puja is still theirs, not a Hindu one.
  if (own && !(own === 'hindu' && community && ['jain', 'buddhist', 'sikh'].includes(COMMUNITY_FAITH[community as Community]))) return own;
  if (community && community in COMMUNITY_FAITH) return COMMUNITY_FAITH[community as Community];
  return NON_RITUAL_EVENTS.has(eventType) ? 'secular' : 'hindu';
}

/** Faiths a template is drawn for (from its communities); empty = suits everyone. */
export function templateFaiths(communities: readonly string[] | undefined): Faith[] {
  const out = new Set<Faith>();
  for (const c of communities ?? []) {
    const f = COMMUNITY_FAITH[c as Community];
    if (f && f !== 'secular') out.add(f);
  }
  return [...out];
}

/** True when a template is drawn for other faiths only (rank it last, never hide it). */
export function templateFaithClash(communities: readonly string[] | undefined, faith: Faith): boolean {
  const fs = templateFaiths(communities);
  return fs.length > 0 && !fs.includes(faith);
}

// ------------------------------------------------------------ sacred art

/**
 * Sacred marks and the faiths they belong to. Anything not listed (lotus, diya, peacock, florals…)
 * is cultural decoration and stays on every card.
 */
const SACRED_MARKS: Record<string, readonly Faith[]> = {
  ganesha: ['hindu'],
  om: ['hindu', 'jain'],
  shree: ['hindu', 'jain'],
  kalash: ['hindu', 'jain'],
  crescent: ['muslim'],
  cross: ['christian'],
  khanda: ['sikh'],
};

/** Key of an art element/band in SACRED_MARKS: 'ganesha' or the motif id. */
export function sacredMarkOf(asset: string, opts?: Record<string, unknown>): string | null {
  if (asset === 'ganesha') return 'ganesha';
  if (asset === 'motif' && typeof opts?.motif === 'string' && opts.motif in SACRED_MARKS) return opts.motif;
  return null;
}

export function markSuitsFaith(mark: string, faith: Faith): boolean {
  return SACRED_MARKS[mark]?.includes(faith) ?? true;
}

/** The faith's own motif, used in place of a sacred mark of another faith (null = just remove it). */
export function faithMotif(faith: Faith): 'shree' | 'crescent' | 'cross' | 'khanda' | 'kalash' | 'lotus' | null {
  switch (faith) {
    case 'hindu':
      return 'shree';
    case 'muslim':
      return 'crescent';
    case 'christian':
      return 'cross';
    case 'sikh':
      return 'khanda';
    case 'jain':
      return 'kalash'; // one of the Jain ashtamangala
    case 'buddhist':
      return 'lotus';
    default:
      return null;
  }
}

// ------------------------------------------------------------ blessing

export type BlessingKind = 'ganesha' | 'om' | 'bismillah' | 'cross' | 'khanda' | 'jain' | 'buddhist' | 'none';

/** Which blessing page opens the card. `motif` only picks Ganesha vs Om for Hindu cards. */
export function blessingFor(eventType: string, faith: Faith, motif?: string): BlessingKind {
  if (NON_RITUAL_EVENTS.has(eventType)) return 'none';
  switch (faith) {
    case 'muslim':
      return 'bismillah';
    case 'christian':
      return 'cross';
    case 'sikh':
      return 'khanda';
    case 'jain':
      return 'jain';
    case 'buddhist':
      return 'buddhist';
    case 'hindu':
      return motif === 'om' ? 'om' : 'ganesha';
    default:
      return 'none';
  }
}

type Lines = Partial<Record<LanguageCode, string>> & { en: string };

export const BISMILLAH = 'بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

const GANESHA: Lines = {
  en: '|| Shree Ganeshaya Namah ||',
  hi: '॥ श्री गणेशाय नमः ॥',
  mr: '॥ श्री गणेशाय नमः ॥',
  gu: '॥ શ્રી ગણેશાય નમઃ ॥',
  bn: '॥ শ্রী গণেশায় নমঃ ॥',
  pa: '॥ ਸ੍ਰੀ ਗਣੇਸ਼ਾਯ ਨਮਃ ॥',
  ta: '॥ ஸ்ரீ கணேசாய நம: ॥',
  te: '॥ శ్రీ గణేశాయ నమః ॥',
  kn: '॥ ಶ್ರೀ ಗಣೇಶಾಯ ನಮಃ ॥',
  ml: '॥ ശ്രീ ഗണേശായ നമഃ ॥',
  or: '॥ ଶ୍ରୀ ଗଣେଶାୟ ନମଃ ॥',
};
/** Bengali Hindu weddings open with Prajapati, the lord of marriage, not Ganesha. */
const PRAJAPATI: Lines = { en: '|| Shri Shri Prajapataye Namah ||', bn: 'শ্রী শ্রী প্রজাপতয়ে নমঃ', hi: '॥ श्री श्री प्रजापतये नमः ॥' };
const IK_ONKAR: Lines = { en: 'Ik Onkar Satgur Prasad', pa: 'ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ', hi: '॥ इक ओंकार सतगुर प्रसाद ॥' };
const NAMOKAR: Lines = { en: '|| Namo Arihantanam ||', hi: '॥ णमो अरिहंताणं ॥', mr: '॥ णमो अरिहंताणं ॥', gu: '॥ ણમો અરિહંતાણં ॥' };
const BUDDHA: Lines = { en: 'Namo Buddhaya', hi: '॥ नमो बुद्धाय ॥', mr: '॥ नमो बुद्धाय ॥' };
const CHRISTIAN: Lines = { en: 'With the blessings of God Almighty' };

const pick = (l: Lines, language: LanguageCode) => l[language] ?? l.en;

/**
 * The blessing line at the top of the card for this faith (undefined = none). Used for default
 * wording, enforced on AI wording, and shown on the blessing page.
 */
export function invocationFor(input: { eventType: string; faith: Faith; language: LanguageCode; community?: string | null }): string | undefined {
  if (NON_RITUAL_EVENTS.has(input.eventType)) return undefined;
  const wedding = ['wedding', 'engagement', 'reception'].includes(input.eventType);
  switch (input.faith) {
    case 'hindu':
      return pick(input.community === 'bengali' && wedding ? PRAJAPATI : GANESHA, input.language);
    case 'muslim':
      return BISMILLAH;
    case 'sikh':
      return pick(IK_ONKAR, input.language);
    case 'jain':
      return pick(NAMOKAR, input.language);
    case 'buddhist':
      return pick(BUDDHA, input.language);
    case 'christian':
      return input.language === 'en' ? CHRISTIAN.en : undefined;
    default:
      return undefined;
  }
}

/** Every blessing line we generate (any faith, any language), to recognise untouched defaults. */
const STOCK_LINES = new Set(
  [GANESHA, PRAJAPATI, IK_ONKAR, NAMOKAR, BUDDHA, CHRISTIAN]
    .flatMap((l) => Object.values(l))
    .concat([BISMILLAH, 'बिस्मिल्लाह-हिर-रहमान-निर-रहीम', 'Bismillah ir-Rahman ir-Rahim', '॥ इक ओंकार ॥', '|| Ik Onkar ||'])
    .map((s) => s.trim()),
);

/**
 * The blessing line to print. A line the family typed themselves is kept as is; one of our stock
 * lines (e.g. a Ganesha line left over from before they picked "Nikah") follows the faith, and an
 * empty line stays empty.
 */
export function resolveInvocation(current: string | undefined | null, input: Parameters<typeof invocationFor>[0]): string | undefined {
  const text = current?.trim();
  // Empty = the family removed it (or the occasion has none): never add one back.
  if (!text) return current ?? undefined;
  if (!STOCK_LINES.has(text)) return current!;
  return invocationFor(input);
}

// ------------------------------------------------------------ couple attire & site characters

type CoupleAttire = 'north' | 'south' | 'bengali' | 'marathi' | 'sikh' | 'muslim' | 'christian';

/** Hindu regional outfits (sindoor, sehra/topor/pheta…): also right for Jain and Buddhist couples. */
const DHARMIC_ATTIRE: readonly CoupleAttire[] = ['north', 'south', 'bengali', 'marathi'];
const COMMUNITY_REGION: Partial<Record<Community, CoupleAttire>> = { 'hindu-south': 'south', bengali: 'bengali', marathi: 'marathi' };

/**
 * What the couple illustration wears. A design's regional look is kept when it fits the faith
 * (a Bengali-style design stays Bengali for any Hindu family); otherwise the faith's own attire:
 * a Nikah never shows sindoor, a Hindu wedding never a dastar.
 */
export function attireFor(faith: Faith, community?: string | null, current?: string): CoupleAttire {
  switch (faith) {
    case 'muslim':
      return 'muslim';
    case 'sikh':
      return 'sikh';
    case 'christian':
      return 'christian';
    case 'secular':
      return (current as CoupleAttire | undefined) ?? 'north';
    default:
      if (current && DHARMIC_ATTIRE.includes(current as CoupleAttire)) return current as CoupleAttire;
      return COMMUNITY_REGION[community as Community] ?? 'north';
  }
}

/** Website characters that are sacred to a faith; the rest (diya, peacock, doves…) suit everyone. */
const SACRED_CHARACTERS: Record<string, readonly Faith[]> = { ganesha: ['hindu'], kalash: ['hindu', 'jain'] };

export function characterSuitsFaith(kind: string, faith: Faith): boolean {
  return SACRED_CHARACTERS[kind]?.includes(faith) ?? true;
}
