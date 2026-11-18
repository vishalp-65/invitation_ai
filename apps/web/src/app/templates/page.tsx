import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SiteFooter, SiteHeader } from '@/components/layout/site-header';
import { TemplateGallery } from './template-gallery';

export const metadata: Metadata = {
  title: 'Invitation designs',
  description: 'Wedding, griha pravesh, birthday, puja and more invitation designs. Preview every design with your own names.',
};

export default function TemplatesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1400px] px-6 pb-20 pt-16 lg:px-12 lg:pt-24">
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
      </main>
      <SiteFooter />
    </>
  );
}
