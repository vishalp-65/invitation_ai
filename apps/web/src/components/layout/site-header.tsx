'use client';

import { BRAND, BUILTIN_TEMPLATES, EVENT_TYPES, type EventCategory } from '@cardai/shared';
import { clsx } from 'clsx';
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Languages,
  LayoutGrid,
  LogOut,
  Palette,
  PartyPopper,
  Plus,
  ShieldCheck,
  Store,
  Tag,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLogout, useMe } from '@/lib/hooks';
import { isLightOnly, ThemeSegmented, ThemeToggle } from '@/lib/theme';
import { ArtImage } from '@/components/studio/primitives';
import { AnnouncementBar } from './announcement-bar';

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

export function useSwitchLocale() {
  const locale = useLocale();
  const router = useRouter();
  const next = locale === 'hi' ? 'en' : 'hi';
  return {
    next,
    label: next === 'hi' ? 'हिन्दी' : 'English',
    switchTo: () => {
      document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    },
  };
}

export function LocaleSwitch({ tone = 'dark' }: { tone?: 'dark' | 'light'; compact?: boolean }) {
  const { next, label, switchTo } = useSwitchLocale();
  return (
    <button
      type="button"
      onClick={switchTo}
      className={clsx(
        'inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors',
        tone === 'light' ? 'text-white/80 hover:text-white' : 'text-ink-soft hover:text-ink',
      )}
      aria-label={next === 'hi' ? 'हिन्दी में देखें' : 'View in English'}
    >
      <Languages className="size-4" aria-hidden />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------- data

const LINKS = [
  { href: '/templates', key: 'templates' },
  { href: '/pricing', key: 'pricing' },
] as const;

/** Occasion menu columns (categories merged so it stays three tidy columns). */
const OCCASION_GROUPS: Array<{
  key: 'weddings' | 'family' | 'celebrations';
  cats: EventCategory[];
}> = [
  { key: 'weddings', cats: ['wedding'] },
  { key: 'family', cats: ['family', 'religious'] },
  { key: 'celebrations', cats: ['celebration', 'business'] },
];

function occasionLabel(e: (typeof EVENT_TYPES)[number], locale: string) {
  if (locale === 'hi') return e.labelHi;
  // "Griha Pravesh / Housewarming" → "Griha Pravesh": the short name reads better in a menu.
  return e.label.split(' / ')[0]!;
}

const initials = (name: string | null, email: string | null) =>
  (name?.trim() || email || '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/** Closes a popover on outside press and Esc (Esc hands focus back to the popover's trigger button). */
function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && close();
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (ref.current?.contains(document.activeElement)) ref.current.querySelector<HTMLElement>('[aria-expanded]')?.focus();
      close();
    };
    window.addEventListener('pointerdown', away, true);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', away, true);
      window.removeEventListener('keydown', key);
    };
  }, [open, close, ref]);
}

// ---------------------------------------------------------------- header

/**
 * Site navigation: a floating "island".
 *  - At the top of the page it sits flush with the page ground; once you scroll it tightens into a
 *    bordered bar (flat, hairline, no shadow) and tucks away while you scroll down, back on scroll up.
 *  - A single pill slides under whichever link the pointer is on.
 *  - A thin gold line along its bottom edge shows reading progress (CSS scroll timeline, no JS).
 *  - No backdrop-filter: blurring scrolling content re-rasterises every frame.
 * Desktop (lg+): links + Occasions mega menu + account menu. Below lg: a slide-in drawer.
 */
