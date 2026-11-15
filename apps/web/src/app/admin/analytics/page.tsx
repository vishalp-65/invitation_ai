'use client';

import { useQuery } from '@tanstack/react-query';
import { Clock, MousePointerClick, Repeat, Smartphone } from 'lucide-react';
import { BarList, Heatmap, TrendChart } from '@/features/admin/charts';
import { Card, EVENT_LABELS, num, PageHeader, pct, RangePicker, Skeleton, StatCard, useRange } from '@/features/admin/ui';
import { api } from '@/lib/api';

interface Behaviour {
  actions: Array<{ name: string; count: number; people: number }>;
  pages: Array<{ path: string; views: number; visitors: number }>;
  devices: Array<{ device: string; visitors: number }>;
  referrers: Array<{ source: string; visitors: number }>;
  heatmap: Array<{ dow: number; hour: number; count: number }>;
  sessions: { count: number; avgEvents: number; avgMinutes: number };
  dailyActive: Array<{ day: string; users: number }>;
  retention: { cohort: number; returned: number };
}

const DEVICE: Record<string, string> = { mobile: 'Phone', tablet: 'Tablet', desktop: 'Computer', unknown: 'Unknown' };

/** Fill missing days with zero so the line doesn't skip quiet days. */
function fillDays(rows: Array<{ day: string; users: number }>, days: number) {
  const map = new Map(rows.map((r) => [r.day, r.users]));
  const out: Array<{ day: string; value: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    out.push({ day: key, value: map.get(key) ?? 0 });
  }
  return out;
}

export default function AdminBehaviourPage() {
  const [range] = useRange();
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'behaviour', range], queryFn: () => api<Behaviour>(`/admin/analytics/behaviour?range=${range}`) });
  const phone = data?.devices.find((d) => d.device === 'mobile')?.visitors ?? 0;
  const allDevices = data?.devices.reduce((s, d) => s + d.visitors, 0) ?? 0;

  return (
    <>
      <PageHeader title="User behaviour" description="What people do on the site, where they come from and when. Tracked first-party, no third parties." actions={<RangePicker />} />
      {isLoading || !data ? (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Sessions" icon={<MousePointerClick className="size-4" />} value={num(data.sessions.count)} hint={`${data.sessions.avgEvents} actions per session`} />
            <StatCard label="Avg. session" icon={<Clock className="size-4" />} value={`${data.sessions.avgMinutes} min`} hint="First to last action" />
            <StatCard label="On phones" icon={<Smartphone className="size-4" />} value={pct(phone, allDevices, 0)} hint={`${num(phone)} of ${num(allDevices)} visitors`} />
            <StatCard label="Came back" icon={<Repeat className="size-4" />} value={pct(data.retention.returned, data.retention.cohort, 0)} hint={`${num(data.retention.returned)} of ${num(data.retention.cohort)} new users returned on a later day`} />
          </div>

          <Card title="Daily active users" description="Signed-in people who did anything that day">
            <TrendChart label="Active users" data={fillDays(data.dailyActive, days)} format={num} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="What people do" description="Actions in this period · people who did it">
              <BarList
                format={num}
                items={data.actions
                  .filter((a) => a.name !== 'page_view')
                  .map((a) => ({ key: a.name, label: `${EVENT_LABELS[a.name] ?? a.name} · ${num(a.people)} people`, value: a.count }))}
              />
            </Card>
            <Card title="Top pages" description="Page views (unique visitors)">
              <BarList
                format={num}
                items={data.pages.map((p) => ({
                  key: p.path,
                  label: (
                    <span>
                      <code className="text-[0.85em]">{p.path}</code> <span className="text-ink-soft">({num(p.visitors)})</span>
                    </span>
                  ),
                  value: p.views,
                }))}
              />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Where visitors come from" description="Referring website, unique visitors">
              <BarList format={num} items={data.referrers.map((r) => ({ key: r.source, label: r.source, value: r.visitors }))} />
            </Card>
            <Card title="Devices" description="Unique visitors">
              <BarList format={num} items={data.devices.map((d) => ({ key: d.device, label: DEVICE[d.device] ?? d.device, value: d.visitors }))} />
            </Card>
          </div>

          <Card title="When people visit" description="Page views by weekday and hour (India time)">
            <Heatmap cells={data.heatmap} />
          </Card>
        </div>
      )}
    </>
  );
}
