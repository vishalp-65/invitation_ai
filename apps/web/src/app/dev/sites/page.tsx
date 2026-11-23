import { notFound } from 'next/navigation';
import { LookThumbs, SiteGallery } from './site-gallery';

/** Internal QA page: the cinematic website designs with a sample wedding. Not available in production. */
export default async function DevSites({ searchParams }: { searchParams: Promise<{ d?: string; open?: string; o?: string; p?: string; thumbs?: string; live?: string; s?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { d, open, o, p, thumbs, live, s } = await searchParams;
  if (thumbs) return <LookThumbs />;
  return <SiteGallery initial={d ?? 'rose-seal'} skipOpening={open === '0'} opening={o} photos={p === undefined ? 2 : Number(p)} live={live === '1'} only={s ? s.split(',') : undefined} />;
}
