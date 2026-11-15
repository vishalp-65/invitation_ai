import { faithOf, resolveInvocation } from '../constants/faith.js';
import { getLanguage, type LanguageCode } from '../constants/languages.js';
import type { EventContent, EventFunctionInput } from '../schemas/events.js';
import { formatFunctionDate, mainFunctionIndex, type InviteFunction } from '../invite/build-invite-props.js';

/** Live event data a card can show. Bound text always reflects it, so card, video and website agree. */
export interface DesignData {
  content: EventContent;
  functions: InviteFunction[];
  /** Index of the headline function (the wedding itself, etc.). */
  mainFunction: number;
  salutation: string | null;
  photos: string[];
  /** "Kindly RSVP by 17 June" (from the event's RSVP deadline), or null. */
  rsvpBy?: string | null;
}

/**
 * Binding keys.
 *   Content: invocation, headline, hostLine, name1, name2, connector, detail1, detail2, message,
 *            familyTitle, familyLines, closing, salutation, welcomeTitle, welcomeLines,
 *            complimentsTitle, complimentsLines, rsvpContacts, rsvpBy, note, hashtag, monogram
 *   Function: fnM.<field> (headline function) or fn<i>.<field> (0-based), where field is one of
 *            name, date, time, datetime, venue, address, venueFull, weekday, day, month, year, monthYear, dress
 *   Photos:  photo.<i>
 */
export type BindingKind = 'text' | 'multiline' | 'date' | 'time' | 'readonly';

const CONTENT_KEYS: Record<string, { label: string; kind: BindingKind }> = {
  invocation: { label: 'Blessing line', kind: 'text' },
  headline: { label: 'Heading', kind: 'text' },
  hostLine: { label: 'Invitation line', kind: 'multiline' },
  name1: { label: 'First name', kind: 'text' },
  name2: { label: 'Second name', kind: 'text' },
  connector: { label: 'Joining word', kind: 'text' },
  detail1: { label: 'First name details', kind: 'multiline' },
  detail2: { label: 'Second name details', kind: 'multiline' },
  message: { label: 'Message', kind: 'multiline' },
  familyTitle: { label: 'Family heading', kind: 'text' },
  familyLines: { label: 'Family names', kind: 'multiline' },
  closing: { label: 'Closing line', kind: 'multiline' },
  welcomeTitle: { label: 'Welcome heading', kind: 'text' },
  welcomeLines: { label: 'Welcome names', kind: 'multiline' },
  complimentsTitle: { label: 'Compliments heading', kind: 'text' },
  complimentsLines: { label: 'Compliments names', kind: 'multiline' },
  rsvpContacts: { label: 'RSVP contacts', kind: 'multiline' },
  note: { label: 'Note', kind: 'multiline' },
  hashtag: { label: 'Hashtag', kind: 'text' },
  rsvpBy: { label: 'RSVP by', kind: 'readonly' },
  monogram: { label: 'Initials', kind: 'readonly' },
  salutation: { label: "Guest's name", kind: 'readonly' },
};

const FN_FIELDS: Record<string, { label: string; kind: BindingKind }> = {
  name: { label: 'Function name', kind: 'text' },
  date: { label: 'Date', kind: 'date' },
  time: { label: 'Time', kind: 'time' },
  datetime: { label: 'Date and time', kind: 'date' },
  venue: { label: 'Venue', kind: 'text' },
  address: { label: 'Address', kind: 'multiline' },
  venueFull: { label: 'Venue and address', kind: 'readonly' },
  weekday: { label: 'Day', kind: 'date' },
  day: { label: 'Date', kind: 'date' },
  month: { label: 'Month', kind: 'date' },
  year: { label: 'Year', kind: 'date' },
  monthYear: { label: 'Month and year', kind: 'date' },
  dress: { label: 'Dress code', kind: 'text' },
  notes: { label: 'Description', kind: 'multiline' },
};

export interface ParsedBinding {
  scope: 'content' | 'fn' | 'photo';
  key: string;
  /** Function index (resolved for fnM) or photo index. */
  index: number;
}

export function parseBinding(bind: string, data?: Pick<DesignData, 'mainFunction'>): ParsedBinding | null {
  if (bind in CONTENT_KEYS) return { scope: 'content', key: bind, index: 0 };
  const fn = /^fn(M|\d{1,2})\.(\w+)$/.exec(bind);
  if (fn && fn[2]! in FN_FIELDS) return { scope: 'fn', key: fn[2]!, index: fn[1] === 'M' ? (data?.mainFunction ?? 0) : Number(fn[1]) };
  const photo = /^photo\.(\d)$/.exec(bind);
  if (photo) return { scope: 'photo', key: 'photo', index: Number(photo[1]) };
  return null;
}

