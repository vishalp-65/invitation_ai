'use client';

import { whatsappShareUrl, type EventDto, type GuestDto, type GuestInput, type GuestStay } from '@cardai/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BedDouble, BookUser, ChevronRight, Copy, MessageCircle, MessageSquareText, Send, SkipForward, Trash2, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Chip, Field, Input, Textarea } from '@/components/ui/field';
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
    .map(([name, phone, group]) => ({ name: name!, phone: phone?.replace(/[^\d+]/g, '') || undefined, groupLabel: group || undefined, maxPax: 2 }));
}

type Filter = 'all' | 'unsent' | 'unopened' | 'replied';

/**
 * The message is built here (not after an API round-trip) so WhatsApp opens straight from the
 * tap; browsers block pop-ups opened after an await.
 */
function inviteMessage(event: EventDto, g: GuestDto) {
  const greeting = g.salutation || g.name;
  return g.invitedAt && g.viewCount === 0
    ? `${greeting}, a gentle reminder — your invitation to ${event.title} is waiting for you: ${g.shortUrl}`
    : `${greeting}, you are warmly invited to ${event.title}. Please open your invitation: ${g.shortUrl}`;
}

function status(g: GuestDto) {
  const replies = Object.values(g.rsvp);
  const yes = replies.filter((r) => r.status === 'yes').length;
  if (replies.length) return yes ? `Coming (${yes})` : 'Not coming';
  if (g.viewCount) return 'Opened';
  return g.invitedAt ? 'Sent, not opened' : 'Not sent';
}

