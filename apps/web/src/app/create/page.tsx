import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { CreateWizard } from '@/features/create/create-wizard';

export const metadata: Metadata = { title: 'Make an invitation' };

export default function CreatePage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-ivory">
        <Suspense>
          <CreateWizard />
        </Suspense>
      </main>
    </>
  );
}
