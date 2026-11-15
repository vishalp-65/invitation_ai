import { BISMILLAH, invocationFor, type BlessingKind } from '../constants/faith.js';
import type { LanguageCode } from '../constants/languages.js';
import { TYPE_SETS, type Band, type RecipeCtx, type TypeSetKey } from './builder.js';

/**
 * Extra pages every template offers (Canva-style multi-page invitations):
 *   blessing → cover → ceremonies… → family & RSVP → photo / save-the-date.
 * Pages are only added when the event has something to put on them; users can delete any page.
 */

// ------------------------------------------------------------ function icons

export const FN_ICONS = ['haldi', 'mehendi', 'sangeet', 'baraat', 'wedding', 'pheras', 'reception', 'rings', 'puja', 'nikah', 'cake', 'dinner', 'flower'] as const;
export type FnIcon = (typeof FN_ICONS)[number];

const ICON_RULES: Array<[RegExp, FnIcon]> = [
  [/haldi|हल्दी|pithi|पीठी|ubtan|उबटन|manjal|மஞ்சள்|gaye holud|গায়ে হলুদ|tel ban/i, 'haldi'],
  [/meh[ae]?n?di|मेहंदी|मेंहदी|mehandi|maruthani/i, 'mehendi'],
  [/sangeet|संगीत|garba|गरबा|dandiya|डांडिया|cocktail|ladies sangeet|dj|party/i, 'sangeet'],
  [/baraat|बारात|ghudchadi|घुड़चढ़ी|sehra|सेहरा|nikasi|janeyu/i, 'baraat'],
  [/phera|फेरे|saptapadi|सप्तपदी|mandap|मंडप|kanyadaan|कन्यादान|lagan|लगन|muhurtham|muhurat|मुहूर्त/i, 'pheras'],
  [/nikah|निकाह|walima|वलीमा|mehfil|qawwali/i, 'nikah'],
  [/engag|sagai|सगाई|roka|रोका|ring|mangni|मंगनी|tilak|तिलक|nischitartham|chunni|shagun|शगुन|misri/i, 'rings'],
  [/reception|रिसेप्शन|स्वागत समारोह|dinner|डिनर|lunch|bhoj|भोज|प्रीतिभोज|dawat|दावत|bhandara|भंडारा|langar/i, 'dinner'],
  [/puja|pooja|पूजा|katha|कथा|havan|हवन|path|पाठ|jagran|जागरण|chowki|चौकी|griha|गृह|ganesh|गणेश|mata|satyanarayan|mundan|मुंडन|annaprashan|naamkaran|नामकरण|upanayan|जनेऊ/i, 'puja'],
  [/birthday|जन्मदिन|cake|केक|bash/i, 'cake'],
  [/wedding|vivah|विवाह|shaadi|शादी|lagna|लग्न|kalyan|anand karaj|आनंद कारज|matrimony|biye|বিয়ে|বিবাহ|marriage|church/i, 'wedding'],
];

/** Picks a small illustration for a function from its name (any of our languages). */
export function functionIcon(name: string): FnIcon {
  for (const [re, icon] of ICON_RULES) if (re.test(name)) return icon;
  return 'flower';
}

// ------------------------------------------------------------ localised headings

type L = Partial<Record<LanguageCode, string>> & { en: string };
const pick = (m: L, lang: LanguageCode) => m[lang] ?? m.en;

export const SCHEDULE_TITLE: L = { en: 'Functions & Ceremonies', hi: 'मांगलिक कार्यक्रम', mr: 'मंगल कार्यक्रम', gu: 'માંગલિક પ્રસંગો', pa: 'ਸਮਾਗਮ', bn: 'অনুষ্ঠানসূচি' };
const DARSHAN_TITLE: L = { en: 'Awaiting your presence', hi: 'दर्शनाभिलाषी', mr: 'दर्शनाभिलाषी', gu: 'દર્શનાભિલાષી' };
const WELCOME_TITLE: L = { en: 'Eagerly awaiting you', hi: 'स्वागतोत्सुक', mr: 'आपले स्वागतोत्सुक', gu: 'સ્વાગતોત્સુક', pa: 'ਸਵਾਗਤ ਲਈ ਉਤਸੁਕ' };
const COMPLIMENTS_TITLE: L = { en: 'With best compliments from', hi: 'सौजन्य से', mr: 'सौजन्य', gu: 'સૌજન્ય', pa: 'ਵੱਲੋਂ' };
const RSVP_TITLE: L = { en: 'RSVP', hi: 'संपर्क सूत्र', mr: 'संपर्क', gu: 'સંપર્ક', pa: 'ਸੰਪਰਕ' };
const SAVE_DATE: L = { en: 'Save the Date', hi: 'तारीख याद रखें', mr: 'तारीख लक्षात ठेवा', gu: 'તારીખ યાદ રાખો' };
const FAMILY_TITLE: L = { en: 'With love from', hi: 'शुभाकांक्षी', mr: 'शुभेच्छुक', gu: 'શુભેચ્છક' };

