import { BRAND } from '@cardai/shared';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { PRIVATE_ROBOTS } from '@/lib/viewport';

// A plain string here would drop the site-wide "· Noyta" suffix for every page below.
export const metadata: Metadata = { title: { default: 'Dashboard', template: `%s · ${BRAND.name}` }, robots: PRIVATE_ROBOTS };

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
