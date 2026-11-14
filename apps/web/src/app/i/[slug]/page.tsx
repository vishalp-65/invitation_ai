import { getLanguage, RTL_LANGUAGES, type LanguageCode, type PublicSiteDto } from '@cardai/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import { ApiError, serverApi } from '@/lib/api';
import { InviteSite } from './invite-site';

type Params = Promise<{ slug: string }>;
type Search = Promise<{ g?: string }>;

async function load(slug: string, g?: string): Promise<PublicSiteDto | null> {
  try {
    return await serverApi<PublicSiteDto>(`/public/events/${encodeURIComponent(slug)}${g ? `?g=${encodeURIComponent(g)}` : ''}`, 30);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** WhatsApp shows this title + image as the link preview — the card itself is the preview. */
export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Search }): Promise<Metadata> {
  const { slug } = await params;
  const { g } = await searchParams;
  const site = await load(slug, g);
  if (!site) return { title: 'Invitation not found' };
  const c = site.event.content;
  const title = [c.headline, c.primaryNames.join(` ${c.connector || '&'} `)].filter(Boolean).join(' — ') || site.event.title;
  const description = site.guest ? `${site.guest.salutation || site.guest.name}, you are invited.` : c.message || 'You are invited.';
  return {
    title,
    description,
    robots: { index: false, follow: false }, // private family events
    openGraph: { title, description, images: site.media.coverUrl ? [{ url: site.media.coverUrl, width: 1080, height: 1920 }] : [], type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function InvitePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug } = await params;
  const { g } = await searchParams;
  const site = await load(slug, g);
  if (!site) notFound();

  const lang = getLanguage(site.event.language);
  const p = site.template.theme.palette;
  const fonts = [lang.fonts.display, lang.fonts.body].map((f) => `family=${f.replace(/ /g, '+')}:wght@400;600;700`).join('&');
  const style = {
    '--inv-bg': p.background,
    '--inv-bg-alt': p.backgroundAlt,
    '--inv-surface': p.surface,
    '--inv-primary': p.primary,
    '--inv-accent': p.accent,
    '--inv-text': p.text,
    '--inv-muted': p.muted,
    '--inv-display': `"${lang.fonts.display}", serif`,
    '--inv-body': `"${lang.fonts.body}", sans-serif`,
  } as CSSProperties;

  return (
    <>
      <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${fonts}&display=swap`} />
      <div style={style} lang={lang.code} dir={RTL_LANGUAGES.has(lang.code as LanguageCode) ? 'rtl' : 'ltr'}>
        <InviteSite site={site} guestToken={g} />
      </div>
    </>
  );
}
