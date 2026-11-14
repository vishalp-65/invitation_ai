'use client';

import type { Theme } from '@cardai/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';

interface ReviewItem {
  t: { id: string; name: string; layout: string; theme: Theme };
  designer: string | null;
}
interface PendingDesigner {
  userId: string;
  displayName: string;
  portfolioUrl: string | null;
}
interface PrintOrder {
  id: string;
  quantity: number;
  paperType: string;
  status: string;
  shippingAddress: Record<string, string>;
}

/** Minimal operations console: marketplace review and print fulfilment. */
export default function AdminPage() {
  const qc = useQueryClient();
  const templates = useQuery({ queryKey: ['admin', 'templates'], queryFn: () => api<ReviewItem[]>('/admin/templates/review') });
  const designers = useQuery({ queryKey: ['admin', 'designers'], queryFn: () => api<PendingDesigner[]>('/admin/designers/pending') });
  const prints = useQuery({ queryKey: ['admin', 'prints'], queryFn: () => api<PrintOrder[]>('/admin/print-orders') });

  const act = (p: Promise<unknown>) =>
    p.then(() => qc.invalidateQueries({ queryKey: ['admin'] })).catch((e) => toast.error(e instanceof ApiError ? e.message : 'Failed'));

  if (templates.error instanceof ApiError && templates.error.status === 403) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-10">You need admin access for this page.</main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6">
        <h1 className="text-4xl">Admin</h1>

        <section>
          <h2 className="text-2xl">Designers waiting</h2>
          <ul className="mt-3 divide-y divide-line">
            {designers.data?.map((d) => (
              <li key={d.userId} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex-1">
                  {d.displayName}{' '}
                  {d.portfolioUrl && (
                    <a href={d.portfolioUrl} target="_blank" rel="noopener" className="text-sindoor underline">
                      portfolio
                    </a>
                  )}
                </span>
                <Button size="sm" onClick={() => act(api(`/admin/designers/${d.userId}/review`, { method: 'POST', json: { decision: 'approved' } }))}>
                  Approve
                </Button>
                <Button size="sm" variant="danger" onClick={() => act(api(`/admin/designers/${d.userId}/review`, { method: 'POST', json: { decision: 'rejected' } }))}>
                  Reject
                </Button>
              </li>
            ))}
            {designers.data?.length === 0 && <li className="py-3 text-ink-soft">Nobody waiting.</li>}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl">Themes to review</h2>
          <ul className="mt-3 divide-y divide-line">
            {templates.data?.map(({ t, designer }) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="size-8 rounded-full" style={{ background: t.theme.palette.background }} aria-hidden />
                <span className="flex-1">
                  {t.name} <span className="text-ink-soft">({t.layout}) by {designer}</span>
                </span>
                <Button size="sm" onClick={() => act(api(`/admin/templates/${t.id}/review`, { method: 'POST', json: { decision: 'approved' } }))}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    const note = prompt('Reason for the designer') ?? undefined;
                    void act(api(`/admin/templates/${t.id}/review`, { method: 'POST', json: { decision: 'rejected', note } }));
                  }}
                >
                  Reject
                </Button>
              </li>
            ))}
            {templates.data?.length === 0 && <li className="py-3 text-ink-soft">Nothing to review.</li>}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl">Print orders</h2>
          <ul className="mt-3 divide-y divide-line">
            {prints.data?.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex-1">
                  {o.quantity} cards, {o.paperType}, {o.shippingAddress.city} ({o.shippingAddress.phone})
                </span>
                <select
                  className="h-10 rounded-[10px] border border-hairline px-2"
                  value={o.status}
                  onChange={(e) => act(api(`/admin/print-orders/${o.id}`, { method: 'PATCH', json: { status: e.target.value } }))}
                >
                  {['requested', 'quoted', 'confirmed', 'printing', 'shipped', 'delivered', 'cancelled'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </li>
            ))}
            {prints.data?.length === 0 && <li className="py-3 text-ink-soft">No print orders.</li>}
          </ul>
        </section>
      </main>
    </>
  );
}
