'use client';

import { EVENT_TYPES, getSiteDesign } from '@cardai/shared';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, ExternalLink, MailOpen, RotateCcw, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/field';
import { ago, Badge, Empty, num, PageHeader, Pager, Segmented, Skeleton, Table } from '@/features/admin/ui';
import { api, ApiError } from '@/lib/api';

interface Invitation {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: 'draft' | 'published' | 'archived';
  templateId: string;
  viewCount: number;
  createdAt: string;
  publishedAt: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  siteDesign: string | null;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  guests: number;
  paidOrders: number;
}
type Status = 'all' | 'published' | 'draft' | 'archived' | 'suspended';
interface ListResponse {
  items: Invitation[];
  total: number;
  pageSize: number;
  counts: Record<Status, number>;
}

const typeLabel = (id: string) => EVENT_TYPES.find((e) => e.id === id)?.label.split(' / ')[0] ?? id;

/** Every invitation on the platform, with take-down for abuse / copyright / complaints. */
export default function AdminInvitationsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>('all');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [suspending, setSuspending] = useState<Invitation | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams({ page: String(page) });
  if (status !== 'all') params.set('status', status);
  if (debounced) params.set('q', debounced);
  const key = ['admin', 'invitations', status, debounced, page];
  const { data, isLoading, isFetching } = useQuery({ queryKey: key, queryFn: () => api<ListResponse>(`/admin/invitations?${params}`), placeholderData: keepPreviousData });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'invitations'] });

  async function restore(inv: Invitation) {
    try {
      await api(`/admin/invitations/${inv.id}`, { method: 'PATCH', json: { suspended: false } });
      toast.success(`${inv.title} is live again`);
      void refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not restore');
    }
  }

  const c = data?.counts;
  return (
    <>
      <PageHeader title="Invitations" description="Every invitation people have made. Take one down if it breaks the rules: its website, guest links and short links stop working until you restore it." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          label="Status"
          options={[
            { value: 'all', label: 'All', count: c?.all },
            { value: 'published', label: 'Published', count: c?.published },
            { value: 'draft', label: 'Draft', count: c?.draft },
            { value: 'archived', label: 'Archived', count: c?.archived },
            { value: 'suspended', label: 'Taken down', count: c?.suspended },
          ]}
        />
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, link, owner email or short code" className="pl-9" aria-label="Search invitations" />
        </label>
      </div>

      <section className="border border-ink/10 bg-ink/[0.015]" aria-busy={isFetching}>
        {isLoading ? (
          <Skeleton className="m-5 h-64" />
        ) : !data?.items.length ? (
          <div className="p-5">
            <Empty icon={<MailOpen />} title="No invitations found">
              {debounced ? 'Try a different search.' : 'Invitations appear here as people create them.'}
            </Empty>
          </div>
        ) : (
          <>
            <Table head={['Invitation', 'Owner', 'Status', 'Views', 'Guests', 'Paid', 'Created', '']}>
              {data.items.map((inv) => (
                <tr key={inv.id}>
                  <td className="max-w-64">
                    <p className="truncate font-medium">{inv.title}</p>
                    <p className="truncate text-xs text-ink-soft">
                      {typeLabel(inv.type)} · {inv.siteDesign ? (getSiteDesign(inv.siteDesign)?.name ?? inv.siteDesign) : inv.templateId}
                    </p>
                  </td>
                  <td className="max-w-48">
                    <Link href={`/admin/users?user=${inv.userId}`} className="block truncate underline-offset-4 hover:underline">
                      {inv.userName ?? inv.userEmail ?? 'Unknown'}
                    </Link>
                    {inv.userName && <p className="truncate text-xs text-ink-soft">{inv.userEmail}</p>}
                  </td>
                  <td>
                    {inv.suspendedAt ? (
                      <span title={inv.suspendedReason ?? undefined}>
                        <Badge tone="bad">Taken down</Badge>
                      </span>
                    ) : (
                      <Badge tone={inv.status === 'published' ? 'good' : inv.status === 'archived' ? 'neutral' : 'warn'}>{inv.status[0]!.toUpperCase() + inv.status.slice(1)}</Badge>
                    )}
                  </td>
                  <td className="tabular-nums">{num(inv.viewCount)}</td>
                  <td className="tabular-nums">{num(inv.guests)}</td>
                  <td className="tabular-nums">{inv.paidOrders ? <Badge tone="info">{inv.paidOrders}</Badge> : '—'}</td>
                  <td className="whitespace-nowrap text-ink-soft">{ago(inv.createdAt)}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      {inv.status === 'published' && !inv.suspendedAt && (
                        <a href={`/i/${inv.slug}`} target="_blank" rel="noreferrer" aria-label="Open website" data-tip="Open website" className="grid size-8 place-items-center text-ink-soft hover:bg-ink/[0.05] hover:text-ink">
                          <ExternalLink className="size-4" />
                        </a>
                      )}
                      {inv.suspendedAt ? (
                        <Button size="sm" variant="line" className="h-8 px-3" onClick={() => void restore(inv)}>
                          <RotateCcw className="size-3.5" /> Restore
                        </Button>
                      ) : (
                        <Button size="sm" variant="line" className="h-8 px-3 hover:border-sindoor hover:text-sindoor" onClick={() => setSuspending(inv)}>
                          <Ban className="size-3.5" /> Take down
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            <Pager page={page} total={data.total} pageSize={data.pageSize} onPage={setPage} />
          </>
        )}
      </section>

      {suspending && <SuspendDialog inv={suspending} onClose={() => setSuspending(null)} onDone={() => void refresh()} />}
    </>
  );
}

function SuspendDialog({ inv, onClose, onDone }: { inv: Invitation; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/admin/invitations/${inv.id}`, { method: 'PATCH', json: { suspended: true, reason: reason.trim() || null } });
      toast.success(`${inv.title} taken down`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not take it down');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onClose={onClose} title="Take down this invitation?">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft">
          <strong className="text-ink">{inv.title}</strong> stops opening for guests: website, personal guest links and short links. The owner keeps their invitation and payments, but cannot publish it again until you restore it.
        </p>
        <Field label="Reason (for the admin log)">{(id) => <Textarea id={id} rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Copyright complaint from …" />}</Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="line" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="solid" size="sm" loading={busy}>
            Take down
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
