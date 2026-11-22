import 'server-only';
import { BRAND, isLockedSite, type PublicSiteDto, type PublicSiteResponse } from '@cardai/shared';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ExpiredSite, LockedSite } from '@/app/i/[slug]/gates';
import { ApiError } from '@/lib/api';
import { serverApi } from '@/lib/server-api';
import { SiteRenderer } from './site-renderer';

/**
 * The invitation page, shared by `/i/<slug>` and every short link (`/<name>`, `/<code>`, `/s/<code>`).
 * Short links render the page in place instead of redirecting: the short URL stays in the
 * address bar, and WhatsApp / Telegram / iMessage read the preview from that one URL without
 * having to follow a redirect.
 */

export type LoadedInvite = { kind: 'ok'; site: PublicSiteResponse; key?: string } | { kind: 'gone' } | null;

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? BRAND.url).replace(/\/+$/, '');

export async function loadInvite(slug: string, g?: string | null): Promise<LoadedInvite> {
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

function joinNames(site: PublicSiteDto): string {
  const c = site.event.content;
  return c.primaryNames.filter(Boolean).join(` ${c.connector || '&'} `);
}

/** "Sat, 14 Feb 2027 · Leela Palace, Udaipur" from the first function. */
function whenWhere(site: PublicSiteDto): string {
  const f = site.functions[0];
  if (!f) return '';
  const date = new Intl.DateTimeFormat('en-IN', { timeZone: site.event.settings.timezone, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(f.startsAt));
  const place = [f.venueName, f.venueAddress?.split(',').slice(-2).join(',').trim()].filter(Boolean)[0];
  return [date, place].filter(Boolean).join(' · ');
}

/** Link preview: title + 1200×630 picture made for chat apps (see /og/invite/[slug]). */
export function inviteMetadata(loaded: LoadedInvite, slug: string, shareUrl: string): Metadata {
  if (!loaded) return { title: 'Invitation not found', robots: { index: false, follow: false } };
  if (loaded.kind === 'gone') return { title: 'Invitation', robots: { index: false, follow: false } };
  const image = { url: `${APP_URL}/og/invite/${encodeURIComponent(slug)}`, width: 1200, height: 630, type: 'image/png' };
  const site = loaded.site;
  if (isLockedSite(site)) {
    return {
      title: site.title,
      description: 'A private invitation. Open the link to enter.',
      robots: { index: false, follow: false },
      openGraph: { title: site.title, url: shareUrl, siteName: BRAND.name, images: [{ ...image, alt: site.title }], type: 'website' },
      twitter: { card: 'summary_large_image', title: site.title, images: [image.url] },
    };
  }
  const c = site.event.content;
  const names = joinNames(site);
  const title = (names ? `${c.headline ? `${c.headline}: ` : ''}${names}` : c.headline) || site.event.title;
  const where = whenWhere(site);
  const greet = site.guest ? `${site.guest.salutation || site.guest.name}, you are invited.` : 'You are invited.';
  const description = `${greet}${where ? ` ${where}.` : ''} Tap to open the invitation.`;
  return {
    title,
    description,
    alternates: { canonical: shareUrl },
    robots: { index: false, follow: false }, // private family events
    openGraph: { title, description, url: shareUrl, siteName: BRAND.name, images: [{ ...image, alt: title }], type: 'website', locale: site.event.language === 'en' ? 'en_IN' : `${site.event.language}_IN` },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
  };
}

export function InviteView({ loaded, slug, guestToken }: { loaded: LoadedInvite; slug: string; guestToken?: string | null }) {
  if (!loaded) notFound();
  if (loaded.kind === 'gone') return <ExpiredSite />;
  if (isLockedSite(loaded.site)) return <LockedSite slug={slug} site={loaded.site} />;
  return <SiteRenderer data={loaded.site} guestToken={guestToken ?? undefined} accessKey={loaded.key} />;
}

export const shareUrlFor = (path: string) => `${APP_URL}${path}`;
