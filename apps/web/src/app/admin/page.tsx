'use client';

import { PRODUCTS, type AnalyticsRange, type ProductCode } from '@cardai/shared';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Eye, IndianRupee, Percent, Sparkles, TrendingUp, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { BarList, Funnel, TrendChart } from '@/features/admin/charts';
import { TemplateThumb } from '@/features/admin/template-thumb';
import { Card, compactINR, Delta, inr, num, PageHeader, pct, RangePicker, Segmented, Skeleton, StatCard, ago, useRange } from '@/features/admin/ui';
import type { TemplateStat } from '@/features/admin/types';
import { api } from '@/lib/api';

interface Kpis {
  visitors: number;
  signups: number;
  activeUsers: number;
  eventsCreated: number;
  orders: number;
  revenuePaise: number;
  payingUsers: number;
  discountPaise: number;
  trackedSignups: number;
}
interface Overview {
  range: AnalyticsRange;
  current: Kpis;
  previous: Kpis;
  totals: { users: number; events: number; revenuePaise: number; orders: number; payingUsers: number };
  series: Array<{ day: string; visitors: number; signups: number; orders: number; revenuePaise: number }>;
  funnel: Array<{ key: string; label: string; count: number }>;
  products: Array<{ code: string; orders: number; revenuePaise: number }>;
  recentOrders: Array<{ id: string; product: string; amount: number; name: string | null; email: string | null; paidAt: string; coupon: string | null }>;
  topTemplates: TemplateStat[];
}

type Metric = 'visitors' | 'signups' | 'revenuePaise' | 'orders';
const METRICS: Array<{ value: Metric; label: string }> = [
  { value: 'visitors', label: 'Visitors' },
  { value: 'signups', label: 'Sign-ups' },
  { value: 'revenuePaise', label: 'Revenue' },
  { value: 'orders', label: 'Orders' },
];

export default function AdminOverviewPage() {
  const [range] = useRange();
  const [metric, setMetric] = useState<Metric>('visitors');
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'overview', range], queryFn: () => api<Overview>(`/admin/overview?range=${range}`) });

  return (
    <>
      <PageHeader title="Overview" description="How the business is doing: traffic, sign-ups, invitations and money." actions={<RangePicker />} />
      {isLoading || !data ? (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Revenue" icon={<IndianRupee className="size-4" />} value={compactINR(data.current.revenuePaise)} delta={<Delta now={data.current.revenuePaise} before={data.previous.revenuePaise} />} hint={`${inr(data.totals.revenuePaise)} all time`} />
            <StatCard label="Visitors" icon={<Eye className="size-4" />} value={num(data.current.visitors)} delta={<Delta now={data.current.visitors} before={data.previous.visitors} />} hint="Unique browsers" />
            <StatCard label="Sign-ups" icon={<UserPlus className="size-4" />} value={num(data.current.signups)} delta={<Delta now={data.current.signups} before={data.previous.signups} />} hint={`${num(data.totals.users)} users in total`} />
            <StatCard
              label="Sign-up rate"
              icon={<Percent className="size-4" />}
              value={pct(data.current.trackedSignups, data.current.visitors)}
              hint={data.current.visitors ? `${num(data.current.trackedSignups)} of ${num(data.current.visitors)} visitors signed up` : 'Visitors who sign up. Counts from the first tracked visit'}
            />
            <StatCard label="Paid orders" icon={<CreditCard className="size-4" />} value={num(data.current.orders)} delta={<Delta now={data.current.orders} before={data.previous.orders} />} hint={data.current.orders ? `Avg ${inr(Math.round(data.current.revenuePaise / data.current.orders))}` : undefined} />
            <StatCard label="Paying customers" icon={<Users className="size-4" />} value={num(data.current.payingUsers)} hint={`${pct(data.totals.payingUsers, data.totals.users)} of all users have paid`} />
            <StatCard label="Invitations made" icon={<Sparkles className="size-4" />} value={num(data.current.eventsCreated)} delta={<Delta now={data.current.eventsCreated} before={data.previous.eventsCreated} />} hint={`${num(data.totals.events)} all time`} />
            <StatCard label="Discounts given" icon={<TrendingUp className="size-4" />} value={compactINR(data.current.discountPaise)} hint="Sales + coupons on paid orders" />
          </div>

          <Card
            title="Trend"
            description="Per day, Indian time"
            action={<Segmented value={metric} onChange={setMetric} options={METRICS} label="Metric" />}
          >
            <TrendChart
              key={metric}
              kind={metric === 'orders' || metric === 'signups' ? 'bar' : 'area'}
              label={METRICS.find((m) => m.value === metric)!.label}
              data={data.series.map((s) => ({ day: s.day, value: s[metric] }))}
              format={metric === 'revenuePaise' ? compactINR : num}
            />
          </Card>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card title="Conversion funnel" description="Unique people reaching each step in this period" className="lg:col-span-3">
              <Funnel steps={data.funnel} />
            </Card>
            <Card title="Revenue by product" className="lg:col-span-2">
              <BarList
                format={compactINR}
                empty="No paid orders in this period"
                items={data.products.map((p) => ({ key: p.code, label: `${PRODUCTS[p.code as ProductCode]?.name ?? p.code} · ${num(p.orders)}`, value: p.revenuePaise }))}
              />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card title="Most used templates" description="Invitations made with each template (all time)" action={<Link href={`/admin/templates?range=${range}`} className="text-sm font-semibold underline underline-offset-4">All templates</Link>} className="lg:col-span-3">
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {data.topTemplates.map((t, i) => (
                  <li key={t.id} className="min-w-0">
                    <div className="relative">
                      <TemplateThumb id={t.id} name={t.name} coverPage={t.coverPage} />
                      <span className="absolute left-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-surface text-xs font-bold">{i + 1}</span>
                    </div>
                    <p className="mt-1.5 truncate text-xs font-semibold">{t.name}</p>
                    <p className="text-xs text-ink-soft">{num(t.invitations)} uses</p>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Latest payments" action={<Link href="/admin/orders" className="text-sm font-semibold underline underline-offset-4">All orders</Link>} className="lg:col-span-2" pad={false}>
              {data.recentOrders.length ? (
                <ul className="divide-y divide-hairline">
                  {data.recentOrders.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{o.name ?? o.email ?? 'Customer'}</p>
                        <p className="truncate text-ink-soft">
                          {PRODUCTS[o.product as ProductCode]?.name ?? o.product}
                          {o.coupon && ` · ${o.coupon}`} · {ago(o.paidAt)}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums">{inr(o.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 pb-5 text-sm text-ink-soft">No payments yet.</p>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
