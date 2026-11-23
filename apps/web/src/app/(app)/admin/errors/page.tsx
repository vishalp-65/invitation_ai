'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bug } from 'lucide-react';
import { Fragment, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ago, dateTime, Empty, PageHeader, Segmented, Skeleton, StatCard, Table } from '@/features/admin/ui';
import { api } from '@/lib/api';

interface AppError {
  id: string;
  source: 'web' | 'api' | 'worker';
  message: string;
  stack: string | null;
  url: string | null;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
}

const SOURCE: Record<AppError['source'], string> = { web: 'Browser', api: 'API', worker: 'Worker' };

/** Errors from the web app, API and render worker, grouped so one bug is one row. */
export default function AdminErrorsPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'open' | 'all'>('open');
  const [openId, setOpenId] = useState<string | null>(null);
  const key = ['admin', 'errors', view] as const;
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => api<{ last24h: { groups: number; events: number }; items: AppError[] }>(`/admin/errors${view === 'all' ? '?all=1' : ''}`),
    refetchInterval: 60_000,
  });
  const resolve = (e: AppError) =>
    api(`/admin/errors/${e.id}/resolve`, { method: 'POST' }).then(
      () => {
        toast.success('Marked as fixed. It comes back if it happens again.');
        void qc.invalidateQueries({ queryKey: ['admin', 'errors'] });
      },
      (err: Error) => toast.error(err.message),
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Errors"
        description="Crashes and failed jobs from browsers, the API and the render worker. A fixed error re-opens by itself if it happens again."
        actions={
          <Segmented
            label="Show"
            value={view}
            onChange={setView}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'all', label: 'All' },
            ]}
          />
        }
      />
      {data && (
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard label="Distinct errors, last 24 h" value={data.last24h.groups} />
          <StatCard label="Occurrences, last 24 h" value={data.last24h.events.toLocaleString('en-IN')} />
        </div>
      )}
      {isLoading && <Skeleton className="h-64" />}
      {data && data.items.length === 0 && (
        <Empty icon={<Bug />} title="No open errors">
          Nothing has crashed recently.
        </Empty>
      )}
      {data && data.items.length > 0 && (
        <Table head={['Error', 'Where', 'Count', 'Last seen', '']}>
          {data.items.map((e) => (
            <Fragment key={e.id}>
              <tr className="cursor-pointer" onClick={() => setOpenId(openId === e.id ? null : e.id)}>
                <td className="max-w-md">
                  <p className="line-clamp-2 break-words">{e.message}</p>
                  <p className="mt-0.5 font-mono text-[0.6875rem] text-ink-soft">
                    {SOURCE[e.source]} · first {dateTime(e.firstSeenAt)}
                  </p>
                </td>
                <td className="font-mono text-xs text-ink-soft">{e.url ?? '–'}</td>
                <td className="tabular-nums">{e.count.toLocaleString('en-IN')}</td>
                <td className="whitespace-nowrap text-ink-soft">{ago(e.lastSeenAt)}</td>
                <td className="text-right">
                  {e.resolvedAt ? (
                    <span className="font-mono text-xs text-ink-soft">Fixed</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="line"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        void resolve(e);
                      }}
                    >
                      Mark fixed
                    </Button>
                  )}
                </td>
              </tr>
              {openId === e.id && e.stack && (
                <tr>
                  <td colSpan={5}>
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap bg-ink/[0.03] p-3 font-mono text-[0.6875rem] leading-relaxed">{e.stack}</pre>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </Table>
      )}
    </div>
  );
}
