'use client';

import { formatINR } from '@cardai/shared';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { ArrowUpRight, Printer } from 'lucide-react';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { StatusPill, type Tone } from '@/features/event/panel-ui';
import { api } from '@/lib/api';

interface PrintOrder {
  id: string;
  eventId: string;
  quantity: number;
  paperType: string;
  status: 'requested' | 'quoted' | 'confirmed' | 'printing' | 'shipped' | 'delivered' | 'cancelled';
  quotePaise: number | null;
  createdAt: string;
}

const STATUS: Record<PrintOrder['status'], { label: string; tone: Tone }> = {
  requested: { label: 'Awaiting quote', tone: 'muted' },
  quoted: { label: 'Quote ready', tone: 'gold' },
  confirmed: { label: 'Confirmed', tone: 'primary' },
  printing: { label: 'Printing', tone: 'primary' },
  shipped: { label: 'Shipped', tone: 'primary' },
  delivered: { label: 'Delivered', tone: 'leaf' },
  cancelled: { label: 'Cancelled', tone: 'sindoor' },
};

/** The journey of a print order, shown as a thin tracker under each row. */
const STAGES = ['requested', 'quoted', 'confirmed', 'printing', 'shipped', 'delivered'] as const;
const STAGE_LABEL: Record<(typeof STAGES)[number], string> = {
  requested: 'Requested',
  quoted: 'Quoted',
  confirmed: 'Confirmed',
  printing: 'Printing',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Printed-card orders placed from any invitation's Print tab. */
export default function OrdersPage() {
  const { data, isLoading } = useQuery({ queryKey: ['print-orders'], queryFn: () => api<PrintOrder[]>('/print/orders') });

  const open = data?.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length ?? 0;
  const delivered = data?.filter((o) => o.status === 'delivered').length ?? 0;
  const cards = data?.filter((o) => o.status !== 'cancelled').reduce((n, o) => n + o.quantity, 0) ?? 0;

  return (
    <div className="animate-fade-up">
      <span className="kicker mb-5">Print</span>
      <h1 className="page-title">Print orders</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">Printed cards you ordered from a partner press, newest first.</p>

      {isLoading && (
        <div className="mt-8 flex flex-col gap-2" aria-busy>
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
      )}

      {data && data.length === 0 && (
        <div className="mt-8 flex flex-col items-center border border-dashed border-ink/15 px-6 py-16 text-center">
          <span className="grid size-11 place-items-center border border-ink/15">
            <Printer className="size-[1.1rem]" strokeWidth={1.6} aria-hidden />
          </span>
          <p className="mt-5 text-lg">No print orders yet</p>
          <p className="mt-1.5 max-w-sm text-sm text-ink-soft">Open an invitation and use its Print tab to order printed cards of the same design, delivered to your door.</p>
          <ButtonLink href="/dashboard" variant="line" size="sm" className="press mt-6">
            Go to invitations
          </ButtonLink>
        </div>
      )}

      {data && data.length > 0 && (
        <>
          <dl className="mt-8 grid grid-cols-3 border-l border-t border-ink/10">
            {[
              { label: 'In progress', value: open },
              { label: 'Delivered', value: delivered },
              { label: 'Cards ordered', value: cards },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col-reverse gap-1.5 border-b border-r border-ink/10 px-4 py-4 sm:px-5">
                <dt className="font-mono text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft sm:text-[0.6875rem]">{label}</dt>
                <dd className="font-display text-2xl tabular-nums leading-none sm:text-[1.75rem]">{value.toLocaleString('en-IN')}</dd>
              </div>
            ))}
          </dl>

          <ul className="mt-8 border-t border-ink/10">
            {data.map((o) => {
              const s = STATUS[o.status];
              const at = o.status === 'cancelled' ? -1 : STAGES.indexOf(o.status);
              return (
                <li key={o.id} className="border-b border-ink/10">
                  <Link href={`/dashboard/events/${o.eventId}?tab=print`} className="group block py-5 transition-colors hover:bg-ink/[0.02] sm:px-4">
                    <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-ink-soft">
                          #{o.id.slice(0, 8)} · {fmtDate(o.createdAt)}
                        </p>
                        <p className="mt-1.5 text-[0.9375rem]">
                          {o.quantity.toLocaleString('en-IN')} cards <span className="text-ink-soft">on {o.paperType}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-right">
                          <span className="block font-mono text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Quote</span>
                          <span className="font-display text-lg tabular-nums">{o.quotePaise != null ? formatINR(o.quotePaise) : '—'}</span>
                        </span>
                        <StatusPill tone={s.tone}>{s.label}</StatusPill>
                        <ArrowUpRight
                          className="size-4 text-ink-soft transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink max-sm:hidden"
                          aria-hidden
                        />
                      </div>
                    </div>

                    {o.status !== 'cancelled' && (
                      <ol className="mt-4 grid grid-cols-6 gap-1" aria-label={`Order progress: ${s.label}`}>
                        {STAGES.map((st, i) => (
                          <li key={st} className="min-w-0">
                            <span className={clsx('block h-px transition-colors', i <= at ? 'bg-ink' : 'bg-ink/15', i === at && o.status !== 'delivered' && '!bg-gold')} />
                            <span className={clsx('mt-1.5 block truncate font-mono text-[0.5625rem] uppercase tracking-[0.06em] max-sm:hidden', i <= at ? 'text-ink' : 'text-ink-soft/70')}>
                              {STAGE_LABEL[st]}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
