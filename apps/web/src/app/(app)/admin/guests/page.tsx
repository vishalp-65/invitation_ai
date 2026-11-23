'use client';

import { getEventType } from '@cardai/shared';
import { useQuery } from '@tanstack/react-query';
import { Eye, MessageCircle, Share2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { BarList, Funnel, TrendChart } from '@/features/admin/charts';
import { Card, Empty, num, PageHeader, pct, RangePicker, Skeleton, StatCard, Table, useRange } from '@/features/admin/ui';
import { api } from '@/lib/api';

interface Guests {
  bucket: 'day' | 'week';
  totals: { views: number; guestViews: number; whatsapp: number; mobile: number; invitations: number; published: number };
  series: Array<{ day: string; views: number }>;
  top: Array<{ id: string; title: string; type: string; views: number; guests: number; rsvps: number; yes: number }>;
  rsvp: { invited: number; opened: number; rsvps: number; yes: number; headcount: number };
  viral: { referred: number; referredPaying: number; signups: number };
  shares: Array<{ kind: string; count: number; people: number }>;
}

const SHARE: Record<string, string> = { file: 'Shared the card / video file', link: 'Shared the website link', other: 'Other shares' };

/** The guest side: how invitations travel (WhatsApp), get opened and answered, and bring new hosts. */
export default function AdminGuestsPage() {
  const [range] = useRange();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'guests', range], queryFn: () => api<Guests>(`/admin/analytics/guests?range=${range}`), staleTime: 60_000 });

  return (
    <>
      <PageHeader title="Guests & sharing" description="How invitations travel: opens, WhatsApp, RSVPs, and guests who go on to make their own invitation." actions={<RangePicker />} />
      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Invitation opens" icon={<Eye />} value={num(data.totals.views)} hint={`${num(data.totals.invitations)} invitations opened · ${data.totals.invitations ? Math.round(data.totals.views / data.totals.invitations) : 0} each`} />
            <StatCard label="Opened in WhatsApp" icon={<MessageCircle />} value={pct(data.totals.whatsapp, data.totals.views, 0)} hint={`${pct(data.totals.mobile, data.totals.views, 0)} on phones`} />
            <StatCard label="Personal links" icon={<Share2 />} value={pct(data.totals.guestViews, data.totals.views, 0)} hint="Opens through a guest's own link" />
            <StatCard
              label="Guests who became hosts"
              icon={<UserPlus />}
              value={num(data.viral.referred)}
              hint={`${pct(data.viral.referred, data.viral.signups, 1)} of new sign-ups · ${num(data.viral.referredPaying)} paid`}
            />
          </div>

          <Card title={`Invitation opens, per ${data.bucket}`}>
            <TrendChart label="Opens" data={data.series.map((s) => ({ day: s.day, value: s.views }))} format={num} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Guest list to RSVP" description="Invitations created in this period">
              <Funnel
                steps={[
                  { key: 'invited', label: 'Guests added', count: data.rsvp.invited },
                  { key: 'opened', label: 'Opened their link', count: data.rsvp.opened },
                  { key: 'rsvp', label: 'Replied (all RSVPs)', count: data.rsvp.rsvps },
                  { key: 'yes', label: 'Said yes', count: data.rsvp.yes },
                ]}
              />
              <p className="mt-3 text-xs text-ink-soft">{num(data.rsvp.headcount)} people expected in total (yes and maybe, with headcount).</p>
            </Card>
            <Card title="Sharing by hosts" description="Times hosts shared from the app · people">
              <BarList format={num} items={data.shares.map((s) => ({ key: s.kind, label: `${SHARE[s.kind] ?? s.kind} · ${num(s.people)} hosts`, value: s.count }))} empty="No shares tracked in this period" />
            </Card>
          </div>

          <Card title="Most opened invitations" pad={false}>
            {data.top.length ? (
              <Table head={['Invitation', 'Opens', 'Guests', 'RSVPs', 'Yes']}>
                {data.top.map((t) => (
                  <tr key={t.id}>
                    <td className="max-w-72">
                      <Link href={`/admin/invitations?q=${encodeURIComponent(t.title)}`} className="block truncate font-medium underline-offset-4 hover:underline">
                        {t.title}
                      </Link>
                      <span className="text-xs text-ink-soft">{getEventType(t.type)?.label.split(' / ')[0] ?? t.type}</span>
                    </td>
                    <td className="tabular-nums">{num(t.views)}</td>
                    <td className="tabular-nums">{num(t.guests)}</td>
                    <td className="tabular-nums">{num(t.rsvps)}</td>
                    <td className="tabular-nums">{num(t.yes)}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <div className="p-5">
                <Empty title="No opens yet">Opens are counted when guests load a published invitation website.</Empty>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
