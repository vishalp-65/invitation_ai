'use client';

import { CHANNEL_LABEL, CITY_TIER_LABEL, INDIA_STATES, LANGUAGES, type Channel, type CityTier } from '@cardai/shared';
import { useQuery } from '@tanstack/react-query';
import { Globe2, MapPin, Megaphone, Signal } from 'lucide-react';
import { BarList } from '@/features/admin/charts';
import { Card, compactINR, Empty, num, PageHeader, pct, RangePicker, Skeleton, StatCard, Table, useRange } from '@/features/admin/ui';
import { api } from '@/lib/api';

interface Row {
  key: string;
  visitors: number;
  accounts: number;
  payers: number;
  revenuePaise: number;
}
interface Acquisition {
  totals: { visitors: number; located: number; india: number };
  channels: Row[];
  campaigns: Row[];
  states: Row[];
  tiers: Row[];
  languages: Row[];
  networks: Row[];
  inApp: Row[];
  devices: Row[];
  countries: Row[];
}

const NETWORK: Record<string, string> = { '4g': '4G / Wi-Fi', '3g': '3G', '2g': '2G', 'slow-2g': 'Slow 2G', unknown: 'Unknown (iPhone / desktop)' };
const IN_APP: Record<string, string> = { whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', snapchat: 'Snapchat', telegram: 'Telegram', sharechat: 'ShareChat / Moj', linkedin: 'LinkedIn' };
const DEVICE: Record<string, string> = { mobile: 'Phone', tablet: 'Tablet', desktop: 'Computer', unknown: 'Unknown' };
const langName = (code: string) => {
  const base = code.split('-')[0]!;
  const l = LANGUAGES.find((x) => x.code === base);
  return l ? `${l.name}${l.nativeName !== l.name ? ` · ${l.nativeName}` : ''}` : code;
};

/** Where visitors come from, India-first: channels (WhatsApp, Instagram…), campaigns, states, city tiers, languages and networks. */
export default function AdminAcquisitionPage() {
  const [range] = useRange();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'acquisition', range], queryFn: () => api<Acquisition>(`/admin/analytics/acquisition?range=${range}`), staleTime: 60_000 });

  return (
    <>
      <PageHeader
        title="Acquisition & India"
        description="New visitors in the period by channel, campaign (utm tags), state, city tier, language and connection. Accounts, payers and revenue count each person once, at their first visit."
        actions={<RangePicker />}
      />
      {isLoading || !data ? (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      ) : !data.totals.visitors ? (
        <Empty icon={<MapPin />} title="No new visitors in this period yet">
          Visits are attributed from now on. Tag your links with utm_source, utm_medium and utm_campaign (e.g. ?utm_source=instagram&utm_campaign=diwali) to see campaigns here.
        </Empty>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="New visitors" icon={<Globe2 />} value={num(data.totals.visitors)} hint={`${pct(data.totals.india, data.totals.visitors, 0)} from India`} />
            <StatCard
              label="Top channel"
              icon={<Megaphone />}
              value={data.channels[0] ? CHANNEL_LABEL[data.channels[0].key as Channel] ?? data.channels[0].key : '—'}
              hint={data.channels[0] ? `${pct(data.channels[0].visitors, data.totals.visitors, 0)} of new visitors` : undefined}
            />
            <StatCard
              label="Top state"
              icon={<MapPin />}
              value={data.states[0] ? INDIA_STATES[data.states[0].key] ?? data.states[0].key : '—'}
              hint={data.totals.located ? `${pct(data.totals.located, data.totals.visitors, 0)} of visits have a location` : 'Location appears once the site runs on Vercel'}
            />
            <StatCard
              label="On 2G / 3G"
              icon={<Signal />}
              value={pct(data.networks.filter((x) => ['2g', '3g', 'slow-2g'].includes(x.key)).reduce((s, x) => s + x.visitors, 0), data.totals.visitors, 0)}
              hint="Keep pages light for these visitors"
            />
          </div>

          <DimTable title="Channels" description="WhatsApp and Instagram links often arrive without a referrer, so the in-app browser is used too" rows={data.channels} label={(k) => CHANNEL_LABEL[k as Channel] ?? k} />
          <DimTable title="Campaigns" description="From utm_campaign on your links" rows={data.campaigns} label={(k) => <code className="text-[0.85em]">{k}</code>} empty="No tagged campaigns yet. Add ?utm_campaign=… to the links you share." />

          <div className="grid gap-6 lg:grid-cols-2">
            <DimTable title="States" rows={data.states} label={(k) => INDIA_STATES[k] ?? k} compact />
            <div className="flex flex-col gap-6">
              <DimTable title="City tier" description="Metros, tier 2 and everything else" rows={data.tiers} label={(k) => CITY_TIER_LABEL[k as CityTier] ?? k} compact />
              <Card title="Languages" description="Page language at first visit">
                <BarList format={num} items={data.languages.map((l) => ({ key: l.key, label: langName(l.key), value: l.visitors }))} />
              </Card>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Connection" description="Network speed reported by the browser">
              <BarList format={num} items={data.networks.map((x) => ({ key: x.key, label: NETWORK[x.key] ?? x.key, value: x.visitors }))} />
            </Card>
            <Card title="Opened inside an app" description="Links tapped in these apps">
              <BarList format={num} items={data.inApp.map((x) => ({ key: x.key, label: IN_APP[x.key] ?? x.key, value: x.visitors }))} empty="No in-app visits" />
            </Card>
            <Card title="Devices">
              <BarList format={num} items={data.devices.map((x) => ({ key: x.key, label: DEVICE[x.key] ?? x.key, value: x.visitors }))} />
            </Card>
          </div>

          {data.countries.length > 1 && <DimTable title="Countries" description="NRI families often share invitations from abroad" rows={data.countries} label={(k) => k} compact />}
        </div>
      )}
    </>
  );
}

function DimTable({ title, description, rows, label, empty = 'No data yet', compact }: { title: string; description?: string; rows: Row[]; label: (k: string) => React.ReactNode; empty?: string; compact?: boolean }) {
  return (
    <Card title={title} description={description} pad={false}>
      {rows.length ? (
        <Table head={compact ? ['', 'Visitors', 'Accounts', 'Paid'] : ['', 'Visitors', 'Accounts', 'Sign-up rate', 'Paying', 'Revenue']} className="[&_table]:min-w-[420px]">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="max-w-56 truncate font-medium">{label(r.key)}</td>
              <td className="tabular-nums">{num(r.visitors)}</td>
              <td className="tabular-nums">{num(r.accounts)}</td>
              {compact ? (
                <td className="tabular-nums">{r.payers ? `${num(r.payers)} · ${compactINR(r.revenuePaise)}` : '—'}</td>
              ) : (
                <>
                  <td className="tabular-nums">{pct(r.accounts, r.visitors)}</td>
                  <td className="tabular-nums">{num(r.payers)}</td>
                  <td className="tabular-nums">{r.revenuePaise ? compactINR(r.revenuePaise) : '—'}</td>
                </>
              )}
            </tr>
          ))}
        </Table>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-ink-soft">{empty}</p>
      )}
    </Card>
  );
}
