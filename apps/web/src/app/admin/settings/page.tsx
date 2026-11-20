'use client';

import { ADMIN_SCOPE_LABEL, ADMIN_SCOPES, type AdminScope, type FlagDto } from '@cardai/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Film, Image as ImageIcon, Music, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/field';
import { ago, Badge, Card, Empty, PageHeader, Segmented, shortDate, Skeleton, Table, Toggle } from '@/features/admin/ui';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/hooks';

type Tab = 'switches' | 'admins' | 'media' | 'music' | 'privacy';

interface AdminRow {
  id: string;
  name: string | null;
  email: string | null;
  scopes: AdminScope[];
  digest: boolean;
  lastSeenAt: string | null;
  disabledAt: string | null;
}
interface MediaRow {
  slot: string;
  label: string;
  accept: string[];
  maxMb: number;
  url: string | null;
  custom: boolean;
  bytes: number | null;
  updatedAt: string | null;
}
interface Track {
  id: string;
  title: string;
  mood: string;
  durationSec: number;
  license: string;
  active: boolean;
  url: string;
  uses: number;
}
interface DataReq {
  id: string;
  user_id: string;
  kind: 'export' | 'erasure';
  status: string;
  note: string | null;
  name: string | null;
  email: string | null;
  handledByName: string | null;
  created_at: string;
  completed_at: string | null;
}

async function call<T>(p: Promise<T>, ok: string): Promise<T> {
  try {
    const r = await p;
    toast.success(ok);
    return r;
  } catch (e) {
    toast.error(e instanceof ApiError ? e.message : 'Something went wrong');
    throw e;
  }
}

/** Presigned upload straight to storage, then the API checks and records it. */
async function upload(file: File, presignPath: string): Promise<string> {
  const p = await api<{ key: string; uploadUrl: string; headers: Record<string, string> }>(presignPath, { method: 'POST', json: { contentType: file.type, bytes: file.size } });
  const res = await fetch(p.uploadUrl, { method: 'PUT', body: file, headers: p.headers });
  if (!res.ok) throw new Error('Upload failed');
  return p.key;
}

export default function AdminSettingsPage() {
  const { data: me } = useMe();
  const owner = !me?.adminScopes?.length || me.adminScopes.includes('owner');
  const content = owner || Boolean(me?.adminScopes?.includes('content'));
  const [tab, setTab] = useState<Tab>('switches');
  const tabs: Array<{ value: Tab; label: string }> = [
    { value: 'switches', label: 'Switches' },
    { value: 'admins', label: 'Admins & roles' },
    ...(content ? [{ value: 'media' as Tab, label: 'Landing media' }, { value: 'music' as Tab, label: 'Music library' }] : []),
    ...(owner ? [{ value: 'privacy' as Tab, label: 'Data requests' }] : []),
  ];

  return (
    <>
      <PageHeader title="Settings" description="Switch features off in an emergency, manage who can do what, replace landing media and music, and handle data-protection requests." />
      <div className="mb-5">
        <Segmented value={tab} onChange={setTab} label="Settings section" options={tabs} />
      </div>
      {tab === 'switches' && <Switches owner={owner} />}
      {tab === 'admins' && <Admins owner={owner} meId={me?.id} />}
      {tab === 'media' && <Media />}
      {tab === 'music' && <MusicLibrary />}
      {tab === 'privacy' && <Privacy />}
    </>
  );
}

// ---------------- Switches ----------------

