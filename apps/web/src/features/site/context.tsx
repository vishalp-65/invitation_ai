'use client';

import { getLanguage, sectionHeading, type EventContent, type PublicSiteDto, type SiteSection } from '@cardai/shared';
import { createContext, useContext, useMemo } from 'react';

export interface SiteCtx {
  data: PublicSiteDto;
  content: EventContent;
  language: string;
  guestToken?: string;
  /** Builder preview: no tracking, no real submissions. */
  preview: boolean;
  fmt: { date: Intl.DateTimeFormat; time: Intl.DateTimeFormat; short: Intl.DateTimeFormat };
  heading: (s: Pick<SiteSection, 'type' | 'title'>) => string;
  t: (en: string, hi: string) => string;
  asset: (id: string | undefined) => string | undefined;
}

const Ctx = createContext<SiteCtx | null>(null);

export function useSite(): SiteCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSite outside SiteProvider');
  return v;
}

export function SiteProvider({
  data,
  content,
  language,
  guestToken,
  preview,
  children,
}: {
  data: PublicSiteDto;
  content: EventContent;
  language: string;
  guestToken?: string;
  preview: boolean;
  children: React.ReactNode;
}) {
  const value = useMemo<SiteCtx>(() => {
    const locale = getLanguage(language).locale;
    const tz = data.event.settings.timezone;
    const hi = language === 'hi' || language === 'mr';
    return {
      data,
      content,
      language,
      guestToken,
      preview,
      fmt: {
        date: new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        time: new Intl.DateTimeFormat(locale, { timeZone: tz, hour: 'numeric', minute: '2-digit' }),
        short: new Intl.DateTimeFormat(locale, { timeZone: tz, day: 'numeric', month: 'short' }),
      },
      heading: (s) => sectionHeading(s, language),
      t: (en, h) => (hi ? h : en),
      asset: (id) => (id ? data.media.assets[id] : undefined),
    };
  }, [data, content, language, guestToken, preview]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Only http(s) links become hrefs on the guest page (older saved data may hold anything). */
export function safeHref(url: string | undefined | null): string | undefined {
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}
