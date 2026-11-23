import { BRAND } from '@cardai/shared';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PRIVATE_ROBOTS } from '@/lib/viewport';

/** Full-screen host tools without the app chrome: printable lists and the venue photo wall. */
export const metadata: Metadata = { title: { default: 'Host tools', template: `%s · ${BRAND.name}` }, robots: PRIVATE_ROBOTS };

export default function HostLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
