'use client';

import {
  formatINR,
  LAYOUTS,
  MOTIFS,
  PATTERNS,
  type EventTypeId,
  type LayoutId,
  type MotifId,
  type PatternId,
  type TemplateDefinition,
  type Theme,
} from '@cardai/shared';
import { sampleInviteProps } from '@cardai/templates';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { InvitePlayer } from '@/components/invite/lazy-player';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { api, ApiError } from '@/lib/api';

interface Profile {
  status: 'pending' | 'approved' | 'rejected';
  displayName: string;
  revenueSharePct: number;
}
interface MyTemplate {
  id: string;
  templateKey: string;
  name: string;
  status: string;
  salesCount: number;
  reviewNote: string | null;
}

const DEFAULT_THEME: Theme = {
  palette: { background: '#5B0F1B', backgroundAlt: '#3D0811', surface: '#FFF6E5', primary: '#E9B949', accent: '#F4D58D', text: '#FFF6E5', muted: '#E8C7A0' },
  motif: 'shree',
  pattern: 'mandala',
  ornamentOpacity: 0.18,
};

export default function DesignerPage() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ['designer', 'me'], queryFn: () => api<Profile | null>('/designers/me') });
  const { data: mine } = useQuery({ queryKey: ['designer', 'templates'], queryFn: () => api<MyTemplate[]>('/designer/templates'), enabled: profile?.status === 'approved' });
  const { data: earnings } = useQuery({
    queryKey: ['designer', 'earnings'],
    queryFn: () => api<{ pendingPaise: number; paidPaise: number }>('/designer/earnings'),
    enabled: profile?.status === 'approved',
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-5xl">Designer studio</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">
          Publish invitation themes and earn a share of every paid invitation that uses them.
        </p>
        {isLoading && <p className="mt-8 text-ink-soft">Loading…</p>}
        {!isLoading && !profile && <ApplyForm onDone={() => qc.invalidateQueries({ queryKey: ['designer', 'me'] })} />}
        {profile?.status === 'pending' && (
          <p className="mt-8 glass-light rounded-[var(--radius-card)] p-6">Thanks, {profile.displayName}. Your profile is being reviewed — usually within two days.</p>
        )}
        {profile?.status === 'rejected' && <p className="mt-8 glass-light rounded-[var(--radius-card)] p-6">Your application was not approved. Contact support for details.</p>}
        {profile?.status === 'approved' && (
          <>
            <div className="mt-8 flex flex-wrap gap-8">
              <p>
                <span className="font-display block text-4xl">{formatINR(earnings?.pendingPaise ?? 0)}</span>
                <span className="text-ink-soft">to be paid out ({profile.revenueSharePct}% share)</span>
              </p>
              <p>
                <span className="font-display block text-4xl">{formatINR(earnings?.paidPaise ?? 0)}</span>
                <span className="text-ink-soft">paid so far</span>
              </p>
            </div>
            <ThemeEditor onSaved={() => qc.invalidateQueries({ queryKey: ['designer', 'templates'] })} />
            <section className="mt-12">
              <h2 className="text-2xl">Your themes</h2>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {mine?.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-3 py-4">
                    <span className="flex-1 font-semibold">{t.name}</span>
                    <span className="text-sm text-ink-soft">{t.salesCount} sales</span>
                    <span className="rounded-full bg-mist px-3 py-1 text-sm">{t.status}</span>
                    {t.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() =>
                          api(`/designer/templates/${t.id}/submit`, { method: 'POST' }).then(() => {
                            toast.success('Sent for review');
                            void qc.invalidateQueries({ queryKey: ['designer', 'templates'] });
                          })
                        }
                      >
                        Submit for review
                      </Button>
                    )}
                    {t.reviewNote && <p className="w-full text-sm text-sindoor">{t.reviewNote}</p>}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </>
  );
}

function ApplyForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ displayName: '', bio: '', portfolioUrl: '', payoutUpi: '' });
  const apply = useMutation({
    mutationFn: () => api('/designers/apply', { method: 'POST', json: { ...f, portfolioUrl: f.portfolioUrl || undefined, bio: f.bio || undefined } }),
    onSuccess: onDone,
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not apply'),
  });
  return (
    <form
      className="mt-8 flex max-w-xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        apply.mutate();
      }}
    >
      <Field label="Display name">{(id) => <Input id={id} required value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} />}</Field>
      <Field label="About your work">{(id) => <Textarea id={id} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />}</Field>
      <Field label="Portfolio link (Instagram, Behance…)">
        {(id) => <Input id={id} type="url" value={f.portfolioUrl} onChange={(e) => setF({ ...f, portfolioUrl: e.target.value })} />}
      </Field>
      <Field label="UPI ID for payouts">{(id) => <Input id={id} required placeholder="name@okbank" value={f.payoutUpi} onChange={(e) => setF({ ...f, payoutUpi: e.target.value })} />}</Field>
      <Button type="submit" className="self-start" loading={apply.isPending}>
        Apply as a designer
      </Button>
    </form>
  );
}