// ------------------------------------------------------------ blessing page

/**
 * The blessing page: the faith's sacred art, then its blessing line. The line is the card's own
 * `invocation` when it has one (the family may have reworded it), else the faith's stock line.
 */
export function blessingBands(ctx: RecipeCtx, kind: BlessingKind, gold: string): Band[] {
  if (kind === 'none') return [];
  const out: Band[] = [];
  const own = ctx.data.content.invocation?.trim();
  if (kind === 'ganesha') {
    out.push({ t: 'art', asset: 'ganesha', w: 460, h: 506, colors: [gold, ctx.p.accent], opts: { light: !isDark(ctx.p.background) }, gap: 0, anim: 'drop' });
  } else if (kind === 'bismillah') {
    out.push({ t: 'art', asset: 'motif', w: 200, h: 200, colors: [gold, ctx.p.accent], opts: { motif: 'crescent' }, gap: 0, anim: 'drop' });
    // The Bismillah is the blessing itself; only add the card's line when it says something else.
    out.push({ t: 'text', role: 'headline', text: BISMILLAH, font: 'Amiri', size: 84, gap: 50, tone: 'accent' });
    out.push({ t: 'divider', style: 'ornate', gap: 46, w: 380 });
    if (own && own !== BISMILLAH) out.push({ t: 'text', role: 'headline', bind: 'invocation', gap: 40, size: 56 });
    return out;
  } else {
    const motif = BLESSING_MOTIF[kind];
    out.push({ t: 'art', asset: 'motif', w: 300, h: 300, colors: [gold, ctx.p.accent], opts: { motif }, gap: 0, anim: 'drop' });
  }
  out.push({ t: 'divider', style: 'ornate', gap: 46, w: 380 });
  if (own) out.push({ t: 'text', role: 'headline', bind: 'invocation', gap: 40, size: 64 });
  else {
    const line = invocationFor({ eventType: ctx.eventType, faith: ctx.faith, language: ctx.language });
    if (line) out.push({ t: 'text', role: 'headline', text: line, gap: 40, size: 64 });
  }
  return out;
}

const BLESSING_MOTIF: Record<Exclude<BlessingKind, 'ganesha' | 'bismillah' | 'none'>, string> = {
  om: 'om',
  cross: 'cross',
  khanda: 'khanda',
  jain: 'kalash',
  buddhist: 'lotus',
};

