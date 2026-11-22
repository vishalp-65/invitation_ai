import { BRAND } from '@cardai/shared';
import { clsx } from 'clsx';
import Link from 'next/link';
import { useId } from 'react';

/** Ogee (Indian cusped) arch that doubles as the "n" of noyta — the doorway an invitation brings you to. */
const ARCH = 'M19 50V30c0-8 13-9 13-18 0 9 13 10 13 18v20';
/** Diya flame lit inside the doorway: welcome. Carries the site's accent gradient. */
const FLAME = 'M32 30.5c4 4.4 5.8 7.6 5.8 10.4a5.8 5.8 0 0 1-11.6 0c0-2.8 1.8-6 5.8-10.4Z';

export function Logo({
  className = '',
  tone = 'dark',
  compact,
}: {
  className?: string;
  tone?: 'dark' | 'light';
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      className={clsx('flex shrink-0 items-center gap-2', className)}
      aria-label={`${BRAND.name} home`}
    >
      <LogoMark tone={tone} className="size-7" />
      {!compact && (
        <Wordmark className={clsx('h-[22px] w-auto', tone === 'light' ? 'text-white' : 'text-ink')} />
      )}
    </Link>
  );
}

/** Custom monoline "noyta" lettering; the n repeats the arch of the mark. Inherits currentColor. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 156 44" className={clsx('shrink-0', className)} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 34V22c0-5.6 9-6.4 9-13 0 6.6 9 7.4 9 13v12" />
        <circle cx="40" cy="24" r="10" />
        <path d="M60 14l10 20M80 14L66.5 40" />
        <path d="M92 6v22c0 4 2 6 6 6M86 15h12" />
        <circle cx="116" cy="24" r="10" />
        <path d="M126 14v20" />
      </g>
    </svg>
  );
}

/**
 * Noyta mark: an ogee doorway arch drawn as the "n", with a diya flame lit inside (an invitation at
 * your door). Ink tile in light mode, off-white tile in dark. Static copies live in /public/brand.
 */
export function LogoMark({
  className = '',
  tone = 'dark',
}: {
  className?: string;
  tone?: 'dark' | 'light';
}) {
  const gid = `nf${useId().replace(/:/g, '')}`;
  const light = tone === 'light';
  return (
    <svg viewBox="0 0 64 64" className={clsx('shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FBBF24" />
          <stop offset=".45" stopColor="#ECA8D6" />
          <stop offset="1" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" className={light ? 'fill-white' : 'fill-primary'} />
      <path
        d={ARCH}
        fill="none"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={light ? 'stroke-night' : 'stroke-ivory'}
      />
      <path d={FLAME} fill={`url(#${gid})`} />
    </svg>
  );
}
