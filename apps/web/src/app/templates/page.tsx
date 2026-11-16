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
      <main className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-6 sm:pt-14">
        <div className="max-w-2xl">
          <h1 className="text-4xl tracking-tight sm:text-5xl">Invitation designs</h1>
          <p className="mt-3 text-lg leading-relaxed text-ink-soft">
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
