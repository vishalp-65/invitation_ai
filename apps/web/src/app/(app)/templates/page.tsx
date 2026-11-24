import { EVENT_TYPE_IDS, type TemplateDefinition } from '@cardai/shared';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GallerySkeleton } from '@/components/ui/skeletons';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { serverApi } from '@/lib/server-api';
import { TemplateGallery, type InitialTemplates } from './template-gallery';

export const metadata: Metadata = {
  title: 'Wedding & festival invitation card designs',
  description: 'Browse wedding, griha pravesh, birthday, puja and nikah invitation designs as image cards, video invites and invitation websites. Preview any design free.',
  // Filters (?format=video, ?price=, ?type=) narrow the same gallery.
  alternates: { canonical: '/templates' },
};

/**
 * The first page of designs for the requested occasion, fetched on the server so the gallery is in
 * the HTML (crawlers, link previews, slow phones) rather than a "Loading designs…" placeholder.
 * Null when the API is unreachable: the gallery then loads in the browser as before.
 */
async function initialTemplates(type: string | undefined): Promise<InitialTemplates | null> {
  const eventType = type && (EVENT_TYPE_IDS as readonly string[]).includes(type) ? type : undefined;
  try {
    const { items } = await serverApi<{ items: TemplateDefinition[] }>(`/templates${eventType ? `?eventType=${eventType}` : ''}`, 300);
    return { eventType, items };
  } catch {
    return null;
  }
}

type Props = { searchParams: Promise<{ type?: string | string[] }> };

export default async function TemplatesPage({ searchParams }: Props) {
  const { type } = await searchParams;
  const initial = await initialTemplates(typeof type === 'string' ? type : undefined);
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[1400px] px-6 pb-20 pt-16 lg:px-12 lg:pt-24">
        <div className="max-w-4xl">
          <span className="kicker mb-8">Designs</span>
          <h1 className="display-md">
            Invitation
            <br />
            <span className="text-ink-soft">designs.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Image cards, video invites and invitation websites. One invitation makes all three, so pick what matters most to you now and change the rest any time.
          </p>
        </div>
        <Suspense fallback={<GallerySkeleton />}>
          <TemplateGallery initial={initial} />
        </Suspense>

      </main>
      <SiteFooter />
    </>
  );
}
