import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { EDITOR_VIEWPORT, PRIVATE_ROBOTS } from '@/lib/viewport';

export const metadata: Metadata = { title: 'Editor harness', robots: PRIVATE_ROBOTS };
export const viewport = EDITOR_VIEWPORT;

export default function DevEditorLayout({ children }: { children: ReactNode }) {
  return children;
}
