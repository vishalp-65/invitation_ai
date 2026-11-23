import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { UnsubscribeCard } from './unsubscribe-card';

export const metadata: Metadata = { title: 'Email preferences', robots: { index: false, follow: false } };

export default function UnsubscribePage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto flex max-w-xl flex-col px-5 py-20 sm:py-28">
        <Suspense>
          <UnsubscribeCard />
        </Suspense>
      </main>
    </>
  );
}
