'use client';

import { composeGuestMessage, getLanguage, whatsappShareUrl, type EventDto, type GuestDto, type GuestInput, type GuestStay, type SendKind } from '@cardai/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { BedDouble, BookUser, ChevronRight, Copy, MessageSquareText, Printer, ScanLine, Send, Tv, SkipForward, Trash2, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/field';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { cleanPhone, GuestFileImport } from './guest-import';
import { FollowUpsCard } from './follow-ups-card';
import { Panel, StatusPill, tableHead, type Tone } from './panel-ui';
import { api, ApiError } from '@/lib/api';
import { qk } from '@/lib/hooks';

interface ContactsManager {
  select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
}

/** Parses "Name, phone, group" lines (paste from Excel / notes / WhatsApp). */
function parsePasted(text: string): GuestInput[] {
  return text
    .split('\n')
    .map((l) => l.split(/[,\t;]/).map((s) => s.trim()))
    .filter(([name]) => name && name.toLowerCase() !== 'name')
    .map(([name, phone, group]) => ({ name: name!.slice(0, 100), phone: cleanPhone(phone), groupLabel: group?.slice(0, 40) || undefined, maxPax: 2 }));
}

type Filter = 'all' | 'unsent' | 'unopened' | 'replied' | 'noReply' | 'arrived';

const defaultKind = (g: GuestDto): SendKind => (g.invitedAt && g.viewCount === 0 ? 'unopened' : 'invite');

/**
 * The message is built here (not after an API round-trip) so WhatsApp opens straight from the
 * tap; browsers block pop-ups opened after an await. Same wording as the server, in the
 * invitation's language.
 */
function inviteMessage(event: EventDto, g: GuestDto, kind: SendKind = defaultKind(g)) {
  return composeGuestMessage({
    event: { language: event.language, title: event.title, timezone: event.settings.timezone },
    functions: event.functions,
    guest: g,
    kind,
    url: g.shortUrl,
    locale: getLanguage(event.language).locale,
  });
}

