import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PRIVATE_ROBOTS } from '@/lib/viewport';

export const metadata: Metadata = { title: 'Website builder', robots: PRIVATE_ROBOTS };

export default function BuilderLayout({ children }: { children: ReactNode }) {
  return children;
}
