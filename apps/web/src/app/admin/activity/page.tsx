'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dateTime, Empty, PageHeader, Segmented, Skeleton, Table } from '@/features/admin/ui';
import { api } from '@/lib/api';

interface Entry {
  id: string;
  action: string;
  target: string | null;
  targetLabel: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  admin: string | null;
  adminEmail: string | null;
}

const ACTIONS: Record<string, string> = {
  'template.update': 'Changed a template',
  'template.delete': 'Deleted a template',
  'template.publish': 'Published a template',
  'template.edit': 'Edited template details',
  'coupon.create': 'Created a coupon',
  'coupon.update': 'Updated a coupon',
  'coupon.delete': 'Deleted a coupon',
  'sale.create': 'Scheduled a sale',
  'sale.update': 'Updated a sale',
  'sale.delete': 'Deleted a sale',
  'banner.create': 'Published a banner',
  'banner.update': 'Updated a banner',
  'banner.delete': 'Deleted a banner',
  'price.update': 'Changed a price',
  'plan.update': 'Edited a plan',
  'user.role': 'Changed a user’s role',
  'user.disable': 'Disabled a user',
  'user.enable': 'Enabled a user',
  'user.note': 'Edited a user note',
  'user.grant': 'Gave a plan for free',
  'template.bulk': 'Changed many templates',
  'design.update': 'Changed a video / web design',
  'coupon.bulk': 'Generated coupon codes',
  'coupon.bulk-pause': 'Paused coupons',
  'coupon.bulk-activate': 'Activated coupons',
  'coupon.bulk-delete': 'Deleted coupons',
  'invitation.suspend': 'Took down an invitation',
  'invitation.restore': 'Restored an invitation',
  'export.users': 'Exported users',
  'export.orders': 'Exported orders',
};

const GROUPS = [
  { value: '', label: 'All' },
  { value: 'user', label: 'Users' },
  { value: 'invitation', label: 'Invitations' },
  { value: 'template', label: 'Templates' },
  { value: 'design', label: 'Designs' },
  { value: 'plan', label: 'Plans' },
  { value: 'coupon', label: 'Coupons' },
  { value: 'sale', label: 'Sales' },
  { value: 'banner', label: 'Banners' },
  { value: 'export', label: 'Exports' },
] as const;
type Group = (typeof GROUPS)[number]['value'];

export default function AdminActivityPage() {
  const [group, setGroup] = useState<Group>('');
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page), ...(group ? { action: group } : {}) });
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'audit', qs.toString()], queryFn: () => api<Entry[]>(`/admin/audit?${qs}`), placeholderData: keepPreviousData });
  return (
    <>
      <PageHeader title="Admin log" description="Every change and export made from this console, newest first." />
      <div className="mb-4">
        <Segmented
          value={group}
          onChange={(g) => {
            setGroup(g);
            setPage(1);
          }}
          label="Area"
          options={GROUPS.map((g) => ({ value: g.value, label: g.label }))}
        />
      </div>
      <section className="border border-ink/10 bg-ink/[0.015]">
        {isLoading ? (
          <Skeleton className="m-5 h-48" />
        ) : !data?.length ? (
          <div className="p-5">
            <Empty icon={<ScrollText className="size-6" />} title="Nothing yet">
              Changes to templates, offers, prices and users will be listed here.
            </Empty>
          </div>
        ) : (
          <Table head={['When', 'Admin', 'Action', 'On', 'Details']}>
            {data.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap text-ink-soft">{dateTime(e.createdAt)}</td>
                <td>{e.admin ?? e.adminEmail ?? '—'}</td>
                <td className="font-medium">{ACTIONS[e.action] ?? e.action}</td>
                <td className="max-w-48 truncate" title={e.target ?? ''}>
                  {e.targetLabel ?? e.target ?? '—'}
                </td>
                <td className="max-w-72 truncate text-xs text-ink-soft" title={e.details ? JSON.stringify(e.details) : ''}>
                  {e.details
                    ? Object.entries(e.details)
                        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                        .join(' · ')
                    : '—'}
                </td>
              </tr>
            ))}
          </Table>
        )}
        {(page > 1 || (data?.length ?? 0) === 100) && (
          <div className="flex justify-end gap-2 border-t border-ink/10 px-5 py-3">
            <Button size="xs" variant="line" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Newer
            </Button>
            <Button size="xs" variant="line" disabled={(data?.length ?? 0) < 100} onClick={() => setPage(page + 1)}>
              Older
            </Button>
          </div>
        )}
      </section>
    </>
  );
}
