import {
  getEventType,
  getLanguage,
  type GenerateWordingInput,
  type Theme,
  type TransliterateInput,
} from '@cardai/shared';
import { z } from 'zod';

/** Bump when a prompt changes so cached generations are invalidated. */
export const PROMPT_VERSION = 'v1';

// ---------------- Wording ----------------

export const wordingOutputSchema = z.object({
  invocation: z.string().describe('Short blessing line at the very top, or empty string if not customary'),
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

// ---------------- WhatsApp / voice intake ----------------

export function intentPrompt(today: string) {
  return {
    system: [
      'Extract invitation details from a user message (may be Hindi, Hinglish or any Indian language, possibly a voice transcript).',
      `Today is ${today}. Resolve relative dates ("next Sunday") to YYYY-MM-DD. Use null when unknown. Never guess names.`,
      'eventType must be one of the allowed ids. language is the language the user wants the card in (default to the language they are writing in).',
    ].join(' '),
  };
}

// ---------------- Images ----------------

export function backgroundImagePrompt(opts: { eventLabel: string; theme: Theme; extra?: string }) {
  const p = opts.theme.palette;
  return [
    `Vertical 9:16 decorative background artwork for an Indian ${opts.eventLabel} invitation card.`,
    `Colour palette: ${p.background}, ${p.backgroundAlt}, ${p.primary}, ${p.accent}.`,
    `Motif inspiration: ${opts.theme.motif}, ${opts.theme.pattern} patterns, rich traditional Indian ornamentation, soft lighting.`,
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

export function clipPrompt(opts: { eventLabel: string; theme: Theme; extra?: string }) {
  return [
    `Slow cinematic establishing shot for an Indian ${opts.eventLabel} invitation:`,
    opts.extra ?? 'a decorated venue with marigold garlands, diyas and fairy lights, gentle camera push-in, petals floating',
    `colour mood ${opts.theme.palette.background} and ${opts.theme.palette.primary}.`,
    'No people speaking, no text, no logos.',
  ].join(' ');
}
