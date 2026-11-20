import { EVENT_TYPE_IDS, type TemplateDefinition } from '@cardai/shared';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { VideoDesignCoverflow } from '@/components/marketing/design-coverflow';
import { serverApi } from '@/lib/api';
import { TemplateGallery, type InitialTemplates } from './template-gallery';

export const metadata: Metadata = {
  title: 'Wedding & festival invitation card designs',
  description: 'Browse wedding, griha pravesh, birthday, puja and nikah invitation designs. Preview each with your own names as a card, video or website, free.',
  // Filters (?price=, ?type=) narrow the same gallery.
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
  const [hi, initial] = await Promise.all([
    getLocale().then((l) => l === 'hi'),
    initialTemplates(typeof type === 'string' ? type : undefined),
  ]);
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
            Every design works as an image card, a video invite and a website. Pick one now and switch any time — your words stay the same.
          </p>
        </div>
        <Suspense>
          <TemplateGallery initial={initial} />
        </Suspense>

        {/* The cinematic video / website designs have no card thumbnails, so they get their own row. */}
        <section id="video-designs" className="mt-24 border-t border-hairline pt-16 lg:mt-32 lg:pt-24">
          <span className="kicker mb-8">Video invites</span>
          <h2 className="display-md">
            Video &amp; website
            <br />
            <span className="text-ink-soft">designs.</span>
          </h2>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Painted, animated scenes for a 9:16 video that plays crisp on WhatsApp, and the same design as your invitation website.
          </p>
          <div className="-mx-6 mt-6 lg:-mx-12">
            <VideoDesignCoverflow hi={hi} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
