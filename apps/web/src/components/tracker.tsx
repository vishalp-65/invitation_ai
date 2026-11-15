'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { track } from '@/lib/track';

/** One page_view per route change. The first carries the external referrer. */
export function Tracker() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    const ref = first.current && document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : undefined;
    first.current = false;
    track('page_view', { path: pathname, referrer: ref });
  }, [pathname]);
  return null;
}
