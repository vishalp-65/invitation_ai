import { BRAND, getSiteDesign, isLockedSite, type PublicSiteResponse } from '@cardai/shared';
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { serverApi } from '@/lib/server-api';

/**
 * Link-preview picture for an invitation (WhatsApp, Telegram, iMessage, Facebook, X): 1200×630,
 * the size chat apps show as a large card. The card image sits on the left in a thin gold frame;
 * the names, date and short link sit on the right.
 *
 * Satori cannot shape Indic scripts, so text is drawn only when it is Latin; otherwise the card
 * image (which already carries the names, rendered properly) carries the message alone.
 */

const W = 1200;
const H = 630;
const LATIN = /^[\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}\s]*$/u;
const isLatin = (s: string) => LATIN.test(s);

async function googleFont(family: string, text: string, weight = 500): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`, { next: { revalidate: 86400 } })).text();
    const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return src ? await (await fetch(src, { next: { revalidate: 86400 } })).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let site: PublicSiteResponse | null;
  try {
    site = await serverApi<PublicSiteResponse>(`/public/events/${encodeURIComponent(slug)}`, 300);
  } catch {
    site = null;
  }

  let bg = '#1A1512';
  let ink = '#F6EEDF';
  let gold = '#D4B26A';
  let cover: string | null = null;
  let kicker = 'You are invited';
  let names = '';
  let line1 = '';
  let line2 = '';
  let link: string = BRAND.domain;

  if (site && isLockedSite(site)) {
    cover = site.coverUrl;
    names = isLatin(site.title) ? site.title : '';
    kicker = 'A private invitation';
  } else if (site) {
    const design = getSiteDesign(site.site.design);
    const pal = design?.palette ?? site.template.theme.palette;
    // Deep, rich ground: the design's darkest band, else its primary colour.
    const dark = design?.bands.find((b) => /^#[0-3]/.test(b.bg));
    bg = dark?.bg ?? pal.primary;
    ink = dark?.ink ?? '#FFF8EC';
    gold = pal.accent;
    cover = site.media.coverUrl;
    const c = site.event.content;
    const ns = c.primaryNames.filter(Boolean);
    const joined = ns.join(` ${c.connector && isLatin(c.connector) ? c.connector : '&'} `);
    names = isLatin(joined) ? joined : '';
    if (c.headline && isLatin(c.headline)) kicker = c.headline;
    const f = site.functions[0];
    if (f) {
      line1 = new Intl.DateTimeFormat('en-IN', { timeZone: site.event.settings.timezone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(f.startsAt));
      const place = [f.venueName, f.venueAddress?.split(',').slice(-1)[0]?.trim()].filter((x): x is string => Boolean(x) && isLatin(x!));
      line2 = [...new Set(place)].join(', ');
    }
    link = site.shortUrl.replace(/^https?:\/\//, '');
  }

  const textAll = `${kicker}${names}${line1}${line2}${link}&`;
  const [serif, sans] = await Promise.all([googleFont('Cormorant Garamond', textAll, 500), googleFont('Jost', textAll, 400)]);
  const fonts = [
    ...(serif ? [{ name: 'Serif', data: serif, weight: 500 as const, style: 'normal' as const }] : []),
    ...(sans ? [{ name: 'Sans', data: sans, weight: 400 as const, style: 'normal' as const }] : []),
  ];
  const hasText = Boolean(names || line1);
  const nameSize = names.length > 26 ? 64 : names.length > 16 ? 80 : 96;

  const img = (
    <div style={{ width: W, height: H, display: 'flex', background: bg, color: ink, fontFamily: 'Sans', position: 'relative' }}>
      {/* inner hairline frame */}
      <div style={{ position: 'absolute', top: 24, left: 24, right: 24, bottom: 24, border: `1.5px solid ${gold}`, opacity: 0.55, display: 'flex' }} />
      <div style={{ position: 'absolute', top: 32, left: 32, right: 32, bottom: 32, border: `1px solid ${gold}`, opacity: 0.3, display: 'flex' }} />
      {cover && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: hasText ? 470 : W, height: H, padding: hasText ? '64px 0 64px 72px' : 56 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" style={{ maxHeight: H - (hasText ? 128 : 112), maxWidth: hasText ? 398 : W - 112, objectFit: 'contain', borderRadius: 6, border: `2px solid ${gold}` }} />
        </div>
      )}
      {hasText && (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, padding: cover ? '0 80px 0 56px' : '0 120px', alignItems: cover ? 'flex-start' : 'center', textAlign: cover ? 'left' : 'center' }}>
          <div style={{ fontSize: 24, letterSpacing: 6, textTransform: 'uppercase', color: gold }}>{kicker}</div>
          {names && <div style={{ fontFamily: 'Serif', fontSize: nameSize, lineHeight: 1.04, marginTop: 22, letterSpacing: -1 }}>{names}</div>}
          <div style={{ width: 120, height: 2, background: gold, marginTop: 34, marginBottom: 30, display: 'flex' }} />
          {line1 && <div style={{ fontSize: 32 }}>{line1}</div>}
          {line2 && <div style={{ fontSize: 26, opacity: 0.8, marginTop: 10 }}>{line2}</div>}
          <div style={{ display: 'flex', marginTop: 40, fontSize: 22, letterSpacing: 1, padding: '10px 22px', borderRadius: 999, border: `1.5px solid ${gold}`, color: gold }}>{link}</div>
        </div>
      )}
      {!cover && !hasText && (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', fontFamily: 'Serif', fontSize: 72 }}>You are invited</div>
      )}
    </div>
  );

  return new ImageResponse(img, {
    width: W,
    height: H,
    fonts: fonts.length ? fonts : undefined,
    headers: { 'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
