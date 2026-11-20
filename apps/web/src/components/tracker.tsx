'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { track } from '@/lib/track';

type Conn = { effectiveType?: string; saveData?: boolean };

/**
 * First page view of a visit: campaign tags (utm_*, ad click ids), page language and connection
 * speed, so the console can show which campaigns, languages and 2G/3G/4G users convert.
 */
function firstVisitProps(): Record<string, string | boolean | null> {
  const q = new URLSearchParams(location.search);
  const conn = (navigator as Navigator & { connection?: Conn }).connection;
  const props: Record<string, string | boolean | null> = {
    lang: document.documentElement.lang || navigator.language || null,
    net: conn?.effectiveType ?? null,
    saveData: conn?.saveData ?? null,
  };
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const) {
    const v = q.get(k);
    if (v) props[k] = v.slice(0, 120);
  }
  if (q.has('gclid') || q.has('fbclid') || q.has('gbraid') || q.has('wbraid')) props.paid = true;
  return props;
}

/** One page_view per route change. The first carries the external referrer and campaign tags. */
export function Tracker() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    const isFirst = first.current;
    const ref = isFirst && document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : undefined;
    first.current = false;
    track('page_view', { path: pathname, referrer: ref, props: isFirst ? firstVisitProps() : undefined });
  }, [pathname]);
  return null;
}
