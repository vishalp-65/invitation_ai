import { BRAND } from '@cardai/shared';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { occasionBySlug, OCCASION_PAGES } from '@/features/occasions/content';
import { designsFor } from '@/features/occasions/designs';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = `${BRAND.name} invitation designs`;

export function generateStaticParams() {
  return OCCASION_PAGES.map((o) => ({ occasion: o.slug }));
}

async function dataUri(id: string): Promise<string | null> {
  try {
    const buf = await readFile(path.join(process.cwd(), 'public', 'showcase', `${id}.jpg`));
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * Share / search thumbnail per occasion: the three newest premium designs for that occasion
 * (modern collections lead, see designsFor) next to the headline. Google uses og:image as a
 * thumbnail candidate, so this is what a search result shows instead of a random old card.
 */
export default async function OccasionOgImage({ params }: { params: Promise<{ occasion: string }> }) {
  const o = occasionBySlug((await params).occasion);
  const designs = o ? await designsFor(o.type, 3) : [];
  const shots = (await Promise.all(designs.map((d) => dataUri(d.id)))).filter((s): s is string => !!s);
  const headline = o ? `${o.name.en} invitation cards, videos & websites` : 'Invitation cards, videos & websites';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#050608', color: '#F7F6F2', padding: '56px 64px', gap: 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <svg width="56" height="56" viewBox="0 0 64 64">
              <path d="M19 50V30c0-8 13-9 13-18 0 9 13 10 13 18v20" fill="none" stroke="#F4F1EC" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M32 30.5c4 4.4 5.8 7.6 5.8 10.4a5.8 5.8 0 0 1-11.6 0c0-2.8 1.8-6 5.8-10.4Z" fill="#ECA8D6" />
            </svg>
            <span style={{ fontSize: 38, letterSpacing: -1 }}>{BRAND.name}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <span style={{ fontSize: 58, lineHeight: 1.08, letterSpacing: -1.5 }}>{headline}</span>
            <span style={{ fontSize: 26, color: 'rgba(247,246,242,0.62)' }}>Hindi + 11 Indian languages · Share on WhatsApp · Free to try</span>
          </div>
          <span style={{ fontSize: 24, color: 'rgba(247,246,242,0.45)' }}>{BRAND.domain}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {shots.map((src, k) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={k} src={src} width={k === 1 ? 232 : 200} height={k === 1 ? 412 : 356} style={{ borderRadius: 10, objectFit: 'cover', marginTop: k === 1 ? 0 : 56 }} alt="" />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
