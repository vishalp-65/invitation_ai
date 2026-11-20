import { isLockedSite, type PublicSiteResponse } from '@cardai/shared';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ApiError, serverApi } from '@/lib/api';
import { SiteRenderer } from '@/features/site/site-renderer';
import { ExpiredSite, LockedSite } from './gates';

type Params = Promise<{ slug: string }>;
type Search = Promise<{ g?: string }>;

type Loaded = { kind: 'ok'; site: PublicSiteResponse; key?: string } | { kind: 'gone' } | null;

async function load(slug: string, g?: string): Promise<Loaded> {
  const key = (await cookies()).get(`inv_k_${slug}`)?.value;
  const qs = new URLSearchParams();
  if (g) qs.set('g', g);
  if (key) qs.set('k', key);
  try {
    // Personal / unlocked pages are never cached; the open page for 15 s (edits show up fast).
    const site = await serverApi<PublicSiteResponse>(`/public/events/${encodeURIComponent(slug)}${qs.size ? `?${qs}` : ''}`, qs.size ? 0 : 15);
    return { kind: 'ok', site, key };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    if (err instanceof ApiError && err.status === 410) return { kind: 'gone' };
    throw err;
  }
}

/** WhatsApp shows this title + image as the link preview; personal links greet the guest by name. */
export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Search }): Promise<Metadata> {
  const { slug } = await params;
  const { g } = await searchParams;
  const loaded = await load(slug, g);
  if (!loaded) return { title: 'Invitation not found' };
  if (loaded.kind === 'gone') return { title: 'Invitation', robots: { index: false, follow: false } };
  const site = loaded.site;
  if (isLockedSite(site)) {
    return { title: site.title, robots: { index: false, follow: false }, openGraph: { title: site.title, images: site.coverUrl ? [site.coverUrl] : [] } };
  }
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
  const loaded = await load(slug, g);
  if (!loaded) notFound();
  if (loaded.kind === 'gone') return <ExpiredSite />;
  if (isLockedSite(loaded.site)) return <LockedSite slug={slug} site={loaded.site} />;
  return <SiteRenderer data={loaded.site} guestToken={g} accessKey={loaded.key} />;
}
