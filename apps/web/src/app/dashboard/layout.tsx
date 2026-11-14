import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/layout/site-header';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
    </>
  );
}
