import {
  faithOf,
  getEventType,
  markSuitsFaith,
  type Faith,
  getLanguage,
  type GenerateWordingInput,
  type Theme,
  type TransliterateInput,
} from '@cardai/shared';
import { z } from 'zod';

/** Bump when a prompt changes so cached generations are invalidated. */
export const PROMPT_VERSION = 'v2';

// ---------------- Wording ----------------

export const wordingOutputSchema = z.object({
  invocation: z.string().describe('Always an empty string: the app adds the blessing line for the family faith'),
  headline: z.string().describe('2–4 word title, e.g. "Shubh Vivah"'),
  hostLine: z.string().describe('Who is inviting, as one sentence'),
  primaryNames: z.array(z.string()).describe('Names of the couple / person, in the target script'),
  primaryDetails: z.array(z.string()).describe('Optional parentage lines, same order as names'),
  connector: z.string().describe('Word between two names, e.g. "weds" / "संग", or empty'),
  message: z.string().describe('2–3 sentence invitation message'),
  familyTitle: z.string().describe('Heading for the family list, e.g. "Swagatotsuk" / "With best compliments"'),
  familyLines: z.array(z.string()).describe('Family names / relations, one per line, at most 10'),
  closing: z.string().describe('Warm closing line'),
});
export type WordingOutput = z.infer<typeof wordingOutputSchema>;

const TONE_GUIDE: Record<GenerateWordingInput['tone'], string> = {
  traditional: 'formal, respectful, customary phrases used on printed Indian cards',
  warm: 'heartfelt and family-oriented, simple words',
  poetic: 'lyrical, may include a short shayari/doha/kavita couplet in the message',
  modern: 'contemporary, concise, elegant, urban',
  fun: 'playful and light, suitable for parties',
};

