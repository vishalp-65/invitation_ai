'use client';

import { functionIcon, type EventContent, type EventDto, type EventFunctionInput, type UpdateEventInput } from '@cardai/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { api, ApiError } from '@/lib/api';
import { qk } from '@/lib/hooks';
import { splitIso } from '@/features/editor/use-event-data';

interface FnDraft {
  key: string;
  id?: string;
  name: string;
  date: string;
  time: string;
  venueName: string;
  venueAddress: string;
  dressCode: string;
  notes: string;
  mapUrl?: string;
  endsAt?: string;
}

const ICON_EMOJI: Record<string, string> = {
  haldi: '🟡', mehendi: '🌿', sangeet: '🎶', baraat: '🐎', wedding: '🛕', pheras: '🔥', reception: '🥂', rings: '💍', puja: '🪔', nikah: '🌙', cake: '🎂', dinner: '🍽️', flower: '🌸',
};

/** "2026-12-14" + "19:00" → ISO in IST. */
const toIso = (date: string, time: string) => `${date}T${time || '18:00'}:00+05:30`;

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);

function fromEvent(e: EventDto): FnDraft[] {
  return e.functions.map((f) => {
    const { date, time } = splitIso(f.startsAt);
    return {
      key: f.id,
      id: f.id,
      name: f.name,
      date,
      time,
      venueName: f.venueName,
      venueAddress: f.venueAddress ?? '',
      dressCode: f.dressCode ?? '',
      notes: f.notes ?? '',
      mapUrl: f.mapUrl,
      endsAt: f.endsAt,
    };
  });
}

/**
 * Everything the inner card pages show: functions & ceremonies (with descriptions and dress
 * codes), welcome and compliments names, RSVP contacts and deadline, a note and a hashtag.
 */
