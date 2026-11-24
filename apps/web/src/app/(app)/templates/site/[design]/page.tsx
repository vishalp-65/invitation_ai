import { getSiteDesign, isRetiredDesign } from '@cardai/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SampleSite } from './sample-site';

/** A cinematic design as a full sample invitation website (shown in the gallery's phone frame). */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SampleSitePage({ params }: { params: Promise<{ design: string }> }) {
  const { design } = await params;
  const d = getSiteDesign(design);
  if (!d || isRetiredDesign(d.id)) notFound();
  return <SampleSite design={d.id} />;
}
