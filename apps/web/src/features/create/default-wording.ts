import {
  eventTitle,
  faithOf,
  getEventType,
  invocationFor,
  LANGUAGES,
  localizeFunctionName,
  STOCK_LINES,
  type Community,
  type EventContent,
  type EventTypeId,
  type Faith,
  type LanguageCode,
} from '@cardai/shared';

const FAITH_WEDDING: Partial<Record<Faith, EventTypeId>> = { muslim: 'nikah', sikh: 'anand-karaj', christian: 'christian-wedding' };

/**
 * Instant, offline wording in every card language so users can preview before signing in.
 * AI wording (any tone) replaces it with one tap. Every line is in the card's language: the
 * card never mixes two languages unless the user writes it that way.
 *
 * The blessing line follows the family's faith (occasion + tradition): Ganesha for Hindu families,
 * Bismillah for a Nikah or a Muslim family, Ik Onkar for Sikh, Namokar for Jain, none for parties.
 */
export function defaultWording(type: EventTypeId, language: LanguageCode, names: string[], hosts: string, community?: Community, greeting = false): EventContent {
  const faith = faithOf(type, community);
  // A "wedding" for a Muslim, Sikh or Christian family is titled as their own ceremony, not "Shubh Vivah".
  const titleType: EventTypeId = type === 'wedding' ? (FAITH_WEDDING[faith] ?? type) : type;
  const ev = getEventType(titleType);
  const n = names.filter(Boolean);
  const L = STOCK_LINES[language] ?? STOCK_LINES.en;
  const wedding = ev.category === 'wedding';
  const invocation = invocationFor({ eventType: type, faith, language, community });

  // Greeting cards (Diwali wishes, holiday greetings): a wish from the family, not an invitation.
  if (greeting)
    return {
      invocation,
      headline: eventTitle(titleType, language),
      hostLine: hosts ? L.greetFrom(hosts) : L.greetPlain,
      primaryNames: n.slice(0, 2),
      primaryDetails: [],
      connector: n.length === 2 ? L.and : undefined,
      message: L.greet,
      familyTitle: '',
      familyLines: [],
      closing: L.greetPlain,
    };
  return {
    invocation,
    headline: eventTitle(titleType, language),
    hostLine: hosts ? L.hostLine(hosts) : L.invited,
    primaryNames: n.slice(0, 2),
    primaryDetails: [],
    connector: n.length === 2 ? (wedding ? L.weds : L.and) : undefined,
    message: L.message,
    familyTitle: L.familyTitle,
    familyLines: hosts ? [hosts] : [],
    closing: L.closing,
  };
}

const STOCK_FIELDS = ['invocation', 'headline', 'hostLine', 'connector', 'message', 'familyTitle', 'closing'] as const;

/**
 * The wording moved to another language. Lines that are still our ready-made ones (in any
 * language) are swapped for the new language; anything the user or AI wrote is kept as is.
 */
export function rewordForLanguage(
  content: EventContent,
  opts: { type: EventTypeId; language: LanguageCode; names: string[]; hosts: string; community?: Community; greeting?: boolean },
): EventContent {
  const next = defaultWording(opts.type, opts.language, opts.names, opts.hosts, opts.community, opts.greeting);
  // Our lines in any language, greeting or invitation, count as ready-made (safe to swap).
  const all = LANGUAGES.flatMap((l) => [false, true].map((g) => defaultWording(opts.type, l.code, opts.names, opts.hosts, opts.community, g)));
  const out: EventContent = { ...content };
  for (const f of STOCK_FIELDS) {
    const cur = content[f];
    const stock = !cur?.trim() || all.some((w) => w[f] === cur);
    if (stock) (out as Record<string, unknown>)[f] = next[f];
  }
  return out;
}

/** Suggested function names follow the card language; names the user typed stay. */
export function localizeFunctions<T extends { name: string }>(functions: T[], language: LanguageCode): T[] {
  return functions.map((f) => ({ ...f, name: localizeFunctionName(f.name, language) }));
}