export function GuestsPanel({ event, onUpgrade }: { event: EventDto; onUpgrade: () => void }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [paste, setPaste] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', salutation: '', groupLabel: '', maxPax: 2 });
  const [filter, setFilter] = useState<Filter>('all');
  const [queue, setQueue] = useState<string[] | null>(null);
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
        .map((c) => ({ name: c.name![0]!, phone: c.tel?.[0]?.replace(/[^\d+]/g, '').replace(/^0/, '') || undefined, maxPax: 2 }));
      if (list.length) importMany.mutate(list);
    } catch {
      /* user cancelled */
    }
  }

  /** Opens WhatsApp (or SMS) at once, then records the send in the background. */
  function send(g: GuestDto, via: 'whatsapp' | 'sms' = 'whatsapp') {
    const text = inviteMessage(event, g);
    const url = via === 'sms' ? `sms:${g.phone ?? ''}?body=${encodeURIComponent(text)}` : whatsappShareUrl(text, g.phone);
    window.open(url, '_blank', 'noopener');
    void api(`/events/${event.id}/guests/${g.id}/send`, { method: 'POST', json: { viaApi: false } }).then(refresh, handle);
  }

  const counts = useMemo(() => {
    const list = guests ?? [];
    return {
      all: list.length,
      unsent: list.filter((g) => !g.invitedAt).length,
      unopened: list.filter((g) => g.invitedAt && !g.viewCount).length,
      replied: list.filter((g) => Object.keys(g.rsvp).length > 0).length,
    };
  }, [guests]);
  const shown = (guests ?? []).filter((g) =>
    filter === 'unsent' ? !g.invitedAt : filter === 'unopened' ? Boolean(g.invitedAt) && !g.viewCount : filter === 'replied' ? Object.keys(g.rsvp).length > 0 : true,
  );
  const startQueue = (list: GuestDto[]) => (list.length ? setQueue(list.map((g) => g.id)) : toast.message('Nobody to send to in this list'));
  const copy = (g: GuestDto) => navigator.clipboard.writeText(g.shortUrl).then(() => toast.success('Link copied'));
  const remove = (g: GuestDto) => api(`/events/${event.id}/guests/${g.id}`, { method: 'DELETE' }).then(refresh);
  const openStay = (g: GuestDto) => (royale ? setStayFor(g) : onUpgrade());

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl">Guests</h2>
          <p className="mt-1 max-w-xl text-ink-soft">
            Every guest gets a personal short link that greets them by name. You see who opened it and who replied.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {supportsContacts && (
            <Button variant="outline" onClick={pickContacts}>
              <BookUser className="size-4" />
              From contacts
            </Button>
          )}
          <Button onClick={() => setAdding(true)}>
            <UserPlus className="size-4" />
            Add guests
          </Button>
        </div>
      </div>

      {isLoading && <p className="mt-6 text-ink-soft">Loading guests…</p>}
      {guests && guests.length === 0 && (
        <p className="mt-8 glass-light rounded-[var(--radius-card)] p-6 text-ink-soft">
          No guests yet. Add them one by one, paste a list, or pick from your phone contacts.
        </p>
      )}

      {guests && guests.length > 0 && (
        <>
          <div className="mt-6 flex flex-col gap-4 rounded-[var(--radius-card)] bg-primary p-5 text-on-primary sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold">Send to everyone, one tap each</p>
              <p className="text-sm opacity-85">
                WhatsApp opens with the guest’s personal short link ready. Send, come back, tap the next one. Free: it goes from your own WhatsApp.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="line" onClick={() => startQueue(guests.filter((g) => !g.invitedAt))}>
                <Send className="size-4" /> Send to {counts.unsent} not sent
              </Button>
              {counts.unopened > 0 && (
                <Button variant="line" onClick={() => startQueue(guests.filter((g) => g.invitedAt && !g.viewCount))}>
                  Remind {counts.unopened} who didn’t open
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter guests">
            {(
              [
                ['all', 'All'],
                ['unsent', 'Not sent'],
                ['unopened', 'Not opened'],
                ['replied', 'Replied'],
              ] as const
            ).map(([f, label]) => (
              <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
                {label} ({counts[f]})
              </Chip>
            ))}
          </div>

          {/* Phones: card list */}
          <ul className="mt-5 flex flex-col gap-3 md:hidden">
            {shown.map((g) => {
              const yes = Object.values(g.rsvp).filter((r) => r.status === 'yes').length;
              return (
                <li key={g.id} className="glass-light rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{g.name}</p>
                      <p className="text-sm text-ink-soft">
                        {g.phone ?? 'No number'}
                        {g.groupLabel ? ` · ${g.groupLabel}` : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${yes ? 'bg-leaf/15 text-leaf' : 'bg-mist text-ink-soft'}`}>{status(g)}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="flex-1 bg-leaf text-white hover:bg-leaf/90" onClick={() => send(g)}>
                      <MessageCircle className="size-4" />
                      {g.invitedAt && !g.viewCount ? 'Remind' : 'Send on WhatsApp'}
                    </Button>
                    <Button size="sm" variant="outline" aria-label={`Copy link for ${g.name}`} onClick={() => copy(g)}>
                      <Copy className="size-4" />
                    </Button>
                    <Button size="sm" variant="outline" aria-label={`Stay details for ${g.name}`} onClick={() => openStay(g)}>
                      <BedDouble className="size-4" />
                    </Button>
                    <Button size="sm" variant="danger" aria-label={`Remove ${g.name}`} onClick={() => remove(g)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-left">
              <thead className="border-b-2 border-ink text-[0.95rem]">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Guest</th>
                  <th className="py-2 pr-3 font-semibold">Opened</th>
                  <th className="py-2 pr-3 font-semibold">Reply</th>
                  <th className="py-2 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((g) => {
                  const replies = Object.values(g.rsvp);
                  const yes = replies.filter((r) => r.status === 'yes').length;
                  return (
                    <tr key={g.id}>
                      <td className="py-3 pr-3">
                        <p className="font-semibold">{g.name}</p>
                        <p className="text-sm text-ink-soft">
                          {g.phone ?? 'No number'}
                          {g.groupLabel ? ` · ${g.groupLabel}` : ''}
                        </p>
                      </td>
                      <td className="py-3 pr-3 text-[0.95rem]">{g.viewCount > 0 ? `${g.viewCount}×` : g.invitedAt ? 'Sent, not yet' : 'Not sent'}</td>
                      <td className="py-3 pr-3 text-[0.95rem]">{replies.length === 0 ? 'Waiting' : yes ? `Coming to ${yes}` : 'Not coming'}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" className="bg-leaf text-white hover:bg-leaf/90" onClick={() => send(g)}>
                            <MessageCircle className="size-4" />
                            {g.invitedAt && !g.viewCount ? 'Remind' : 'Send'}
                          </Button>
                          <Button size="sm" variant="quiet" aria-label={`Copy link for ${g.name}`} onClick={() => copy(g)}>
                            <Copy className="size-4" />
                          </Button>
                          <Button size="sm" variant="quiet" aria-label={`Stay details for ${g.name}`} onClick={() => openStay(g)}>
                            <BedDouble className="size-4" />
                          </Button>
                          <Button size="sm" variant="danger" aria-label={`Remove ${g.name}`} onClick={() => remove(g)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
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

        <hr className="my-6 border-line" />

        <Field label="Or paste a list" hint="One guest per line: name, mobile, group. Works with copy-paste from Excel.">
          {(id, d) => (
            <Textarea id={id} aria-describedby={d} rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'Gupta Ji, 9811111111, Bride side\nAnita, 9822222222'} />
          )}
        </Field>
        <Button
          variant="outline"
          className="mt-3"
          disabled={!paste.trim()}
          loading={importMany.isPending}
          onClick={() => importMany.mutate(parsePasted(paste))}
        >
          Add {parsePasted(paste).length || ''} guests
        </Button>
      </Dialog>

      {queue && guests && <SendQueue ids={queue} guests={guests} onSend={send} onClose={() => setQueue(null)} />}
      {stayFor && <StayDialog event={event} guest={stayFor} onClose={() => setStayFor(null)} onSaved={refresh} />}
    </div>
  );
}

/** One guest at a time: tap Send, WhatsApp opens, come back, next guest. */
function SendQueue({ ids, guests, onSend, onClose }: { ids: string[]; guests: GuestDto[]; onSend: (g: GuestDto, via?: 'whatsapp' | 'sms') => void; onClose: () => void }) {
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
            You sent {sent} invitation{sent === 1 ? '' : 's'}.
          </p>
          <p className="text-ink-soft">See who opened them in the list. Remind the rest later with one tap.</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-mist">
            <div className="h-full rounded-full bg-leaf transition-[width]" style={{ width: `${(i / ids.length) * 100}%` }} />
          </div>
          <div>
            <p className="text-2xl">{g.salutation || g.name}</p>
            <p className="text-ink-soft">
              {g.phone ?? 'No number: WhatsApp will ask whom to send to'}
              {g.groupLabel ? ` · ${g.groupLabel}` : ''}
            </p>
            <p className="mt-2 break-all text-sm text-ink-soft">{g.shortUrl}</p>
          </div>
          <Button size="lg" className="bg-leaf text-white hover:bg-leaf/90" onClick={() => next('whatsapp')}>
            <MessageCircle className="size-5" /> Send on WhatsApp
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
