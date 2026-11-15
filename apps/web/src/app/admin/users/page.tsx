'use client';

import { PRODUCTS, type ProductCode, type UserRole } from '@cardai/shared';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Ban, Mail, Search, ShieldCheck, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ago, Badge, dateTime, Empty, EVENT_LABELS, inr, num, PageHeader, Pager, Segmented, shortDate, Skeleton, Table } from '@/features/admin/ui';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/hooks';
import { controlClass } from '@/components/ui/field';

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  disabledAt: string | null;
  google: boolean;
  events: number;
  orders: number;
  spentPaise: number;
}
interface UserDetail {
  user: Omit<UserRow, 'events' | 'orders' | 'spentPaise'>;
  events: Array<{ id: string; title: string; type: string; templateId: string; status: string; viewCount: number; createdAt: string }>;
  orders: Array<{ id: string; productCode: string; amountPaise: number; status: string; couponCode: string | null; createdAt: string; paidAt: string | null }>;
  activity: Array<{ name: string; path: string | null; templateId: string | null; device: string | null; props: Record<string, unknown> | null; createdAt: string }>;
  spentPaise: number;
}

const ROLE_TONE: Record<UserRole, 'neutral' | 'info' | 'warn' | 'good'> = { user: 'neutral', designer: 'info', agent: 'good', admin: 'warn' };

type Status = 'all' | 'active' | 'paying' | 'disabled';

