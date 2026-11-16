'use client';

import { clsx } from 'clsx';
import { LayoutGrid, Package, Palette, PanelLeftClose, PanelLeftOpen, Plus, Settings, ShieldCheck, Store, Users, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { useMe } from '@/lib/hooks';
import { ThemeToggle } from '@/lib/theme';
import { AccountMenu, Avatar, LocaleSwitch, Logo } from './site-header';

type NavKey = 'invitations' | 'guests' | 'orders' | 'templates' | 'sell' | 'admin' | 'settings';
interface NavItem {
  key: NavKey;
  href: string;
  icon: LucideIcon;
  /** Which paths light this item up. */
  match: (p: string) => boolean;
}

const MAIN: NavItem[] = [
  { key: 'invitations', href: '/dashboard', icon: LayoutGrid, match: (p) => p === '/dashboard' || p.startsWith('/dashboard/events') },
  { key: 'guests', href: '/dashboard/guests', icon: Users, match: (p) => p.startsWith('/dashboard/guests') },
  { key: 'orders', href: '/dashboard/orders', icon: Package, match: (p) => p.startsWith('/dashboard/orders') },
  { key: 'templates', href: '/dashboard/designs', icon: Palette, match: (p) => p.startsWith('/dashboard/designs') || p.startsWith('/templates') },
];
const MORE: NavItem[] = [{ key: 'sell', href: '/designer', icon: Store, match: (p) => p.startsWith('/designer') }];
const ADMIN: NavItem = { key: 'admin', href: '/admin', icon: ShieldCheck, match: (p) => p.startsWith('/admin') };
const SETTINGS: NavItem = { key: 'settings', href: '/dashboard/settings', icon: Settings, match: (p) => p.startsWith('/dashboard/settings') };

const SIDEBAR_KEY = 'cardai-sidebar';

/** Collapsed state lives on <html data-sidebar> (set before paint by the boot script), so there's no flash. */
function useSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => setCollapsed(document.documentElement.dataset.sidebar === 'collapsed'), []);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (next) document.documentElement.dataset.sidebar = 'collapsed';
    else delete document.documentElement.dataset.sidebar;
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? 'collapsed' : 'open');
    } catch {
      /* storage blocked: still applies for this visit */
    }
  };
  return { collapsed, toggle };
}