export function bindingInfo(bind: string): { label: string; kind: BindingKind; fnIndex?: number | 'M' } | null {
  if (bind in CONTENT_KEYS) return CONTENT_KEYS[bind]!;
  const fn = /^fn(M|\d{1,2})\.(\w+)$/.exec(bind);
  if (fn && fn[2]! in FN_FIELDS) return { ...FN_FIELDS[fn[2]!]!, fnIndex: fn[1] === 'M' ? 'M' : Number(fn[1]) };
  return null;
}

/** "Ananya", "Rohan" → "A & R" (first letter of each name, any script). */
export function monogramOf(names: string[]): string {
  return names
    .map((n) => [...n.trim()][0] ?? '')
    .filter(Boolean)
    .join(' & ');
}

/** RSVP contacts → "Name · phone" lines. */
export function rsvpContactLines(c: EventContent): string {
  return (c.rsvpContacts ?? [])
    .filter((r) => r.name || r.phone)
    .map((r) => [r.name, r.phone].filter(Boolean).join('  ·  '))
    .join('\n');
}

/** "Name · phone" / "Name - phone" / "Name 98xxxx" lines → contacts. */
export function parseRsvpContacts(text: string): NonNullable<EventContent['rsvpContacts']> {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((l) => {
      const m = /^(.*?)[\s·:,–—-]*(\+?\d[\d\s-]{5,})$/.exec(l);
      return m ? { name: m[1]!.replace(/[\s·:,–—-]+$/, '').slice(0, 60), phone: m[2]!.trim().slice(0, 24) } : { name: l.slice(0, 60), phone: '' };
    });
}

function contentValue(c: EventContent, key: string, data: Pick<DesignData, 'salutation' | 'rsvpBy'>): string {
  switch (key) {
    case 'welcomeLines':
      return (c.welcomeLines ?? []).join('\n');
    case 'complimentsLines':
      return (c.complimentsLines ?? []).join('\n');
    case 'rsvpContacts':
      return rsvpContactLines(c);
    case 'rsvpBy':
      return data.rsvpBy ?? '';
    case 'monogram':
      return monogramOf(c.primaryNames);
    case 'name1':
      return c.primaryNames[0] ?? '';
    case 'name2':
      return c.primaryNames[1] ?? '';
    case 'detail1':
      return c.primaryDetails[0] ?? '';
    case 'detail2':
      return c.primaryDetails[1] ?? '';
    case 'familyLines':
      return c.familyLines.join('\n');
    case 'salutation':
      return data.salutation ?? '';
    default: {
      const v = (c as Record<string, unknown>)[key];
      return typeof v === 'string' ? v : '';
    }
  }
}

function fnValue(f: InviteFunction, key: string): string {
  switch (key) {
    case 'name':
      return f.name;
    case 'date':
      return f.dateLabel;
    case 'time':
      return f.timeLabel;
    case 'datetime':
      return `${f.dateLabel}, ${f.timeLabel}`;
    case 'venue':
      return f.venue;
    case 'address':
      return f.address ?? '';
    case 'venueFull':
      return [f.venue, f.address].filter(Boolean).join(', ');
    case 'weekday':
      return f.parts.weekday;
    case 'day':
      return f.parts.day;
    case 'month':
      return f.parts.month;
    case 'year':
      return f.parts.year;
    case 'monthYear':
      return `${f.parts.month} ${f.parts.year}`;
    case 'dress':
      return f.dressCode ?? '';
    case 'notes':
      return f.notes ?? '';
    default:
      return '';
  }
}

/** Current text for a binding, or null when the binding points at nothing (e.g. a removed function). */
export function resolveBinding(bind: string, data: DesignData): string | null {
  const p = parseBinding(bind, data);
  if (!p) return null;
  if (p.scope === 'content') return contentValue(data.content, p.key, data);
  if (p.scope === 'fn') {
    const f = data.functions[p.index];
    return f ? fnValue(f, p.key) : null;
  }
  return data.photos[p.index] ?? null;
}

/** Text shown for an element: bound value when it resolves, else its own text. */
export function displayText(el: { text: string; bind?: string }, data: DesignData | null): string {
  if (!el.bind || !data) return el.text;
  const v = resolveBinding(el.bind, data);
  return v ?? el.text;
}

export type BindingWrite =
  | { scope: 'content'; content: EventContent }
  | { scope: 'fn'; index: number; field: 'name' | 'venueName' | 'venueAddress' | 'dressCode' | 'notes'; value: string }
  | null;

/**
 * Turns an edit made on the card back into event data. Returns null for read-only / date
 * bindings (the editor opens a date picker for those instead).
 */
