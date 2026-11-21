'use client';

import { PRODUCT_CODES, PRODUCTS, type ProductCode, type UserRole } from '@cardai/shared';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Ban, Download, Eye, FileDown, Gift, LogOut, Mail, Pencil, Search, ShieldCheck, StickyNote, Trash2, Users, X } from 'lucide-react';
import { InvitationDrawer } from '@/features/admin/invitation-drawer';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { TrendChart } from '@/features/admin/charts';
import { ago, Badge, BulkBar, dateTime, downloadCsv, duration, Empty, EVENT_LABELS, inr, num, PageHeader, Pager, Segmented, shortDate, Skeleton, Table } from '@/features/admin/ui';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/hooks';
import { controlClass } from '@/components/ui/field';
import { confirmDialog } from '@/components/ui/confirm';

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
  activeSeconds30: number;
  hasNote: boolean;
}
interface UserDetail {
  user: Omit<UserRow, 'events' | 'orders' | 'spentPaise' | 'activeSeconds30' | 'hasNote'> & { note: string | null; marketingEmails: boolean; locale: string };
  events: Array<{ id: string; title: string; type: string; templateId: string; status: string; slug: string; viewCount: number; suspendedAt: string | null; createdAt: string }>;
  orders: Array<{ id: string; productCode: string; amountPaise: number; status: string; couponCode: string | null; createdAt: string; paidAt: string | null }>;
  activity: Array<{ name: string; path: string | null; templateId: string | null; device: string | null; props: Record<string, unknown> | null; createdAt: string }>;
  spentPaise: number;
  time: { today: number; week: number; month: number; year: number; allTime: number; activeDays: number; activeDays30: number; pageViews: number };
  daily: Array<{ day: string; seconds: number }>;
}

type Sort = 'new' | 'active' | 'spend' | 'seen';
const SORTS: Record<Sort, string> = { new: 'Newest first', active: 'Most time (30 d)', spend: 'Top spenders', seen: 'Recently active' };

const ROLE_TONE: Record<UserRole, 'neutral' | 'info' | 'warn' | 'good'> = { user: 'neutral', designer: 'info', agent: 'good', admin: 'warn' };

type Status = 'all' | 'active' | 'paying' | 'disabled';

