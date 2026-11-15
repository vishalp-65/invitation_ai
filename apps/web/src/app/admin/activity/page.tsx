'use client';

import { useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { dateTime, Empty, PageHeader, Skeleton, Table } from '@/features/admin/ui';
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
  'user.role': 'Changed a user’s role',
  'user.disable': 'Disabled a user',
  'user.enable': 'Enabled a user',
};

export default function AdminActivityPage() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'audit'], queryFn: () => api<Entry[]>('/admin/audit') });
  return (
    <>
      <PageHeader title="Admin log" description="Every change made from this console, newest first (last 100)." />
      <section className="rounded-xl border border-hairline bg-surface">
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
                <td className="font-semibold">{ACTIONS[e.action] ?? e.action}</td>
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
      </section>
    </>
  );
}
