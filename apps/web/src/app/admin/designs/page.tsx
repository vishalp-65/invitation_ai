'use client';

import { getSiteDesign, SITE_DESIGNS } from '@cardai/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Clapperboard, Eye, Film, Globe, Play, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DesignPoster } from '@/components/invite/design-poster';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { googleFontsHref } from '@/features/site/theme';
import { Badge, BulkBar, Empty, num, PageHeader, Segmented, Skeleton, StatCard, Toggle } from '@/features/admin/ui';
import { api, ApiError } from '@/lib/api';

interface DesignRow {
  id: string;
  name: string;
  blurb: string;
  region: string;
  faith: string | null;
  isNew: boolean;
  night: boolean;
  opening: string;
  music: string;
  hidden: boolean;
  hideShowcase: boolean;
  featured: boolean;
  usage: { events: number; published: number; recent: number; films: number };
}
type Patch = { hidden?: boolean; hideShowcase?: boolean; featured?: boolean };
type Filter = 'all' | 'live' | 'showcase-off' | 'hidden';

const KEY = ['admin', 'designs'];

/**
 * The cinematic design packs that power both the 9:16 video invite and the invitation website.
 * These are also the video demos and website demos on the landing page. Packs live in code, so
 * "delete" hides them (restorable); invitations already made with a pack keep working.
 */
