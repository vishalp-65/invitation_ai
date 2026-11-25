import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GallerySkeleton } from '@/components/ui/skeletons';
import { TemplateGallery } from '@/app/(app)/templates/template-gallery';

export const metadata: Metadata = { title: 'Designs' };

/** The design gallery inside the signed-in shell, so the sidebar stays put while browsing. */
export default function DashboardDesignsPage() {
  return (
    <div className="animate-fade-up">
      {/* Title only: the format tabs below say what each design makes (one line, not two). */}
      <h1 className="page-title">Designs</h1>
      <Suspense fallback={<GallerySkeleton />}>
        <TemplateGallery inApp />
      </Suspense>
    </div>
  );
}
