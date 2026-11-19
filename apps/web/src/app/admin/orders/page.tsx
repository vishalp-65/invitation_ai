'use client';

import { PRODUCTS, type ProductCode } from '@cardai/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Mail, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge, dateTime, Empty, inr, num, PageHeader, Pager, Segmented, Skeleton, Table } from '@/features/admin/ui';
import { api, ApiError } from '@/lib/api';

interface OrderRow {
  id: string;
  productCode: string;
  amountPaise: number;
  listPricePaise: number | null;
  discountPaise: number;
  couponCode: string | null;
  status: 'created' | 'paid' | 'failed' | 'refunded';
  provider: string;
  paymentId: string | null;
  createdAt: string;
  paidAt: string | null;
  userName: string | null;
  userEmail: string | null;
  eventTitle: string | null;
}

type Status = 'all' | OrderRow['status'];
const TONE = { paid: 'good', created: 'neutral', failed: 'bad', refunded: 'warn' } as const;
const LABEL = { paid: 'Paid', created: 'Not paid', failed: 'Failed', refunded: 'Refunded' } as const;

function ResendReceipt({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const resend = async () => {
    setBusy(true);
    try {
      const r = await api<{ to: string }>(`/admin/orders/${id}/resend-receipt`, { method: 'POST' });
      toast.success(`Receipt sent to ${r.to}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not send the receipt');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button size="xs" variant="line" loading={busy} onClick={() => void resend()} title="Email the receipt to the customer again">
      <Mail className="size-3.5" /> Receipt
    </Button>
  );
}

export default function AdminOrdersPage() {
  const [status, setStatus] = useState<Status>('paid');
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page), ...(status !== 'all' ? { status } : {}) });
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', qs.toString()],
    queryFn: () => api<{ items: OrderRow[]; total: number; paidPaise: number; pageSize: number }>(`/admin/orders?${qs}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every checkout, with what was charged, discounts and coupons."
        actions={data && <span className="flex items-baseline gap-2 border border-ink/15 px-4 py-2"><span className="font-mono text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Collected</span><span className="font-display text-lg tabular-nums">{inr(data.paidPaise)}</span></span>}
      />
      <div className="mb-4">
        <Segmented
          value={status}
          onChange={(s) => {
            setStatus(s);
            setPage(1);
          }}
          label="Order status"
          options={[
            { value: 'paid', label: 'Paid' },
            { value: 'created', label: 'Not paid' },
            { value: 'failed', label: 'Failed' },
            { value: 'refunded', label: 'Refunded' },
            { value: 'all', label: 'All' },
          ]}
        />
      </div>
      <section className="border border-ink/10 bg-ink/[0.015]">
        {isLoading ? (
          <Skeleton className="m-5 h-48" />
        ) : !data?.items.length ? (
          <div className="p-5">
            <Empty icon={<ShoppingBag className="size-6" />} title="No orders here" />
          </div>
        ) : (
          <>
            <Table head={['Customer', 'Product', 'Invitation', 'Charged', 'Discount', 'When', 'Status', '']}>
              {data.items.map((o) => (
                <tr key={o.id}>
                  <td>
                    <p className="font-medium">{o.userName ?? 'No name'}</p>
                    <p className="text-xs text-ink-soft">{o.userEmail ?? '—'}</p>
                  </td>
                  <td>{PRODUCTS[o.productCode as ProductCode]?.name ?? o.productCode}</td>
                  <td className="max-w-44 truncate text-ink-soft" title={o.eventTitle ?? ''}>
                    {o.eventTitle ?? '—'}
                  </td>
                  <td className="font-medium tabular-nums">{inr(o.amountPaise)}</td>
                  <td className="whitespace-nowrap text-ink-soft">
                    {o.discountPaise > 0 ? `−${inr(o.discountPaise)}` : '—'}
                    {o.couponCode && (
                      <span className="ml-1.5">
                        <Badge tone="info">{o.couponCode}</Badge>
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-ink-soft">{dateTime(o.paidAt ?? o.createdAt)}</td>
                  <td>
                    <Badge tone={TONE[o.status]}>{LABEL[o.status]}</Badge>
                  </td>
                  <td className="text-right">{o.status === 'paid' && <ResendReceipt id={o.id} />}</td>
                </tr>
              ))}
            </Table>
            <Pager page={page} total={data.total} pageSize={data.pageSize} onPage={setPage} />
          </>
        )}
      </section>
      {data && <p className="mt-3 text-sm text-ink-soft">{num(data.total)} orders</p>}
    </>
  );
}
