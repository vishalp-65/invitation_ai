import { notFound } from 'next/navigation';
import { SiteGallery } from './site-gallery';

/** Internal QA page: the cinematic website designs with a sample wedding. Not available in production. */
export default async function DevSites({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { d } = await searchParams;
  return <SiteGallery initial={d ?? 'rose-seal'} />;
}
