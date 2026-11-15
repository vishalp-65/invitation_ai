'use client';

import { getEventType } from '@cardai/shared';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Eye, LogOut, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, ButtonLink } from '@/components/ui/button';
import { api } from '@/lib/api';
import { qk, useLogout, useMe } from '@/lib/hooks';

interface EventSummary {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: 'draft' | 'published' | 'archived';
  viewCount: number;
  updatedAt: string;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function DashboardPage() {
  const router = useRouter();
  const { data: me } = useMe();
  const logout = useLogout();
  const { data, isLoading } = useQuery({
    queryKey: qk.events,
    queryFn: () => api<{ items: EventSummary[] }>('/events'),
    select: (d) => d.items,
  });

  const firstName = me?.name?.split(' ')[0];
  const live = data?.filter((e) => e.status === 'published').length ?? 0;
  const views = data?.reduce((n, e) => n + e.viewCount, 0) ?? 0;

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">{firstName ? `Namaste, ${firstName}` : 'Dashboard'}</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">Your invitations</h1>
          {me && <p className="mt-2 text-ink-soft">Signed in as {me.email ?? me.phone}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="line"
            size="md"
            className="h-11"
            loading={logout.isPending}
            onClick={() => logout.mutate(undefined, { onSuccess: () => router.push('/') })}
          >
            <LogOut className="size-4" aria-hidden />
            Log out
          </Button>
          <ButtonLink href="/create" variant="solid" className="h-11">
            <Plus className="size-4" aria-hidden />
            New invitation
          </ButtonLink>
        </div>
      </div>

      {/* Summary */}
      {data && data.length > 0 && (
        <dl className="panel mt-8 grid grid-cols-3 divide-x divide-hairline rounded-[var(--radius-card)]">
          {[
            ['Invitations', data.length],
            ['Live', live],
            ['Total views', views.toLocaleString('en-IN')],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 px-4 py-5 sm:px-6">
              <dt className="order-2 text-sm text-ink-soft">{label}</dt>
              <dd className="font-display text-3xl">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Loading */}
      {isLoading && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy aria-label="Loading your invitations">
          {[0, 1, 2].map((i) => (
            <li key={i} className="skeleton h-44 rounded-[var(--radius-card)]" />
          ))}
        </ul>
      )}

      {/* Empty */}
      {data && data.length === 0 && (
        <section className="panel mt-8 grid overflow-hidden rounded-[var(--radius-card)] md:grid-cols-[1.2fr_1fr]">
          <div className="p-8 sm:p-10">
            <p className="eyebrow">Get started</p>
            <h2 className="mt-4 text-3xl sm:text-4xl">Your first invitation takes two minutes</h2>
            <p className="mt-3 max-w-md text-ink-soft">
              Pick the occasion, add names and dates, choose a design. Card, video and website link are made together.
            </p>
            <ButtonLink href="/create" variant="solid" size="lg" className="mt-7">
              Make an invitation
            </ButtonLink>
          </div>
          <div className="relative hidden items-end justify-center gap-3 bg-sand px-8 pt-10 md:flex" aria-hidden>
            {['golden-vows-onyx', 'varmala-maroon', 'marigold-mandap'].map((id, i) => (
              <Image
                key={id}
                src={`/showcase/${id}.jpg`}
                alt=""
                width={432}
                height={768}
                sizes="140px"
                className={`w-[30%] rounded-t-xl border-[3px] border-b-0 border-white object-cover ${i === 1 ? 'mb-0' : '-mb-6'}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* Invitations */}
      {data && data.length > 0 && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((e) => {
            const type = getEventType(e.type);
            const isLive = e.status === 'published';
            return (
              <li key={e.id}>
                <Link
                  href={`/dashboard/events/${e.id}`}
                  className="panel lift group flex h-full flex-col rounded-[var(--radius-card)] p-5 focus-visible:rounded-[var(--radius-card)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-sand text-2xl" aria-hidden>
                      {type.emoji}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                        isLive ? 'bg-leaf/10 text-leaf' : 'bg-mist text-ink-soft'
                      }`}
                    >
                      <span className={`size-1.5 rounded-full ${isLive ? 'bg-leaf' : 'bg-ink-soft/50'}`} aria-hidden />
                      {isLive ? 'Live' : 'Draft'}
                    </span>
                  </div>
                  <p className="font-display mt-5 line-clamp-2 text-2xl leading-tight">{e.title}</p>
                  <p className="mt-1 text-sm text-ink-soft">{type.label}</p>
                  <div className="mt-auto pt-5" />
                  <div className="flex items-center justify-between gap-3 border-t border-hairline pt-4 text-sm text-ink-soft">
                    <span className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="size-4" aria-hidden /> {e.viewCount}
                        <span className="sr-only">views</span>
                      </span>
                      <span>Updated {fmtDate(e.updatedAt)}</span>
                    </span>
                    <ArrowUpRight
                      className="size-4 text-ink transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </div>
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/create"
              className="flex h-full min-h-44 flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-ink/20 p-5 text-ink-soft transition-colors hover:border-ink/40 hover:bg-surface hover:text-ink"
            >
              <span className="grid size-11 place-items-center rounded-full border border-hairline bg-surface">
                <Plus className="size-5" aria-hidden />
              </span>
              <span className="font-semibold">New invitation</span>
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
