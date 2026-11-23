import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PRIVATE_ROBOTS } from '@/lib/viewport';

// The page itself is a client component (designer dashboard), so its tab title lives here.
export const metadata: Metadata = { title: 'Sell your designs', robots: PRIVATE_ROBOTS };

export default function DesignerLayout({ children }: { children: ReactNode }) {
  return children;
}
