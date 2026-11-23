import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';

/** The app's pages (same URLs; the route group only adds the providers). */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
