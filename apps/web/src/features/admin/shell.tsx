'use client';

import { BRAND } from '@cardai/shared';
import { clsx } from 'clsx';
import { ArrowLeft, BarChart3, LayoutDashboard, LayoutTemplate, Mail, ScrollText, ShoppingBag, Store, Tag, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { ThemeToggle } from '@/lib/theme';
import { useMe } from '@/lib/hooks';
import { Skeleton } from './ui';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Behaviour', icon: BarChart3 },
  { href: '/admin/templates', label: 'Templates', icon: LayoutTemplate },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/offers', label: 'Offers & pricing', icon: Tag },
  { href: '/admin/emails', label: 'Emails', icon: Mail },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/marketplace', label: 'Marketplace & print', icon: Store },
  { href: '/admin/activity', label: 'Admin log', icon: ScrollText },
] as const;

/** Wordmark + a quiet mono "Admin" tag. */
function AdminMark() {
  return (
    <Link href="/admin" className="flex shrink-0 items-center gap-2.5">
      <span className="font-display text-xl uppercase leading-none">{BRAND.name}</span>
      <span className="border border-ink/20 px-1.5 py-0.5 font-mono text-[0.5625rem] uppercase leading-none tracking-[0.1em] text-ink-soft">Admin</span>
    </Link>
  );
}

/**
 * Admin console frame. Only admins ever see it: everyone else gets the normal "not found" page,
 * so the console isn't advertised. The API re-checks the admin role on every request regardless.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMe();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh bg-ivory">
        <div className="hidden w-60 border-r border-ink/10 lg:block" />
        <div className="flex-1 space-y-4 p-6 lg:p-10">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (me?.role !== 'admin') {
    return (
      <main className="grid min-h-dvh place-items-center bg-ivory px-6 text-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-ink-soft">Error 404</p>
          <p className="mt-3 text-2xl">This page could not be found.</p>
          <Link href="/" className="mt-6 inline-block text-sm underline underline-offset-4">
            Go home
          </Link>
        </div>
      </main>
    );
  }

  const active = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  return (
    <div className="min-h-dvh bg-ivory lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-ink/10 lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-ink/10 px-5">
          <AdminMark />
        </div>
        <p className="px-6 pb-2 pt-5 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-ink-soft/80">Console</p>
        <nav className="thin-scroll flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4" aria-label="Admin">
          {NAV.map(({ href, label, icon: Icon }) => {
            const on = active(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? 'page' : undefined}
                className={clsx(
                  'relative flex h-10 shrink-0 items-center gap-3 border px-3 text-sm transition-colors',
                  on ? 'border-ink/20 bg-ink/[0.04] text-ink' : 'border-transparent text-ink-soft hover:border-ink/10 hover:text-ink',
                )}
              >
                <span aria-hidden className={clsx('absolute -left-3 bottom-2 top-2 w-[2px] bg-gold transition-transform duration-300 ease-[var(--ease-out-quint)]', on ? 'scale-y-100' : 'scale-y-0')} />
                <Icon className="size-[1.1rem] shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-ink/10 p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center border border-ink/15 font-mono text-xs">{(me.name ?? me.email ?? 'A').slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0 text-sm">
              <p className="truncate">{me.name ?? 'Admin'}</p>
              <p className="truncate font-mono text-[0.6875rem] text-ink-soft">{me.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-ink-soft transition-colors hover:text-ink">
              <ArrowLeft className="size-3.5" aria-hidden /> Back to app
            </Link>
            <ThemeToggle compact />
          </div>
        </div>
      </aside>

      {/* Top bar + scrollable tabs (phones & tablets) */}
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-ivory/85 backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
          <AdminMark />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle compact />
            <Link href="/dashboard" className="ml-1 inline-flex items-center gap-1 font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-ink-soft">
              <ArrowLeft className="size-3.5" aria-hidden /> App
            </Link>
          </div>
        </div>
        <nav className="flex overflow-x-auto px-2 [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden" aria-label="Admin">
          {NAV.map(({ href, label, icon: Icon }) => {
            const on = active(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? 'page' : undefined}
                className={clsx(
                  'relative flex h-10 shrink-0 items-center gap-1.5 px-3 text-[0.8125rem] transition-colors',
                  on ? 'text-ink' : 'text-ink-soft hover:text-ink',
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
                {label}
                <span aria-hidden className={clsx('absolute inset-x-3 -bottom-px h-px bg-ink transition-transform duration-300 ease-[var(--ease-out-quint)]', on ? 'scale-x-100' : 'scale-x-0')} />
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="admin-main mx-auto w-full max-w-[1280px] min-w-0 flex-1 px-4 pb-16 pt-8 sm:px-6 lg:px-10 lg:pt-12">
        <Suspense fallback={<Skeleton className="h-72" />}>{children}</Suspense>
      </main>
    </div>
  );
}
