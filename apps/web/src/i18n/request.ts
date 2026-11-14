import { UI_LOCALES, type UiLocale } from '@cardai/shared';
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const LOCALE_COOKIE = 'locale';

/** Cookie-based locale (no /hi/ URL prefix): invite links stay identical in every language. */
export default getRequestConfig(async () => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const accept = (await headers()).get('accept-language') ?? '';
  const locale: UiLocale = UI_LOCALES.includes(fromCookie as UiLocale)
    ? (fromCookie as UiLocale)
    : accept.toLowerCase().startsWith('hi')
      ? 'hi'
      : 'en';
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