function isDark(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

// ------------------------------------------------------------ ceremonies

export const FUNCTIONS_PER_PAGE = 3;

export function ceremonyBands(ctx: RecipeCtx, from: number, to: number, divider: string, typeKey: TypeSetKey, gold: string): Band[] {
  const ts = TYPE_SETS[typeKey];
  const bands: Band[] = [
    { t: 'text', role: 'headline', text: pick(SCHEDULE_TITLE, ctx.language), gap: 0 },
    { t: 'divider', style: divider, gap: 22 },
  ];
  for (let k = from; k < to; k++) {
    const f = ctx.data.functions[k]!;
    const group = `fn${k}`;
    bands.push(
      { t: 'art', asset: 'fn-icon', w: 120, h: 120, colors: [gold, ctx.p.accent], opts: { icon: functionIcon(f.name) }, gap: k === from ? 54 : 70, anim: 'zoom', group },
      { t: 'text', role: 'connector', bind: `fn${k}.name`, gap: 10, size: ts.connector.size * 1.2, group },
      { t: 'text', role: 'date', bind: `fn${k}.datetime`, gap: 10, size: ts.date.size * 0.9, group },
      { t: 'text', role: 'venue', bind: `fn${k}.venue`, gap: 10, group },
      { t: 'text', role: 'small', bind: `fn${k}.address`, gap: 2, group },
      { t: 'text', role: 'detail', bind: `fn${k}.notes`, gap: 8, group },
      { t: 'text', role: 'small', bind: `fn${k}.dress`, gap: 6, tone: 'accent', group },
    );
  }
  return bands;
}

// ------------------------------------------------------------ family & RSVP

export function hasFamilyExtras(ctx: RecipeCtx): boolean {
  const c = ctx.data.content;
  return Boolean(c.welcomeLines?.length || c.complimentsLines?.length || c.rsvpContacts?.some((r) => r.name || r.phone) || c.note?.trim() || ctx.data.rsvpBy);
}

export function familyBands(ctx: RecipeCtx, divider: string, withFamily: boolean, typeKey: TypeSetKey): Band[] {
  const c = ctx.data.content;
  const eyebrow = TYPE_SETS[typeKey].eyebrow.size * 1.2;
  const lang = ctx.language;
  const out: Band[] = [];
  if (withFamily && c.familyLines.length) {
    out.push(
      c.familyTitle?.trim() ? { t: 'text', role: 'headline', bind: 'familyTitle', gap: 0 } : { t: 'text', role: 'headline', text: pick(FAMILY_TITLE, lang), gap: 0 },
      { t: 'divider', style: divider, gap: 22 },
      { t: 'text', role: 'body', bind: 'familyLines', gap: 30, size: TYPE_SETS[typeKey].body.size * 1.15 },
    );
  }
  if (c.welcomeLines?.length) {
    out.push(
      c.welcomeTitle?.trim()
        ? { t: 'text', role: 'eyebrow', bind: 'welcomeTitle', gap: 56, size: eyebrow }
        : { t: 'text', role: 'eyebrow', text: pick(withFamily && c.familyTitle?.trim() === pick(WELCOME_TITLE, lang) ? DARSHAN_TITLE : WELCOME_TITLE, lang), gap: 56, size: eyebrow },
      { t: 'text', role: 'body', bind: 'welcomeLines', gap: 14 },
    );
  }
  if (c.complimentsLines?.length) {
    out.push(
      c.complimentsTitle?.trim() ? { t: 'text', role: 'eyebrow', bind: 'complimentsTitle', gap: 48, size: eyebrow } : { t: 'text', role: 'eyebrow', text: pick(COMPLIMENTS_TITLE, lang), gap: 48, size: eyebrow },
      { t: 'text', role: 'body', bind: 'complimentsLines', gap: 14 },
    );
  }
  if (c.note?.trim()) out.push({ t: 'text', role: 'detail', bind: 'note', gap: 48, size: TYPE_SETS[typeKey].detail.size * 1.3 });
  const contacts = c.rsvpContacts?.some((r) => r.name || r.phone);
  if (contacts || ctx.data.rsvpBy) {
    out.push({ t: 'divider', style: 'simple', gap: 48, w: 260 });
    if (contacts) out.push({ t: 'text', role: 'eyebrow', text: pick(RSVP_TITLE, lang), gap: 30, size: eyebrow }, { t: 'text', role: 'venue', bind: 'rsvpContacts', gap: 14 });
    out.push({ t: 'text', role: 'body', bind: 'rsvpBy', gap: 12 });
  }
  out.push({ t: 'text', role: 'connector', bind: 'closing', gap: 56 });
  // Nothing above the closing line → drop the leading gap.
  if (out[0] && 'gap' in out[0]) out[0] = { ...out[0], gap: 0 } as Band;
  return out;
}

// ------------------------------------------------------------ photo / save the date

export function photoBands(ctx: RecipeCtx, dateStyle: 'strip' | 'line' | 'stack' | 'boxed'): Band[] {
  const two = ctx.people === 2;
  return [
    { t: 'text', role: 'eyebrow', text: pick(SAVE_DATE, ctx.language), gap: 0 },
    { t: 'photo', w: 640, h: 800, mask: 'arch', gap: 40 },
    ...(two
      ? ([
          { t: 'text', role: 'names', bind: 'name1', gap: 40, size: 110 },
          { t: 'text', role: 'connector', bind: 'connector', gap: 4 },
          { t: 'text', role: 'names', bind: 'name2', gap: 4, size: 110 },
        ] satisfies Band[])
      : ([{ t: 'text', role: 'name', bind: 'name1', gap: 40, size: 120 }] satisfies Band[])),
    { t: 'date', style: dateStyle, gap: 40 },
    { t: 'text', role: 'eyebrow', bind: 'hashtag', gap: 34 },
  ];
}