export function wordingPrompt(input: GenerateWordingInput) {
  const lang = getLanguage(input.language);
  const event = getEventType(input.eventType);
  const system = [
    'You write invitation card text for Indian families.',
    `Write ONLY in ${lang.name} using ${lang.script} script (except proper nouns the user typed in another script, which you transliterate into ${lang.script}).`,
    'Respect the customs of the community and religion. Never invent facts (names, dates, places) the user did not give; leave fields empty instead.',
    'Keep every line short enough for a phone screen. No emojis. No hashtags.',
    'Return JSON only.',
  ].join(' ');

  const user = [
    `Event: ${event.label}.`,
    `Faith: ${faithOf(input.eventType, input.community)}. Use only this faith's customs and phrases; never mention another religion's deities or prayers.`,
    input.community ? `Community/custom: ${input.community}.` : '',
    `Tone: ${TONE_GUIDE[input.tone]}.`,
    input.facts.primaryNames.length ? `Main names: ${input.facts.primaryNames.join(' & ')}.` : '',
    input.facts.primaryDetails.length ? `Parentage: ${input.facts.primaryDetails.join(' | ')}.` : '',
    input.facts.hosts ? `Hosts: ${input.facts.hosts}.` : '',
    input.facts.familyMembers ? `Family to list: ${input.facts.familyMembers}.` : '',
    input.facts.extra ? `Other notes: ${input.facts.extra}.` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return { system, user };
}

// ---------------- Transliteration ----------------

export const transliterationOutputSchema = z.object({
  results: z.array(z.string()),
});

export function transliterationPrompt(input: TransliterateInput) {
  const lang = getLanguage(input.language);
  return {
    system: `Transliterate Indian names, places and short phrases written in Latin letters into ${lang.name} (${lang.script} script) the way a native speaker would spell them. Do not translate meaning. Keep honorifics natural (Shri→श्री for Hindi). Return {"results": [...]} with exactly one output per input, same order.`,
    user: JSON.stringify(input.texts),
  };
}

// ---------------- Translation of an existing invite ----------------

export function translationPrompt(languageCode: string, content: unknown) {
  const lang = getLanguage(languageCode);
  return {
    system: `Translate this Indian invitation card text into ${lang.name} (${lang.script} script). Transliterate personal names and places, translate everything else naturally using customary card phrasing. Keep the exact JSON shape. Return JSON only.`,
    user: JSON.stringify(content),
  };
}

// ---------------- Invitation website draft ----------------

export function siteDraftPrompt(opts: {
  eventType: string;
  language: string;
  tone: string;
  vibe: string;
  community?: string | null;
  primaryNames: string[];
  functions: Array<{ name: string; date: string; venue: string }>;
  story?: string;
}) {
  const lang = getLanguage(opts.language);
  const event = getEventType(opts.eventType);
  const system = [
    'You write the content of an animated invitation website for an Indian family event.',
    `Write ONLY in ${lang.name} (${lang.script} script); keep personal names as given (transliterate into ${lang.script} if needed).`,
    'Use ONLY the facts provided. Never invent names, dates, places, jobs, how people met, or relatives. If the story is not given, return an empty story array.',
    'FAQ answers must stay generic when the fact is unknown (e.g. "Details will be shared soon"), never made-up specifics.',
    'Dress code colours must be #RRGGBB, matching the function mood (haldi = yellows, mehendi = greens, sangeet = jewel tones...).',
    `Pick opening from: none, envelope, doors, curtain, scroll, petals. Pick character from: auto, none, couple, ganesha, diya, kalash, baby, cake, elephant, peacock, doves, house — fitting the occasion and the "${opts.vibe}" vibe.`,
    'headings: one natural, short heading in the invitation language for each of these section types: hero, welcome, couple, story, schedule, dresscode, venue, gallery, video, family, travel, rsvp, gifts, livestream, updates, faq, wishes, album, custom, closing.',
    'Short lines that read well on a phone. No emojis, no hashtags. Return JSON only.',
  ].join(' ');
  const user = [
    `Occasion: ${event.label}.`,
    `${faithLine(opts.eventType, opts.community)} Do not pick the ganesha or kalash character unless the faith is hindu (kalash also jain).`,
    opts.community ? `Community/custom: ${opts.community}.` : '',
    `Tone: ${opts.tone}. Visual vibe: ${opts.vibe}.`,
    opts.primaryNames.length ? `Main people: ${opts.primaryNames.join(' & ')}.` : '',
    `Functions: ${opts.functions.map((f) => `${f.name} on ${f.date} at ${f.venue}`).join('; ')}.`,
    opts.story ? `Their story / notes from the host:\n${opts.story}` : 'No story given.',
  ]
    .filter(Boolean)
    .join('\n');
  return { system, user };
}

// ---------------- WhatsApp / voice intake ----------------

export function intentPrompt(today: string) {
  return {
    system: [
      'Extract invitation details from a user message (may be Hindi, Hinglish or any Indian language, possibly a voice transcript).',
      `Today is ${today}. Resolve relative dates ("next Sunday") to YYYY-MM-DD. Use null when unknown. Never guess names.`,
      'eventType must be one of the allowed ids. language is the language the user wants the card in (default to the language they are writing in).',
      'community only when the message says it or names a faith ceremony (nikah, anand karaj, church wedding, jain…); never infer religion from names; otherwise null.',
    ].join(' '),
  };
}

// ---------------- Card scan (photo of a printed card) ----------------

export function cardScanPrompt(today: string) {
  return {
    system: [
      'You read photographed or scanned Indian invitation cards (wedding cards, kankotri, nimantran patrika, e-cards, event flyers) and extract their details as JSON.',
      'Several photos may be pages of the same card (front, inside, function inserts): combine them into one answer.',
      'COPY TEXT EXACTLY AS PRINTED, in the same script and spelling. Never translate, transliterate, summarise or invent text. Use null / [] for anything not on the card.',
      'language: the main language of the printed text (for bilingual cards, the language of the names and main body).',
      'eventType: the occasion, one of the allowed ids (vivah/shaadi/lagna = wedding, sagai/roka/ring ceremony = engagement, nikah, anand-karaj, church wedding = christian-wedding, griha pravesh/vastu = griha-pravesh, katha/path = puja, etc.).',
      'primaryNames: just the names of the person/couple the event is for, without honorifics such as Chi./Sau./चि./सौ.का. For weddings: [groom, bride]. primaryDetails: the parentage line printed with each name ("S/o Mr. & Mrs. …", "सुपुत्र श्री …"), same order.',
      'hosts: the inviting family/people. hostLine: the sentence that invites guests. invocation: the sacred line at the top (e.g. "॥ श्री गणेशाय नमः ॥"). headline: the card title (e.g. "शुभ विवाह", "Wedding Invitation"). connector: the word between the two names ("weds", "संग", "&").',
      'message: the main invitation paragraph. familyTitle/familyLines: e.g. "विनीत" and the names under it, one line each. welcomeTitle/welcomeLines: "स्वागतोत्सुक"/"दर्शनाभिलाषी" lists. complimentsTitle/complimentsLines: "With best compliments"/"शुभेच्छु" lists. note: e.g. the children’s request line ("बाल मनुहार"). rsvpContacts: name + phone digits.',
      `functions: every ceremony with its own date and time. Today is ${today}. date as YYYY-MM-DD (if the year is missing, use the next occurrence after today; ignore Hindu calendar dates when a Gregorian date is printed). time as 24h HH:mm ("सायं 7 बजे" = 19:00, "प्रातः 10 बजे" = 10:00), null if not printed. venueName: the hall/hotel/home name; venueAddress: street/area/city. If one venue is printed for all functions, repeat it. Keep function names as printed.`,
      'community only when the card states it or shows a faith ceremony (nikah, anand karaj, church, Jain mantra); never infer religion from surnames; otherwise null.',
      'uncertain: list every field you could not read clearly or had to guess. isInvitation: false only if the photos are clearly not an invitation or event document.',
    ].join('\n'),
  };
}

// ---------------- Images ----------------

export function backgroundImagePrompt(opts: { eventLabel: string; theme: Theme; extra?: string; faith: Faith }) {
  const p = opts.theme.palette;
  return [
    `Vertical 9:16 decorative background artwork for an Indian ${opts.eventLabel} invitation card.`,
    `Colour palette: ${p.background}, ${p.backgroundAlt}, ${p.primary}, ${p.accent}.`,
    `Motif inspiration: ${motifHint(opts.theme.motif, opts.faith)}${opts.theme.pattern} patterns, rich traditional Indian ornamentation, soft lighting.`,
    FAITH_IMAGERY[opts.faith],
    'Leave the central 60% calm and uncluttered so text can be placed on top.',
    'Absolutely no text, letters, numbers, logos or watermarks.',
    opts.extra ? `Scene direction: ${opts.extra}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function caricaturePrompt(extra?: string) {
  return [
    'Create a charming, high-quality caricature illustration of the people in the reference photo, in festive Indian traditional attire,',
    'faithful to their faces, warm colours, clean cut-out style on a plain transparent background, full upper body.',
    'No text.',
    extra ?? '',
  ].join(' ');
}

export function portraitCutoutPrompt() {
  return 'Same people as the reference photo, unchanged, cleanly cut out on a transparent background, studio quality. No text.';
}

export function clipPrompt(opts: { eventLabel: string; theme: Theme; extra?: string; faith: Faith }) {
  return [
    `Slow cinematic establishing shot for an Indian ${opts.eventLabel} invitation:`,
    opts.extra ?? CLIP_SCENE[opts.faith],
    FAITH_IMAGERY[opts.faith],
    `colour mood ${opts.theme.palette.background} and ${opts.theme.palette.primary}.`,
    'No people speaking, no text, no logos.',
  ].join(' ');
}

// ---------------- Faith ----------------

function faithLine(eventType: string, community?: string | null): string {
  return `Faith: ${faithOf(eventType, community)}. Use only this faith's customs, symbols and phrases; never another religion's deities, prayers or symbols.`;
}

/** Imagery the image/clip models must stay within (they otherwise default to Hindu temple art). */
const FAITH_IMAGERY: Record<Faith, string> = {
  hindu: 'Hindu wedding/puja aesthetics are welcome.',
  muslim: 'Islamic aesthetics only: arches, jaali, lanterns, geometric patterns, crescent. No Hindu deities, Om, swastika, kalash or temple imagery; no human or animal figures.',
  christian: 'Christian aesthetics: church, white florals, doves, candles. No Hindu or Islamic religious symbols.',
  sikh: 'Sikh aesthetics: phulkari, gurdwara-inspired domes, Khanda allowed. No Hindu deities, Om or idols.',
  jain: 'Jain aesthetics: lotus, kalash, simple temple shikhara. No Hindu deities such as Ganesha.',
  buddhist: 'Buddhist aesthetics: lotus, Dharma wheel, stupa silhouettes. No Hindu deities.',
  secular: 'No religious symbols or deities of any faith.',
};

const CLIP_SCENE: Record<Faith, string> = {
  hindu: 'a decorated venue with marigold garlands, diyas and fairy lights, gentle camera push-in, petals floating',
  muslim: 'a decorated venue with arches, hanging lanterns, white florals and fairy lights, gentle camera push-in',
  christian: 'a church aisle with white flowers, candles and soft daylight, gentle camera push-in',
  sikh: 'a decorated venue with phulkari drapes, marigolds and fairy lights, gentle camera push-in',
  jain: 'a serene venue with lotus decor, white and gold drapes and soft lamps, gentle camera push-in',
  buddhist: 'a serene venue with lotus decor, soft lanterns and drapes, gentle camera push-in',
  secular: 'an elegant decorated venue with flowers and fairy lights, gentle camera push-in',
};

/** The template's motif, unless it is another faith's sacred symbol. */
function motifHint(motif: string, faith: Faith): string {
  return motif !== 'none' && markSuitsFaith(motif, faith) ? `${motif}, ` : '';
}