export function writeBinding(bind: string, value: string, data: DesignData): BindingWrite {
  const p = parseBinding(bind, data);
  if (!p) return null;
  const v = value.trim();
  if (p.scope === 'content') {
    const c: EventContent = { ...data.content, primaryNames: [...data.content.primaryNames], primaryDetails: [...data.content.primaryDetails] };
    const setAt = (arr: string[], i: number) => {
      while (arr.length <= i) arr.push('');
      arr[i] = v;
      while (arr.length && !arr[arr.length - 1]) arr.pop();
    };
    switch (p.key) {
      case 'name1':
        setAt(c.primaryNames, 0);
        break;
      case 'name2':
        setAt(c.primaryNames, 1);
        break;
      case 'detail1':
        setAt(c.primaryDetails, 0);
        break;
      case 'detail2':
        setAt(c.primaryDetails, 1);
        break;
      case 'familyLines':
        c.familyLines = v.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 16);
        break;
      case 'welcomeLines':
        c.welcomeLines = v.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 16);
        break;
      case 'complimentsLines':
        c.complimentsLines = v.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 12);
        break;
      case 'rsvpContacts':
        c.rsvpContacts = parseRsvpContacts(v);
        break;
      case 'headline':
        c.headline = v;
        break;
      case 'salutation':
      case 'rsvpBy':
      case 'monogram':
        return null;
      default:
        (c as Record<string, unknown>)[p.key] = v || undefined;
    }
    return { scope: 'content', content: c };
  }
  if (p.scope === 'fn') {
    const field = ({ name: 'name', venue: 'venueName', address: 'venueAddress', dress: 'dressCode', notes: 'notes' } as const)[p.key as 'name'];
    if (!field) return null;
    if ((field === 'name' || field === 'venueName') && !v) return null;
    return { scope: 'fn', index: p.index, field, value: v };
  }
  return null;
}

/** Pickable bindings for the editor's "link to event detail" menu. */
export function bindingChoices(functionCount: number): Array<{ bind: string; label: string }> {
  const out = Object.entries(CONTENT_KEYS)
    .filter(([, v]) => v.kind !== 'readonly')
    .map(([bind, v]) => ({ bind, label: v.label }));
  for (const [k, v] of Object.entries(FN_FIELDS)) out.push({ bind: `fnM.${k}`, label: `Main function: ${v.label.toLowerCase()}` });
  for (let i = 0; i < functionCount; i++) {
    for (const k of ['name', 'datetime', 'venue', 'notes']) out.push({ bind: `fn${i}.${k}`, label: `Function ${i + 1}: ${FN_FIELDS[k]!.label.toLowerCase()}` });
  }
  return out;
}

/** Event (or wizard draft) → the data a card shows. */
export function designDataFrom(input: {
  content: EventContent;
  functions: Array<Pick<EventFunctionInput, 'name' | 'startsAt' | 'venueName' | 'venueAddress' | 'dressCode'> & { notes?: string | null }>;
  language: LanguageCode;
  eventType: string;
  timezone?: string;
  salutation?: string | null;
  photos?: string[];
  /** ISO RSVP deadline (event settings). */
  rsvpDeadline?: string | null;
  /** The family's tradition; with the event type it decides the blessing line. */
  community?: string | null;
}): DesignData {
  const faith = faithOf(input.eventType, input.community);
  return {
    // A stock blessing line of another faith (left from an earlier choice) follows the event's faith;
    // anything the family typed themselves is kept.
    content: { ...input.content, invocation: resolveInvocation(input.content.invocation, { eventType: input.eventType, faith, language: input.language, community: input.community }) },
    functions: input.functions.map((f) => ({
      name: f.name,
      ...formatFunctionDate(f.startsAt, input.language, input.timezone),
      venue: f.venueName,
      address: f.venueAddress ?? null,
      dressCode: f.dressCode ?? null,
      notes: f.notes ?? null,
    })),
    mainFunction: mainFunctionIndex(
      input.functions.map((f) => f.name),
      input.eventType,
    ),
    salutation: input.salutation ?? null,
    photos: input.photos ?? [],
    rsvpBy: input.rsvpDeadline ? rsvpByLabel(input.rsvpDeadline, input.language, input.timezone) : null,
  };
}

const RSVP_BY: Partial<Record<LanguageCode, string>> = {
  en: 'Kindly RSVP by',
  hi: 'कृपया उत्तर दें',
  mr: 'कृपया कळवावे',
  gu: 'કૃપા કરી જણાવશો',
};

function rsvpByLabel(iso: string, language: LanguageCode, timezone = 'Asia/Kolkata'): string {
  const { locale } = getLanguage(language);
  const date = new Intl.DateTimeFormat(locale, { timeZone: timezone, day: 'numeric', month: 'long' }).format(new Date(iso));
  const prefix = RSVP_BY[language];
  return prefix && language !== 'en' ? `${prefix} · ${date}` : `${RSVP_BY.en} ${date}`;
}
