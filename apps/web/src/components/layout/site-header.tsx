'use client';

import { BRAND } from '@cardai/shared';
import { clsx } from 'clsx';
import { Languages, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { useMe } from '@/lib/hooks';
import { ThemeToggle } from '@/lib/theme';

export function Logo({ className = '', tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  return (
    <Link href="/" className={clsx('flex items-center gap-2', className)} aria-label={`${BRAND.name} home`}>
      {/* Toran-inspired mark: arch + marigold drop, in the trilogy. */}
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E2394A" />
            <stop offset="1" stopColor="#8A0D14" />
          </linearGradient>
        </defs>
        <path d="M4 30V14a12 12 0 0 1 24 0v16Z" fill="url(#lg)" />
        <path d="M8 30V15a8 8 0 0 1 16 0v15" fill="none" stroke="#F2A900" strokeWidth="1.6" />
        <circle cx="16" cy="19" r="3.4" fill="#F2A900" />
        <path d="M16 4v3" stroke="#F2A900" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className={clsx('font-display text-[1.45rem] leading-none tracking-tight', tone === 'light' ? 'text-white' : 'text-ink')}>
        {BRAND.name}
      </span>
    </Link>
  );
}

export function LocaleSwitch({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const locale = useLocale();
  const router = useRouter();
  const next = locale === 'hi' ? 'en' : 'hi';
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
      className={clsx(
        'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors',
        tone === 'light' ? 'text-white/90 hover:bg-surface/10' : 'hover:bg-ink/5',
      )}
      aria-label={next === 'hi' ? 'हिन्दी में देखें' : 'View in English'}
    >
      <Languages className="size-4" />
      {next === 'hi' ? 'हिन्दी' : 'English'}
    </button>
  );
}

const NAV = [
  { href: '/templates', key: 'templates' },
  { href: '/pricing', key: 'pricing' },
] as const;

/**
 * Sticky navigation, tuned for smooth scrolling:
 *  - no backdrop-filter: blurring the content that scrolls underneath re-rasterises every frame
 *  - the "scrolled" state comes from an IntersectionObserver on a sentinel, not a scroll listener
 *  - the only thing that animates is the opacity of a solid background layer (compositor-only);
 *    the bar's size never changes, so there is no layout work while scrolling
 * `tone="light"` = white text while the bar sits over a dark hero.
 */
export function SiteHeader({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const t = useTranslations('nav');
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const light = tone === 'light' && !scrolled && !open;

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e!.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* 24px tall marker at the top of the page: once it leaves the viewport, we're "scrolled". */}
      <div ref={sentinel} className="pointer-events-none absolute left-0 top-0 h-6 w-px" aria-hidden />
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="relative isolate mx-auto flex h-14 max-w-6xl items-center gap-1 rounded-full pl-4 pr-2">
          {/* Background layer: fades in after scrolling. Opacity only, so it never repaints. */}
          <span
            aria-hidden
            className={clsx(
              'pointer-events-none absolute inset-0 -z-10 rounded-full border border-hairline bg-surface/95 transition-opacity duration-300',
              scrolled || open || tone === 'dark' ? 'opacity-100' : 'opacity-0',
              (scrolled || open) && 'shadow-[0_1px_2px_rgb(30_34_80/0.04),0_10px_30px_-14px_rgb(30_34_80/0.25)]',
            )}
          />
          <Logo tone={light ? 'light' : 'dark'} />
          <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={pathname === n.href ? 'page' : undefined}
                className={clsx(
                  'rounded-full px-3.5 py-2 text-[0.95rem] font-medium transition-colors',
                  light ? 'text-white/85 hover:bg-surface/10 hover:text-white' : 'text-ink/80 hover:bg-ink/5 hover:text-ink',
                  'aria-[current=page]:font-semibold',
                )}
              >
                {t(n.key)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-1 sm:flex">
            <LocaleSwitch tone={light ? 'light' : 'dark'} />
            <ThemeToggle />
            <Link
              href={me ? '/dashboard' : '/login'}
              className={clsx('rounded-full px-3.5 py-2 text-[0.95rem] font-semibold', light ? 'text-white hover:bg-surface/10' : 'hover:bg-ink/5')}
            >
              {me ? t('myInvites') : t('login')}
            </Link>
            <ButtonLink href="/create" variant="solid" size="sm" className="h-10 px-5">
              {t('create')}
            </ButtonLink>
          </div>
          <button
            type="button"
            className={clsx('ml-auto grid size-10 place-items-center rounded-full sm:hidden', light ? 'text-white' : 'text-ink')}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Mobile sheet */}
        <div id="mobile-menu" hidden={!open} className="panel mx-auto mt-2 max-w-6xl origin-top animate-fade-up rounded-[28px] p-3 sm:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-2xl px-4 py-3 text-lg font-medium active:bg-ink/5">
                {t(n.key)}
              </Link>
            ))}
            <Link href={me ? '/dashboard' : '/login'} className="rounded-2xl px-4 py-3 text-lg font-medium active:bg-ink/5">
              {me ? t('myInvites') : t('login')}
            </Link>
          </nav>
          <div className="mt-2 flex items-center gap-2 border-t border-hairline px-1 pt-3">
            <LocaleSwitch />
            <ThemeToggle />
            <ButtonLink href="/create" variant="solid" className="ml-auto">
              {t('create')}
            </ButtonLink>
          </div>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative bg-night text-white">
      <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo tone="light" />
          <p className="mt-4 text-white/70">
            Invitation cards, video invites and invitation websites for every Indian family occasion — in your language.
          </p>
        </div>
        <FooterCol title="Make" links={[['/create', 'Make an invitation'], ['/templates', 'Designs'], ['/pricing', 'Pricing']]} />
        <FooterCol title="Occasions" links={[['/create?type=wedding', 'Wedding'], ['/create?type=griha-pravesh', 'Griha Pravesh'], ['/create?type=birthday', 'Birthday']]} />
        <FooterCol title="Company" links={[['/designer', 'Sell your designs'], ['/login', 'Log in'], ['/signup', 'Sign up']]} />
      </div>
      <p className="relative border-t border-white/10 py-5 text-center text-sm text-white/50">Made in India, for every family.</p>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <h3 className="font-sans text-sm font-semibold text-marigold">{title}</h3>
      <ul className="mt-3 flex flex-col gap-2">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="text-white/75 transition-colors hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
