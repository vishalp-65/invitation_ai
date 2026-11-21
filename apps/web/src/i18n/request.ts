import { UI_LOCALES, type UiLocale } from '@cardai/shared';
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const LOCALE_COOKIE = 'locale';

type Messages = { [key: string]: string | Messages };

/** Language strings over English: a key not translated yet shows in English instead of breaking. */
function withFallback(base: Messages, over: Messages): Messages {
  const out: Messages = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = base[k];
    out[k] = typeof v === 'object' && typeof b === 'object' ? withFallback(b, v) : v;
  }
  return out;
}

const isLocale = (v: string | undefined): v is UiLocale => UI_LOCALES.includes(v as UiLocale);

/** Cookie-based locale (no /hi/ URL prefix): invite links stay identical in every language. */
export default getRequestConfig(async () => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  // First supported language the browser asks for, e.g. "ta-IN,ta;q=0.9,en;q=0.8" -> ta.
  const accept = ((await headers()).get('accept-language') ?? '')
    .split(',')
    .map((p) => p.trim().slice(0, 2).toLowerCase())
    .find(isLocale);
  const locale: UiLocale = isLocale(fromCookie) ? fromCookie : (accept ?? 'en');
  const en = (await import('../../messages/en.json')).default as Messages;
  const messages = locale === 'en' ? en : withFallback(en, (await import(`../../messages/${locale}.json`)).default as Messages);
  return { locale, messages };
});
