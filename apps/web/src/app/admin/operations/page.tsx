'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useMe } from '@/lib/hooks';
import { AlertTriangle, Bot, Clock, Database, HardDrive, Hourglass, MailOpen, Video } from 'lucide-react';
import { BarList } from '@/features/admin/charts';
import { ago, Badge, Card, Empty, num, PageHeader, pct, RangePicker, Skeleton, StatCard, Table, useRange } from '@/features/admin/ui';
import { api, ApiError } from '@/lib/api';
import { confirmDialog } from '@/components/ui/confirm';

interface Ops {
  renders: Array<{ format: string; status: string; count: number; avgSeconds: number | null }>;
  stuck: number;
  failures: Array<{ id: string; format: string; error: string | null; createdAt: string; eventId: string; title: string; email: string | null }>;
  ai: Array<{ kind: string; status: string; count: number; costUsd: number }>;
  storage: Array<{ kind: string; files: number; bytes: number }>;
  invitations: Array<{ status: string; count: number; suspended: number }>;
  tables: Array<{ name: string; rows: number; bytes: number }>;
}

const FORMAT: Record<string, string> = { image: 'Image card', pdf: 'PDF', print_pdf: 'Print PDF', video: 'Video', site_video: 'Design film' };

function bytes(n: number) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

/** System health in one place: is rendering keeping up, what failed, what AI costs, how big things are. */
export default function AdminOperationsPage() {
  const [range] = useRange();
  const qcOps = useQueryClient();
  async function renderAction(id: string, action: 'retry' | 'delete') {
    if (action === 'delete' && !(await confirmDialog('Delete this failed render? The customer can start it again.'))) return;
    try {
      await api(`/admin/renders/${id}${action === 'retry' ? '/retry' : ''}`, { method: action === 'retry' ? 'POST' : 'DELETE' });
      toast.success(action === 'retry' ? 'Back in the queue' : 'Deleted');
      void qcOps.invalidateQueries({ queryKey: ['admin', 'ops'] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed');
    }
  }
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'ops', range],
    queryFn: () => api<Ops>(`/admin/operations?range=${range}`),
    refetchInterval: 60_000,
  });

  const formats = [...new Set(data?.renders.map((r) => r.format) ?? [])];
  const byFormat = formats.map((f) => {
    const rows = data!.renders.filter((r) => r.format === f);
    const get = (s: string) => rows.find((r) => r.status === s)?.count ?? 0;
    const total = rows.reduce((s, r) => s + r.count, 0);
    return { format: f, total, completed: get('completed'), failed: get('failed'), pending: get('queued') + get('processing'), avg: rows.find((r) => r.status === 'completed')?.avgSeconds ?? null };
  });
  const totalRenders = byFormat.reduce((s, r) => s + r.total, 0);
  const failed = byFormat.reduce((s, r) => s + r.failed, 0);
  const aiCost = data?.ai.reduce((s, r) => s + r.costUsd, 0) ?? 0;
  const storage = data?.storage.reduce((s, r) => s + r.bytes, 0) ?? 0;
  const liveSites = data?.invitations.find((i) => i.status === 'published')?.count ?? 0;
  const suspended = data?.invitations.reduce((s, i) => s + i.suspended, 0) ?? 0;

  return (
    <>
      <PageHeader title="Operations" description="Rendering, AI spend, storage and database size. Refreshes every minute." actions={<RangePicker />} />
      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Renders" icon={<Video />} value={num(totalRenders)} hint={`${pct(totalRenders - failed, totalRenders, 1)} succeeded`} />
            <StatCard label="Failed renders" icon={<AlertTriangle />} value={num(failed)} hint={failed ? 'See the list below' : 'All good'} />
            <StatCard
              label="Stuck in queue"
              icon={<Hourglass />}
              value={<span className={data.stuck ? 'text-sindoor' : undefined}>{num(data.stuck)}</span>}
              hint="Queued or running for over 15 min. Check the worker if this is not 0."
            />
            <StatCard label="AI spend" icon={<Bot />} value={`$${aiCost.toFixed(2)}`} hint={`${num(data.ai.reduce((s, r) => s + r.count, 0))} generations`} />
            <StatCard label="Storage" icon={<HardDrive />} value={bytes(storage)} hint={`${num(data.storage.reduce((s, r) => s + r.files, 0))} files (all time)`} />
            <StatCard label="Live websites" icon={<MailOpen />} value={num(liveSites)} hint={`${num(suspended)} taken down`} />
            <StatCard label="Database" icon={<Database />} value={bytes(data.tables.reduce((s, t) => s + t.bytes, 0))} hint="10 biggest tables" />
            <StatCard label="Avg. video render" icon={<Clock />} value={byFormat.find((f) => f.format === 'video')?.avg ? `${byFormat.find((f) => f.format === 'video')!.avg} s` : '—'} hint="Queue to finished file" />
          </div>

          <Alerts />

          <Card title="Rendering by format" pad={false}>
            {byFormat.length ? (
              <Table head={['Format', 'Total', 'Done', 'Failed', 'Pending', 'Failure rate', 'Avg. time']}>
                {byFormat.map((r) => (
                  <tr key={r.format}>
                    <td className="font-medium">{FORMAT[r.format] ?? r.format}</td>
                    <td className="tabular-nums">{num(r.total)}</td>
                    <td className="tabular-nums">{num(r.completed)}</td>
                    <td className="tabular-nums">{r.failed ? <Badge tone="bad">{num(r.failed)}</Badge> : '0'}</td>
                    <td className="tabular-nums">{num(r.pending)}</td>
                    <td className="tabular-nums">{pct(r.failed, r.total)}</td>
                    <td className="tabular-nums">{r.avg != null ? `${r.avg} s` : '—'}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-ink-soft">No renders in this period</p>
            )}
          </Card>

          <Card title="Recent failures" description="Newest first, with the worker's error" pad={false}>
            {data.failures.length ? (
              <Table head={['When', 'Format', 'Invitation', 'Error', '']}>
                {data.failures.map((f) => (
                  <tr key={f.id}>
                    <td className="whitespace-nowrap text-ink-soft">{ago(f.createdAt)}</td>
                    <td className="whitespace-nowrap">{FORMAT[f.format] ?? f.format}</td>
                    <td className="max-w-48">
                      <p className="truncate">{f.title}</p>
                      <p className="truncate text-xs text-ink-soft">{f.email}</p>
                    </td>
                    <td className="max-w-md">
                      <code className="line-clamp-2 break-all text-xs text-sindoor">{f.error ?? 'No message'}</code>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="line" className="h-8 px-3" onClick={() => void renderAction(f.id, 'retry')}>
                          Retry
                        </Button>
                        <Button size="sm" variant="quiet" className="h-8 px-3" onClick={() => void renderAction(f.id, 'delete')}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <div className="p-5">
                <Empty title="No failed renders">Nothing failed in this period.</Empty>
              </div>
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="AI usage" description="Generations and spend (USD) by kind">
              <BarList
                format={(v) => `$${v.toFixed(2)}`}
                items={Object.values(
                  data.ai.reduce<Record<string, { key: string; label: string; value: number; n: number; failed: number }>>((acc, r) => {
                    const a = (acc[r.kind] ??= { key: r.kind, label: r.kind, value: 0, n: 0, failed: 0 });
                    a.value += r.costUsd;
                    a.n += r.count;
                    if (r.status === 'failed') a.failed += r.count;
                    return acc;
                  }, {}),
                ).map((a) => ({ key: a.key, value: a.value, label: `${a.label.replace(/_/g, ' ')} · ${num(a.n)} runs${a.failed ? ` · ${num(a.failed)} failed` : ''}` }))}
                empty="No AI generations in this period"
              />
            </Card>
            <Card title="Stored files" description="Uploads and renders by kind">
              <BarList format={bytes} items={data.storage.map((s) => ({ key: s.kind, label: `${s.kind.replace(/_/g, ' ')} · ${num(s.files)} files`, value: s.bytes }))} empty="No files yet" />
            </Card>
          </div>

          <Card title="Biggest database tables" description="Rows are Postgres estimates" pad={false}>
            <Table head={['Table', 'Rows', 'Size']}>
              {data.tables.map((t) => (
                <tr key={t.name}>
                  <td>
                    <code className="text-[0.85em]">{t.name}</code>
                  </td>
                  <td className="tabular-nums">{num(t.rows)}</td>
                  <td className="tabular-nums">{bytes(t.bytes)}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      )}
    </>
  );
}

interface AlertRow {
  id: string;
  kind: string;
  severity: 'warn' | 'critical';
  title: string;
  detail: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

/** Alerts from the 10-minute checks, plus buttons to run the scheduled jobs now. */
function Alerts() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const owner = !me?.adminScopes?.length || me.adminScopes.includes('owner');
  const { data } = useQuery({ queryKey: ['admin', 'alerts'], queryFn: () => api<AlertRow[]>('/admin/alerts'), refetchInterval: 60_000 });
  const [busy, setBusy] = useState<string | null>(null);
  const open = (data ?? []).filter((a) => !a.resolvedAt);

  async function run(job: 'check' | 'digest' | 'nightly') {
    setBusy(job);
    try {
      const r = await api<{ raised?: unknown[]; sentTo?: number; backfilled?: number }>(`/admin/ops/${job}`, { method: 'POST' });
      toast.success(job === 'check' ? `Checks ran: ${r.raised?.length ?? 0} new alert(s)` : job === 'digest' ? `Summary sent to ${r.sentTo ?? 0} admin(s)` : `Daily numbers updated (${r.backfilled ?? 0} days filled)`);
      void qc.invalidateQueries({ queryKey: ['admin', 'alerts'] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  async function bulkAlerts(kind: 'resolve' | 'clear') {
    await (kind === 'resolve' ? api('/admin/alerts/resolve-all', { method: 'POST' }) : api('/admin/alerts/resolved', { method: 'DELETE' })).catch(() => toast.error('Failed'));
    void qc.invalidateQueries({ queryKey: ['admin', 'alerts'] });
  }

  async function removeAlert(id: string) {
    await api(`/admin/alerts/${id}`, { method: 'DELETE' }).catch(() => toast.error('Failed'));
    void qc.invalidateQueries({ queryKey: ['admin', 'alerts'] });
  }

  async function resolve(id: string) {
    await api(`/admin/alerts/${id}/resolve`, { method: 'POST' }).catch(() => undefined);
    void qc.invalidateQueries({ queryKey: ['admin', 'alerts'] });
  }

  return (
    <Card
      title="Alerts"
      description="Checked every 10 minutes: failing or stuck renders, payment webhooks, checkouts with no payments, sign-up drops, AI spend. Emailed to owners and support, at most every 2 hours per problem."
      pad={false}
      action={
        owner && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="line" loading={busy === 'check'} onClick={() => void run('check')}>
              Run checks now
            </Button>
            <Button size="sm" variant="line" loading={busy === 'digest'} onClick={() => void run('digest')}>
              Send today’s summary
            </Button>
            <Button size="sm" variant="quiet" loading={busy === 'nightly'} onClick={() => void run('nightly')}>
              Rebuild daily numbers
            </Button>
            {open.length > 1 && (
              <Button size="sm" variant="quiet" onClick={() => void bulkAlerts('resolve')}>
                Resolve all
              </Button>
            )}
            {(data ?? []).some((a) => a.resolvedAt) && (
              <Button size="sm" variant="quiet" onClick={() => void bulkAlerts('clear')}>
                Clear resolved
              </Button>
            )}
          </div>
        )
      }
    >
      {!data?.length ? (
        <p className="px-5 py-6 text-center text-sm text-ink-soft">No alerts. Everything looks healthy.</p>
      ) : (
        <ul className="divide-y divide-ink/10">
          {data.slice(0, 15).map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-5 py-3">
              <Badge tone={a.resolvedAt ? 'neutral' : a.severity === 'critical' ? 'bad' : 'warn'}>{a.resolvedAt ? 'Resolved' : a.severity === 'critical' ? 'Critical' : 'Warning'}</Badge>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{a.title}</p>
                {a.detail && <p className="text-xs text-ink-soft">{a.detail}</p>}
                <p className="mt-0.5 font-mono text-[0.6875rem] text-ink-soft">{ago(a.createdAt)}</p>
              </div>
              {!a.resolvedAt && (
                <Button size="sm" variant="quiet" className="h-8 px-3" onClick={() => void resolve(a.id)}>
                  Resolve
                </Button>
              )}
              <Button size="sm" variant="quiet" className="h-8 px-2" aria-label="Delete alert" onClick={() => void removeAlert(a.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
      {open.length > 0 && <p className="border-t border-ink/10 px-5 py-2 text-xs text-ink-soft">{open.length} open</p>}
    </Card>
  );
}