/** Who each tap-through queue lists (mirrors the server's send-queue filters). */
/** Labels come from messages (`send.<kind>`, `send.<kind>Hint`). */
const QUEUES: Array<{ kind: SendKind; pick: (g: GuestDto) => boolean }> = [
  { kind: 'invite', pick: (g) => !g.invitedAt },
  { kind: 'unopened', pick: (g) => Boolean(g.invitedAt) && !g.viewCount && !g.nudges.includes('unopened') },
  { kind: 'rsvp', pick: (g) => Boolean(g.invitedAt) && !Object.keys(g.rsvp).length && !g.nudges.includes('rsvp') },
  { kind: 'dayBefore', pick: (g) => Boolean(g.invitedAt) && !g.nudges.includes('dayBefore') },
  { kind: 'thanks', pick: (g) => Boolean(g.invitedAt) && !g.nudges.includes('thanks') },
  { kind: 'saveTheDate', pick: (g) => !g.nudges.includes('saveTheDate') },
];

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} days ago`;
}

const NUDGE_LABEL: Record<string, string> = { unopened: 'reminded', rsvp: 'asked to RSVP', dayBefore: 'day-before sent', thanks: 'thanked', saveTheDate: 'save-the-date sent' };

/** One short line of what happened with this guest: opens, last open, follow-ups. */
function detail(g: GuestDto) {
  const parts: string[] = [];
  if (g.viewCount && g.lastViewedAt) parts.push(`opened ${g.viewCount}×, last ${ago(g.lastViewedAt)}`);
  for (const n of g.nudges) if (NUDGE_LABEL[n]) parts.push(NUDGE_LABEL[n]!);
  if (g.checkedInAt) parts.push(`arrived${g.checkedInPax ? ` (${g.checkedInPax})` : ''}`);
  return parts.join(' · ');
}

function status(g: GuestDto): [string, Tone] {
  const replies = Object.values(g.rsvp);
  const yes = replies.filter((r) => r.status === 'yes').length;
  if (g.checkedInAt) return ['Arrived', 'leaf'];
  if (replies.length) return yes ? [`Coming to ${yes}`, 'leaf'] : ['Not coming', 'sindoor'];
  if (g.viewCount) return [`Opened ${g.viewCount}×`, 'primary'];
  return g.invitedAt ? ['Sent, not opened', 'gold'] : ['Not sent', 'muted'];
}

export function GuestsPanel({ event, onUpgrade }: { event: EventDto; onUpgrade: () => void }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [paste, setPaste] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', salutation: '', groupLabel: '', maxPax: 2 });
  const [filter, setFilter] = useState<Filter>('all');
  const [queue, setQueue] = useState<{ ids: string[]; kind: SendKind | null } | null>(null);
  const params = useSearchParams();
  const ts = useTranslations('send');
  const canManage = event.access !== 'viewer';
  const [stayFor, setStayFor] = useState<GuestDto | null>(null);
  const royale = event.features.includes('website_royale');
  const { data: guests, isLoading } = useQuery({
    queryKey: qk.guests(event.id),
    queryFn: () => api<{ items: GuestDto[] }>(`/events/${event.id}/guests`),
    select: (d) => d.items,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: qk.guests(event.id) });
  const handle = (err: unknown) => (err instanceof ApiError && err.requiredFeature ? onUpgrade() : toast.error((err as Error).message));

  const importMany = useMutation({
    mutationFn: (list: GuestInput[]) => api<{ created: number; skipped: number }>(`/events/${event.id}/guests/import`, { method: 'POST', json: { guests: list } }),
    onSuccess: (r) => {
      toast.success(`${r.created} guests added${r.skipped ? `, ${r.skipped} duplicates skipped` : ''}`);
      setPaste('');
      setAdding(false);
      refresh();
    },
    onError: handle,
  });

  const addOne = useMutation({
    mutationFn: () =>
      api<GuestDto>(`/events/${event.id}/guests`, {
        method: 'POST',
        json: {
          name: form.name,
          phone: form.phone || undefined,
          salutation: form.salutation || undefined,
          groupLabel: form.groupLabel || undefined,
          maxPax: form.maxPax,
        },
      }),
    onSuccess: () => {
      setForm({ name: '', phone: '', salutation: '', groupLabel: form.groupLabel, maxPax: 2 });
      refresh();
    },
    onError: handle,
  });

  const supportsContacts = typeof navigator !== 'undefined' && 'contacts' in navigator;
  async function pickContacts() {
    try {
      const picked = await (navigator as unknown as { contacts: ContactsManager }).contacts.select(['name', 'tel'], { multiple: true });
      const list = picked
        .filter((c) => c.name?.[0])
        .map((c) => ({ name: c.name![0]!.slice(0, 100), phone: cleanPhone(c.tel?.[0]), maxPax: 2 }));
      if (list.length) importMany.mutate(list);
    } catch {
      /* user cancelled */
    }
  }

  /** Opens WhatsApp (or SMS) at once, then records the send in the background. */
  function send(g: GuestDto, via: 'whatsapp' | 'sms' = 'whatsapp', kind: SendKind = defaultKind(g)) {
    const text = inviteMessage(event, g, kind);
    const url = via === 'sms' ? `sms:${g.phone ?? ''}?body=${encodeURIComponent(text)}` : whatsappShareUrl(text, g.phone);
    window.open(url, '_blank', 'noopener');
    void api(`/events/${event.id}/guests/${g.id}/send`, { method: 'POST', json: { viaApi: false, kind } }).then(refresh, handle);
  }

  const counts = useMemo(() => {
    const list = guests ?? [];
    return {
      all: list.length,
      unsent: list.filter((g) => !g.invitedAt).length,
      unopened: list.filter((g) => g.invitedAt && !g.viewCount).length,
      replied: list.filter((g) => Object.keys(g.rsvp).length > 0).length,
      noReply: list.filter((g) => g.invitedAt && !Object.keys(g.rsvp).length).length,
      arrived: list.filter((g) => g.checkedInAt).length,
    };
  }, [guests]);
  const shown = (guests ?? []).filter((g) =>
    filter === 'unsent'
      ? !g.invitedAt
      : filter === 'unopened'
        ? Boolean(g.invitedAt) && !g.viewCount
        : filter === 'replied'
          ? Object.keys(g.rsvp).length > 0
          : filter === 'noReply'
            ? Boolean(g.invitedAt) && !Object.keys(g.rsvp).length
            : filter === 'arrived'
              ? Boolean(g.checkedInAt)
              : true,
  );
  const startQueue = (list: GuestDto[], kind: SendKind | null = null) =>
    // People with a mobile number first: WhatsApp opens their chat directly.
    list.length ? setQueue({ ids: [...list].sort((a, b) => Number(!a.phone) - Number(!b.phone)).map((g) => g.id), kind }) : toast.message('Nobody to send to in this list');

  // Deep link from the WhatsApp bot / follow-up hints: ?queue=unopened opens that queue.
  const wanted = params.get('queue');
  useEffect(() => {
    if (!guests || !wanted) return;
    const q = QUEUES.find((x) => x.kind === wanted);
    if (q) startQueue(guests.filter(q.pick), q.kind);
  }, [guests, wanted]);
  const copy = (g: GuestDto) => navigator.clipboard.writeText(g.shortUrl).then(() => toast.success('Link copied'));
  const remove = (g: GuestDto) => api(`/events/${event.id}/guests/${g.id}`, { method: 'DELETE' }).then(refresh);
  const openStay = (g: GuestDto) => (royale ? setStayFor(g) : onUpgrade());

  const addButtons = !canManage ? null : (
    <>
      {supportsContacts && (
        <Button variant="line" onClick={pickContacts}>
          <BookUser className="size-4" />
          From contacts
        </Button>
      )}
      <Button onClick={() => setAdding(true)}>
        <UserPlus className="size-4" />
        Add guests
      </Button>
    </>
  );
  const FILTERS = [
    ['all', 'All guests'],
    ['unsent', 'Not sent'],
    ['unopened', 'Not opened'],
    ['noReply', 'No reply'],
    ['replied', 'Replied'],
    ['arrived', 'Arrived'],
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Guests"
        description="Every guest gets a personal link that greets them by name. You see who opened it and who replied."
        actions={guests && guests.length > 0 ? addButtons : undefined}
      >
        {isLoading && (
          <div className="flex flex-col gap-2" aria-busy>
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-14" />
            ))}
          </div>
        )}

        {guests && guests.length === 0 && (
          <div className="flex flex-col items-center border border-dashed border-ink/20 px-6 py-12 text-center">
            <span className="grid size-11 place-items-center border border-ink/15">
              <Users className="size-5" strokeWidth={1.6} aria-hidden />
            </span>
            <p className="mt-4 text-lg">Add the people you're inviting</p>
            <p className="mt-1 max-w-md text-sm text-ink-soft">One by one, paste a list from Excel or your notes, or pick from your phone contacts. You can send everyone their link on WhatsApp after.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">{addButtons}</div>
          </div>
        )}

        {guests && guests.length > 0 && (
          <div className="grid grid-cols-3 border-l border-t border-ink/10 2xl:grid-cols-6" role="group" aria-label="Filter guests">
            {FILTERS.map(([f, label]) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'relative border-b border-r border-ink/10 px-4 py-3.5 text-left transition-colors',
                  filter === f ? 'bg-ink/[0.04]' : 'hover:bg-ink/[0.02]',
                )}
              >
                <span aria-hidden className={clsx('absolute inset-x-0 top-0 h-[2px] origin-left bg-gold transition-transform duration-300', filter === f ? 'scale-x-100' : 'scale-x-0')} />
                <span className="block font-display text-2xl tabular-nums leading-tight">{counts[f]}</span>
                <span className={clsx('mt-1 block font-mono text-[0.6875rem]', filter === f ? 'text-ink' : 'text-ink-soft')}>{label}</span>
              </button>
            ))}
          </div>
        )}
      </Panel>

      {guests && guests.length > 0 && canManage && (
        <section className="flex flex-col gap-4 border border-ink/10 bg-ink/[0.015] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid size-10 shrink-0 place-items-center border border-ink/15 text-[#1fa855]">
              <WhatsAppIcon className="size-5" />
            </span>
            <div className="flex-1">
              <p>{ts('title')}</p>
              <p className="text-sm text-ink-soft">{ts('body', { language: getLanguage(event.language).nativeName })}</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {QUEUES.map((q) => {
              const list = guests.filter(q.pick);
              return (
                <button
                  key={q.kind}
                  type="button"
                  disabled={!list.length}
                  onClick={() => startQueue(list, q.kind)}
                  className="flex items-center justify-between gap-3 border border-ink/10 px-4 py-3 text-left transition-colors hover:bg-ink/[0.03] disabled:opacity-45 disabled:hover:bg-transparent"
                >
                  <span className="min-w-0">
                    <span className="block text-[0.9375rem]">{ts(q.kind)}</span>
                    <span className="block truncate text-xs text-ink-soft">{ts(`${q.kind}Hint`)}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 font-display text-xl tabular-nums">
                    {list.length}
                    <Send className="size-3.5 text-ink-soft" aria-hidden />
                  </span>
                </button>
              );
            })}
          </div>
          <p className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link href={`/dashboard/events/${event.id}/checkin`} className="inline-flex items-center gap-1.5 underline underline-offset-4">
              <ScanLine className="size-4" aria-hidden /> {ts('checkin')}
            </Link>
            <a href={`/host/${event.id}/wall`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 underline underline-offset-4">
              <Tv className="size-4" aria-hidden /> {ts('wall')}
            </a>
            <a href={`/host/${event.id}/print`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 underline underline-offset-4">
              <Printer className="size-4" aria-hidden /> {ts('printList')}
            </a>
          </p>
        </section>
      )}

      {guests && guests.length > 0 && canManage && <FollowUpsCard event={event} />}

      {guests && guests.length > 0 && (
        <section className="overflow-clip border border-ink/10 bg-ink/[0.015]">
          {shown.length === 0 && <p className="px-6 py-10 text-center text-sm text-ink-soft">Nobody in this list.</p>}

          {/* Phones: rows */}
          <ul className="divide-y divide-ink/10 md:hidden">
            {shown.map((g) => {
              const [label, tone] = status(g);
              return (
                <li key={g.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate">{g.name}</p>
                      <p className="truncate text-sm text-ink-soft">
                        {g.phone ?? 'No number'}
                        {g.groupLabel ? `, ${g.groupLabel}` : ''}
                      </p>
                      {detail(g) && <p className="truncate text-xs text-ink-soft">{detail(g)}</p>}
                    </div>
                    <StatusPill tone={tone}>{label}</StatusPill>
                  </div>
                  <div className={clsx('mt-3 flex gap-1.5', !canManage && 'hidden')}>
                    <Button size="sm" variant="line" className="flex-1" onClick={() => send(g)}>
                      <WhatsAppIcon className="size-4 text-[#1fa855]" />
                      {g.invitedAt && !g.viewCount ? 'Remind' : 'Send'}
                    </Button>
                    <Button size="icon" variant="quiet" aria-label={`Copy link for ${g.name}`} onClick={() => copy(g)}>
                      <Copy className="size-4" />
                    </Button>
                    <Button size="icon" variant="quiet" aria-label={`Stay details for ${g.name}`} onClick={() => openStay(g)}>
                      <BedDouble className="size-4" />
                    </Button>
                    <Button size="icon" variant="danger" aria-label={`Remove ${g.name}`} onClick={() => remove(g)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop: table */}
          {shown.length > 0 && (
            <table className="hidden w-full text-[0.9375rem] md:table">
              <thead className={tableHead}>
                <tr>
                  <th className="px-6 py-3 font-medium">Guest</th>
                  <th className="px-3 py-3 font-medium">Group</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {shown.map((g) => {
                  const [label, tone] = status(g);
                  return (
                    <tr key={g.id} className="group transition-colors hover:bg-ink/[0.025]">
                      <td className="px-6 py-3">
                        <p>{g.name}</p>
                        <p className="mt-0.5 font-mono text-[0.6875rem] text-ink-soft">{g.phone ?? 'No number'}</p>
                        {detail(g) && <p className="mt-0.5 text-xs text-ink-soft">{detail(g)}</p>}
                      </td>
                      <td className="px-3 py-3 text-sm text-ink-soft">{g.groupLabel ?? '–'}</td>
                      <td className="px-3 py-3">
                        <StatusPill tone={tone}>{label}</StatusPill>
                      </td>
                      <td className="px-6 py-3">
                        <div className={clsx('flex justify-end gap-1', !canManage && 'hidden')}>
                          <Button size="sm" variant="line" onClick={() => send(g)}>
                            <WhatsAppIcon className="size-4 text-[#1fa855]" />
                            {g.invitedAt && !g.viewCount ? 'Remind' : 'Send'}
                          </Button>
                          <Button size="icon" variant="quiet" aria-label={`Copy link for ${g.name}`} data-tip="Copy link" onClick={() => copy(g)}>
                            <Copy className="size-4" />
                          </Button>
                          <Button size="icon" variant="quiet" aria-label={`Stay details for ${g.name}`} data-tip="Travel & stay" onClick={() => openStay(g)}>
                            <BedDouble className="size-4" />
                          </Button>
                          <Button size="icon" variant="danger" aria-label={`Remove ${g.name}`} data-tip="Remove" onClick={() => remove(g)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add guests">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            addOne.mutate();
          }}
        >
          <Field label="Name">{(id) => <Input id={id} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
          <Field label="Mobile (optional)">
            {(id) => <Input id={id} inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />}
          </Field>
          <Field label="Greeting on their invite (optional)" hint='e.g. "Respected Gupta Ji & Family"'>
            {(id, d) => <Input id={id} aria-describedby={d} value={form.salutation} onChange={(e) => setForm({ ...form, salutation: e.target.value })} />}
          </Field>
          <Field label="Group (optional)" hint='e.g. "Family", "Office", "Bride side". Show some website sections only to a group.'>
            {(id, d) => <Input id={id} aria-describedby={d} maxLength={40} value={form.groupLabel} onChange={(e) => setForm({ ...form, groupLabel: e.target.value })} />}
          </Field>
          <Field label="People allowed">
            {(id) => (
              <Input id={id} type="number" min={1} max={50} value={form.maxPax} onChange={(e) => setForm({ ...form, maxPax: Number(e.target.value) })} />
            )}
          </Field>
          <Button type="submit" loading={addOne.isPending}>
            Add guest
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-ink-soft">
          <span className="h-px flex-1 bg-ink/10" />
          or paste many at once
          <span className="h-px flex-1 bg-ink/10" />
        </div>

        <Field label="Paste a list" hint="One guest per line: name, mobile, group. Works with copy-paste from Excel.">
          {(id, d) => (
            <Textarea id={id} aria-describedby={d} rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'Gupta Ji, 9811111111, Bride side\nAnita, 9822222222'} />
          )}
        </Field>
        <div className="my-6 flex items-center gap-3 text-xs text-ink-soft">
          <span className="h-px flex-1 bg-ink/10" />
          or upload a file
          <span className="h-px flex-1 bg-ink/10" />
        </div>
        <GuestFileImport busy={importMany.isPending} onImport={(list) => importMany.mutate(list)} />
        <Button
          variant="line"
          className="mt-3"
          disabled={!paste.trim()}
          loading={importMany.isPending}
          onClick={() => importMany.mutate(parsePasted(paste))}
        >
          Add {parsePasted(paste).length || ''} guests
        </Button>
      </Dialog>

      {queue && guests && (
        <SendQueue
          ids={queue.ids}
          guests={guests}
          preview={(g) => inviteMessage(event, g, queue.kind ?? defaultKind(g))}
          onSend={(g, via) => send(g, via, queue.kind ?? defaultKind(g))}
          onClose={() => setQueue(null)}
        />
      )}
      {stayFor && <StayDialog event={event} guest={stayFor} onClose={() => setStayFor(null)} onSaved={refresh} />}
    </div>
  );
}

/** One guest at a time: tap Send, WhatsApp opens, come back, next guest. */
function SendQueue({
  ids,
  guests,
  preview,
  onSend,
  onClose,
}: {
  ids: string[];
  guests: GuestDto[];
  preview: (g: GuestDto) => string;
  onSend: (g: GuestDto, via?: 'whatsapp' | 'sms') => void;
  onClose: () => void;
}) {
  const [i, setI] = useState(0);
  const [sent, setSent] = useState(0);
  const g = guests.find((x) => x.id === ids[i]);
  const done = i >= ids.length || !g;
  const next = (via?: 'whatsapp' | 'sms') => {
    if (via && g) {
      onSend(g, via);
      setSent((n) => n + 1);
    }
    setI((n) => n + 1);
  };
  return (
    <Dialog open onClose={onClose} title={done ? 'All done' : `Guest ${i + 1} of ${ids.length}`}>
      {done ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="text-lg">
            You sent {sent} message{sent === 1 ? '' : 's'}.
          </p>
          <p className="text-ink-soft">See who opened them in the list. Remind the rest later with one tap.</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="h-px overflow-hidden bg-ink/10">
            <div className="h-full bg-ink transition-[width] duration-500" style={{ width: `${(i / ids.length) * 100}%` }} />
          </div>
          <div>
            <p className="text-2xl">{g.salutation || g.name}</p>
            <p className="text-ink-soft">
              {g.phone ?? 'No number: WhatsApp will ask whom to send to'}
              {g.groupLabel ? `, ${g.groupLabel}` : ''}
            </p>
            <p className="mt-3 whitespace-pre-wrap break-words border-l-2 border-ink/15 pl-3 text-sm text-ink-soft">{preview(g)}</p>
          </div>
          <Button size="lg" onClick={() => next('whatsapp')}>
            <WhatsAppIcon className="size-5" /> Send on WhatsApp
          </Button>
          <div className="flex gap-2">
            {g.phone && (
              <Button variant="line" className="flex-1" onClick={() => next('sms')}>
                <MessageSquareText className="size-4" /> SMS
              </Button>
            )}
            <Button variant="line" className="flex-1" onClick={() => next()}>
              <SkipForward className="size-4" /> Skip
            </Button>
          </div>
          {i + 1 < ids.length && (
            <p className="flex items-center gap-1 text-sm text-ink-soft">
              Next: {guests.find((x) => x.id === ids[i + 1])?.name} <ChevronRight className="size-4" aria-hidden />
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}

/** Royale travel manager: what this guest sees in "Travel & stay". */
function StayDialog({ event, guest, onClose, onSaved }: { event: EventDto; guest: GuestDto; onClose: () => void; onSaved: () => void }) {
  const [stay, setStay] = useState<GuestStay>(guest.stay ?? {});
  const save = useMutation({
    mutationFn: () => {
      const clean = Object.fromEntries(Object.entries(stay).filter(([, v]) => typeof v === 'string' && v.trim())) as GuestStay;
      return api(`/events/${event.id}/guests/${guest.id}`, { method: 'PATCH', json: { stay: Object.keys(clean).length ? clean : null } });
    },
    onSuccess: () => {
      toast.success('Saved. The guest sees it on their page.');
      onSaved();
      onClose();
    },
    onError: (err) => toast.error((err as Error).message),
  });
  const f = (key: keyof GuestStay, label: string, max: number, placeholder?: string) => (
    <Field label={label}>
      {(id) => <Input id={id} maxLength={max} placeholder={placeholder} value={stay[key] ?? ''} onChange={(e) => setStay({ ...stay, [key]: e.target.value })} />}
    </Field>
  );
  return (
    <Dialog open onClose={onClose} title={`Stay for ${guest.name}`}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        {f('hotel', 'Hotel', 100, 'Hotel Clarks Amer')}
        {f('room', 'Room', 40, '204')}
        <div className="grid grid-cols-2 gap-3">
          {f('checkIn', 'Check-in', 40, '10 Dec, 2 pm')}
          {f('checkOut', 'Check-out', 40, '12 Dec, 11 am')}
        </div>
        {f('pickup', 'Pickup', 200, 'Jaipur Junction, 10 Dec 9:30 am')}
        {f('note', 'Note', 300)}
        <Button type="submit" loading={save.isPending}>
          Save
        </Button>
      </form>
    </Dialog>
  );
}
