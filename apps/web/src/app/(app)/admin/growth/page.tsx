'use client';

import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { CalendarDays, Clock, Hourglass, Magnet, Repeat, ShoppingCart, UserCheck, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { BarList, TrendChart } from '@/features/admin/charts';
import { Card, duration, num, PageHeader, pct, RangePicker, Segmented, Skeleton, StatCard, Table, useRange } from '@/features/admin/ui';
import { api } from '@/lib/api';

type Period = 'day' | 'week' | 'month' | 'year';
interface PerPeriod {
  day: number;
  week: number;
  month: number;
  year: number;
}
interface Dim {
  key: string;
  visitors: number;
  signups: number;
}
interface Growth {
  bucket: 'day' | 'week';
  active: { visitors: PerPeriod; users: PerPeriod; stickiness: number };
  time: { everyone: PerPeriod; members: PerPeriod; medianDay: number; totalHoursInRange: number };
  timeSeries: Array<{ day: string; minutes: number; people: number; avgMinutes: number }>;
  timeDistribution: Array<{ key: string; label: string; value: number }>;
  repeat: {
    visitors: number;
    multiDay: number;
    returning: number;
    avgDays: number;
    frequency: Array<{ key: string; label: string; value: number }>;
    payers: number;
    repeatPayers: number;
    payersInRange: number;
    repeatPayersInRange: number;
    ordersPerPayer: number;
    creators: number;
    repeatCreators: number;
    invitationsPerCreator: number;
  };
  cohorts: Array<{ cohort: string; size: number; weeks: Array<{ week: number; active: number }> }>;
  conversion: { series: Array<{ day: string; visitors: number; signups: number }>; bySource: Dim[]; byDevice: Dim[]; byLanding: Dim[] };
}

const PERIOD_LABEL: Record<Period, string> = { day: 'Today', week: 'Last 7 days', month: 'Last 30 days', year: 'Last 12 months' };
const DEVICE: Record<string, string> = { mobile: 'Phone', tablet: 'Tablet', desktop: 'Computer', unknown: 'Unknown' };
const weekLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function AdminGrowthPage() {
  const [range] = useRange();
  const [who, setWho] = useState<'everyone' | 'members'>('everyone');
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'growth', range],
    queryFn: () => api<Growth>(`/admin/analytics/growth?range=${range}`),
    staleTime: 60_000,
  });

  return (
    <>
      <PageHeader
        title="Growth & retention"
        description="Who comes back, how long they stay, and which channels turn visitors into accounts. Time counts only while the tab is open and someone is using it."
        actions={<RangePicker />}
      />
      {isLoading || !data ? (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* ---- Active people ---- */}
          <section>
            <SectionTitle title="Active people" hint="Signed-in users, with all visitors underneath" />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
              {(['day', 'week', 'month', 'year'] as const).map((p) => (
                <StatCard
                  key={p}
                  label={{ day: 'Daily (DAU)', week: 'Weekly (WAU)', month: 'Monthly (MAU)', year: 'Yearly' }[p]}
                  icon={<UserCheck />}
                  value={num(data.active.users[p])}
                  hint={`${num(data.active.visitors[p])} visitors · ${PERIOD_LABEL[p].toLowerCase()}`}
                />
              ))}
              <StatCard label="Stickiness" icon={<Magnet />} value={`${data.active.stickiness}%`} hint="Avg. daily users ÷ monthly users. 20 %+ is healthy." />
            </div>
          </section>

          {/* ---- Time in app ---- */}
          <section>
            <SectionTitle
              title="Time in the app"
              hint="Average engaged time per active person"
              action={
                <Segmented
                  value={who}
                  onChange={setWho}
                  label="Who"
                  options={[
                    { value: 'everyone', label: 'Everyone' },
                    { value: 'members', label: 'Signed-in users' },
                  ]}
                />
              }
            />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <StatCard label="Per day" icon={<Clock />} value={duration(data.time[who].day)} hint={`Median ${duration(data.time.medianDay)} · last 30 days`} />
              <StatCard label="Per week" icon={<CalendarDays />} value={duration(data.time[who].week)} hint="Last 12 weeks" />
              <StatCard label="Per month" icon={<CalendarDays />} value={duration(data.time[who].month)} hint="Last 12 months" />
              <StatCard label="Per year" icon={<Hourglass />} value={duration(data.time[who].year)} hint={`${num(data.time.totalHoursInRange)} h in total this period`} />
            </div>
            <div className="mt-4 grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2" title={`Engaged minutes per person, per ${data.bucket}`} description="Average over the people active in that period">
                <TrendChart label="Avg. minutes" data={data.timeSeries.map((s) => ({ day: s.day, value: s.avgMinutes }))} format={(v) => duration(v)} />
              </Card>
              <Card title="How long a visit day lasts" description="Person-days by engaged time">
                <BarList format={num} items={data.timeDistribution} />
              </Card>
            </div>
            <Card className="mt-4" title={`Total engaged time, per ${data.bucket}`} description="All people together">
              <TrendChart kind="bar" label="Minutes" data={data.timeSeries.map((s) => ({ day: s.day, value: s.minutes }))} format={(v) => duration(v)} />
            </Card>
          </section>

          {/* ---- Repeat ---- */}
          <section>
            <SectionTitle title="Repeat rate" hint="Do people come back, and do they buy again" />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <StatCard
                label="Returning visitors"
                icon={<Repeat />}
                value={pct(data.repeat.returning, data.repeat.visitors, 0)}
                hint={`${num(data.repeat.returning)} of ${num(data.repeat.visitors)} had visited before this period`}
              />
              <StatCard
                label="Came on 2+ days"
                icon={<CalendarDays />}
                value={pct(data.repeat.multiDay, data.repeat.visitors, 0)}
                hint={`${data.repeat.avgDays} visit days per visitor`}
              />
              <StatCard
                label="Repeat buyers"
                icon={<ShoppingCart />}
                value={pct(data.repeat.repeatPayers, data.repeat.payers, 0)}
                hint={`${num(data.repeat.repeatPayers)} of ${num(data.repeat.payers)} paying users bought 2+ times · ${data.repeat.ordersPerPayer} orders each`}
              />
              <StatCard
                label="Repeat creators"
                icon={<UserPlus />}
                value={pct(data.repeat.repeatCreators, data.repeat.creators, 0)}
                hint={`${num(data.repeat.repeatCreators)} of ${num(data.repeat.creators)} made 2+ invitations`}
              />
            </div>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <Card title="Visit frequency" description="Days each visitor came in this period">
                <BarList format={num} items={data.repeat.frequency} />
              </Card>
              <Card title="Buyers this period" description="People whose latest payment falls in the range">
                <div className="grid grid-cols-2 gap-4">
                  <Mini label="Paid" value={num(data.repeat.payersInRange)} />
                  <Mini label="Of them, repeat buyers" value={`${num(data.repeat.repeatPayersInRange)} (${pct(data.repeat.repeatPayersInRange, data.repeat.payersInRange, 0)})`} />
                  <Mini label="Invitations per creator" value={String(data.repeat.invitationsPerCreator)} />
                  <Mini label="Orders per paying user" value={String(data.repeat.ordersPerPayer)} />
                </div>
              </Card>
            </div>
          </section>

          {/* ---- Retention cohorts ---- */}
          <Card title="Weekly retention" description="People who signed up in a week, and the share active in each week after (week 0 = sign-up week)" pad={false}>
            <Cohorts cohorts={data.cohorts} />
          </Card>

          {/* ---- Conversion ---- */}
          <section>
            <SectionTitle title="Visitor → sign-up" hint="First visit in the period, then whether that visitor made an account" />
            <Card title={`Conversion rate, per ${data.bucket}`} description="Sign-ups ÷ unique visitors">
              <TrendChart
                label="Conversion"
                data={data.conversion.series.map((s) => ({ day: s.day, value: s.visitors ? Math.round((s.signups / s.visitors) * 1000) / 10 : 0 }))}
                format={(v) => `${v}%`}
              />
            </Card>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <ConversionTable title="By source" rows={data.conversion.bySource} label={(k) => k} />
              <ConversionTable title="By landing page" rows={data.conversion.byLanding} label={(k) => <code className="text-[0.85em]">{k}</code>} />
            </div>
            <div className="mt-4">
              <ConversionTable title="By device" rows={data.conversion.byDevice} label={(k) => DEVICE[k] ?? k} />
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function SectionTitle({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg">{title}</h2>
        {hint && <p className="text-[0.8125rem] text-ink-soft">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-ink/10 px-3 py-2.5">
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">{label}</p>
      <p className="mt-1 text-lg tabular-nums">{value}</p>
    </div>
  );
}

function ConversionTable({ title, rows, label }: { title: string; rows: Dim[]; label: (k: string) => React.ReactNode }) {
  return (
    <Card title={title} pad={false}>
      {rows.length ? (
        <Table head={['', 'Visitors', 'Sign-ups', 'Rate']} className="[&_table]:min-w-[420px]">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="max-w-56 truncate">{label(r.key)}</td>
              <td className="tabular-nums">{num(r.visitors)}</td>
              <td className="tabular-nums">{num(r.signups)}</td>
              <td className="font-medium tabular-nums">{pct(r.signups, r.visitors)}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-ink-soft">No visits in this period</p>
      )}
    </Card>
  );
}

/** Classic triangle: rows = sign-up week, columns = weeks since. Shade = share still active. */
function Cohorts({ cohorts }: { cohorts: Growth['cohorts'] }) {
  if (!cohorts.length) return <p className="px-5 py-8 text-center text-sm text-ink-soft">No sign-ups in the last 8 weeks</p>;
  const cols = 8;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink/10 bg-ink/[0.02] font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-ink-soft">
            <th className="px-5 py-2.5 text-left font-normal">Week of</th>
            <th className="px-3 py-2.5 text-right font-normal">Users</th>
            {Array.from({ length: cols }, (_, i) => (
              <th key={i} className="px-2 py-2.5 text-center font-normal">
                W{i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => {
            const age = Math.floor((Date.now() - new Date(`${c.cohort}T00:00:00`).getTime()) / (7 * 86400_000));
            return (
              <tr key={c.cohort} className="border-b border-ink/10 last:border-0">
                <td className="whitespace-nowrap px-5 py-2">{weekLabel(c.cohort)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{num(c.size)}</td>
                {Array.from({ length: cols }, (_, w) => {
                  if (w > age) return <td key={w} className="px-1 py-1" />;
                  const active = c.weeks.find((x) => x.week === w)?.active ?? 0;
                  const share = c.size ? active / c.size : 0;
                  return (
                    <td key={w} className="px-1 py-1">
                      <div
                        title={`${num(active)} of ${num(c.size)} active`}
                        className={clsx('grid h-8 place-items-center font-mono text-[0.6875rem] tabular-nums', share > 0.5 ? 'text-ivory' : 'text-ink')}
                        style={{ background: `color-mix(in oklab, var(--color-ink) ${Math.round(share * 85) + (share > 0 ? 6 : 3)}%, transparent)` }}
                      >
                        {c.size ? `${Math.round(share * 100)}%` : '—'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
