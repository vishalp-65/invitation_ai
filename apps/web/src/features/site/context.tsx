'use client';

import { getLanguage, getSiteDesign, sectionHeading, type EventContent, type PublicSiteDto, type SiteDesign, type SiteSection } from '@cardai/shared';
import { createContext, useContext, useMemo } from 'react';

export interface SiteCtx {
  data: PublicSiteDto;
  content: EventContent;
  language: string;
  guestToken?: string;
  /** Unlock key of a password-protected site; sent with every public call so private sites stay private. */
  accessKey?: string;
  /** `/api/public/events/<slug>/<path>` with the guest token / unlock key the server needs to open a private site. */
  publicUrl: (path: string, params?: Record<string, string>) => string;
  /** Builder preview: no tracking, no real submissions. */
  preview: boolean;
  fmt: { date: Intl.DateTimeFormat; time: Intl.DateTimeFormat; short: Intl.DateTimeFormat };
  heading: (s: Pick<SiteSection, 'type' | 'title'>) => string;
  t: (en: string, hi: string) => string;
  asset: (id: string | undefined) => string | undefined;
  /** Cinematic design pack, or null for the classic look. */
  design: SiteDesign | null;
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
  accessKey,
  preview,
  children,
}: {
  data: PublicSiteDto;
  content: EventContent;
  language: string;
  guestToken?: string;
  accessKey?: string;
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
      accessKey,
      publicUrl: (path, params) => {
        const qs = new URLSearchParams(params);
        if (guestToken) qs.set('g', guestToken);
        if (accessKey) qs.set('k', accessKey);
        return `/api/public/events/${encodeURIComponent(data.event.slug)}/${path}${qs.size ? `?${qs}` : ''}`;
      },
      preview,
      fmt: {
        date: new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        time: new Intl.DateTimeFormat(locale, { timeZone: tz, hour: 'numeric', minute: '2-digit' }),
        short: new Intl.DateTimeFormat(locale, { timeZone: tz, day: 'numeric', month: 'short' }),
      },
      heading: (s) => sectionHeading(s, language),
      t: (en, h) => (hi ? h : en),
      asset: (id) => (id ? data.media.assets[id] : undefined),
      design: getSiteDesign(data.site.design),
    };
  }, [data, content, language, guestToken, accessKey, preview]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Only http(s) links become hrefs on the guest page (older saved data may hold anything). */
export function safeHref(url: string | undefined | null): string | undefined {
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}