export function SiteHeader({ overlay = false }: { overlay?: boolean } = {}) {
  const t = useTranslations('nav');
  const { data: me, isLoading } = useMe();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { scrolled, hidden } = useScrollState(headerRef, drawer);
  useEffect(() => setDrawer(false), [pathname]);

  const active = (href: string) => pathname.startsWith(href);
  // Over the hero video (home page, before scrolling) the bar is transparent with white text.
  const onMedia = overlay && !scrolled && !drawer;
  const linkCls = (on: boolean) =>
    clsx(
      'nav-link relative z-10 inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm transition-colors duration-200',
      onMedia
        ? on
          ? 'text-white'
          : 'text-white/70 hover:text-white aria-expanded:text-white'
        : on
          ? 'text-ink'
          : 'text-ink-soft hover:text-ink aria-expanded:text-ink',
    );
  const loginHref = `/login${pathname && pathname !== '/' && pathname !== '/login' ? `?next=${encodeURIComponent(pathname)}` : ''}`;

  return (
    <>
      {!overlay && <AnnouncementBar />}
      <header
        ref={headerRef}
        data-scrolled={scrolled || undefined}
        data-hidden={hidden || undefined}
        className={clsx(
          'group/nav top-0 z-40 px-2 pt-0 transition-[transform,padding] duration-500 ease-[var(--ease-out-quint)] data-[scrolled]:pt-2 data-[hidden]:-translate-y-[calc(100%+4px)] sm:px-4 sm:data-[scrolled]:pt-4',
          overlay ? 'fixed inset-x-0' : 'sticky',
        )}
      >
        {overlay && !scrolled && <AnnouncementBar />}
        <div className="relative mx-auto flex h-20 max-w-[1400px] items-center rounded-2xl border border-transparent px-4 transition-[max-width,height,background-color,border-color] duration-500 ease-[var(--ease-out-quint)] group-data-[scrolled]/nav:h-14 group-data-[scrolled]/nav:max-w-[1200px] group-data-[scrolled]/nav:border-ink/10 group-data-[scrolled]/nav:bg-ivory/80 group-data-[scrolled]/nav:backdrop-blur-xl sm:px-6 lg:px-8">
          <Logo className="mr-6 lg:mr-10" tone={onMedia ? 'light' : 'dark'} />

          <SlidingNav className="hidden lg:flex" label="Main">
            <OccasionsMenu linkCls={linkCls(false)} />
            {LINKS.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active(n.href) ? 'page' : undefined}
                className={linkCls(active(n.href))}
              >
                {t(n.key)}
                {active(n.href) && <ActiveDot />}
              </Link>
            ))}
            <Link
              href="/designer"
              aria-current={active('/designer') ? 'page' : undefined}
              className={linkCls(active('/designer'))}
            >
              {t('sell')}
              {active('/designer') && <ActiveDot />}
            </Link>
          </SlidingNav>

          <div className="ml-auto flex items-center gap-1">
            <div className="hidden items-center gap-0.5 lg:flex">
              <LocaleSwitch tone={onMedia ? 'light' : 'dark'} />
              <ThemeToggle
                compact
                className={
                  onMedia ? '!text-white/70 hover:!bg-white/10 hover:!text-white' : undefined
                }
              />
              <span
                aria-hidden
                className={clsx('mx-1.5 h-5 w-px', onMedia ? 'bg-white/20' : 'bg-hairline')}
              />
            </div>
            {/* Reserve the slot while the session loads so the bar doesn't jump. */}
            {isLoading ? (
              <span className="hidden h-9 w-40 sm:block" aria-hidden />
            ) : me ? (
              <>
                <Link href="/dashboard" className={clsx(linkCls(false), 'max-sm:hidden')}>
                  {t('dashboard')}
                </Link>
                {!pathname.startsWith('/create') && (
                  <CreateButton label={t('create')} onMedia={onMedia} />
                )}
                <AccountMenu />
              </>
            ) : (
              <>
                <Link href={loginHref} className={clsx(linkCls(false), 'max-sm:hidden')}>
                  {t('login')}
                </Link>
                {!pathname.startsWith('/create') && (
                  <CreateButton label={t('create')} onMedia={onMedia} />
                )}
              </>
            )}
            <button
              type="button"
              className={clsx(
                '-mr-1 grid size-10 place-items-center rounded-full transition-colors lg:hidden',
                onMedia ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-mist',
              )}
              aria-expanded={drawer}
              aria-controls="site-drawer"
              aria-label={t('menu')}
              onClick={() => setDrawer(true)}
            >
              <MenuIcon open={drawer} />
            </button>
          </div>

          {/* Reading progress: scales with the page's scroll position (scroll-driven animation). */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-3 -bottom-px h-px overflow-hidden opacity-0 transition-opacity duration-300 group-data-[scrolled]/nav:opacity-100"
          >
            <span className="nav-progress block h-full origin-left bg-ink/40" />
          </span>
        </div>
      </header>
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} />
    </>
  );
}

function ActiveDot() {
  return (
    <span
      aria-hidden
      className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-gold"
    />
  );
}

