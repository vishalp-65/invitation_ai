'use client';

import { BRAND, EVENT_TYPES, type EventCategory } from '@cardai/shared';
import { clsx } from 'clsx';
import { ChevronDown, ChevronRight, Languages, LayoutGrid, LogOut, Menu, Plus, ShieldCheck, Store, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLogout, useMe } from '@/lib/hooks';
import { isLightOnly, ThemeSegmented, ThemeToggle } from '@/lib/theme';
import { AnnouncementBar } from './announcement-bar';

export function Logo({ className = '', tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  return (
    <Link href="/" className={clsx('flex shrink-0 items-center gap-2', className)} aria-label={`${BRAND.name} home`}>
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

function useSwitchLocale() {
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

export function LocaleSwitch({ tone = 'dark', compact }: { tone?: 'dark' | 'light'; compact?: boolean }) {
  const { next, label, switchTo } = useSwitchLocale();
  return (
    <button
      type="button"
      onClick={switchTo}
      data-tip={compact ? (next === 'hi' ? 'हिन्दी में देखें' : 'View in English') : undefined}
      className={clsx(
        'inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition-colors',
        tone === 'light' ? 'text-white/90 hover:bg-white/10' : 'text-ink-soft hover:bg-mist hover:text-ink',
      )}
      aria-label={next === 'hi' ? 'हिन्दी में देखें' : 'View in English'}
    >
      <Languages className="size-4" />
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
const OCCASION_GROUPS: Array<{ key: 'weddings' | 'family' | 'celebrations'; cats: EventCategory[] }> = [
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

/** Closes a popover on outside press and Esc. */
function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && close();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close();
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
 * Site navigation. Full-width sticky bar, tuned for smooth scrolling:
 *  - no backdrop-filter (blurring scrolling content re-rasterises every frame)
 *  - the "scrolled" state comes from an IntersectionObserver on a sentinel, not a scroll listener
 *  - flat: a hairline border separates it from the page, the bar never changes size
 * Desktop (lg+): links + Occasions mega menu + account menu. Below lg: a slide-in drawer.
 */
export function SiteHeader({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const t = useTranslations('nav');
  const { data: me } = useMe();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const light = tone === 'light' && !scrolled;

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e!.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => setDrawer(false), [pathname]);

  const linkCls = (active: boolean) =>
    clsx(
      'relative inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[0.94rem] font-medium transition-colors',
      light ? 'text-white/85 hover:bg-white/10 hover:text-white' : active ? 'text-ink' : 'text-ink-soft hover:bg-mist hover:text-ink',
      // Current page: a short underline, quieter than a filled pill.
      active && 'after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-accent',
    );

  return (
    <>
      <AnnouncementBar />
      {/* Marker at the top of the page: once it leaves the viewport, we're "scrolled". */}
      <div ref={sentinel} className="pointer-events-none absolute left-0 top-0 h-6 w-px" aria-hidden />
      <header className={clsx('sticky top-0 z-40 border-b transition-colors duration-200', light ? 'border-transparent bg-transparent' : 'border-hairline bg-surface')}>
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-5">
          <Logo tone={light ? 'light' : 'dark'} className="mr-3" />

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
            <OccasionsMenu linkCls={linkCls(false)} />
            {LINKS.map((n) => (
              <Link key={n.href} href={n.href} aria-current={pathname.startsWith(n.href) ? 'page' : undefined} className={linkCls(pathname.startsWith(n.href))}>
                {t(n.key)}
              </Link>
            ))}
            <Link href="/designer" aria-current={pathname.startsWith('/designer') ? 'page' : undefined} className={linkCls(pathname.startsWith('/designer'))}>
              {t('sell')}
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <div className="hidden items-center gap-0.5 lg:flex">
              <LocaleSwitch tone={light ? 'light' : 'dark'} />
              <ThemeToggle compact />
              <span className="mx-1.5 h-6 w-px bg-hairline" aria-hidden />
            </div>
            {me ? (
              <>
                <Link
                  href="/dashboard"
                  aria-current={pathname.startsWith('/dashboard') ? 'page' : undefined}
                  className={clsx(
                    'hidden h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors sm:inline-flex',
                    light ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-mist aria-[current=page]:tint-primary',
                  )}
                >
                  <LayoutGrid className="size-4" />
                  {t('myInvites')}
                </Link>
                <CreateButton label={t('create')} />
                <AccountMenu />
              </>
            ) : (
              <>
                <Link
                  href={`/login${pathname && pathname !== '/' && pathname !== '/login' ? `?next=${encodeURIComponent(pathname)}` : ''}`}
                  className={clsx('hidden h-9 items-center rounded-lg px-3 text-sm font-semibold transition-colors sm:inline-flex', light ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-mist')}
                >
                  {t('login')}
                </Link>
                <CreateButton label={t('create')} />
              </>
            )}
            <button
              type="button"
              className={clsx('grid size-10 place-items-center rounded-lg transition-colors lg:hidden', light ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-mist')}
              aria-expanded={drawer}
              aria-controls="site-drawer"
              aria-label={t('menu')}
              onClick={() => setDrawer(true)}
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} />
    </>
  );
}

function CreateButton({ label }: { label: string }) {
  return (
    <Link
      href="/create"
      className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover active:scale-[0.98] sm:px-4"
    >
      <Plus className="size-4" strokeWidth={2.5} />
      <span className="max-[360px]:hidden">{label}</span>
    </Link>
  );
}

// ---------------------------------------------------------------- Occasions mega menu

function OccasionsMenu({ linkCls }: { linkCls: string }) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
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
    hoverTimer.current = setTimeout(() => setOpen(false), 140);
  };

  return (
    <div ref={ref} className="relative" onPointerEnter={(e) => e.pointerType === 'mouse' && enter()} onPointerLeave={(e) => e.pointerType === 'mouse' && leave()}>
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
        <ChevronDown className={clsx('size-4 opacity-70 transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 pt-2">
          <div className="w-[min(720px,calc(100vw-2rem))] origin-top-left animate-[pop-in_0.12s_ease-out] menu overflow-hidden p-0">
            <div className="grid grid-cols-3 gap-1 p-3">
              {OCCASION_GROUPS.map((g) => (
                <div key={g.key}>
                  <p className="px-2.5 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">{t(g.key)}</p>
                  <ul>
                    {EVENT_TYPES.filter((e) => (g.cats as readonly string[]).includes(e.category) && e.id !== 'other').map((e) => (
                      <li key={e.id}>
                        <Link href={`/create?type=${e.id}`} onClick={close} className="menu-item">
                          <span className="grid size-6 place-items-center rounded-md bg-mist text-[0.85rem]" aria-hidden>
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
            <div className="flex items-center justify-between border-t border-hairline bg-surface-2 px-5 py-3 text-sm">
              <span className="text-ink-soft">{t('occasionsHint')}</span>
              <Link href="/templates" onClick={close} className="inline-flex items-center gap-1 font-semibold text-ink hover:underline">
                {t('allDesigns')} <ChevronRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Account menu

function Avatar({ size = 'size-9' }: { size?: string }) {
  const { data: me } = useMe();
  if (!me) return null;
  return me.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- provider avatar URL (Google), tiny
    <img src={me.avatarUrl} alt="" referrerPolicy="no-referrer" className={clsx(size, 'shrink-0 rounded-full object-cover')} />
  ) : (
    <span className={clsx(size, 'grid shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#E2394A,#8A0D14)] text-xs font-bold text-white')}>{initials(me.name, me.email)}</span>
  );
}

function AccountMenu() {
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
    <div ref={ref} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('account')}
        className="ml-1 flex items-center gap-1 rounded-lg p-0.5 pr-1.5 transition-colors hover:bg-mist"
      >
        <Avatar size="size-8" />
        <ChevronDown className={clsx('size-3.5 text-ink-soft transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right animate-[pop-in_0.12s_ease-out] menu">
          <div className="flex items-center gap-3 px-2.5 pb-3 pt-2">
            <Avatar size="size-10" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{me.name ?? t('account')}</p>
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
            <button type="button" onClick={locale.switchTo} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline px-2.5 font-semibold hover:bg-mist">
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

function MenuDivider() {
  return <div className="menu-sep" />;
}

function MenuLink({ href, icon, children, onClick }: { href: string; icon: ReactNode; children: ReactNode; onClick?: () => void }) {
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

  // Lock page scroll and close on Esc while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', key);
    };
  }, [open, onClose]);

  if (!open) return null;
  const row = 'flex h-12 items-center gap-3 rounded-lg px-3 text-[1.02rem] font-medium transition-colors active:bg-mist hover:bg-mist';

  return (
    <div className="fixed inset-0 z-50 lg:hidden" id="site-drawer">
      <button type="button" aria-label={t('close')} onClick={onClose} className="absolute inset-0 animate-[fade-in_0.15s_ease-out] bg-[var(--color-overlay)]" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('menu')}
        className="thin-scroll absolute inset-y-0 right-0 flex w-[min(380px,88vw)] animate-[drawer-in_0.2s_var(--ease-out-quint)] flex-col overflow-y-auto border-l border-hairline bg-surface text-ink"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-hairline px-4">
          <Logo />
          <button type="button" onClick={onClose} aria-label={t('close')} className="grid size-10 place-items-center rounded-lg hover:bg-mist">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3">
          {me && (
            <div className="mb-2 flex items-center gap-3 rounded-xl bg-mist/70 p-3">
              <Avatar size="size-10" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{me.name ?? t('account')}</p>
                {me.email && <p className="truncate text-sm text-ink-soft">{me.email}</p>}
              </div>
            </div>
          )}
          <Link href="/create" className="mb-2 flex h-12 items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-on-primary hover:bg-primary-hover">
            <Plus className="size-5" strokeWidth={2.5} /> {t('create')}
          </Link>

          {me && (
            <Link href="/dashboard" className={row}>
              <LayoutGrid className="size-5 text-ink-soft" /> {t('myInvites')}
            </Link>
          )}
          <button type="button" onClick={() => setOccasions((o) => !o)} aria-expanded={occasions} className={clsx(row, 'w-full justify-between text-left')}>
            {t('occasions')}
            <ChevronDown className={clsx('size-5 text-ink-soft transition-transform duration-150', occasions && 'rotate-180')} />
          </button>
          {occasions && (
            <ul className="mb-1 grid animate-[pop-in_0.12s_ease-out] grid-cols-2 gap-1 px-1">
              {EVENT_TYPES.filter((e) => e.id !== 'other').map((e) => (
                <li key={e.id}>
                  <Link href={`/create?type=${e.id}`} className="flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium hover:bg-mist">
                    <span aria-hidden>{e.emoji}</span>
                    <span className="truncate">{occasionLabel(e, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {LINKS.map((n) => (
            <Link key={n.href} href={n.href} aria-current={pathname.startsWith(n.href) ? 'page' : undefined} className={clsx(row, 'aria-[current=page]:tint-primary')}>
              {t(n.key)}
            </Link>
          ))}
          <Link href="/designer" className={row}>
            {t('sell')}
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
            <button type="button" onClick={lang.switchTo} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline px-3 font-semibold hover:bg-mist">
              <Languages className="size-4" /> {lang.label}
            </button>
          </div>
          {!isLightOnly(pathname) && (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-ink-soft">{t('theme')}</span>
              <ThemeSegmented />
            </div>
          )}
          {me ? (
            <button
              type="button"
              disabled={logout.isPending}
              onClick={() => logout.mutate(undefined, { onSuccess: () => router.push('/') })}
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-hairline font-semibold text-sindoor hover:bg-sindoor/10 disabled:opacity-60"
            >
              <LogOut className="size-4" /> {t('logout')}
            </button>
          ) : (
            <Link href="/login" className="flex h-11 items-center justify-center rounded-lg border border-hairline font-semibold hover:bg-mist">
              {t('login')}
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- footer

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
