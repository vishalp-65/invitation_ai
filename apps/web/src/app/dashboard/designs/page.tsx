import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TemplateGallery } from '@/app/templates/template-gallery';

export const metadata: Metadata = { title: 'Designs' };

/** The design gallery inside the signed-in shell, so the sidebar stays put while browsing. */
export default function DashboardDesignsPage() {
  return (
    <div className="animate-fade-up">
      <h1 className="text-[1.875rem] sm:text-[2.25rem]">Designs</h1>
      <p className="mt-1.5 max-w-2xl text-[0.95rem] text-ink-soft">
        Every design works as an image card, a video invite and a website. Pick one to start a new invitation; your words carry over if you switch later.
      </p>
      <Suspense>
        <TemplateGallery inApp />
      </Suspense>
    </div>
  );
}