/** Two bars that fold into an X. */
function MenuIcon({ open }: { open: boolean }) {
  return (
    <span aria-hidden className="relative block h-3 w-[18px]">
      <span
        className={clsx(
          'absolute left-0 top-0 h-[1.75px] w-full rounded-full bg-current transition-transform duration-300 ease-[var(--ease-out-quint)]',
          open && 'translate-y-[5px] rotate-45',
        )}
      />
      <span
        className={clsx(
          'absolute bottom-0 left-0 h-[1.75px] w-full rounded-full bg-current transition-transform duration-300 ease-[var(--ease-out-quint)]',
          open && '-translate-y-[5px] -rotate-45',
        )}
      />
    </span>
  );
}

/**
 * A nav row with one shared hover pill that glides between links (and to the focused link for
 * keyboard users). Measures with offsetLeft/offsetWidth only on pointer/focus, never on scroll.
 */
function SlidingNav({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [pill, setPill] = useState({ x: 0, w: 0, on: false, instant: true });
  const moveTo = (target: EventTarget | null) => {
    const el = (target as HTMLElement | null)?.closest?.('.nav-link') as HTMLElement | null;
    if (!el || !ref.current?.contains(el)) return;
    const box = ref.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setPill((p) => ({ x: r.left - box.left, w: r.width, on: true, instant: !p.on }));
  };
  return (
    <nav
      ref={ref}
      aria-label={label}
      className={clsx('relative items-center gap-0.5', className)}
      onPointerOver={(e) => e.pointerType === 'mouse' && moveTo(e.target)}
      onPointerLeave={() => setPill((p) => ({ ...p, on: false }))}
      onFocus={(e) => moveTo(e.target)}
      onBlur={() => setPill((p) => ({ ...p, on: false }))}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-1/2 h-9 -translate-y-1/2 rounded-full bg-ink/[0.06] group-data-[scrolled]/nav:bg-mist transition-[transform,width,opacity] duration-300 ease-[var(--ease-out-quint)]"
        style={{
          width: pill.w,
          transform: `translate3d(${pill.x}px,-50%,0)`,
          opacity: pill.on ? 1 : 0,
          transitionProperty: pill.instant ? 'opacity' : undefined,
        }}
      />
      {children}
    </nav>
  );
}

/**
 * `scrolled` once the page leaves the top; `hidden` while scrolling down past the fold
 * (never while the pointer or focus is inside the bar, or the drawer is open).
 * rAF-throttled passive listener, state only changes on threshold crossings.
 */
function useScrollState(ref: React.RefObject<HTMLElement | null>, locked: boolean) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const dy = y - last;
      setScrolled(y > 8);
      if (Math.abs(dy) > 6) {
        const busy = locked || !!ref.current?.matches(':hover, :focus-within');
        setHidden(dy > 0 && y > 480 && !busy);
        last = y;
      }
      if (y < 480) setHidden(false);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [locked, ref]);
  return { scrolled, hidden };
}

function CreateButton({ label, onMedia }: { label: string; onMedia?: boolean }) {
  return (
    <Link
      href="/create"
      className={clsx(
        'press group/cta relative ml-2 inline-flex items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full font-medium transition-all duration-500',
        onMedia
          ? 'h-10 bg-white px-5 text-sm text-black hover:bg-white/90'
          : 'h-9 bg-primary px-4 text-[0.8125rem] text-on-primary hover:bg-primary-hover',
      )}
    >
      {label}
      <ArrowUpRight
        className="size-3.5 opacity-70 transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover/cta:-translate-y-px group-hover/cta:translate-x-px group-hover/cta:opacity-100"
        aria-hidden
      />
    </Link>
  );
}

// ---------------------------------------------------------------- Occasions mega menu

/** First design made for an occasion: shown as the live preview in the mega menu. */
const PREVIEW_FOR = (() => {
  const map = new Map<string, string>();
  for (const e of EVENT_TYPES) {
    const tpl = BUILTIN_TEMPLATES.find(
      (t) => t.eventTypes !== 'all' && (t.eventTypes as string[]).includes(e.id),
    );
    if (tpl) map.set(e.id, tpl.id);
  }
  return map;
})();
const designCount = (id: string) =>
  BUILTIN_TEMPLATES.filter((t) => t.eventTypes === 'all' || (t.eventTypes as string[]).includes(id))
    .length;

