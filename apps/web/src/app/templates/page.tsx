import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { SiteFooter, SiteHeader } from '@/components/layout/site-header';
import { VideoDesignCoverflow } from '@/components/marketing/design-coverflow';
import { TemplateGallery } from './template-gallery';

export const metadata: Metadata = {
  title: 'Wedding & festival invitation card designs',
  description: 'Browse wedding, griha pravesh, birthday, puja and nikah invitation designs. Preview each with your own names as a card, video or website, free.',
  // Filters (?price=, ?type=) narrow the same gallery.
  alternates: { canonical: '/templates' },
};

export default async function TemplatesPage() {
  const hi = (await getLocale()) === 'hi';
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
          <TemplateGallery />
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
