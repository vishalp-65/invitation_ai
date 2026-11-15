import { BRAND } from '../constants/brand.js';
import { getLanguage, RTL_LANGUAGES, type LanguageCode } from '../constants/languages.js';
import { VIDEO } from '../constants/render.js';
import type { EventContent, EventFunctionInput } from '../schemas/events.js';
import type { LayoutId, Theme } from '../templates/types.js';

/** Everything a Remotion layout needs. Serialisable (passed as inputProps). */
export interface InviteProps {
  [key: string]: unknown;
  template: { id: string; layout: LayoutId; theme: Theme };
  language: LanguageCode;
  dir: 'ltr' | 'rtl';
  fonts: { display: string; body: string };
  eventType: string;
  content: EventContent;
  functions: InviteFunction[];
  photos: string[];
  backgroundUrl: string | null;
  aiClipUrl: string | null;
  musicUrl: string | null;
  siteUrl: string | null;
  qrDataUrl: string | null;
  salutation: string | null;
  watermark: boolean;
  watermarkText: string;
  /** For stills: which card page to draw. */
  page: number;
  /** Index of the headline function shown on the cover (e.g. the wedding itself). */
  mainFunction: number;
}

export interface InviteFunction {
  name: string;
  dateLabel: string;
  timeLabel: string;
  /** Split date for the premium "day | date | time" strip. */
  parts: { weekday: string; day: string; month: string; year: string };
  venue: string;
  address: string | null;
  dressCode: string | null;
  /** Short description of the function. */
  notes?: string | null;
}

export interface BuildInvitePropsInput {
  template: { id: string; layout: LayoutId; theme: Theme };
  eventType: string;
  language: LanguageCode;
  content: EventContent;
  functions: Pick<EventFunctionInput, 'name' | 'startsAt' | 'venueName' | 'venueAddress' | 'dressCode'>[];
  timezone?: string;
  photos?: string[];
  backgroundUrl?: string | null;
  aiClipUrl?: string | null;
  musicUrl?: string | null;
  siteUrl?: string | null;
  qrDataUrl?: string | null;
  salutation?: string | null;
  watermark: boolean;
}

export function formatFunctionDate(iso: string, language: LanguageCode, timezone = 'Asia/Kolkata') {
  const { locale } = getLanguage(language);
  const d = new Date(iso);
  const dateLabel = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
  const timeLabel = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
  const part = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: timezone, ...opts }).format(d);
  return {
    dateLabel,
    timeLabel,
    parts: { weekday: part({ weekday: 'long' }), day: part({ day: 'numeric' }), month: part({ month: 'long' }), year: part({ year: 'numeric' }) },
  };
}

const MAIN_FUNCTION = /wedding|vivah|विवाह|shaadi|शादी|nikah|निकाह|anand karaj|matrimony|lagna|लग्न|लग्नसोहळा|kalyan|கல்யாண|பெண்ணின்|బిబాహ|বিবাহ|বিয়ে|reception|griha|गृह प्रवेश|puja|पूजा|mundan|naamkaran|birthday|जन्मदिन/i;

/** Picks the function to feature on the cover: the ceremony itself, else the last (weddings) or first. */
export function mainFunctionIndex(names: string[], eventType: string): number {
  if (names.length <= 1) return 0;
  const ceremony = names.findIndex((n) => /wedding|vivah|विवाह|shaadi|शादी|nikah|निकाह|anand karaj|matrimony|lagna|लग्न|বিবাহ|বিয়ে|కల్యాణ|கல்யாண/i.test(n));
  if (ceremony >= 0) return ceremony;
  const any = names.findIndex((n) => MAIN_FUNCTION.test(n));
  if (any >= 0) return any;
  return ['wedding', 'nikah', 'anand-karaj', 'christian-wedding'].includes(eventType) ? names.length - 1 : 0;
}