export default function AdminDesignsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: () => api<DesignRow[]>('/admin/designs') });
  const [filter, setFilter] = useState<Filter>('all');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fonts = useMemo(() => googleFontsHref(SITE_DESIGNS.flatMap((d) => [d.fonts.script, d.fonts.body])), []);

  async function update(ids: string[], patch: Patch, ok: string) {
    setBusy(true);
    // Optimistic: flip the switches now, roll back if the API says no.
    const before = qc.getQueryData<DesignRow[]>(KEY);
    qc.setQueryData<DesignRow[]>(KEY, (rows) => rows?.map((r) => (ids.includes(r.id) ? { ...r, ...patch } : r)));
    try {
      const rows = await api<DesignRow[]>('/admin/designs', { method: 'PATCH', json: { ids, ...patch } });
      qc.setQueryData(KEY, rows);
      void qc.invalidateQueries({ queryKey: ['offers'] });
      toast.success(ok);
      setPicked(new Set());
    } catch (e) {
      qc.setQueryData(KEY, before);
      toast.error(e instanceof ApiError ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  const rows = data ?? [];
  const shown = rows.filter((d) => (filter === 'live' ? !d.hidden && !d.hideShowcase : filter === 'hidden' ? d.hidden : filter === 'showcase-off' ? d.hideShowcase && !d.hidden : true));
  const counts = {
    all: rows.length,
    live: rows.filter((d) => !d.hidden && !d.hideShowcase).length,
    'showcase-off': rows.filter((d) => d.hideShowcase && !d.hidden).length,
    hidden: rows.filter((d) => d.hidden).length,
  };
  const ids = [...picked];
  const previewDesign = preview ? getSiteDesign(preview) : null;

  return (
    <>
      <link rel="stylesheet" href={fonts} precedence="default" />
      <PageHeader
        title="Video & web designs"
        description="The painted design packs behind every video invite and invitation website, and the demos on the landing page. Hide a pack, take it off the landing page, or feature it first. Changes go live within a minute."
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/5]" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Design packs" icon={<Clapperboard />} value={num(rows.length)} hint={`${counts.hidden} hidden from customers`} />
            <StatCard label="Invitations using one" icon={<Globe />} value={num(rows.reduce((s, d) => s + d.usage.events, 0))} hint={`${num(rows.reduce((s, d) => s + d.usage.published, 0))} published sites`} />
            <StatCard label="Videos made" icon={<Film />} value={num(rows.reduce((s, d) => s + d.usage.films, 0))} hint="Finished 9:16 films" />
            <StatCard label="On the landing page" icon={<Eye />} value={num(counts.live)} hint={`${rows.filter((d) => d.featured).length} featured first`} />
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Segmented
              value={filter}
              onChange={setFilter}
              label="Filter"
              options={[
                { value: 'all', label: 'All', count: counts.all },
                { value: 'live', label: 'Live everywhere', count: counts.live },
                { value: 'showcase-off', label: 'Off landing page', count: counts['showcase-off'] },
                { value: 'hidden', label: 'Hidden', count: counts.hidden },
              ]}
            />
            <button type="button" className="text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline" onClick={() => setPicked(picked.size === shown.length ? new Set() : new Set(shown.map((d) => d.id)))}>
              {picked.size && picked.size === shown.length ? 'Clear selection' : 'Select all shown'}
            </button>
          </div>

          {!shown.length ? (
            <Empty icon={<Clapperboard />} title="Nothing here">
              No design packs match this filter.
            </Empty>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((d) => {
                const design = getSiteDesign(d.id);
                const on = picked.has(d.id);
                return (
                  <li key={d.id} className={clsx('flex flex-col border bg-ink/[0.015] transition-colors', on ? 'border-ink' : 'border-ink/10', d.hidden && 'opacity-70')}>
                    <div className="relative aspect-video overflow-hidden border-b border-ink/10">
                      {design && <DesignPoster design={design} still />}
                      <label className="absolute left-2 top-2 grid size-8 cursor-pointer place-items-center bg-ivory/90">
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--color-ink)]"
                          checked={on}
                          aria-label={`Select ${d.name}`}
                          onChange={() => setPicked((s) => {
                            const n = new Set(s);
                            if (n.has(d.id)) n.delete(d.id);
                            else n.add(d.id);
                            return n;
                          })}
                        />
                      </label>
                      <div className="absolute right-2 top-2 flex gap-1">
                        {d.featured && <Badge tone="info">Featured</Badge>}
                        {d.hidden ? <Badge tone="bad">Hidden</Badge> : d.hideShowcase ? <Badge tone="warn">Off landing</Badge> : <Badge tone="good">Live</Badge>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreview(d.id)}
                        className="absolute bottom-2 right-2 inline-flex h-8 items-center gap-1.5 bg-ivory/90 px-3 text-xs text-ink transition-colors hover:bg-ivory"
                      >
                        <Play className="size-3.5" /> Preview
                      </button>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div>
                        <p className="flex items-center gap-2 font-medium">
                          {d.name}
                          {d.isNew && <Badge>New</Badge>}
                        </p>
                        <p className="text-xs text-ink-soft">
                          {d.region} · {d.night ? 'Night' : 'Day'} scene · {d.opening} opening · {d.music}
                        </p>
                      </div>
                      <dl className="grid grid-cols-3 gap-2 text-center">
                        <Use label="Invitations" value={d.usage.events} />
                        <Use label="Published" value={d.usage.published} />
                        <Use label="Videos" value={d.usage.films} />
                      </dl>
                      <div className="mt-auto flex flex-col gap-2 border-t border-ink/10 pt-3 text-sm">
                        <Row label="Customers can choose it">
                          <Toggle disabled={busy} checked={!d.hidden} label="Customers can choose it" onChange={(v) => void update([d.id], { hidden: !v }, v ? `${d.name} is back in the picker` : `${d.name} hidden from customers`)} />
                        </Row>
                        <Row label="Show on landing page demos">
                          <Toggle disabled={busy || d.hidden} checked={!d.hidden && !d.hideShowcase} label="Show on landing page demos" onChange={(v) => void update([d.id], { hideShowcase: !v }, v ? 'Back on the landing page' : 'Removed from the landing page')} />
                        </Row>
                        <Row label="Feature first">
                          <Toggle disabled={busy} checked={d.featured} label="Feature first" onChange={(v) => void update([d.id], { featured: v }, v ? 'Featured' : 'No longer featured')} />
                        </Row>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {ids.length > 0 && (
        <BulkBar count={ids.length} onClear={() => setPicked(new Set())}>
          <Button size="sm" variant="line" disabled={busy} onClick={() => void update(ids, { hidden: false, hideShowcase: false }, `${ids.length} restored`)}>
            Restore
          </Button>
          <Button size="sm" variant="line" disabled={busy} onClick={() => void update(ids, { hideShowcase: true }, `${ids.length} removed from the landing page`)}>
            Remove from landing
          </Button>
          <Button size="sm" variant="line" disabled={busy} onClick={() => void update(ids, { featured: true }, `${ids.length} featured`)}>
            <Star className="size-3.5" /> Feature
          </Button>
          <Button
            size="sm"
            variant="solid"
            disabled={busy}
            onClick={() => confirm(`Hide ${ids.length} design pack(s) from customers and the landing page? Invitations already using them keep working.`) && void update(ids, { hidden: true }, `${ids.length} hidden`)}
          >
            Hide
          </Button>
        </BulkBar>
      )}

      {previewDesign && (
        <Dialog open onClose={() => setPreview(null)} title={previewDesign.name} size="lg" focusField={false}>
          <div className="relative aspect-video overflow-hidden border border-ink/10">
            <DesignPoster design={previewDesign} />
          </div>
          <p className="mt-3 text-sm text-ink-soft">{previewDesign.blurb}. The same scene drives the 9:16 video and the invitation website.</p>
        </Dialog>
      )}
    </>
  );
}

function Use({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-ink/10 py-1.5">
      <dd className="font-display text-lg tabular-nums leading-none">{num(value)}</dd>
      <dt className="mt-1 font-mono text-[0.5625rem] uppercase tracking-[0.08em] text-ink-soft">{label}</dt>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-soft">{label}</span>
      {children}
    </div>
  );
}
