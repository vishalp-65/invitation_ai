import { BRAND } from '@cardai/shared';
import { ImageResponse } from 'next/og';
import { postBySlug, POSTS } from '@/features/blog';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = `${BRAND.name} blog`;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

/**
 * Share card per post, in the site's monochrome style. The built-in OG font has no Devanagari, so a
 * headline with Indic script falls back to its English part (before the colon).
 */
export default async function PostOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const p = postBySlug((await params).slug);
  const h1 = p?.h1 ?? BRAND.name;
  const latinOnly = [...h1].every((c) => c.charCodeAt(0) <= 0x24f || c === '’' || c === '–' || c === '—');
  const headline = latinOnly ? h1 : (h1.split(':')[0] ?? h1).trim();
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '72px 80px', background: '#050608', color: '#F7F6F2' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <svg width="56" height="56" viewBox="0 0 32 32">
            <path d="M10.5 25v-7.5a5.5 5.5 0 0 1 11 0V25" fill="none" stroke="#F7F6F2" strokeWidth="3.4" strokeLinecap="round" />
            <path d="M16 3.8c1.7 2 2.3 3.3 2.3 4.3a2.3 2.3 0 0 1-4.6 0c0-1 .6-2.3 2.3-4.3Z" fill="#F7F6F2" />
          </svg>
          <span style={{ fontSize: 34, letterSpacing: -1 }}>{BRAND.name}</span>
          <span style={{ fontSize: 26, color: 'rgba(247,246,242,0.45)', marginLeft: 12 }}>{p?.category ?? 'Blog'}</span>
        </div>
        <span style={{ fontSize: headline.length > 60 ? 60 : 72, lineHeight: 1.08, letterSpacing: -2, maxWidth: 1040 }}>{headline}</span>
        <span style={{ fontSize: 26, color: 'rgba(247,246,242,0.45)' }}>{BRAND.domain}/blog</span>
      </div>
    ),
    size,
  );
}