export function CardDetailsPanel({ event, onUpgrade }: { event: EventDto; onUpgrade: () => void }) {
  const qc = useQueryClient();
  const [fns, setFns] = useState<FnDraft[]>(() => fromEvent(event));
  const [c, setC] = useState<EventContent>(event.content);
  const [welcome, setWelcome] = useState((event.content.welcomeLines ?? []).join('\n'));
  const [compliments, setCompliments] = useState((event.content.complimentsLines ?? []).join('\n'));
  const [contacts, setContacts] = useState(() => {
    const r = event.content.rsvpContacts ?? [];
    return [0, 1, 2].map((i) => ({ name: r[i]?.name ?? '', phone: r[i]?.phone ?? '' }));
  });
  const [rsvpBy, setRsvpBy] = useState(event.settings.rsvpDeadline ? splitIso(event.settings.rsvpDeadline).date : '');

  useEffect(() => {
    setFns(fromEvent(event));
    setC(event.content);
  }, [event]);

  const save = useMutation({
    mutationFn: (patch: UpdateEventInput) => api<EventDto>(`/events/${event.id}`, { method: 'PATCH', json: patch }),
    onSuccess: (updated) => {
      qc.setQueryData(qk.event(event.id), updated);
      toast.success('Saved. Your card pages are updated.');
    },
    onError: (err) => (err instanceof ApiError && err.requiredFeature ? onUpgrade() : toast.error((err as Error).message)),
  });

  const upFn = (key: string, patch: Partial<FnDraft>) => setFns((list) => list.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  const move = (i: number, d: number) =>
    setFns((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  function submit() {
    const bad = fns.find((f) => !f.name.trim() || !f.venueName.trim() || !f.date);
    if (bad) return toast.error('Every function needs a name, date and venue.');
    const functions: Array<EventFunctionInput> = fns.map((f) => ({
      ...(f.id ? { id: f.id } : {}),
      name: f.name.trim(),
      startsAt: toIso(f.date, f.time),
      venueName: f.venueName.trim(),
      venueAddress: f.venueAddress.trim() || undefined,
      dressCode: f.dressCode.trim() || undefined,
      notes: f.notes.trim() || undefined,
      mapUrl: f.mapUrl,
    }));
    const content: EventContent = {
      ...event.content,
      welcomeTitle: c.welcomeTitle?.trim() || undefined,
      welcomeLines: lines(welcome).slice(0, 16),
      complimentsTitle: c.complimentsTitle?.trim() || undefined,
      complimentsLines: lines(compliments).slice(0, 12),
      rsvpContacts: contacts.map((r) => ({ name: r.name.trim(), phone: r.phone.trim() })).filter((r) => r.name || r.phone),
      note: c.note?.trim() || undefined,
      hashtag: c.hashtag?.trim() ? (c.hashtag.trim().startsWith('#') ? c.hashtag.trim() : `#${c.hashtag.trim()}`) : undefined,
    };
    save.mutate({ functions, content, settings: { rsvpDeadline: rsvpBy ? toIso(rsvpBy, '23:59') : null } });
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl">Card pages</h2>
        <p className="mt-1 text-[0.95rem] text-ink-soft">
          These fill the extra pages of your invitation: a page for your ceremonies, a family &amp; RSVP page and a save-the-date page. Leave anything blank to skip it. You can also delete any page in the editor.
        </p>
      </div>

      {/* Functions */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xl">Functions &amp; ceremonies</h3>
        <ol className="flex flex-col gap-3">
          {fns.map((f, i) => (
            <li key={f.key} className="rounded-2xl border border-hairline bg-surface p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold">
                  <span aria-hidden>{ICON_EMOJI[functionIcon(f.name)] ?? '🌸'}</span>
                  {f.name || `Function ${i + 1}`}
                </span>
                <span className="flex text-ink-soft">
                  <button type="button" aria-label="Move earlier" className="grid size-8 place-items-center rounded hover:bg-mist disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" aria-label="Move later" className="grid size-8 place-items-center rounded hover:bg-mist disabled:opacity-30" disabled={i === fns.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown className="size-4" />
                  </button>
                  <button type="button" aria-label="Remove function" className="grid size-8 place-items-center rounded text-sindoor hover:bg-sindoor/10 disabled:opacity-30" disabled={fns.length <= 1} onClick={() => setFns((l) => l.filter((x) => x.key !== f.key))}>
                    <Trash2 className="size-4" />
                  </button>
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2" lang={event.language}>
                <Field label="Name">{(id) => <Input id={id} value={f.name} placeholder="Haldi, Mehendi, Sangeet…" onChange={(e) => upFn(f.key, { name: e.target.value })} />}</Field>
                <div className="grid grid-cols-[1.35fr_1fr] gap-3">
                  <Field label="Date">{(id) => <Input id={id} type="date" value={f.date} onChange={(e) => upFn(f.key, { date: e.target.value })} />}</Field>
                  <Field label="Time">{(id) => <Input id={id} type="time" value={f.time} onChange={(e) => upFn(f.key, { time: e.target.value })} />}</Field>
                </div>
                <Field label="Venue">{(id) => <Input id={id} value={f.venueName} onChange={(e) => upFn(f.key, { venueName: e.target.value })} />}</Field>
                <Field label="Address">{(id) => <Input id={id} value={f.venueAddress} onChange={(e) => upFn(f.key, { venueAddress: e.target.value })} />}</Field>
                <Field label="Dress code (optional)">{(id) => <Input id={id} value={f.dressCode} placeholder="e.g. Yellow / Pastels" onChange={(e) => upFn(f.key, { dressCode: e.target.value })} />}</Field>
                <Field label="Short description (optional)">
                  {(id) => <Input id={id} value={f.notes} maxLength={300} placeholder="e.g. Followed by lunch" onChange={(e) => upFn(f.key, { notes: e.target.value })} />}
                </Field>
              </div>
            </li>
          ))}
        </ol>
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          disabled={fns.length >= 12}
          onClick={() => {
            const last = fns[fns.length - 1];
            setFns((l) => [...l, { key: `new-${Date.now()}`, name: '', date: last?.date ?? '', time: '18:00', venueName: last?.venueName ?? '', venueAddress: last?.venueAddress ?? '', dressCode: '', notes: '' }]);
          }}
        >
          <Plus className="size-4" /> Add function
        </Button>
      </div>

      {/* Welcome & compliments */}
      <div className="grid gap-4 md:grid-cols-2" lang={event.language}>
        <div className="flex flex-col gap-3">
          <h3 className="text-xl">Welcome (Swagatotsuk)</h3>
          <Field label="Heading" hint="e.g. Swagatotsuk, Darshanabhilashi, Eagerly awaiting you">
            {(id, desc) => <Input id={id} aria-describedby={desc} value={c.welcomeTitle ?? ''} onChange={(e) => setC({ ...c, welcomeTitle: e.target.value })} />}
          </Field>
          <Field label="Names (one per line)">{(id) => <Textarea id={id} rows={4} value={welcome} onChange={(e) => setWelcome(e.target.value)} />}</Field>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-xl">Compliments</h3>
          <Field label="Heading" hint="e.g. With best compliments from, सौजन्य से">
            {(id, desc) => <Input id={id} aria-describedby={desc} value={c.complimentsTitle ?? ''} onChange={(e) => setC({ ...c, complimentsTitle: e.target.value })} />}
          </Field>
          <Field label="Names (one per line)">{(id) => <Textarea id={id} rows={4} value={compliments} onChange={(e) => setCompliments(e.target.value)} />}</Field>
        </div>
      </div>

      {/* RSVP */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xl">RSVP on the card</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {contacts.map((r, i) => (
            <div key={i} className="contents">
              <Field label={`Contact ${i + 1} name`}>{(id) => <Input id={id} value={r.name} onChange={(e) => setContacts(contacts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />}</Field>
              <Field label="Phone">{(id) => <Input id={id} type="tel" inputMode="tel" value={r.phone} onChange={(e) => setContacts(contacts.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))} />}</Field>
            </div>
          ))}
        </div>
        <Field label="Kindly RSVP by (optional)" hint="Shown on the card and used by the website's RSVP form.">
          {(id, desc) => <Input id={id} aria-describedby={desc} type="date" className="max-w-56" value={rsvpBy} onChange={(e) => setRsvpBy(e.target.value)} />}
        </Field>
      </div>

      {/* Note & hashtag */}
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]" lang={event.language}>
        <Field label="Note" hint="e.g. Your blessings are our gift. Kindly no boxed gifts.">
          {(id, desc) => <Input id={id} aria-describedby={desc} maxLength={240} value={c.note ?? ''} onChange={(e) => setC({ ...c, note: e.target.value })} />}
        </Field>
        <Field label="Hashtag">{(id) => <Input id={id} maxLength={40} placeholder="#PriyaWedsRahul" value={c.hashtag ?? ''} onChange={(e) => setC({ ...c, hashtag: e.target.value })} />}</Field>
      </div>

      <Button onClick={submit} loading={save.isPending} className="self-start">
        Save card pages
      </Button>
    </section>
  );
}