export default function AdminUsersPage() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [status, setStatus] = useState<Status>('all');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<Sort>('new');
  const deepLink = useSearchParams().get('user');
  const [open, setOpen] = useState<string | null>(deepLink);
  const [exporting, setExporting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const qcList = useQueryClient();
  async function bulk(action: 'disable' | 'enable' | 'sign-out') {
    const ids = [...picked];
    const words = { disable: 'Disable', enable: 'Enable', 'sign-out': 'Sign out' }[action];
    if (action !== 'enable' && !(await confirmDialog(`${words} ${ids.length} account(s)? Admins and your own account are skipped.`))) return;
    try {
      const r = await api<{ updated: number; skipped: number }>('/admin/users/bulk', { method: 'POST', json: { ids, action } });
      toast.success(`${r.updated} updated${r.skipped ? `, ${r.skipped} skipped` : ''}`);
      setPicked(new Set());
      void qcList.invalidateQueries({ queryKey: ['admin', 'users'] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not update');
    }
  }
  useEffect(() => setOpen(deepLink), [deepLink]);

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
  if (sort !== 'new') params.set('sort', sort);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'users', params.toString()],
    queryFn: () => api<{ items: UserRow[]; total: number; pageSize: number }>(`/admin/users?${params}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone who has signed up. Open a person to see their invitations, payments, time in the app and what they did."
        actions={
          <Button
            size="sm"
            variant="line"
            loading={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await downloadCsv('/admin/users/export', `noyta-users-${new Date().toISOString().slice(0, 10)}.csv`);
              } catch {
                toast.error('Export failed');
              } finally {
                setExporting(false);
              }
            }}
          >
            <Download className="size-4" /> Export CSV
          </Button>
        }
      />
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
          <Select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as UserRole | '');
              setPage(1);
            }}
            aria-label="Role"
            className="h-10 w-auto min-w-36 text-sm font-medium"
          >
            <option value="">All roles</option>
            <option value="user">Customers</option>
            <option value="designer">Designers</option>
            <option value="agent">Agents</option>
            <option value="admin">Admins</option>
          </Select>
          <Select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as Sort);
              setPage(1);
            }}
            aria-label="Sort"
            className="h-10 w-auto min-w-36 text-sm font-medium"
          >
            {(Object.keys(SORTS) as Sort[]).map((k) => (
              <option key={k} value={k}>
                {SORTS[k]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <section className={clsx('border border-ink/10 bg-ink/[0.015] transition-opacity', isFetching && !isLoading && 'opacity-70')}>
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
            <Table
              head={[
                <input
                  key="all"
                  type="checkbox"
                  aria-label="Select all on this page"
                  className="size-4 accent-[var(--color-ink)]"
                  checked={data.items.every((u) => picked.has(u.id))}
                  onChange={(e) => setPicked(e.target.checked ? new Set(data.items.map((u) => u.id)) : new Set())}
                />,
                'Person',
                'Role',
                'Joined',
                'Last active',
                'Time (30 d)',
                'Invites',
                'Paid',
                'Spent',
                '',
              ]}
            >
              {data.items.map((u) => (
                <tr key={u.id} onClick={() => setOpen(u.id)} className="cursor-pointer">
                  <td className="w-8" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${u.name ?? u.email}`}
                      className="size-4 accent-[var(--color-ink)]"
                      checked={picked.has(u.id)}
                      onChange={() =>
                        setPicked((cur) => {
                          const n = new Set(cur);
                          if (n.has(u.id)) n.delete(u.id);
                          else n.add(u.id);
                          return n;
                        })
                      }
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar u={u} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.name ?? 'No name'}</p>
                        <p className="truncate text-xs text-ink-soft">{u.email ?? u.phone ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge>
                  </td>
                  <td className="whitespace-nowrap text-ink-soft">{shortDate(u.createdAt)}</td>
                  <td className="whitespace-nowrap text-ink-soft">{ago(u.lastSeenAt)}</td>
                  <td className="whitespace-nowrap tabular-nums">{u.activeSeconds30 ? duration(u.activeSeconds30 / 60) : '—'}</td>
                  <td className="tabular-nums">{num(u.events)}</td>
                  <td className="tabular-nums">{num(u.orders)}</td>
                  <td className="font-medium tabular-nums">{u.spentPaise ? inr(u.spentPaise) : '—'}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1.5">
                      {u.hasNote && <StickyNote className="size-3.5 text-ink-soft" aria-label="Has a note" />}
                      {u.disabledAt && <Badge tone="bad">Disabled</Badge>}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            <Pager page={page} total={data.total} pageSize={data.pageSize} onPage={setPage} />
          </>
        )}
      </section>

      {open && <UserDrawer id={open} onClose={() => setOpen(null)} />}
      {picked.size > 0 && (
        <BulkBar count={picked.size} onClear={() => setPicked(new Set())}>
          <Button size="sm" variant="line" onClick={() => void bulk('sign-out')}>
            <LogOut className="size-3.5" /> Sign out
          </Button>
          <Button size="sm" variant="line" onClick={() => void bulk('enable')}>
            Enable
          </Button>
          <Button size="sm" variant="danger" onClick={() => void bulk('disable')}>
            <Ban className="size-3.5" /> Disable
          </Button>
        </BulkBar>
      )}
    </>
  );
}

function Avatar({ u }: { u: Pick<UserRow, 'name' | 'email' | 'avatarUrl'> }) {
  return u.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={u.avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
  ) : (
    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-ink/15 font-mono text-xs">{(u.name ?? u.email ?? '?').slice(0, 1).toUpperCase()}</span>
  );
}

function UserDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'user', id], queryFn: () => api<UserDetail>(`/admin/users/${id}`) });
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'activity' | 'events' | 'orders'>('activity');
  const [granting, setGranting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [openInvite, setOpenInvite] = useState<string | null>(null);

  async function signOutEverywhere() {
    if (!(await confirmDialog('Sign this person out on every device? Open tabs stop working within 15 minutes.'))) return;
    try {
      await api(`/admin/users/${id}/sign-out`, { method: 'POST' });
      toast.success('Signed out everywhere');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not sign out');
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);

  async function update(body: { role?: UserRole; disabled?: boolean; note?: string | null }, msg: string) {
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
  const owner = !me?.adminScopes?.length || me.adminScopes.includes('owner');

  async function viewAs() {
    if (!(await confirmDialog('View the app as this customer? It is read-only and ends after 15 minutes or when you exit.'))) return;
    try {
      const r = await api<{ redirect: string }>(`/admin/users/${id}/impersonate`, { method: 'POST' });
      location.href = r.redirect;
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not start');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="User details">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[var(--color-overlay)]" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl animate-[sheet-up_0.2s_var(--ease-out-quint)] flex-col overflow-hidden border-l border-ink/10 bg-ivory sm:animate-none">
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-soft">User details</h2>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center border border-ink/15 transition-colors hover:bg-ink/[0.05]" aria-label="Close">
            <X className="size-4" />
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
                <p className="flex items-center gap-2 text-xl">
                  {u.name ?? 'No name'}
                  <button type="button" aria-label="Edit profile" data-tip="Edit profile" onClick={() => setEditing(true)} className="grid size-7 place-items-center text-ink-soft hover:bg-ink/[0.05] hover:text-ink">
                    <Pencil className="size-3.5" />
                  </button>
                </p>
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
            <dl className="mx-5 grid grid-cols-2 border-l border-t border-ink/10 sm:grid-cols-4">
              {[
                ['Joined', shortDate(u.createdAt)],
                ['Last active', ago(u.lastSeenAt)],
                ['Invitations', num(data.events.length)],
                ['Total spent', inr(data.spentPaise)],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-r border-ink/10 px-3 py-2.5">
                  <dt className="font-mono text-[0.5625rem] uppercase tracking-[0.08em] text-ink-soft">{k}</dt>
                  <dd className="mt-1 text-sm tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>

            <TimePanel time={data.time} daily={data.daily} />
            {owner && u.role !== 'admin' && <PrivacyBox userId={id} label={u.name ?? u.email ?? 'this person'} erased={Boolean(u.email?.endsWith('@erased.invalid'))} onErased={() => void qc.invalidateQueries({ queryKey: ['admin'] })} />}
            <NoteBox key={u.note ?? ''} note={u.note} busy={busy} onSave={(note) => void update({ note }, note ? 'Note saved' : 'Note removed')} />

            <div className="m-5 flex flex-wrap items-center gap-2 border border-ink/10 p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="size-4 text-ink-soft" /> Role
                <Select
                  value={u.role}
                  disabled={busy || self}
                  onChange={(e) => void update({ role: e.target.value as UserRole }, `Role changed to ${e.target.value}`)}
                  className="h-9 w-auto min-w-32 text-sm"
                >
                  <option value="user">Customer</option>
                  <option value="designer">Designer</option>
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </Select>
              </label>
              <span className="flex-1" />
              {u.role !== 'admin' && !u.disabledAt && (
                <Button size="sm" variant="line" onClick={() => void viewAs()} title="Read-only, 15 minutes">
                  <Eye className="size-4" /> View as
                </Button>
              )}
              <Button size="sm" variant="line" disabled={self} onClick={() => void signOutEverywhere()}>
                <LogOut className="size-4" /> Sign out everywhere
              </Button>
              <Button size="sm" variant="line" disabled={!data.events.length} onClick={() => setGranting(true)}>
                <Gift className="size-4" /> Give a plan
              </Button>
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
                  onClick={async () => {
                    if ((await confirmDialog(`Disable ${u.name ?? u.email}? They will be signed out everywhere and cannot sign in until you enable them again.`))) void update({ disabled: true }, 'Account disabled');
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
                  <ol className="relative ml-2 border-l border-ink/10">
                    {data.activity.map((a, i) => (
                      <li key={i} className="mb-3 ml-4">
                        <span className={clsx('absolute -left-[4.5px] mt-1.5 size-2 rounded-full', a.name === 'purchase' ? 'bg-leaf' : a.name === 'signup' ? 'bg-gold' : 'bg-ink-soft/50')} />
                        <p className="text-sm">{EVENT_LABELS[a.name] ?? a.name}</p>
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
                  <ul className="divide-y divide-ink/10">
                    {data.events.map((e) => (
                      <li key={e.id} onClick={() => setOpenInvite(e.id)} className="flex cursor-pointer items-center justify-between gap-3 py-2.5 text-sm hover:bg-ink/[0.02]">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{e.title}</p>
                          <p className="truncate text-xs text-ink-soft">
                            {e.type} · {e.templateId} · {shortDate(e.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-ink-soft">{num(e.viewCount)} views</span>
                          {e.suspendedAt ? <Badge tone="bad">Taken down</Badge> : <Badge tone={e.status === 'published' ? 'good' : 'neutral'}>{e.status}</Badge>}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-soft">No invitations yet.</p>
                ))}
              {tab === 'orders' &&
                (data.orders.length ? (
                  <ul className="divide-y divide-ink/10">
                    {data.orders.map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{PRODUCTS[o.productCode as ProductCode]?.name ?? o.productCode}</p>
                          <p className="text-xs text-ink-soft">
                            {dateTime(o.paidAt ?? o.createdAt)}
                            {o.couponCode && ` · ${o.couponCode}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="font-medium tabular-nums">{inr(o.amountPaise)}</span>
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
      {editing && u && (
        <ProfileDialog
          id={id}
          initial={{ name: u.name, locale: u.locale === 'hi' ? 'hi' : 'en', marketingEmails: u.marketingEmails }}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            void qc.invalidateQueries({ queryKey: ['admin', 'user', id] });
            void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
          }}
        />
      )}
      {openInvite && <InvitationDrawer id={openInvite} onClose={() => setOpenInvite(null)} />}
      {granting && data && (
        <GrantDialog
          userId={id}
          events={data.events}
          onClose={() => setGranting(false)}
          onDone={(next) => {
            qc.setQueryData(['admin', 'user', id], next);
            setGranting(false);
          }}
        />
      )}
    </div>
  );
}

/** Engaged time (tab open and in use) for this person, with the last 30 days drawn as bars. */
function TimePanel({ time, daily }: { time: UserDetail['time']; daily: UserDetail['daily'] }) {
  const days = useMemo(() => {
    const by = new Map(daily.map((d) => [d.day, d.seconds]));
    return Array.from({ length: 30 }, (_, i) => {
      const day = new Date(Date.now() - (29 - i) * 86400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      return { day, value: Math.round(((by.get(day) ?? 0) / 60) * 10) / 10 };
    });
  }, [daily]);
  const cells: Array<[string, string]> = [
    ['Today', duration(time.today / 60)],
    ['7 days', duration(time.week / 60)],
    ['30 days', duration(time.month / 60)],
    ['12 months', duration(time.year / 60)],
  ];
  return (
    <div className="mx-5 mt-5 border border-ink/10">
      <div className="flex items-baseline justify-between gap-3 border-b border-ink/10 px-3 py-2">
        <p className="text-sm font-medium">Time in the app</p>
        <p className="font-mono text-[0.6875rem] text-ink-soft">
          {num(time.activeDays30)} of 30 days active · {duration(time.allTime / 60)} all time
        </p>
      </div>
      <dl className="grid grid-cols-4 border-b border-ink/10">
        {cells.map(([k, v]) => (
          <div key={k} className="border-r border-ink/10 px-3 py-2 last:border-0">
            <dt className="font-mono text-[0.5625rem] uppercase tracking-[0.08em] text-ink-soft">{k}</dt>
            <dd className="mt-1 text-sm tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="px-2 pb-1 pt-2">
        <TrendChart kind="bar" label="Minutes" data={days} format={(v) => duration(v)} />
      </div>
    </div>
  );
}

function NoteBox({ note, busy, onSave }: { note: string | null; busy: boolean; onSave: (note: string | null) => void }) {
  const [value, setValue] = useState(note ?? '');
  const dirty = value.trim() !== (note ?? '');
  return (
    <div className="mx-5 mt-4">
      <Field label="Private note (admins only)">
        {(fid) => <Textarea id={fid} rows={2} maxLength={2000} value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. Refunded on WhatsApp, wedding moved to March" />}
      </Field>
      {dirty && (
        <div className="mt-2 flex justify-end gap-2">
          <Button size="sm" variant="quiet" onClick={() => setValue(note ?? '')}>
            Cancel
          </Button>
          <Button size="sm" variant="solid" loading={busy} onClick={() => onSave(value.trim() || null)}>
            Save note
          </Button>
        </div>
      )}
    </div>
  );
}

/** Comp a plan onto one of the user's invitations (support, goodwill). No order or revenue is created. */
function GrantDialog({ userId, events, onClose, onDone }: { userId: string; events: UserDetail['events']; onClose: () => void; onDone: (d: UserDetail) => void }) {
  const [eventId, setEventId] = useState(events[0]?.id ?? '');
  const [productCode, setProductCode] = useState<ProductCode>('website');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const next = await api<UserDetail>(`/admin/users/${userId}/grant`, { method: 'POST', json: { eventId, productCode, reason } });
      toast.success(`${PRODUCTS[productCode].name} given`);
      onDone(next);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not give the plan');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onClose={onClose} title="Give a plan for free">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Invitation">
          {(fid) => (
            <Select id={fid} value={eventId} onChange={(e) => setEventId(e.target.value)} required>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Plan">
          {(fid) => (
            <Select id={fid} value={productCode} onChange={(e) => setProductCode(e.target.value as ProductCode)}>
              {PRODUCT_CODES.map((c) => (
                <option key={c} value={c}>
                  {PRODUCTS[c].name} ({inr(PRODUCTS[c].pricePaise)})
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Reason" hint="Saved in the admin log">
          {(fid, d) => <Textarea id={fid} aria-describedby={d} rows={2} minLength={3} maxLength={200} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Render failed twice, goodwill" />}
        </Field>
        <p className="border border-dashed border-ink/15 px-3 py-2 text-[0.8125rem] text-ink-soft">Unlocks the plan on that invitation right away. No payment or order is recorded, so revenue is not affected.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="line" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="solid" size="sm" loading={busy}>
            Give plan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** DPDP Act requests: log them, give a copy of the data, or erase the account (owners only). */
function PrivacyBox({ userId, label, erased, onErased }: { userId: string; label: string; erased: boolean; onErased: () => void }) {
  const [erasing, setErasing] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  async function exportData() {
    setBusy(true);
    try {
      await api(`/admin/users/${userId}/data-requests`, { method: 'POST', json: { kind: 'export', note: 'Exported from the console' } });
      await downloadCsv(`/admin/users/${userId}/data-export`, `noyta-data-${userId.slice(0, 8)}.json`);
      toast.success('Data file downloaded. Send it to the person from your support email.');
    } catch {
      toast.error('Export failed');
    } finally {
      setBusy(false);
    }
  }

  async function erase() {
    setBusy(true);
    try {
      await api(`/admin/users/${userId}/data-requests`, { method: 'POST', json: { kind: 'erasure', note: 'Erased from the console' } });
      const r = await api<{ invitationsDeleted: number; invitationsBlanked: number; files: number }>(`/admin/users/${userId}/erase`, { method: 'POST', json: { confirm: 'DELETE' } });
      toast.success(`Erased: ${r.invitationsDeleted} invitations deleted, ${r.invitationsBlanked} blanked (paid), ${r.files} files.`);
      setErasing(false);
      onErased();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not erase');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-5 mt-4 flex flex-wrap items-center gap-2 border border-ink/10 p-3">
      <p className="mr-auto text-sm">
        Privacy <span className="block text-xs text-ink-soft">Data-protection requests (DPDP Act)</span>
      </p>
      <Button size="sm" variant="line" loading={busy && !erasing} onClick={() => void exportData()}>
        <FileDown className="size-4" /> Copy of data
      </Button>
      {!erased && (
        <Button size="sm" variant="line" className="hover:border-sindoor hover:text-sindoor" onClick={() => setErasing(true)}>
          <Trash2 className="size-4" /> Erase
        </Button>
      )}
      {erasing && (
        <Dialog open onClose={() => setErasing(false)} title={`Erase ${label}?`}>
          <div className="flex flex-col gap-4 text-sm">
            <p>This permanently deletes their invitations, guest lists, RSVPs, photos, files and activity, and scrubs their name, email and phone. They are signed out and cannot sign in again.</p>
            <p className="border border-dashed border-ink/15 px-3 py-2 text-ink-soft">Paid orders stay (amount and date only) because GST rules require keeping invoices; those invitations are blanked instead of deleted. This cannot be undone.</p>
            <Field label="Type DELETE to confirm">{(id) => <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />}</Field>
            <div className="flex justify-end gap-2">
              <Button variant="line" size="sm" onClick={() => setErasing(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" disabled={typed !== 'DELETE'} loading={busy} onClick={() => void erase()}>
                Erase permanently
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

/** Name, email language and offer emails. Email address and sign-in methods stay with the person. */
function ProfileDialog({ id, initial, onClose, onSaved }: { id: string; initial: { name: string | null; locale: 'en' | 'hi'; marketingEmails: boolean }; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial.name ?? '');
  const [locale, setLocale] = useState<'en' | 'hi'>(initial.locale);
  const [marketing, setMarketing] = useState(initial.marketingEmails);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/admin/users/${id}/profile`, { method: 'PATCH', json: { name: name.trim() || null, locale, marketingEmails: marketing } });
      toast.success('Profile saved');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onClose={onClose} title="Edit profile">
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <Field label="Name">{(fid) => <Input id={fid} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />}</Field>
        <Field label="Email language">
          {(fid) => (
            <Select id={fid} value={locale} onChange={(e) => setLocale(e.target.value as 'en' | 'hi')}>
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </Select>
          )}
        </Field>
        <label className="flex items-center justify-between gap-3 border border-ink/10 p-3 text-sm">
          <span>
            Offer emails
            <span className="block text-xs text-ink-soft">Only turn on if the person asked for it (consent)</span>
          </span>
          <input type="checkbox" className="size-4 accent-[var(--color-ink)]" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
        </label>
        <p className="text-xs text-ink-soft">The email address and Google sign-in can only be changed by the person, so nobody can take over an account from here.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="line" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="solid" size="sm" loading={busy}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