/**
 * Signed-in frame: a collapsible left sidebar on desktop (lg+), a slim top bar for language,
 * theme and account, and a bottom tab bar on phones and tablets.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { data: me } = useMe();
  const { collapsed, toggle } = useSidebar();
  const items = [...MAIN];
  const more = me?.role === 'admin' ? [...MORE, ADMIN] : MORE;
  const current = [...items, ...more, SETTINGS].find((i) => i.match(pathname));

  return (
    <div className="app-frame min-h-dvh bg-ivory">
      {/* ---------------- Sidebar (desktop) ---------------- */}
      <aside
        aria-label={t('dashboard')}
        className="app-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-hairline bg-surface lg:flex"
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-hairline px-4">
          <Logo compact={collapsed} />
        </div>

        <div className="px-3 pt-4">
          <Link
            href="/create"
            data-tip={collapsed ? t('newInvite') : undefined}
            className={clsx(
              'flex h-10 items-center gap-2 rounded-lg bg-primary text-sm font-semibold text-on-primary transition-[background-color,transform] duration-150 hover:bg-primary-hover active:scale-[0.98]',
              collapsed ? 'justify-center' : 'px-3.5',
            )}
          >
            <Plus className="size-4 shrink-0" aria-hidden />
            <span className="sb-label">{t('newInvite')}</span>
          </Link>
        </div>

        <nav className="thin-scroll flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4" aria-label="Dashboard">
          {items.map((i) => (
            <SideLink key={i.key} item={i} label={t(i.key)} active={i.match(pathname)} collapsed={collapsed} />
          ))}
          <div className="my-3 h-px bg-hairline" />
          {more.map((i) => (
            <SideLink key={i.key} item={i} label={t(i.key)} active={i.match(pathname)} collapsed={collapsed} />
          ))}
        </nav>

        <div className="flex flex-col gap-0.5 border-t border-hairline p-3">
          <SideLink item={SETTINGS} label={t('settings')} active={SETTINGS.match(pathname)} collapsed={collapsed} />
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? t('expand') : t('collapse')}
            data-tip={collapsed ? t('expand') : undefined}
            className={clsx(
              'flex h-9 items-center gap-3 rounded-lg text-sm font-medium text-ink-soft transition-colors hover:bg-mist hover:text-ink',
              collapsed ? 'justify-center' : 'px-3',
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-[1.1rem] shrink-0" /> : <PanelLeftClose className="size-[1.1rem] shrink-0" />}
            <span className="sb-label">{t('collapse')}</span>
          </button>
        </div>
      </aside>

      {/* ---------------- Main column ---------------- */}
      <div className="app-main flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 border-b border-hairline bg-ivory">
          <div className="flex h-14 items-center gap-2 px-4 sm:px-6 lg:h-16 lg:px-8">
            <Logo className="lg:hidden" />
            <p className="hidden text-sm font-medium text-ink-soft lg:block">{current ? t(current.key) : t('dashboard')}</p>
            <div className="ml-auto flex items-center gap-0.5">
              <span className="max-sm:hidden">
                <LocaleSwitch />
              </span>
              <ThemeToggle compact />
              <AccountMenu className="ml-1.5 hidden lg:block" />
              <Link href="/dashboard/settings" aria-label={t('settings')} className="ml-1.5 rounded-full lg:hidden">
                <Avatar size="size-8" />
              </Link>
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-8 sm:px-6 lg:px-8 lg:pb-16">{children}</main>
      </div>

      {/* ---------------- Tab bar (phones / tablets) ---------------- */}
      <nav
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
          <TabLink item={MAIN[0]!} label={t('invitations')} active={MAIN[0]!.match(pathname)} />
          <TabLink item={MAIN[1]!} label={t('guestsShort')} active={MAIN[1]!.match(pathname)} />
          <li className="grid place-items-center">
            <Link
              href="/create"
              aria-label={t('newInvite')}
              className="grid size-11 place-items-center rounded-xl bg-primary text-on-primary transition-transform active:scale-95"
            >
              <Plus className="size-5" />
            </Link>
          </li>
          <TabLink item={MAIN[2]!} label={t('ordersShort')} active={MAIN[2]!.match(pathname)} />
          <TabLink item={SETTINGS} label={t('settings')} active={SETTINGS.match(pathname)} />
        </ul>
      </nav>
    </div>
  );
}

function SideLink({ item, label, active, collapsed }: { item: NavItem; label: string; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      data-tip={collapsed ? label : undefined}
      className={clsx(
        'relative flex h-9 shrink-0 items-center gap-3 rounded-lg text-sm font-medium transition-colors',
        collapsed ? 'justify-center' : 'px-3',
        active ? 'tint-primary' : 'text-ink-soft hover:bg-mist hover:text-ink',
      )}
    >
      {/* Gold marker on the active item. */}
      <span
        aria-hidden
        className={clsx(
          'absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gold transition-transform duration-300 ease-[var(--ease-out-quint)]',
          active ? 'scale-y-100' : 'scale-y-0',
        )}
      />
      <Icon className="size-[1.1rem] shrink-0" aria-hidden />
      <span className="sb-label truncate">{label}</span>
    </Link>
  );
}

function TabLink({ item, label, active }: { item: NavItem; label: string; active: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={clsx(
          'flex h-14 flex-col items-center justify-center gap-1 rounded-lg text-[0.6875rem] font-medium transition-colors',
          active ? 'text-primary' : 'text-ink-soft',
        )}
      >
        <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
        <span className="max-w-full truncate">{label}</span>
      </Link>
    </li>
  );
}
