import { BRAND } from '@cardai/shared';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';

// A plain string here would drop the site-wide "· Noyta" suffix for every page below.
export const metadata: Metadata = { title: { default: 'Dashboard', template: `%s · ${BRAND.name}` } };

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
