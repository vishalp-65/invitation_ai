import { BRAND } from '@cardai/shared';
import { clsx } from 'clsx';
import Link from 'next/link';

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
      className={clsx('flex shrink-0 items-center gap-1.5', className)}
      aria-label={`${BRAND.name} home`}
    >
      {compact ? (
        <LogoMark tone={tone} className="size-7" />
      ) : (
        <>
          <span
            className={clsx(
              'font-display text-2xl uppercase leading-none !tracking-normal',
              tone === 'light' ? 'text-white' : 'text-ink',
            )}
          >
            {BRAND.name}
          </span>
          <span
            className={clsx(
              'mt-1 font-mono text-[10px] leading-none',
              tone === 'light' ? 'text-white/60' : 'text-ink-soft',
            )}
          >
            IN
          </span>
        </>
      )}
    </Link>
  );
}

/**
 * Noyta mark: the "n" drawn as a doorway arch with a diya flame above it (an invitation at your door).
 * Plum tile in light mode, gold tile on dark grounds. Static copies live in /public/brand.
 */
export function LogoMark({
  className = '',
  tone = 'dark',
}: {
  className?: string;
  tone?: 'dark' | 'light';
}) {
  const light = tone === 'light';
  return (
    <svg viewBox="0 0 32 32" className={clsx('shrink-0', className)} aria-hidden>
      <rect width="32" height="32" rx="7" className={light ? 'fill-white' : 'fill-primary'} />
      <path
        d="M10.5 25v-7.5a5.5 5.5 0 0 1 11 0V25"
        fill="none"
        strokeWidth="3.4"
        strokeLinecap="round"
        className={light ? 'stroke-night' : 'stroke-ivory dark:stroke-night'}
      />
      <path
        d="M16 3.8c1.7 2 2.3 3.3 2.3 4.3a2.3 2.3 0 0 1-4.6 0c0-1 .6-2.3 2.3-4.3Z"
        className="fill-rose"
      />
    </svg>
  );
}