function Switches({ owner }: { owner: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'flags'], queryFn: () => api<FlagDto[]>('/admin/flags') });
  const [editing, setEditing] = useState<FlagDto | 'new' | null>(null);
  const save = async (key: string, body: { enabled: boolean; rolloutPct: number; description?: string | null; message?: string | null }, ok: string) => {
    const rows = await call(api<FlagDto[]>(`/admin/flags/${key}`, { method: 'PUT', json: body }), ok);
    qc.setQueryData(['admin', 'flags'], rows);
    void qc.invalidateQueries({ queryKey: ['offers'] });
  };

  return (
    <Card
      title="Switches"
      description="Kill switches stop a feature for customers within seconds (admins are never blocked). Custom switches roll a feature out to a share of people."
      pad={false}
      action={
        owner && (
          <Button size="sm" variant="line" onClick={() => setEditing('new')}>
            <Plus className="size-4" /> New roll-out
          </Button>
        )
      }
    >
      {isLoading || !data ? (
        <Skeleton className="m-5 h-48" />
      ) : (
        <Table head={['Switch', 'State', 'Roll-out', 'Customer message', '']}>
          {data.map((f) => {
            const danger = f.key === 'maintenance' ? f.enabled : !f.enabled;
            return (
              <tr key={f.key}>
                <td className="max-w-80">
                  <p className="font-medium">{f.builtin ? labelFor(f.key) : <code>{f.key}</code>}</p>
                  <p className="text-xs text-ink-soft">{f.description}</p>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Toggle
                      checked={f.enabled}
                      disabled={!owner}
                      label={f.key}
                      onChange={(v) => {
                        const warn = f.key === 'maintenance' ? (v ? 'Turn on maintenance mode? Customers cannot save anything until you turn it off.' : null) : !v ? `Switch off “${labelFor(f.key)}” for all customers?` : null;
                        if (warn && !confirm(warn)) return;
                        void save(f.key, { enabled: v, rolloutPct: f.rolloutPct, description: f.builtin ? null : f.description, message: f.message }, v ? 'Switched on' : 'Switched off');
                      }}
                    />
                    {danger && <Badge tone={f.key === 'maintenance' ? 'warn' : 'bad'}>{f.key === 'maintenance' ? 'On' : 'Off'}</Badge>}
                  </div>
                </td>
                <td className="tabular-nums">{f.builtin ? '—' : `${f.rolloutPct}%`}</td>
                <td className="max-w-64 truncate text-xs text-ink-soft">{f.message ?? '—'}</td>
                <td className="text-right">
                  {owner && (
                    <Button size="sm" variant="quiet" className="h-8 px-3" onClick={() => setEditing(f)}>
                      Edit
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      {!owner && <p className="border-t border-ink/10 px-5 py-3 text-xs text-ink-soft">Only owners can change switches.</p>}
      {editing && <FlagDialog flag={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={(rows) => qc.setQueryData(['admin', 'flags'], rows)} />}
    </Card>
  );
}

const FLAG_LABELS: Record<string, string> = {
  maintenance: 'Maintenance mode',
  signups: 'New sign-ups',
  checkout: 'Checkout & payments',
  ai_generation: 'AI generation',
  video_render: 'Video rendering',
  print_orders: 'Print orders',
  marketplace: 'Designer marketplace',
};
const labelFor = (k: string) => FLAG_LABELS[k] ?? k;

function FlagDialog({ flag, onClose, onSaved }: { flag: FlagDto | null; onClose: () => void; onSaved: (rows: FlagDto[]) => void }) {
  const [key, setKey] = useState(flag?.key ?? '');
  const [enabled, setEnabled] = useState(flag?.enabled ?? true);
  const [pct, setPct] = useState(String(flag?.rolloutPct ?? 10));
  const [description, setDescription] = useState(flag?.builtin ? '' : (flag?.description ?? ''));
  const [message, setMessage] = useState(flag?.message ?? '');
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const rows = await call(
        api<FlagDto[]>(`/admin/flags/${key}`, { method: 'PUT', json: { enabled, rolloutPct: flag?.builtin ? 100 : Number(pct), description: description.trim() || null, message: message.trim() || null } }),
        'Saved',
      );
      onSaved(rows);
      void qc.invalidateQueries({ queryKey: ['offers'] });
      onClose();
    } catch {
      /* toast shown */
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!flag || !confirm(`Delete switch ${flag.key}? Code checking it falls back to its default.`)) return;
    const rows = await call(api<FlagDto[]>(`/admin/flags/${flag.key}`, { method: 'DELETE' }), 'Deleted');
    onSaved(rows);
    onClose();
  }

  return (
    <Dialog open onClose={onClose} title={flag ? `Switch: ${flag.builtin ? labelFor(flag.key) : flag.key}` : 'New roll-out'}>
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        {!flag && (
          <Field label="Key" hint="Used in code: useFlag('new-editor')">
            {(id, d) => <Input id={id} aria-describedby={d} value={key} onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} required minLength={2} maxLength={40} className="font-mono" />}
          </Field>
        )}
        <label className="flex items-center justify-between gap-3 text-sm">
          On
          <Toggle checked={enabled} onChange={setEnabled} label="On" />
        </label>
        {!flag?.builtin && (
          <Field label="Share of people (%)" hint="Stable per person: the same people keep seeing it as you raise the number">
            {(id, d) => <Input id={id} aria-describedby={d} type="number" min={0} max={100} value={pct} onChange={(e) => setPct(e.target.value)} />}
          </Field>
        )}
        {!flag?.builtin && <Field label="What it does">{(id) => <Input id={id} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />}</Field>}
        <Field label="Message to customers (optional)" hint="Shown when this blocks something, or as the maintenance notice. Hindi is fine.">
          {(id, d) => <Textarea id={id} aria-describedby={d} rows={2} maxLength={200} value={message} onChange={(e) => setMessage(e.target.value)} />}
        </Field>
        <div className="flex justify-between gap-2">
          {flag && !flag.builtin ? (
            <Button type="button" variant="quiet" size="sm" onClick={() => void remove()}>
              <Trash2 className="size-4" /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="line" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="solid" size="sm" loading={busy}>
              Save
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

// ---------------- Admins ----------------

function Admins({ owner, meId }: { owner: boolean; meId?: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'admins'], queryFn: () => api<AdminRow[]>('/admin/admins') });
  const set = (rows: AdminRow[]) => qc.setQueryData(['admin', 'admins'], rows);

  async function toggleScope(a: AdminRow, s: AdminScope) {
    const next = a.scopes.includes(s) ? a.scopes.filter((x) => x !== s) : [...a.scopes.filter((x) => (s === 'owner' ? false : x !== 'owner')), s];
    if (!next.length) return toast.error('An admin needs at least one role.');
    set(await call(api<AdminRow[]>(`/admin/admins/${a.id}/scopes`, { method: 'PUT', json: { scopes: next } }), 'Roles updated'));
  }

  return (
    <Card title="Admins & roles" description="Owner: everything. Support: users, invitations, orders, trust & safety. Marketing: plans, offers, emails, revenue. Content: templates, designs, media. Make someone an admin from Users (owners only)." pad={false}>
      {isLoading || !data ? (
        <Skeleton className="m-5 h-40" />
      ) : (
        <Table head={['Admin', ...ADMIN_SCOPES.map((s) => s[0]!.toUpperCase() + s.slice(1)), 'Daily email', 'Last active']}>
          {data.map((a) => (
            <tr key={a.id}>
              <td>
                <p className="font-medium">{a.name ?? a.email}</p>
                <p className="text-xs text-ink-soft">{a.email}</p>
              </td>
              {ADMIN_SCOPES.map((s) => (
                <td key={s} title={ADMIN_SCOPE_LABEL[s]}>
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--color-ink)]"
                    checked={a.scopes.includes(s)}
                    disabled={!owner}
                    aria-label={`${ADMIN_SCOPE_LABEL[s]} for ${a.email}`}
                    onChange={() => void toggleScope(a, s).catch(() => undefined)}
                  />
                </td>
              ))}
              <td>
                <Toggle
                  checked={a.digest}
                  disabled={!owner && a.id !== meId}
                  label="Daily summary email"
                  onChange={(v) => void call(api<AdminRow[]>(`/admin/admins/${a.id}/digest`, { method: 'PUT', json: { on: v } }), v ? 'Daily summary on' : 'Daily summary off').then(set)}
                />
              </td>
              <td className="whitespace-nowrap text-ink-soft">{ago(a.lastSeenAt)}</td>
            </tr>
          ))}
        </Table>
      )}
      <p className="border-t border-ink/10 px-5 py-3 text-xs text-ink-soft">Admins confirm a 6-digit email code once per device every 12 hours. The daily summary arrives at 8 am India time; alerts go to owners and support.</p>
    </Card>
  );
}

// ---------------- Media ----------------

function Media() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'media'], queryFn: () => api<MediaRow[]>('/admin/media') });
  const [busy, setBusy] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function replace(m: MediaRow, file: File) {
    if (!m.accept.includes(file.type)) return toast.error(`Use ${m.accept.join(', ')}`);
    if (file.size > m.maxMb * 1024 * 1024) return toast.error(`Keep it under ${m.maxMb} MB so it loads on mobile data.`);
    setBusy(m.slot);
    try {
      const key = await upload(file, `/admin/media/${m.slot}/presign`);
      qc.setQueryData(['admin', 'media'], await call(api<MediaRow[]>(`/admin/media/${m.slot}`, { method: 'PUT', json: { key } }), `${m.label} replaced`));
      void qc.invalidateQueries({ queryKey: ['offers'] });
    } catch (e) {
      if (!(e instanceof ApiError)) toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function reset(m: MediaRow) {
    if (!confirm(`Go back to the original ${m.label.toLowerCase()}?`)) return;
    qc.setQueryData(['admin', 'media'], await call(api<MediaRow[]>(`/admin/media/${m.slot}`, { method: 'DELETE' }), 'Back to the original'));
    void qc.invalidateQueries({ queryKey: ['offers'] });
  }

  if (isLoading || !data) return <Skeleton className="h-72" />;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {data.map((m) => {
        const video = m.accept[0]?.startsWith('video/');
        return (
          <Card key={m.slot} title={m.label} description={`${m.accept.map((a) => a.split('/')[1]).join(', ')} · up to ${m.maxMb} MB`}>
            <div className="relative aspect-video overflow-hidden border border-ink/10 bg-ink/[0.03]">
              {m.url ? (
                video ? (
                  <video src={m.url} muted loop playsInline autoPlay className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                )
              ) : (
                <div className="grid h-full place-items-center text-ink-soft">{video ? <Film /> : <ImageIcon />}</div>
              )}
              <span className="absolute left-2 top-2">{m.custom ? <Badge tone="info">Replaced {m.updatedAt ? shortDate(m.updatedAt) : ''}</Badge> : <Badge>Original</Badge>}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <input ref={(el) => void (inputs.current[m.slot] = el)} type="file" accept={m.accept.join(',')} className="hidden" onChange={(e) => e.target.files?.[0] && void replace(m, e.target.files[0])} />
              <Button size="sm" variant="line" loading={busy === m.slot} onClick={() => inputs.current[m.slot]?.click()}>
                <Upload className="size-4" /> Replace
              </Button>
              {m.custom && (
                <Button size="sm" variant="quiet" onClick={() => void reset(m)}>
                  <RotateCcw className="size-4" /> Use original
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------- Music ----------------

function MusicLibrary() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'music'], queryFn: () => api<Track[]>('/admin/music') });
  const [editing, setEditing] = useState<Track | 'new' | null>(null);
  const save = async (t: Track, active: boolean) => {
    qc.setQueryData(['admin', 'music'], await call(api<Track[]>('/admin/music', { method: 'PUT', json: { id: t.id, title: t.title, mood: t.mood, durationSec: t.durationSec, license: t.license, active } }), active ? 'Track on' : 'Track hidden'));
  };
  return (
    <Card
      title="Music library"
      description="Songs customers can pick for their video and website. Only add music you hold a licence for."
      pad={false}
      action={
        <Button size="sm" variant="line" onClick={() => setEditing('new')}>
          <Plus className="size-4" /> Add song
        </Button>
      }
    >
      {isLoading || !data ? (
        <Skeleton className="m-5 h-40" />
      ) : !data.length ? (
        <div className="p-5">
          <Empty icon={<Music />} title="No songs yet">
            Add shehnai, sitar or dhol tracks so customers can choose them.
          </Empty>
        </div>
      ) : (
        <Table head={['Song', 'Mood', 'Length', 'Used by', 'Licence', 'On', '']}>
          {data.map((t) => (
            <tr key={t.id}>
              <td>
                <p className="font-medium">{t.title}</p>
                <audio src={t.url} controls preload="none" className="mt-1 h-8 w-56" />
              </td>
              <td className="capitalize">{t.mood}</td>
              <td className="tabular-nums">{Math.floor(t.durationSec / 60)}:{String(t.durationSec % 60).padStart(2, '0')}</td>
              <td className="tabular-nums">{t.uses}</td>
              <td className="max-w-40 truncate text-xs text-ink-soft">{t.license}</td>
              <td>
                <Toggle checked={t.active} onChange={(v) => void save(t, v).catch(() => undefined)} label="Available" />
              </td>
              <td>
                <Button size="sm" variant="quiet" className="h-8 px-3" onClick={() => setEditing(t)}>
                  Edit
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {editing && <TrackDialog track={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={(rows) => qc.setQueryData(['admin', 'music'], rows)} />}
    </Card>
  );
}

function TrackDialog({ track, onClose, onSaved }: { track: Track | null; onClose: () => void; onSaved: (rows: Track[]) => void }) {
  const [title, setTitle] = useState(track?.title ?? '');
  const [mood, setMood] = useState(track?.mood ?? 'shehnai');
  const [license, setLicense] = useState(track?.license ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(track?.durationSec ?? 0);
  const [busy, setBusy] = useState(false);

  function pick(f: File) {
    setFile(f);
    const a = new Audio(URL.createObjectURL(f));
    a.onloadedmetadata = () => setDuration(Math.round(a.duration));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const storageKey = file ? await upload(file, '/admin/music/presign') : undefined;
      const id = track?.id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) + '-' + Math.random().toString(36).slice(2, 6);
      onSaved(await call(api<Track[]>('/admin/music', { method: 'PUT', json: { id, title, mood, license, durationSec: Math.max(5, duration), active: track?.active ?? true, storageKey } }), 'Song saved'));
      onClose();
    } catch (err) {
      if (!(err instanceof ApiError)) toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={track ? `Edit ${track.title}` : 'Add a song'}>
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <Field label="Audio file" hint={track ? 'Leave empty to keep the current file' : 'MP3, M4A, AAC or OGG, under 15 MB'}>
          {(id, d) => <Input id={id} aria-describedby={d} type="file" accept="audio/mpeg,audio/mp4,audio/aac,audio/ogg" required={!track} onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />}
        </Field>
        <Field label="Title">{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} maxLength={60} />}</Field>
        <Field label="Mood" hint="e.g. shehnai, sitar, santoor, flute, dhol, qawwali, piano">
          {(id, d) => <Input id={id} aria-describedby={d} value={mood} onChange={(e) => setMood(e.target.value)} required maxLength={30} />}
        </Field>
        <Field label="Licence" hint="Where it is from and that you may use it commercially">
          {(id, d) => <Input id={id} aria-describedby={d} value={license} onChange={(e) => setLicense(e.target.value)} required minLength={2} maxLength={120} />}
        </Field>
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

// ---------------- Data requests ----------------

function Privacy() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'data-requests'], queryFn: () => api<DataReq[]>('/admin/data-requests') });
  return (
    <Card
      title="Data-protection requests"
      description="Under the DPDP Act 2023 people can ask for a copy of their data or for it to be erased. Log and handle each request from the person's page in Users; this is the record."
      pad={false}
    >
      {isLoading || !data ? (
        <Skeleton className="m-5 h-40" />
      ) : !data.length ? (
        <div className="p-5">
          <Empty title="No requests yet">When someone writes in, open them in Users → Privacy.</Empty>
        </div>
      ) : (
        <Table head={['Requested', 'Person', 'Type', 'Status', 'Handled by', 'Note']}>
          {data.map((r) => {
            const overdue = r.status === 'open' && Date.now() - new Date(r.created_at).getTime() > 25 * 86400_000;
            return (
              <tr key={r.id}>
                <td className="whitespace-nowrap">{shortDate(r.created_at)}</td>
                <td>{r.name ?? r.email ?? r.user_id.slice(0, 8)}</td>
                <td>{r.kind === 'export' ? 'Copy of data' : 'Erasure'}</td>
                <td>{r.status === 'done' ? <Badge tone="good">Done {r.completed_at ? shortDate(r.completed_at) : ''}</Badge> : <Badge tone={overdue ? 'bad' : 'warn'}>{overdue ? 'Overdue' : 'Open'}</Badge>}</td>
                <td>{r.handledByName ?? '—'}</td>
                <td className="max-w-56 truncate text-xs text-ink-soft">{r.note ?? '—'}</td>
              </tr>
            );
          })}
        </Table>
      )}
    </Card>
  );
}