export default function AdminUsersPage() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [status, setStatus] = useState<Status>('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams({ page: String(page) });
  if (debounced) params.set('q', debounced);
  if (role) params.set('role', role);
  if (status !== 'all') params.set('status', status);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'users', params.toString()],
    queryFn: () => api<{ items: UserRow[]; total: number; pageSize: number }>(`/admin/users?${params}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Users" description="Everyone who has signed up. Open a person to see their invitations, payments and what they did." />
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
        <Segmented
          value={status}
          onChange={(s) => {
            setStatus(s);
            setPage(1);
          }}
          label="Status"
          options={[
            { value: 'all', label: 'All' },
            { value: 'paying', label: 'Paying' },
            { value: 'active', label: 'Active' },
            { value: 'disabled', label: 'Disabled' },
          ]}
        />
        <div className="flex min-w-0 flex-1 gap-2 xl:justify-end">
          <label className="relative min-w-[180px] flex-1 xl:max-w-sm">
            <span className="sr-only">Search users</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or phone" className={`${controlClass} h-10 w-full pl-9 pr-3 text-sm`} />
          </label>
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as UserRole | '');
              setPage(1);
            }}
            aria-label="Role"
            className={`${controlClass} select h-10 pl-3 pr-9 text-sm font-semibold`}
          >
            <option value="">All roles</option>
            <option value="user">Customers</option>
            <option value="designer">Designers</option>
            <option value="agent">Agents</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      <section className={clsx('rounded-xl border border-hairline bg-surface transition-opacity', isFetching && !isLoading && 'opacity-70')}>
        {isLoading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <div className="p-5">
            <Empty icon={<Users className="size-6" />} title="No users found">
              Try a different search or filter.
            </Empty>
          </div>
        ) : (
          <>
            <Table head={['Person', 'Role', 'Joined', 'Last active', 'Invites', 'Paid', 'Spent', '']}>
              {data.items.map((u) => (
                <tr key={u.id} onClick={() => setOpen(u.id)} className="cursor-pointer hover:bg-surface-2">
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar u={u} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{u.name ?? 'No name'}</p>
                        <p className="truncate text-xs text-ink-soft">{u.email ?? u.phone ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge>
                  </td>
                  <td className="whitespace-nowrap text-ink-soft">{shortDate(u.createdAt)}</td>
                  <td className="whitespace-nowrap text-ink-soft">{ago(u.lastSeenAt)}</td>
                  <td className="tabular-nums">{num(u.events)}</td>
                  <td className="tabular-nums">{num(u.orders)}</td>
                  <td className="font-semibold tabular-nums">{u.spentPaise ? inr(u.spentPaise) : '—'}</td>
                  <td>{u.disabledAt && <Badge tone="bad">Disabled</Badge>}</td>
                </tr>
              ))}
            </Table>
            <Pager page={page} total={data.total} pageSize={data.pageSize} onPage={setPage} />
          </>
        )}
      </section>

      {open && <UserDrawer id={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Avatar({ u }: { u: Pick<UserRow, 'name' | 'email' | 'avatarUrl'> }) {
  return u.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={u.avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
  ) : (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-tint text-sm font-bold">{(u.name ?? u.email ?? '?').slice(0, 1).toUpperCase()}</span>
  );
}

function UserDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'user', id], queryFn: () => api<UserDetail>(`/admin/users/${id}`) });
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'activity' | 'events' | 'orders'>('activity');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);

  async function update(body: { role?: UserRole; disabled?: boolean }, msg: string) {
    setBusy(true);
    try {
      const next = await api<UserDetail>(`/admin/users/${id}`, { method: 'PATCH', json: body });
      qc.setQueryData(['admin', 'user', id], next);
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(msg);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not update');
    } finally {
      setBusy(false);
    }
  }

  const self = me?.id === id;
  const u = data?.user;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="User details">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[var(--color-overlay)]" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl animate-[sheet-up_0.2s_var(--ease-out-quint)] flex-col overflow-hidden border-l border-hairline bg-surface sm:animate-none">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h2 className="font-sans text-lg font-bold">User</h2>
          <button type="button" onClick={onClose} className="rounded-lg bg-ink/5 p-2 hover:bg-ink/10" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        {isLoading || !data || !u ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-20" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-start gap-4 p-5">
              <Avatar u={u} />
              <div className="min-w-0 flex-1">
                <p className="text-xl font-semibold">{u.name ?? 'No name'}</p>
                <p className="flex items-center gap-1.5 truncate text-sm text-ink-soft">
                  <Mail className="size-3.5" /> {u.email ?? '—'} {u.google && <Badge>Google</Badge>}
                </p>
                {u.phone && <p className="text-sm text-ink-soft">{u.phone}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge>
                  {u.disabledAt ? <Badge tone="bad">Disabled {shortDate(u.disabledAt)}</Badge> : <Badge tone="good">Active</Badge>}
                </div>
              </div>
            </div>
            <dl className="mx-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Joined', shortDate(u.createdAt)],
                ['Last active', ago(u.lastSeenAt)],
                ['Invitations', num(data.events.length)],
                ['Total spent', inr(data.spentPaise)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-mist px-3 py-2">
                  <dt className="text-xs text-ink-soft">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="m-5 flex flex-wrap items-center gap-2 rounded-xl border border-hairline p-3">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4 text-ink-soft" /> Role
                <select
                  value={u.role}
                  disabled={busy || self}
                  onChange={(e) => void update({ role: e.target.value as UserRole }, `Role changed to ${e.target.value}`)}
                  className={`${controlClass} select h-9 pl-3 pr-9 text-sm`}
                >
                  <option value="user">Customer</option>
                  <option value="designer">Designer</option>
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <span className="flex-1" />
              {u.disabledAt ? (
                <Button size="sm" variant="line" loading={busy} onClick={() => void update({ disabled: false }, 'Account enabled')}>
                  Enable account
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="danger"
                  loading={busy}
                  disabled={self}
                  onClick={() => {
                    if (confirm(`Disable ${u.name ?? u.email}? They will be signed out everywhere and cannot sign in until you enable them again.`)) void update({ disabled: true }, 'Account disabled');
                  }}
                >
                  <Ban className="size-4" /> Disable account
                </Button>
              )}
              {self && <p className="w-full text-xs text-ink-soft">You can’t change your own role or disable yourself.</p>}
            </div>

            <div className="px-5">
              <Segmented
                value={tab}
                onChange={setTab}
                label="Details"
                options={[
                  { value: 'activity', label: 'Activity', count: data.activity.length },
                  { value: 'events', label: 'Invitations', count: data.events.length },
                  { value: 'orders', label: 'Orders', count: data.orders.length },
                ]}
              />
            </div>
            <div className="p-5 pt-3">
              {tab === 'activity' &&
                (data.activity.length ? (
                  <ol className="relative ml-2 border-l border-hairline">
                    {data.activity.map((a, i) => (
                      <li key={i} className="mb-3 ml-4">
                        <span className={clsx('absolute -left-[5px] mt-1.5 size-2.5 rounded-full', a.name === 'purchase' ? 'bg-leaf' : a.name === 'signup' ? 'bg-marigold' : 'bg-ink-soft/50')} />
                        <p className="text-sm font-semibold">{EVENT_LABELS[a.name] ?? a.name}</p>
                        <p className="text-xs text-ink-soft">
                          {dateTime(a.createdAt)}
                          {a.path && ` · ${a.path}`}
                          {a.templateId && ` · ${a.templateId}`}
                          {a.device && ` · ${a.device}`}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-ink-soft">No tracked activity yet.</p>
                ))}
              {tab === 'events' &&
                (data.events.length ? (
                  <ul className="divide-y divide-hairline">
                    {data.events.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{e.title}</p>
                          <p className="truncate text-xs text-ink-soft">
                            {e.type} · {e.templateId} · {shortDate(e.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-ink-soft">{num(e.viewCount)} views</span>
                          <Badge tone={e.status === 'published' ? 'good' : 'neutral'}>{e.status}</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-soft">No invitations yet.</p>
                ))}
              {tab === 'orders' &&
                (data.orders.length ? (
                  <ul className="divide-y divide-hairline">
                    {data.orders.map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{PRODUCTS[o.productCode as ProductCode]?.name ?? o.productCode}</p>
                          <p className="text-xs text-ink-soft">
                            {dateTime(o.paidAt ?? o.createdAt)}
                            {o.couponCode && ` · ${o.couponCode}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="font-semibold tabular-nums">{inr(o.amountPaise)}</span>
                          <Badge tone={o.status === 'paid' ? 'good' : o.status === 'failed' ? 'bad' : 'neutral'}>{o.status}</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-soft">No orders yet.</p>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
