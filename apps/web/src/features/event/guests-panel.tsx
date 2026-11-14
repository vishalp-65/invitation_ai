'use client';

import type { EventDto, GuestDto, GuestInput } from '@cardai/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookUser, Copy, MessageCircle, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/field';
import { api, ApiError } from '@/lib/api';
import { qk } from '@/lib/hooks';

interface ContactsManager {
  select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
}

/** Parses "Name, phone" lines (paste from Excel / notes / WhatsApp). */
function parsePasted(text: string): GuestInput[] {
  return text
    .split('\n')
    .map((l) => l.split(/[,\t;]/).map((s) => s.trim()))
    .filter(([name]) => name && name.toLowerCase() !== 'name')
    .map(([name, phone, group]) => ({ name: name!, phone: phone?.replace(/[^\d+]/g, '') || undefined, groupLabel: group || undefined, maxPax: 2 }));
}

export function GuestsPanel({ event, onUpgrade }: { event: EventDto; onUpgrade: () => void }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [paste, setPaste] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', salutation: '', maxPax: 2 });
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
        json: { name: form.name, phone: form.phone || undefined, salutation: form.salutation || undefined, maxPax: form.maxPax },
      }),
    onSuccess: () => {
      setForm({ name: '', phone: '', salutation: '', maxPax: 2 });
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

  async function send(g: GuestDto) {
    try {
      const r = await api<{ sent: boolean; shareUrl: string }>(`/events/${event.id}/guests/${g.id}/send`, { method: 'POST', json: { viaApi: false } });
      window.open(r.shareUrl, '_blank', 'noopener');
      refresh();
    } catch (err) {
      handle(err);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl">Guests</h2>
          <p className="mt-1 max-w-xl text-ink-soft">
            Every guest gets a personal link that greets them by name. You see who opened it and who replied.
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

      {/* Phones: card list */}
      {guests && guests.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3 md:hidden">
          {guests.map((g) => {
            const replies = Object.values(g.rsvp);
            const yes = replies.filter((r) => r.status === 'yes').length;
            return (
              <li key={g.id} className="glass-light rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{g.name}</p>
                    <p className="text-sm text-ink-soft">{g.phone ?? 'No number'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${yes ? 'bg-leaf/15 text-leaf' : 'bg-mist text-ink-soft'}`}>
                    {replies.length === 0 ? (g.viewCount ? 'Opened' : 'Not opened') : yes ? `Coming (${yes})` : 'Not coming'}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="flex-1 bg-leaf text-white hover:bg-leaf/90" onClick={() => send(g)}>
                    <MessageCircle className="size-4" />
                    Send on WhatsApp
                  </Button>
                  <Button size="sm" variant="outline" aria-label={`Copy link for ${g.name}`} onClick={() => navigator.clipboard.writeText(g.inviteUrl).then(() => toast.success('Link copied'))}>
                    <Copy className="size-4" />
                  </Button>
                  <Button size="sm" variant="danger" aria-label={`Remove ${g.name}`} onClick={() => api(`/events/${event.id}/guests/${g.id}`, { method: 'DELETE' }).then(refresh)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {guests && guests.length > 0 && (
        <div className="mt-6 hidden overflow-x-auto md:block">
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
              {guests.map((g) => {
                const replies = Object.values(g.rsvp);
                const yes = replies.filter((r) => r.status === 'yes').length;
                return (
                  <tr key={g.id}>
                    <td className="py-3 pr-3">
                      <p className="font-semibold">{g.name}</p>
                      <p className="text-sm text-ink-soft">{g.phone ?? 'No number'}</p>
                    </td>
                    <td className="py-3 pr-3 text-[0.95rem]">{g.viewCount > 0 ? `${g.viewCount}×` : 'Not yet'}</td>
                    <td className="py-3 pr-3 text-[0.95rem]">
                      {replies.length === 0 ? 'Waiting' : yes ? `Coming to ${yes}` : 'Not coming'}
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" className="bg-leaf text-white hover:bg-leaf/90" onClick={() => send(g)}>
                          <MessageCircle className="size-4" />
                          Send
                        </Button>
                        <Button
                          size="sm"
                          variant="quiet"
                          aria-label={`Copy link for ${g.name}`}
                          onClick={() => navigator.clipboard.writeText(g.inviteUrl).then(() => toast.success('Link copied'))}
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          aria-label={`Remove ${g.name}`}
                          onClick={() => api(`/events/${event.id}/guests/${g.id}`, { method: 'DELETE' }).then(refresh)}
                        >
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
    </div>
  );
}
