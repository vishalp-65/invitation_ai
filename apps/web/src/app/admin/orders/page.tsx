'use client';

import { PRODUCTS, type ProductCode } from '@cardai/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download, Mail, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Toggle } from '@/features/admin/ui';
import { useMe } from '@/lib/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, dateTime, downloadCsv, Empty, inr, num, PageHeader, Pager, Segmented, Skeleton, Table } from '@/features/admin/ui';
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
  refundedPaise: number;
  refundReason: string | null;
  paymentMethod: string | null;
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
        actions={
          <>
            {data && (
              <span className="flex items-baseline gap-2 border border-ink/15 px-4 py-2">
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Collected</span>
                <span className="font-display text-lg tabular-nums">{inr(data.paidPaise)}</span>
              </span>
            )}
            <Button
              size="sm"
              variant="line"
              onClick={() =>
                void downloadCsv(`/admin/orders/export${status !== 'all' ? `?status=${status}` : ''}`, `noyta-orders-${status}-${new Date().toISOString().slice(0, 10)}.csv`).catch(() => toast.error('Export failed'))
              }
            >
              <Download className="size-4" /> Export CSV
            </Button>
          </>
        }
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
                  <td className="font-medium tabular-nums">
                    {inr(o.amountPaise)}
                    {o.refundedPaise > 0 && <span className="block text-xs font-normal text-sindoor" title={o.refundReason ?? ''}>− {inr(o.refundedPaise)} refunded</span>}
                    {o.paymentMethod && <span className="block text-xs font-normal uppercase text-ink-soft">{o.paymentMethod}</span>}
                  </td>
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
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      {o.status === 'paid' && <ResendReceipt id={o.id} />}
                      {o.status === 'paid' && o.provider !== 'admin' && <RefundButton order={o} />}
                    </div>
                  </td>
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

/** Owners only: sends money back through Razorpay (UPI refunds usually land within 2 days). */
function RefundButton({ order }: { order: OrderRow }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const left = order.amountPaise - order.refundedPaise;
  const [amount, setAmount] = useState(String(left / 100));
  const [reason, setReason] = useState('');
  const [revoke, setRevoke] = useState(false);
  const [busy, setBusy] = useState(false);
  const owner = !me?.adminScopes?.length || me.adminScopes.includes('owner');
  if (!owner || left <= 0) return null;
  const paise = Math.round(Number(amount) * 100);
  const full = paise === left;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Refund ${inr(paise)} to ${order.userEmail ?? 'the customer'}? This sends real money back and cannot be undone.`)) return;
    setBusy(true);
    try {
      const r = await api<{ refundId: string }>(`/admin/orders/${order.id}/refund`, { method: 'POST', json: { amountPaise: paise, reason, revokeAccess: full && revoke } });
      toast.success(`Refund started (${r.refundId}). The customer was emailed.`);
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Refund failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="line" className="h-8 px-3" onClick={() => setOpen(true)}>
        Refund
      </Button>
      {open && (
        <Dialog open onClose={() => setOpen(false)} title="Refund this order">
          <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">
              {PRODUCTS[order.productCode as ProductCode]?.name ?? order.productCode} · {order.eventTitle ?? 'Invitation'} · paid {inr(order.amountPaise)}
              {order.refundedPaise > 0 && `, ${inr(order.refundedPaise)} already refunded`}
            </p>
            <Field label="Amount (₹)" hint={`Up to ${inr(left)}`}>
              {(id, d) => <Input id={id} aria-describedby={d} type="number" min={1} max={left / 100} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />}
            </Field>
            <Field label="Reason" hint="Kept with the order and in the admin log">
              {(id, d) => <Textarea id={id} aria-describedby={d} rows={2} minLength={3} maxLength={200} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Event cancelled, render failed" />}
            </Field>
            {full && (
              <label className="flex items-center justify-between gap-3 border border-ink/10 p-3 text-sm">
                <span>
                  Also remove what it unlocked
                  <span className="block text-xs text-ink-soft">Watermark returns, premium site features switch off</span>
                </span>
                <Toggle checked={revoke} onChange={setRevoke} label="Remove access" />
              </label>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="line" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" size="sm" loading={busy} disabled={!paise || paise > left}>
                Refund {paise ? inr(paise) : ''}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
