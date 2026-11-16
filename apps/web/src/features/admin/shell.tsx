'use client';

import { BRAND } from '@cardai/shared';
import { clsx } from 'clsx';
import { BarChart3, ExternalLink, LayoutDashboard, LayoutTemplate, ScrollText, ShoppingBag, Store, Tag, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { LogoMark } from '@/components/layout/site-header';
import { ThemeToggle } from '@/lib/theme';
import { useMe } from '@/lib/hooks';
import { Skeleton } from './ui';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Behaviour', icon: BarChart3 },
  { href: '/admin/templates', label: 'Templates', icon: LayoutTemplate },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/offers', label: 'Offers & pricing', icon: Tag },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/marketplace', label: 'Marketplace & print', icon: Store },
  { href: '/admin/activity', label: 'Admin log', icon: ScrollText },
] as const;

/**
 * Admin console frame. Only admins ever see it: everyone else gets the normal "not found" page,
 * so the console isn't advertised. The API re-checks the admin role on every request regardless.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMe();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh bg-workspace">
        <div className="hidden w-64 border-r border-hairline bg-surface lg:block" />
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (me?.role !== 'admin') {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="font-display text-6xl">404</p>
          <p className="mt-2 text-ink-soft">This page could not be found.</p>
          <Link href="/" className="mt-6 inline-block font-semibold underline underline-offset-4">
            Go home
          </Link>
        </div>
      </main>
    );
  }

  const active = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  return (
    <div className="min-h-dvh bg-workspace lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-hairline bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <Link href="/admin" className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em]">
            <LogoMark className="size-7" />
            {BRAND.name.toLowerCase()}
          </Link>
          <span className="rounded-md bg-marigold px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#1a1300]">Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2" aria-label="Admin">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? 'page' : undefined}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] font-medium text-ink-soft transition-colors hover:bg-mist hover:text-ink aria-[current=page]:bg-tint aria-[current=page]:font-semibold aria-[current=page]:text-ink"
            >
              <Icon className="size-[18px]" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-hairline p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-on-primary">{(me.name ?? me.email ?? 'A').slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0 text-sm">
              <p className="truncate font-semibold">{me.name ?? 'Admin'}</p>
              <p className="truncate text-ink-soft">{me.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
              <ExternalLink className="size-4" /> Back to app
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Top bar + scrollable tabs (phones & tablets) */}
      <header className="sticky top-0 z-30 border-b border-hairline bg-surface lg:hidden">
        <div className="flex h-14 items-center gap-2 px-4">
          <Link href="/admin" className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em]">
            <LogoMark className="size-6" />
            {BRAND.name.toLowerCase()}
          </Link>
          <span className="rounded-md bg-marigold px-2 py-0.5 text-[10px] font-bold uppercase text-[#1a1300]">Admin</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link href="/dashboard" className="text-sm font-semibold text-ink-soft">
              Exit
            </Link>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Admin">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? 'page' : undefined}
              className={clsx('flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium', active(href) ? 'bg-primary text-on-primary' : 'text-ink-soft hover:bg-mist')}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Suspense fallback={<Skeleton className="h-72" />}>{children}</Suspense>
      </main>
    </div>
  );
}