export function buildInviteProps(input: BuildInvitePropsInput): InviteProps {
  const lang = getLanguage(input.language);
  return {
    template: input.template,
    language: input.language,
    dir: RTL_LANGUAGES.has(input.language) ? 'rtl' : 'ltr',
    fonts: {
      display: input.template.theme.fontDisplay ?? lang.fonts.display,
      body: input.template.theme.fontBody ?? lang.fonts.body,
    },
    eventType: input.eventType,
    content: input.content,
    functions: input.functions.map((f) => ({
      name: f.name,
      ...formatFunctionDate(f.startsAt, input.language, input.timezone),
      venue: f.venueName,
      address: f.venueAddress ?? null,
      dressCode: f.dressCode ?? null,
    })),
    photos: input.photos ?? [],
    backgroundUrl: input.backgroundUrl ?? null,
    aiClipUrl: input.aiClipUrl ?? null,
    musicUrl: input.musicUrl ?? null,
    siteUrl: input.siteUrl ?? null,
    qrDataUrl: input.qrDataUrl ?? null,
    salutation: input.salutation ?? null,
    watermark: input.watermark,
    watermarkText: BRAND.watermarkText,
    page: 0,
    mainFunction: mainFunctionIndex(
      input.functions.map((f) => f.name),
      input.eventType,
    ),
  };
}

// ---------------- Card pagination ----------------

export type CardPage =
  /** Cover always carries names + the main function's date strip and venue. */
  | { kind: 'cover'; inlineFunction: boolean; showFamily: boolean }
  | { kind: 'functions'; items: number[] }
  | { kind: 'family' };

const FUNCTIONS_PER_PAGE = 3;

/**
 * Page 1 is a complete invitation on its own (forwardable as a single image).
 * Further pages list every function and the family.
 */
export function planCardPages(props: Pick<InviteProps, 'functions' | 'content'>): CardPage[] {
  const fnCount = props.functions.length;
  const familyCount = props.content.familyLines.length;

  if (fnCount <= 1 && familyCount <= 3) {
    return [{ kind: 'cover', inlineFunction: true, showFamily: familyCount > 0 }];
  }
  const pages: CardPage[] = [{ kind: 'cover', inlineFunction: true, showFamily: false }];
  const hasFamily = familyCount > 0;
  if (fnCount <= 1) {
    if (hasFamily) pages.push({ kind: 'family' });
    return pages;
  }
  for (let i = 0; i < fnCount; i += FUNCTIONS_PER_PAGE) {
    pages.push({
      kind: 'functions',
      items: Array.from({ length: Math.min(FUNCTIONS_PER_PAGE, fnCount - i) }, (_, k) => i + k),
    });
  }
  if (hasFamily) pages.push({ kind: 'family' });
  return pages;
}

// ---------------- Video timeline ----------------

export type VideoScene =
  | { kind: 'clip'; from: number; duration: number }
  | { kind: 'intro'; from: number; duration: number }
  | { kind: 'names'; from: number; duration: number }
  | { kind: 'savedate'; from: number; duration: number }
  | { kind: 'function'; index: number; from: number; duration: number }
  | { kind: 'family'; from: number; duration: number }
  | { kind: 'outro'; from: number; duration: number };

export const AI_CLIP_SECONDS = 6;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export function planVideoScenes(
  props: Pick<InviteProps, 'functions' | 'content' | 'aiClipUrl'>,
  fps: number = VIDEO.fps,
): { scenes: VideoScene[]; durationInFrames: number } {
  const s = (sec: number) => Math.round(sec * fps);
  const scenes: VideoScene[] = [];
  let at = 0;
  const push = (scene: DistributiveOmit<VideoScene, 'from'>) => {
    scenes.push({ ...scene, from: at } as VideoScene);
    at += scene.duration;
  };

  if (props.aiClipUrl) push({ kind: 'clip', duration: s(AI_CLIP_SECONDS) });
  push({ kind: 'intro', duration: s(VIDEO.sceneSeconds.intro) });
  if (props.content.primaryNames.length > 0 || props.content.hostLine) {
    push({ kind: 'names', duration: s(VIDEO.sceneSeconds.names) });
  }
  // "Save the date": the headline function's day | date | time strip and venue.
  if (props.functions.length > 0) push({ kind: 'savedate', duration: s(VIDEO.sceneSeconds.names) });
  // Individual function scenes only add information when there is more than one.
  if (props.functions.length > 1) {
    props.functions.forEach((_, index) => push({ kind: 'function', index, duration: s(VIDEO.sceneSeconds.fn) }));
  }
  if (props.content.familyLines.length > 0) push({ kind: 'family', duration: s(VIDEO.sceneSeconds.family) });
  push({ kind: 'outro', duration: s(VIDEO.sceneSeconds.outro) });

  return { scenes, durationInFrames: at };
}
