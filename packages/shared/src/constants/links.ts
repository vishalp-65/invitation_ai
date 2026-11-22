/**
 * Invitation short links live at the root of the main domain: `noyta.in/<name>`.
 * The same rules run in the API (when a host picks a name) and in the web proxy (when a request
 * comes in), so a word that is an app page can never be taken as a link, and vice versa.
 *
 * Zod-free on purpose: the web proxy and the builder import it (see bundle-size rules).
 */

export const ALIAS_MIN = 2;
export const ALIAS_MAX = 32;

/** Lowercase letters, digits and inner hyphens: `rp`, `rahul-weds-priya`, `aarav1`. */
export const ALIAS_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

/** Anything that could be a link in a request (generated codes are mixed case). */
export const LINK_SEGMENT_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38}[A-Za-z0-9])?$/;

/**
 * Words that are pages, files or folders of the site, plus words we may need later. Every
 * top-level folder in apps/web/src/app and apps/web/public must be here (a test checks).
 */
export const RESERVED_LINK_WORDS: ReadonlySet<string> = new Set([
  // app routes
  'admin', 'api', 'auth', 'blog', 'builder', 'create', 'dashboard', 'designer', 'dev', 'editor', 'email', 'faq',
  'host', 'i', 's', 'invitation-maker', 'login', 'logout', 'signup', 'pricing', 'preview', 'templates', 'og',
  // public folders and well-known files
  'brand', 'icons', 'landing', 'showcase', 'video', 'designs', 'music', 'fonts', 'static', 'assets', 'public',
  'favicon', 'robots', 'sitemap', 'manifest', 'icon', 'apple-icon', 'opengraph-image', 'llms', 'llms-full',
  // product words people would expect to be ours
  'about', 'account', 'app', 'billing', 'blogs', 'careers', 'contact', 'cookies', 'help', 'home', 'legal', 'me',
  'new', 'noyta', 'orders', 'privacy', 'refund', 'refunds', 'settings', 'support', 'terms', 'www', 'mail', 'status',
  'invite', 'invites', 'invitation', 'invitations', 'site', 'sites', 'link', 'links', 'go', 'r', 'u', 'p', 'e', 'g',
  'checkin', 'rsvp', 'guests', 'events', 'event', 'cards', 'card', 'videos', 'websites', 'website', 'shop', 'store',
]);

/** Occasion landing pages are `/<occasion>-invitation`; keep that whole family for them. */
const OCCASION_PAGE = /-invitations?$/;

export function isReservedLink(word: string): boolean {
  const w = word.toLowerCase();
  return RESERVED_LINK_WORDS.has(w) || OCCASION_PAGE.test(w);
}

export type AliasProblem = 'short' | 'long' | 'format' | 'reserved';

/** Normalises what a host typed into a link name (spaces → hyphens, lowercase, no doubles). */
export function normaliseAlias(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .slice(0, ALIAS_MAX);
}

export function aliasProblem(alias: string): AliasProblem | null {
  if (alias.length < ALIAS_MIN) return 'short';
  if (alias.length > ALIAS_MAX) return 'long';
  if (!ALIAS_PATTERN.test(alias)) return 'format';
  if (isReservedLink(alias)) return 'reserved';
  return null;
}

export const ALIAS_PROBLEM_TEXT: Record<AliasProblem, string> = {
  short: `Use at least ${ALIAS_MIN} letters or numbers`,
  long: `Use at most ${ALIAS_MAX} characters`,
  format: 'Use letters, numbers and hyphens only (no hyphen at the start or end)',
  reserved: 'That word is used by Noyta itself, please pick another',
};
