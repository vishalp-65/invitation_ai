'use client';

import { formatINR } from '@cardai/shared';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Package } from 'lucide-react';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
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

const STATUS: Record<PrintOrder['status'], string> = {
  requested: 'Waiting for a quote',
  quoted: 'Quote ready',
  confirmed: 'Confirmed',
  printing: 'Printing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** Printed-card orders placed from any invitation's Print tab. */
export default function OrdersPage() {
  const { data, isLoading } = useQuery({ queryKey: ['print-orders'], queryFn: () => api<PrintOrder[]>('/print/orders') });

  return (
    <div className="animate-fade-up">
      <h1 className="text-[1.75rem] sm:text-[2rem]">Print orders</h1>
      <p className="mt-1.5 text-[0.95rem] text-ink-soft">Printed cards you ordered from a partner press, newest first.</p>

      {isLoading && (
        <div className="mt-8 flex flex-col gap-2" aria-busy>
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-[4.5rem] rounded-[var(--radius-card)]" />
          ))}
        </div>
      )}

      {data && data.length === 0 && (
        <div className="mt-8 flex flex-col items-center rounded-[var(--radius-card)] border border-hairline bg-surface px-6 py-14 text-center">
          <Package className="size-6 text-ink-soft" aria-hidden />
          <p className="mt-4 font-medium">No print orders</p>
          <p className="mt-1 max-w-sm text-sm text-ink-soft">Open an invitation and use its Print tab to order printed cards of the same design.</p>
          <ButtonLink href="/dashboard" variant="line" className="mt-5">
            Go to invitations
          </ButtonLink>
        </div>
      )}

      {data && data.length > 0 && (
        <ul className="mt-8 divide-y divide-hairline overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface">
          {data.map((o) => (
            <li key={o.id}>
              <Link href={`/dashboard/events/${o.eventId}?tab=print`} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 transition-colors hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {o.quantity} cards, {o.paperType}
                  </p>
                  <p className="text-[0.8125rem] text-ink-soft">
                    Ordered {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {o.quotePaise != null && <span className="tabular-nums font-medium">{formatINR(o.quotePaise)}</span>}
                <span
                  className={clsx(
                    'badge',
                    o.status === 'delivered' && '!text-leaf',
                    o.status === 'cancelled' && '!text-sindoor',
                    o.status === 'quoted' && '!border-gold/50 !text-ink',
                  )}
                >
                  {STATUS[o.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
