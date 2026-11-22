import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { WizardSkeleton } from '@/components/ui/skeletons';
import { CreateWizard } from '@/features/create/create-wizard';

export const metadata: Metadata = {
  title: 'Make an invitation online, free',
  description:
    'Pick the occasion, add names and functions, and get an invitation card, video and RSVP website in Hindi or 11 more Indian languages. Free to make and share.',
  // ?type=wedding and &template=… deep links all describe the same page.
  alternates: { canonical: '/create' },
};

export default function CreatePage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="bg-ivory">
        <Suspense fallback={<WizardSkeleton />}>
          <CreateWizard />
        </Suspense>
      </main>
    </>
  );
}