const PALETTE_KEYS: Array<keyof Theme['palette']> = ['background', 'backgroundAlt', 'surface', 'primary', 'accent', 'text', 'muted'];

function ThemeEditor({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState('');
  const [layout, setLayout] = useState<LayoutId>('royal-arch');
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [eventTypes] = useState<EventTypeId[]>(['wedding', 'engagement', 'reception']);
  const preview = useMemo(
    () => sampleInviteProps({ id: 'preview', name, layout, theme, eventTypes, communities: [], tags: [], premium: true, source: 'marketplace' } as TemplateDefinition),
    [name, layout, theme, eventTypes],
  );
  const save = useMutation({
    mutationFn: () => api('/designer/templates', { method: 'POST', json: { name, layout, theme, eventTypes, communities: [], tags: [] } }),
    onSuccess: () => {
      toast.success('Theme saved as draft');
      onSaved();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not save'),
  });

  return (
    <section className="mt-12 grid gap-10 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-5">
        <h2 className="text-2xl">New theme</h2>
        <Field label="Theme name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Layout">
            {(id) => (
              <Select id={id} value={layout} onChange={(e) => setLayout(e.target.value as LayoutId)}>
                {LAYOUTS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Symbol">
            {(id) => (
              <Select id={id} value={theme.motif} onChange={(e) => setTheme({ ...theme, motif: e.target.value as MotifId })}>
                {MOTIFS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Pattern">
            {(id) => (
              <Select id={id} value={theme.pattern} onChange={(e) => setTheme({ ...theme, pattern: e.target.value as PatternId })}>
                {PATTERNS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <fieldset>
          <legend className="font-semibold">Colours</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {PALETTE_KEYS.map((k) => (
              <label key={k} className="flex flex-col items-center gap-1 text-sm">
                <input
                  type="color"
                  value={theme.palette[k]}
                  onChange={(e) => setTheme({ ...theme, palette: { ...theme.palette, [k]: e.target.value.toUpperCase() } })}
                  className="size-12 cursor-pointer rounded-full border border-hairline"
                />
                {k}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={`Ornament strength (${Math.round(theme.ornamentOpacity * 100)}%)`}>
          {(id) => (
            <input
              id={id}
              type="range"
              min={0}
              max={0.5}
              step={0.02}
              value={theme.ornamentOpacity}
              onChange={(e) => setTheme({ ...theme, ornamentOpacity: Number(e.target.value) })}
              className="accent-[var(--color-sindoor)]"
            />
          )}
        </Field>
        <Button className="self-start" disabled={name.length < 2} loading={save.isPending} onClick={() => save.mutate()}>
          Save draft
        </Button>
      </div>
      <InvitePlayer props={preview} mode="card" className="shadow-[var(--shadow-lift)]" />
    </section>
  );
}
