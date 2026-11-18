'use client';

import { EVENT_TYPE_IDS, getEventType } from '@cardai/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Crown, Eye, EyeOff, Flame, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Chip, Field, Input, controlClass } from '@/components/ui/field';
import type { TemplateStat } from '@/features/admin/types';
import { TemplateThumb } from '@/features/admin/template-thumb';
import { Badge, compactINR, Empty, num, PageHeader, RangePicker, Segmented, Skeleton, useRange } from '@/features/admin/ui';
import { api, ApiError } from '@/lib/api';

type Tab = 'all' | 'trending' | 'popular' | 'catalog' | 'featured' | 'hidden';
type Sort = 'uses' | 'views' | 'revenue' | 'trend' | 'name';

export default function AdminTemplatesPage() {
  const [range] = useRange();
  const qc = useQueryClient();
  const key = ['admin', 'catalog', range];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => api<{ items: TemplateStat[] }>(`/admin/catalog?range=${range}`), select: (d) => d.items });
  const [tab, setTab] = useState<Tab>('all');
  const [sort, setSort] = useState<Sort>('uses');
  const [q, setQ] = useState('');
  const [howTo, setHowTo] = useState(false);
  const [editing, setEditing] = useState<TemplateStat | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TemplateStat | null>(null);

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api(`/admin/catalog/${id}`, { method: 'PATCH', json: body }),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<{ items: TemplateStat[] }>(key);
      qc.setQueryData<{ items: TemplateStat[] }>(key, (cur) => (cur ? { items: cur.items.map((t) => (t.id === id ? { ...t, ...body } : t)) } : cur));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error(e instanceof ApiError ? e.message : 'Could not update the template');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });

  const counts = useMemo(() => {
    const all = data ?? [];
    return {
      all: all.filter((t) => !t.hidden).length,
      trending: all.filter((t) => !t.hidden && t.last7 > 0).length,
      popular: all.filter((t) => !t.hidden && t.invitations > 0).length,
      catalog: all.filter((t) => t.source === 'catalog').length,
      featured: all.filter((t) => t.featured).length,
      hidden: all.filter((t) => t.hidden).length,
    };
  }, [data]);

  const shown = useMemo(() => {
    let list = data ?? [];
    if (tab === 'hidden') list = list.filter((t) => t.hidden);
    else if (tab === 'catalog') list = list.filter((t) => t.source === 'catalog');
    else if (tab === 'featured') list = list.filter((t) => t.featured);
    else list = list.filter((t) => !t.hidden);
    if (tab === 'trending') list = list.filter((t) => t.last7 > 0);
    if (tab === 'popular') list = list.filter((t) => t.invitations > 0);
    const needle = q.trim().toLowerCase();
    if (needle) list = list.filter((t) => `${t.name} ${t.id} ${t.family ?? ''} ${t.tags.join(' ')}`.toLowerCase().includes(needle));
    const s: Sort = tab === 'trending' ? 'trend' : tab === 'popular' ? 'uses' : sort;
    const by: Record<Sort, (a: TemplateStat, b: TemplateStat) => number> = {
      uses: (a, b) => b.invitations - a.invitations || b.views - a.views,
      views: (a, b) => b.views - a.views,
      revenue: (a, b) => b.revenuePaise - a.revenuePaise,
      trend: (a, b) => b.trendScore - a.trendScore,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...list].sort(by[s]);
  }, [data, tab, q, sort]);

  async function remove(t: TemplateStat, permanent: boolean) {
    try {
      await api(`/admin/catalog/${t.id}${permanent ? '?permanent=true' : ''}`, { method: 'DELETE' });
      toast.success(permanent ? `Deleted “${t.name}”` : `“${t.name}” is hidden from customers`, permanent ? undefined : { action: { label: 'Undo', onClick: () => patch.mutate({ id: t.id, body: { hidden: false } }) } });
      setConfirmDelete(null);
      void qc.invalidateQueries({ queryKey: ['admin', 'catalog'] });
      void qc.invalidateQueries({ queryKey: ['templates'] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not delete');
    }
  }

  return (
    <>
      <PageHeader
        title="Templates"
        description="See what customers love, feature or hide any template, and publish new ones designed in the editor."
        actions={
          <>
            <RangePicker />
            <Button variant="solid" size="sm" onClick={() => setHowTo(true)}>
              <Plus className="size-4" /> Add template
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
        <Segmented
          value={tab}
          onChange={setTab}
          label="Filter templates"
          options={[
            { value: 'all', label: 'Live', count: counts.all },
            { value: 'trending', label: 'Trending', count: counts.trending },
            { value: 'popular', label: 'Popular', count: counts.popular },
            { value: 'featured', label: 'Featured', count: counts.featured },
            { value: 'catalog', label: 'Added by admins', count: counts.catalog },
            { value: 'hidden', label: 'Hidden', count: counts.hidden },
          ]}
        />
        <div className="flex min-w-0 flex-1 gap-2 xl:justify-end">
          <label className="relative min-w-[180px] flex-1 xl:max-w-xs">
            <span className="sr-only">Search templates</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, tag, family…" className={`${controlClass} h-10 w-full pl-9 pr-3 text-sm`} />
          </label>
          {tab !== 'trending' && tab !== 'popular' && (
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by" className={`${controlClass} select h-10 pl-3 pr-9 text-sm font-medium`}>
              <option value="uses">Most used</option>
              <option value="views">Most viewed</option>
              <option value="revenue">Most revenue</option>
              <option value="trend">Trending</option>
              <option value="name">Name</option>
            </select>
          )}
        </div>
      </div>

      {tab === 'trending' && <p className="mb-4 text-sm text-ink-soft">Ranked by picks and new invitations in the last 7 days compared with the 7 days before.</p>}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="aspect-[9/14]" />
          ))}
        </div>
      ) : !shown.length ? (
        <Empty title={tab === 'hidden' ? 'No hidden templates' : tab === 'catalog' ? 'No templates added from the editor yet' : 'Nothing matches'}>
          {tab === 'catalog' ? 'Use “Add template” to see how to publish one.' : tab === 'trending' ? 'Trending needs a few picks in the last 7 days.' : 'Try another filter or search.'}
        </Empty>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((t, i) => (
            <li key={t.id} className={clsx('group flex flex-col overflow-hidden border border-ink/10 bg-ink/[0.015] transition-colors hover:border-ink/25', t.hidden && 'opacity-70')}>
              <div className="relative p-2 pb-0">
                <TemplateThumb id={t.id} name={t.name} coverPage={t.coverPage} />
                <div className="absolute left-3.5 top-3.5 flex flex-wrap gap-1">
                  {(tab === 'trending' || tab === 'popular') && <span className="grid size-6 place-items-center bg-ivory font-mono text-[0.6875rem]">{String(i + 1).padStart(2, '0')}</span>}
                  {t.featured && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.08em] bg-ink text-ivory">
                      <Star className="size-2.5" /> Featured
                    </span>
                  )}
                  {t.hidden && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.08em] bg-ivory/90 text-ink-soft">Hidden</span>}
                </div>
                {t.trend >= 30 && t.last7 >= 2 && (
                  <span className="absolute right-3.5 top-3.5 inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.08em] bg-gold text-ivory">
                    <Flame className="size-2.5" /> +{t.trend}%
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-[0.9375rem]" title={t.name}>
                    {t.name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {t.premium ? (
                      <Badge tone="warn">
                        <Crown className="size-3" /> Premium
                      </Badge>
                    ) : (
                      <Badge>Free</Badge>
                    )}
                    {t.source === 'catalog' && <Badge tone="info">Admin</Badge>}
                    {t.source === 'marketplace' && <Badge tone="info">Marketplace</Badge>}
                  </div>
                </div>
                <dl className="grid grid-cols-3 border-l border-t border-ink/10 text-center">
                  <div className="border-b border-r border-ink/10 px-1 py-1.5">
                    <dt className="font-mono text-[0.5625rem] uppercase tracking-[0.06em] text-ink-soft">Uses</dt>
                    <dd className="text-sm tabular-nums">{num(t.invitations)}</dd>
                  </div>
                  <div className="border-b border-r border-ink/10 px-1 py-1.5">
                    <dt className="font-mono text-[0.5625rem] uppercase tracking-[0.06em] text-ink-soft">Views</dt>
                    <dd className="text-sm tabular-nums">{num(t.views)}</dd>
                  </div>
                  <div className="border-b border-r border-ink/10 px-1 py-1.5">
                    <dt className="font-mono text-[0.5625rem] uppercase tracking-[0.06em] text-ink-soft">Revenue</dt>
                    <dd className="text-sm tabular-nums">{compactINR(t.revenuePaise)}</dd>
                  </div>
                </dl>
                <div className="mt-auto flex items-center gap-1 pt-1">
                  <IconBtn label={t.featured ? 'Remove from featured' : 'Feature at the top of the gallery'} active={t.featured} onClick={() => patch.mutate({ id: t.id, body: { featured: !t.featured } })}>
                    <Star className="size-4" />
                  </IconBtn>
                  <IconBtn label={t.premium ? 'Make free' : 'Make premium'} active={t.premium} onClick={() => patch.mutate({ id: t.id, body: { premium: !t.premium } })}>
                    <Crown className="size-4" />
                  </IconBtn>
                  {t.source === 'catalog' && (
                    <IconBtn label="Edit name & tags" onClick={() => setEditing(t)}>
                      <Pencil className="size-4" />
                    </IconBtn>
                  )}
                  <span className="flex-1" />
                  {t.hidden ? (
                    <Button size="sm" variant="line" className="h-8 px-3" onClick={() => patch.mutate({ id: t.id, body: { hidden: false } })}>
                      <Eye className="size-4" /> Restore
                    </Button>
                  ) : (
                    <IconBtn label="Delete (hide from customers)" danger onClick={() => setConfirmDelete(t)}>
                      <Trash2 className="size-4" />
                    </IconBtn>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={howTo} onClose={() => setHowTo(false)} title="Add a template">
        <ol className="flex flex-col gap-4 text-[0.95rem]">
          <Step n={1} title="Start from any design">Create an invitation (or open an existing one) and pick the template closest to what you want.</Step>
          <Step n={2} title="Design it in the editor">Change layers, colours, fonts, ornaments and pages. Text linked to invitation details stays linked, so customers’ names and dates fill in automatically.</Step>
          <Step n={3} title="Publish to catalogue">
            In the editor, open <strong>More → Publish to catalogue</strong>. Choose a name, the occasions it suits, tags and free or premium. It goes live for every customer straight away.
          </Step>
        </ol>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <ButtonLink href="/dashboard" variant="line" size="sm">
            My invitations
          </ButtonLink>
          <ButtonLink href="/create" variant="solid" size="sm">
            Start a new design
          </ButtonLink>
        </div>
      </Dialog>

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete template?">
        {confirmDelete && (
          <div className="flex flex-col gap-4">
            <p>
              <strong>{confirmDelete.name}</strong> will disappear from the gallery and the editor for customers.
              {confirmDelete.invitations > 0 && ` The ${num(confirmDelete.invitations)} invitation(s) already made with it keep working.`} You can restore it any time from the Hidden tab.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              {confirmDelete.source === 'catalog' && confirmDelete.invitations === 0 && (
                <Button variant="danger" size="sm" onClick={() => void remove(confirmDelete, true)}>
                  Delete permanently
                </Button>
              )}
              <Button variant="line" size="sm" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button variant="brand" size="sm" onClick={() => void remove(confirmDelete, false)}>
                <EyeOff className="size-4" /> Hide from customers
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {editing && <EditCatalogDialog t={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-7 shrink-0 place-items-center border border-ink/20 font-mono text-xs">{String(n).padStart(2, '0')}</span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-ink-soft">{children}</p>
      </div>
    </li>
  );
}

function IconBtn({ label, onClick, children, active, danger }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      data-tip={label}
      className={clsx(
        'grid size-8 place-items-center transition-colors',
        danger ? 'text-ink-soft hover:bg-sindoor/10 hover:text-sindoor' : 'text-ink-soft hover:bg-ink/[0.04] hover:text-ink',
        active && 'bg-ink/[0.08] !text-ink',
      )}
    >
      {children}
    </button>
  );
}

function EditCatalogDialog({ t, onClose }: { t: TemplateStat; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(t.name);
  const [types, setTypes] = useState<string[]>(t.eventTypes === 'all' ? [] : t.eventTypes);
  const [tags, setTags] = useState(t.tags.join(', '));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api(`/admin/catalog/${t.id}/details`, {
        method: 'PUT',
        json: { name: name.trim(), eventTypes: types, tags: tags.split(',').map((s) => s.trim()).filter(Boolean) },
      });
      toast.success('Template updated');
      void qc.invalidateQueries({ queryKey: ['admin', 'catalog'] });
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Edit template">
      <div className="flex flex-col gap-4">
        <Field label="Name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />}</Field>
        <div>
          <p className="mb-2 text-[0.95rem] font-medium">Occasions</p>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPE_IDS.map((id) => (
              <Chip key={id} selected={types.includes(id)} onClick={() => setTypes((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))} className="h-9 text-sm">
                {getEventType(id).label}
              </Chip>
            ))}
          </div>
        </div>
        <Field label="Tags" hint="Comma separated, used by search (e.g. royal, floral, maroon)">
          {(id, d) => <Input id={id} aria-describedby={d} value={tags} onChange={(e) => setTags(e.target.value)} />}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="line" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="solid" size="sm" loading={busy} disabled={!name.trim() || !types.length} onClick={() => void save()}>
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

