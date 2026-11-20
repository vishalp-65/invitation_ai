'use client';

import { CITY_TIER_LABEL, INDIA_STATES, PRODUCTS, type CityTier, type ProductCode } from '@cardai/shared';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { BadgePercent, IndianRupee, ReceiptText, RotateCcw, Smartphone, UserCheck, Users, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import { BarList, TrendChart } from '@/features/admin/charts';
import { Card, compactINR, inr, num, PageHeader, pct, RangePicker, Skeleton, StatCard, Table, useRange } from '@/features/admin/ui';
import { api } from '@/lib/api';

interface Revenue {
  totals: {
    orders: number;
    grossPaise: number;
    refundsPaise: number;
    netPaise: number;
    discountsPaise: number;
    payers: number;
    refundedOrders: number;
    activeUsers: number;
    signups: number;
    arpuPaise: number;
    arppuPaise: number;
    aovPaise: number;
  };
  methods: Array<{ method: string; orders: number; amountPaise: number }>;
  monthly: Array<{ month: string; product: string; netPaise: number; orders: number }>;
  ltv: Array<{ cohort: string; size: number; perUserPaise: number[] }>;
  coupons: { withOrders: number; withNetPaise: number; withDiscountPaise: number; withAovPaise: number; withoutOrders: number; withoutAovPaise: number; avgDiscountPct: number };
  byState: Array<{ key: string; netPaise: number; payers: number }>;
  byTier: Array<{ key: string; netPaise: number; payers: number }>;
}

const METHOD: Record<string, string> = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', wallet: 'Wallet (Paytm, PhonePe…)', emi: 'EMI', paylater: 'Pay later', unknown: 'Not recorded' };
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

/** Money quality, not just totals: net of refunds, per user, by payment method, by cohort and region. */
export default function AdminRevenuePage() {
  const [range] = useRange();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'revenue', range], queryFn: () => api<Revenue>(`/admin/analytics/revenue?range=${range}`), staleTime: 60_000 });

  const months = useMemo(() => {
    const by = new Map<string, number>();
    for (const m of data?.monthly ?? []) by.set(m.month, (by.get(m.month) ?? 0) + m.netPaise);
    return [...by.entries()].map(([month, v]) => ({ day: `${month}-01`, value: Math.round(v / 100) }));
  }, [data]);
  const products = useMemo(() => {
    const by = new Map<string, number>();
    for (const m of data?.monthly ?? []) by.set(m.product, (by.get(m.product) ?? 0) + m.netPaise);
    return [...by.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  return (
    <>
      <PageHeader title="Revenue" description="Net of refunds. Per-user value, how India pays, what coupons do to order size, and what each sign-up month is worth over time." actions={<RangePicker />} />
      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Net revenue" icon={<IndianRupee />} value={compactINR(data.totals.netPaise)} hint={`${inr(data.totals.grossPaise)} collected − ${inr(data.totals.refundsPaise)} refunded`} />
            <StatCard label="Paid orders" icon={<ReceiptText />} value={num(data.totals.orders)} hint={`Average order ${inr(data.totals.aovPaise)}`} />
            <StatCard label="Per active user (ARPU)" icon={<Users />} value={inr(data.totals.arpuPaise)} hint={`${num(data.totals.activeUsers)} signed-in users were active`} />
            <StatCard label="Per paying user (ARPPU)" icon={<UserCheck />} value={inr(data.totals.arppuPaise)} hint={`${num(data.totals.payers)} people paid · ${pct(data.totals.payers, data.totals.activeUsers, 1)} of active`} />
            <StatCard
              label="Paid by UPI"
              icon={<Smartphone />}
              value={pct(data.methods.find((m) => m.method === 'upi')?.orders ?? 0, data.totals.orders, 0)}
              hint="Share of paid orders"
            />
            <StatCard label="Refunds" icon={<RotateCcw />} value={inr(data.totals.refundsPaise)} hint={`${num(data.totals.refundedOrders)} orders · ${pct(data.totals.refundedOrders, data.totals.orders, 1)}`} />
            <StatCard label="Discounts given" icon={<BadgePercent />} value={compactINR(data.totals.discountsPaise)} hint={`Avg. coupon ${data.coupons.avgDiscountPct}% off`} />
            <StatCard
              label="Coupon orders"
              icon={<Wallet />}
              value={pct(data.coupons.withOrders, data.coupons.withOrders + data.coupons.withoutOrders, 0)}
              hint={`AOV ${inr(data.coupons.withAovPaise)} with vs ${inr(data.coupons.withoutAovPaise)} without`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2" title="Net revenue by month" description="Last 12 months (₹)">
              <TrendChart kind="bar" label="Net revenue" data={months} format={(v) => `₹${num(v)}`} />
            </Card>
            <Card title="By plan" description="Last 12 months, net">
              <BarList format={compactINR} items={products.map(([code, v]) => ({ key: code, label: PRODUCTS[code as ProductCode]?.name ?? code, value: v }))} />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="How people pay" description="Paid orders by method">
              <BarList format={num} items={data.methods.map((m) => ({ key: m.method, label: `${METHOD[m.method] ?? m.method} · ${compactINR(m.amountPaise)}`, value: m.orders }))} empty="No paid orders in this period" />
            </Card>
            <Card title="By city tier" description="Net revenue, by where buyers first came from">
              <BarList format={compactINR} items={data.byTier.map((t) => ({ key: t.key, label: `${CITY_TIER_LABEL[t.key as CityTier] ?? t.key} · ${num(t.payers)} buyers`, value: t.netPaise }))} empty="Location shows once visits are attributed" />
            </Card>
          </div>

          <Card title="Top states" description="Net revenue in this period" pad={false}>
            {data.byState.length ? (
              <Table head={['State', 'Buyers', 'Net revenue', 'Per buyer']}>
                {data.byState.slice(0, 15).map((s) => (
                  <tr key={s.key}>
                    <td className="font-medium">{INDIA_STATES[s.key] ?? s.key}</td>
                    <td className="tabular-nums">{num(s.payers)}</td>
                    <td className="tabular-nums">{inr(s.netPaise)}</td>
                    <td className="tabular-nums">{s.payers ? inr(Math.round(s.netPaise / s.payers)) : '—'}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-ink-soft">No state data yet</p>
            )}
          </Card>

          <Card title="Lifetime value by sign-up month" description="Net revenue per person who signed up that month, cumulative by months since sign-up (M0 = same month)" pad={false}>
            <Ltv rows={data.ltv} />
          </Card>
        </div>
      )}
    </>
  );
}

function Ltv({ rows }: { rows: Revenue['ltv'] }) {
  if (!rows.length) return <p className="px-5 py-8 text-center text-sm text-ink-soft">No sign-ups in the last 12 months</p>;
  const max = Math.max(1, ...rows.flatMap((r) => r.perUserPaise));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink/10 bg-ink/[0.02] font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-ink-soft">
            <th className="px-5 py-2.5 text-left font-normal">Month</th>
            <th className="px-3 py-2.5 text-right font-normal">Users</th>
            {Array.from({ length: 12 }, (_, i) => (
              <th key={i} className="px-1 py-2.5 text-center font-normal">
                M{i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.cohort} className="border-b border-ink/10 last:border-0">
              <td className="whitespace-nowrap px-5 py-2">{monthLabel(r.cohort)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{num(r.size)}</td>
              {Array.from({ length: 12 }, (_, i) => {
                const v = r.perUserPaise[i];
                if (v === undefined) return <td key={i} />;
                const share = v / max;
                return (
                  <td key={i} className="px-0.5 py-1">
                    <div
                      title={`₹${(v / 100).toFixed(0)} per user after ${i} month(s)`}
                      className={clsx('grid h-8 place-items-center font-mono text-[0.625rem] tabular-nums', share > 0.55 ? 'text-ivory' : 'text-ink')}
                      style={{ background: `color-mix(in oklab, var(--color-ink) ${Math.round(share * 85) + 4}%, transparent)` }}
                    >
                      ₹{Math.round(v / 100)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