function OccasionsMenu({ linkCls }: { linkCls: string }) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState('wedding');
  const ref = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPointer = useRef('');
  const close = useRef(() => setOpen(false)).current;
  useDismiss(open, close, ref);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  // Hover opens on mouse (with a short grace period so diagonal moves don't close it); click/tap always toggles.
  const enter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setOpen(true);
  };
  const leave = () => {
    hoverTimer.current = setTimeout(() => setOpen(false), 160);
  };
  const ev = EVENT_TYPES.find((e) => e.id === focus) ?? EVENT_TYPES[0]!;
  const previewId = PREVIEW_FOR.get(focus);

  return (
    <div
      ref={ref}
      className="relative"
      onPointerEnter={(e) => e.pointerType === 'mouse' && enter()}
      onPointerLeave={(e) => e.pointerType === 'mouse' && leave()}
    >
      <button
        type="button"
        className={linkCls}
        aria-expanded={open}
        aria-haspopup="true"
        onPointerDown={(e) => (lastPointer.current = e.pointerType)}
        // Mouse hover already opened it, so a click shouldn't close it again; touch and keyboard toggle.
        onClick={() => (lastPointer.current === 'mouse' ? setOpen(true) : setOpen((o) => !o))}
        onKeyDown={() => (lastPointer.current = 'keyboard')}
      >
        {t('occasions')}
        <ChevronDown
          className={clsx(
            'size-4 opacity-70 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="absolute -left-3 top-full z-50 pt-3">
          <div className="menu grid w-[min(860px,calc(100vw-2rem))] origin-top-left animate-[sheet-in_0.22s_var(--ease-out-quint)] grid-cols-[1fr_220px] overflow-hidden p-0">
            <div className="flex flex-col">
              <div className="grid grid-cols-3 gap-1 p-3">
                {OCCASION_GROUPS.map((g) => (
                  <div key={g.key}>
                    <p className="px-2.5 pb-1.5 pt-1 text-[0.8125rem] font-medium text-ink-soft">
                      {t(g.key)}
                    </p>
                    <ul>
                      {EVENT_TYPES.filter(
                        (e) =>
                          (g.cats as readonly string[]).includes(e.category) && e.id !== 'other',
                      ).map((e) => (
                        <li key={e.id}>
                          <Link
                            href={`/create?type=${e.id}`}
                            onClick={close}
                            onPointerEnter={() => setFocus(e.id)}
                            onFocus={() => setFocus(e.id)}
                            data-on={focus === e.id || undefined}
                            className="menu-item data-[on]:bg-mist"
                          >
                            <span
                              className="grid size-6 place-items-center rounded-md bg-sand text-[0.85rem]"
                              aria-hidden
                            >
                              {e.emoji}
                            </span>
                            <span className="truncate">{occasionLabel(e, locale)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-hairline bg-surface-2 px-5 py-3 text-sm">
                <span className="text-ink-soft">{t('occasionsHint')}</span>
                <Link
                  href="/templates"
                  onClick={close}
                  className="group/all inline-flex items-center gap-1 font-medium text-ink"
                >
                  {t('allDesigns')}{' '}
                  <ChevronRight className="size-4 transition-transform duration-200 group-hover/all:translate-x-0.5" />
                </Link>
              </div>
            </div>

            {/* Live preview of the occasion under the pointer. */}
            <Link
              href={`/create?type=${ev.id}`}
              onClick={close}
              tabIndex={-1}
              className="group/pv relative flex flex-col border-l border-hairline bg-sand p-4"
            >
              <div className="relative aspect-[9/14] overflow-hidden rounded-lg ring-1 ring-black/5">
                {previewId && (
                  // Keyed so each occasion fades in rather than swapping abruptly.
                  <Image
                    key={previewId}
                    src={`/showcase/${previewId}.jpg`}
                    alt=""
                    fill
                    sizes="200px"
                    className="animate-[fade-in_0.35s_ease-out] object-cover object-top transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover/pv:scale-[1.04]"
                  />
                )}
              </div>
              <p className="mt-3 truncate text-sm font-medium">{occasionLabel(ev, locale)}</p>
              <p className="text-[0.8125rem] text-ink-soft">
                {locale === 'hi' ? `${designCount(ev.id)} डिज़ाइन` : `${designCount(ev.id)} designs`}{' '}
                ·{' '}
                <span className="text-ink underline decoration-hairline underline-offset-4 group-hover/pv:decoration-ink">
                  {locale === 'hi' ? 'शुरू करें' : 'Start'}
                </span>
              </p>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Account menu

export function Avatar({ size = 'size-9' }: { size?: string }) {
  const { data: me, isLoading } = useMe();
  // Hold the space while the session loads so headers don't jump when the avatar arrives.
  if (!me) return isLoading ? <span className={clsx(size, 'skeleton shrink-0 rounded-full')} aria-hidden /> : null;
  return me.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- provider avatar URL (Google), tiny
    <img
      src={me.avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
      className={clsx(size, 'shrink-0 rounded-full object-cover')}
    />
  ) : (
    <span
      className={clsx(
        size,
        'grid shrink-0 place-items-center rounded-full bg-mist text-xs font-medium text-ink ring-1 ring-inset ring-hairline',
      )}
    >
      {initials(me.name, me.email)}
    </span>
  );
}

export function AccountMenu({
  className = 'hidden lg:block',
  align = 'right',
}: {
  className?: string;
  align?: 'right' | 'left-up';
}) {
  const t = useTranslations('nav');
  const { data: me } = useMe();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(() => setOpen(false)).current;
  useDismiss(open, close, ref);
  useEffect(() => setOpen(false), [pathname]);
  const locale = useSwitchLocale();
  if (!me) return null;

  return (
    <div ref={ref} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          // ArrowDown opens the menu and lands on the first item.
          if (e.key !== 'ArrowDown') return;
          e.preventDefault();
          setOpen(true);
          requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('account')}
        className="ml-1 flex items-center gap-1 rounded-lg p-0.5 pr-1.5 transition-colors hover:bg-mist"
      >
        <Avatar size="size-8" />
        <ChevronDown
          className={clsx(
            'size-3.5 text-ink-soft transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={t('account')}
          onKeyDown={menuKeys}
          className={clsx(
            'absolute z-50 w-72 animate-[sheet-in_0.18s_var(--ease-out-quint)] menu',
            align === 'right'
              ? 'right-0 top-full mt-2 origin-top-right'
              : 'bottom-full left-0 mb-2 origin-bottom-left',
          )}
        >
          <div className="flex items-center gap-3 px-2.5 pb-3 pt-2">
            <Avatar size="size-10" />
            <div className="min-w-0">
              <p className="truncate font-medium">{me.name ?? t('account')}</p>
              {me.email && <p className="truncate text-sm text-ink-soft">{me.email}</p>}
            </div>
          </div>
          <MenuDivider />
          <MenuLink href="/dashboard" icon={<LayoutGrid className="size-4" />} onClick={close}>
            {t('myInvites')}
          </MenuLink>
          <MenuLink href="/create" icon={<Plus className="size-4" />} onClick={close}>
            {t('create')}
          </MenuLink>
          <MenuLink href="/designer" icon={<Store className="size-4" />} onClick={close}>
            {t('sell')}
          </MenuLink>
          {me.role === 'admin' && (
            <MenuLink href="/admin" icon={<ShieldCheck className="size-4" />} onClick={close}>
              {t('admin')}
            </MenuLink>
          )}
          <MenuDivider />
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-sm">
            <span className="text-ink-soft">{t('language')}</span>
            <button
              type="button"
              onClick={locale.switchTo}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline px-2.5 font-medium hover:bg-mist"
            >
              <Languages className="size-3.5" /> {locale.label}
            </button>
          </div>
          {!isLightOnly(pathname) && (
            <div className="flex flex-col gap-1.5 px-2.5 py-1.5 text-sm">
              <span className="text-ink-soft">{t('theme')}</span>
              <ThemeSegmented />
            </div>
          )}
          <MenuDivider />
          <button
            type="button"
            role="menuitem"
            disabled={logout.isPending}
            onClick={() => logout.mutate(undefined, { onSuccess: () => router.push('/') })}
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium text-sindoor transition-colors hover:bg-sindoor/10 disabled:opacity-60"
          >
            <LogOut className="size-4" /> {t('logout')}
          </button>
        </div>
      )}
    </div>
  );
}

/** Arrow keys / Home / End move between a menu's items (WAI-ARIA menu pattern). */
function menuKeys(e: React.KeyboardEvent<HTMLElement>) {
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')];
  if (!items.length) return;
  const i = items.indexOf(document.activeElement as HTMLElement);
  const to =
    e.key === 'ArrowDown' ? (i + 1) % items.length
    : e.key === 'ArrowUp' ? (i <= 0 ? items.length - 1 : i - 1)
    : e.key === 'Home' ? 0
    : e.key === 'End' ? items.length - 1
    : -1;
  if (to < 0) return;
  e.preventDefault();
  items[to]!.focus();
}

function MenuDivider() {
  return <div className="menu-sep" />;
}

function MenuLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} className="menu-item">
      <span className="text-ink-soft">{icon}</span>
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------- Mobile / tablet drawer

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const { data: me } = useMe();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();
  const lang = useSwitchLocale();
  const [occasions, setOccasions] = useState(false);

  const panel = useRef<HTMLElement>(null);
  // The parent passes a fresh onClose each render; read it through a ref so the effect below runs
  // once per open (re-running would bounce focus to the opener and back).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // While open: lock page scroll, move focus into the drawer and keep Tab inside it, close on Esc.
  // On close, focus goes back to whatever opened it (the menu button).
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('button')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return closeRef.current();
      if (e.key !== 'Tab' || !panel.current) return;
      const focusable = [...panel.current.querySelectorAll<HTMLElement>('a[href]:not([tabindex="-1"]), button:not(:disabled):not([tabindex="-1"])')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!panel.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', key);
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  if (!open) return null;
  const row =
    'flex h-11 items-center gap-3 rounded-lg px-3 text-[0.95rem] font-medium transition-colors active:bg-mist hover:bg-mist';

  return (
    <div className="fixed inset-0 z-50 lg:hidden" id="site-drawer">
      <button
        type="button"
        aria-label={t('close')}
        onClick={onClose}
        className="absolute inset-0 animate-[fade-in_0.15s_ease-out] bg-[var(--color-overlay)]"
      />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={t('menu')}
        // Any link closes the drawer, including one to the page you're already on (no route change).
        onClick={(e) => (e.target as Element).closest('a[href]') && onClose()}
        className="thin-scroll absolute inset-y-0 right-0 flex w-[min(380px,88vw)] animate-[drawer-in_0.28s_var(--ease-out-quint)] flex-col overflow-y-auto border-l border-hairline bg-surface text-ink"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-hairline px-4">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="grid size-10 place-items-center rounded-lg hover:bg-mist"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="stagger flex flex-1 flex-col gap-1 p-3">
          {me && (
            <div className="mb-2 flex items-center gap-3 rounded-xl bg-mist/70 p-3">
              <Avatar size="size-10" />
              <div className="min-w-0">
                <p className="truncate font-medium">{me.name ?? t('account')}</p>
                {me.email && <p className="truncate text-sm text-ink-soft">{me.email}</p>}
              </div>
            </div>
          )}
          <Link
            href="/create"
            className="mb-2 flex h-11 items-center justify-center rounded-lg bg-primary font-medium text-on-primary hover:bg-primary-hover"
          >
            {t('create')}
          </Link>

          {me && (
            <Link href="/dashboard" className={row}>
              <LayoutGrid className="size-5 text-ink-soft" /> {t('myInvites')}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setOccasions((o) => !o)}
            aria-expanded={occasions}
            className={clsx(row, 'w-full text-left')}
          >
            <PartyPopper className="size-5 text-ink-soft" />
            <span className="flex-1">{t('occasions')}</span>
            <ChevronDown
              className={clsx(
                'size-5 text-ink-soft transition-transform duration-150',
                occasions && 'rotate-180',
              )}
            />
          </button>
          {occasions && (
            <ul className="mb-1 grid animate-[pop-in_0.12s_ease-out] grid-cols-2 gap-1 px-1">
              {EVENT_TYPES.filter((e) => e.id !== 'other').map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/create?type=${e.id}`}
                    className="flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium hover:bg-mist"
                  >
                    <span aria-hidden>{e.emoji}</span>
                    <span className="truncate">{occasionLabel(e, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {LINKS.map((n) => {
            const Icon = n.href === '/templates' ? Palette : Tag;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={pathname.startsWith(n.href) ? 'page' : undefined}
                className={clsx(row, 'aria-[current=page]:tint-primary')}
              >
                <Icon className="size-5 text-ink-soft" /> {t(n.key)}
              </Link>
            );
          })}
          <Link href="/designer" className={row}>
            <Store className="size-5 text-ink-soft" /> {t('sell')}
          </Link>
          {me?.role === 'admin' && (
            <Link href="/admin" className={row}>
              <ShieldCheck className="size-5 text-ink-soft" /> {t('admin')}
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-hairline p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-soft">{t('language')}</span>
            <button
              type="button"
              onClick={lang.switchTo}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline px-3 font-medium hover:bg-mist"
            >
              <Languages className="size-4" /> {lang.label}
            </button>
          </div>
          {!isLightOnly(pathname) && (
            <div className="flex flex-col gap-2 text-sm">
              <span className="text-ink-soft">{t('theme')}</span>
              <ThemeSegmented />
            </div>
          )}
          {me ? (
            <button
              type="button"
              disabled={logout.isPending}
              onClick={() => logout.mutate(undefined, { onSuccess: () => router.push('/') })}
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-hairline font-medium text-sindoor hover:bg-sindoor/10 disabled:opacity-60"
            >
              <LogOut className="size-4" /> {t('logout')}
            </button>
          ) : (
            <Link
              href="/login"
              className="flex h-11 items-center justify-center rounded-lg border border-hairline font-medium hover:bg-mist"
            >
              {t('login')}
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- footer

export function SiteFooter({ banner = false }: { banner?: boolean } = {}) {
  return (
    <footer className="relative bg-black text-white [color-scheme:dark]">
      {/* Panoramic art banner (home page). Drop /landing/footer-panorama.jpg in to replace the glow. */}
      {banner && (
        <div className="art-wrap-all relative h-[240px] w-full overflow-clip sm:h-[300px] md:h-[420px]">
          <ArtImage name="footer-panorama" collapse className="parallax-slow absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
        </div>
      )}
      <div
        className={clsx(
          'relative z-10 mx-auto max-w-[1400px] px-5 sm:px-6 lg:px-12',
          banner && 'pb-24 lg:pb-0',
        )}
      >
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 py-14 sm:grid-cols-4 lg:grid-cols-6 lg:gap-8 lg:py-20">
          <div className="col-span-2 sm:col-span-4 lg:col-span-2">
            <Logo tone="light" />
            <p className="mb-8 mt-6 max-w-xs text-sm leading-relaxed text-white/50">
              Invitation cards, video invites and invitation websites for every Indian family
              occasion, in your language.
            </p>
            <a
              href="https://wa.me/910000000000?text=Hi"
              target="_blank"
              rel="noopener"
              className="group flex w-fit items-center gap-1 text-sm text-white/40 transition-colors hover:text-white"
            >
              WhatsApp
              <ArrowUpRight className="size-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
            </a>
          </div>
          <FooterCol
            title="Make"
            links={[
              ['/create', 'Make an invitation'],
              ['/templates', 'Designs'],
              ['/pricing', 'Pricing'],
            ]}
          />
          <FooterCol
            title="Occasions"
            links={[
              ['/wedding-invitation', 'Wedding invitations'],
              ['/engagement-invitation', 'Engagement invitations'],
              ['/griha-pravesh-invitation', 'Griha pravesh invitations'],
              ['/birthday-invitation', 'Birthday invitations'],
              ['/nikah-invitation', 'Nikah invitations'],
              ['/puja-invitation', 'Puja invitations'],
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              ['/designer', 'Sell your designs', 'Open'],
              ['/login', 'Log in'],
              ['/signup', 'Sign up'],
            ]}
          />
          <FooterCol
            title="Help"
            links={[
              ['/#pricing', 'Plans'],
              ['/#privacy', 'Privacy'],
              ['/#faq', 'FAQ'],
            ]}
          />
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-8 md:flex-row">
          <p className="text-sm text-white/30">
            © {new Date().getFullYear()} {BRAND.name}. Made in India, for every family.
          </p>
          <span className="flex items-center gap-2 text-sm text-white/30">
            <span className="size-2 rounded-full bg-rose" />
            Invites delivering
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<[string, string, string?]> }) {
  return (
    <div>
      <h3 className="mb-6 text-sm font-medium text-white">{title}</h3>
      <ul className="flex flex-col gap-4">
        {links.map(([href, label, badge]) => (
          <li key={href}>
            <Link
              href={href}
              className="inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
            >
              {label}
              {badge && (
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-black">
                  {badge}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
