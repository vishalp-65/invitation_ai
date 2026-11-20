'use client';

import { clsx } from 'clsx';
import { X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('common');
  // null until this browser's dismissals are read, so a banner you closed never flashes back on load.
  const [dismissed, setDismissed] = useState<string[] | null>(null);
  useEffect(() => {
    try {
      setDismissed(JSON.parse(localStorage.getItem('cai_banners_closed') ?? '[]') as string[]);
    } catch {
      setDismissed([]); /* private mode */
    }
  }, []);

  const where = pathname === '/' ? 'landing' : 'app';
  const b = dismissed && data?.announcements.find((a) => (a.audience === 'all' || a.audience === where) && !dismissed.includes(a.id));
  if (!b) return null;

  const close = () => {
    const next = [...(dismissed ?? []), b.id];
    setDismissed(next);
    try {
      localStorage.setItem('cai_banners_closed', JSON.stringify(next.slice(-20)));
    } catch {
      /* ignore */
    }
  };
  const external = b.ctaUrl?.startsWith('https://');

  return (
    <div role="region" aria-label={t('offer')} className={clsx('relative z-50 flex items-center justify-center gap-3 px-10 py-2 text-center text-sm font-medium', TONE[b.tone])}>
      <span>{b.message}</span>
      {b.ctaUrl && b.ctaLabel && (
        <Link href={b.ctaUrl} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="shrink-0 underline underline-offset-4">
          {b.ctaLabel}
        </Link>
      )}
      <button type="button" onClick={close} aria-label={t('dismiss')} className="absolute right-2 grid size-7 place-items-center rounded-[var(--radius-control)] hover:bg-black/10">
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
