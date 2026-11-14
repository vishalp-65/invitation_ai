import type { Metadata } from 'next';
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
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-5xl">Designs</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">
          Each design works as an image card, a video invite and a website. Pick one now or change it any time — your words stay the same.
        </p>
        <TemplateGallery />
      </main>
      <SiteFooter />
    </>
  );
}
