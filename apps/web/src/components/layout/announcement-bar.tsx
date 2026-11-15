'use client';

import { clsx } from 'clsx';
import { X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useOffers } from '@/lib/offers';

const TONE = {
  marigold: 'bg-marigold text-[#1a1300]',
  indigo: 'bg-[#1e2250] text-white',
  sindoor: 'bg-[#b5121b] text-white',
} as const;

/** Admin-scheduled offer banner. Dismissal is remembered per banner in this browser. */
export function AnnouncementBar() {
  const { data } = useOffers();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => {
    try {
      setDismissed(JSON.parse(localStorage.getItem('cai_banners_closed') ?? '[]') as string[]);
    } catch {
      /* private mode */
    }
  }, []);

  const where = pathname === '/' ? 'landing' : 'app';
  const b = data?.announcements.find((a) => (a.audience === 'all' || a.audience === where) && !dismissed.includes(a.id));
  if (!b) return null;

  const close = () => {
    const next = [...dismissed, b.id];
    setDismissed(next);
    try {
      localStorage.setItem('cai_banners_closed', JSON.stringify(next.slice(-20)));
    } catch {
      /* ignore */
    }
  };
  const external = b.ctaUrl?.startsWith('https://');

  return (
    <div role="region" aria-label="Offer" className={clsx('relative z-50 flex items-center justify-center gap-3 px-10 py-2 text-center text-sm font-semibold', TONE[b.tone])}>
      <span>{b.message}</span>
      {b.ctaUrl && b.ctaLabel && (
        <Link href={b.ctaUrl} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="shrink-0 underline underline-offset-4">
          {b.ctaLabel}
        </Link>
      )}
      <button type="button" onClick={close} aria-label="Dismiss" className="absolute right-2 grid size-7 place-items-center rounded-lg hover:bg-black/10">
        <X className="size-4" />
      </button>
    </div>
  );
}
