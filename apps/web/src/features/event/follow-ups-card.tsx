'use client';

import type { EventDto, FollowUps, UpdateEventInput } from '@cardai/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { qk } from '@/lib/hooks';

const DEFAULTS: FollowUps = { auto: false, unopenedDays: 3, rsvpDaysBefore: 7, dayBefore: true, thanks: true };

/**
 * When follow-ups go out. With the Website plan they can send themselves from our WhatsApp
 * Business number; otherwise the same guests show up in the tap-through lists above.
 */
export function FollowUpsCard({ event }: { event: EventDto }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<FollowUps>({ ...DEFAULTS, ...event.settings.followUps });
  const paid = event.features.includes('personalized_links');
  const save = useMutation({
    mutationFn: (followUps: FollowUps) =>
      api<EventDto>(`/events/${event.id}`, { method: 'PATCH', json: { settings: { followUps } } satisfies UpdateEventInput }),
    onSuccess: (updated) => {
      qc.setQueryData(qk.event(event.id), updated);
      toast.success('Follow-ups saved');
    },
    onError: (err) => toast.error((err as Error).message),
  });
  const set = (patch: Partial<FollowUps>) => setRules((r) => ({ ...r, ...patch }));
  const num = (label: string, key: 'unopenedDays' | 'rsvpDaysBefore', max: number, suffix: string) => (
    <label className="flex flex-wrap items-center gap-2 text-sm">
      <span className="min-w-44">{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={rules[key]}
        onChange={(e) => set({ [key]: Math.min(max, Math.max(0, Number(e.target.value) || 0)) })}
        className="h-9 w-16 border border-ink/15 bg-transparent px-2 tabular-nums"
      />
      <span className="text-ink-soft">{suffix}</span>
    </label>
  );
  const box = (label: string, key: 'dayBefore' | 'thanks') => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={rules[key]} onChange={(e) => set({ [key]: e.target.checked })} />
      {label}
    </label>
  );

  return (
    <section className="border border-ink/10 bg-ink/[0.015] p-5 sm:p-6">
      <button type="button" className="flex w-full items-center gap-4 text-left" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="grid size-10 shrink-0 place-items-center border border-ink/15">
          <BellRing className="size-5" strokeWidth={1.6} aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block">Follow-ups</span>
          <span className="block text-sm text-ink-soft">
            {event.settings.followUps?.auto && paid ? 'Sending automatically on WhatsApp, 9 am to 8 pm.' : 'Reminders, a day-before message and a thank-you. Choose when.'}
          </span>
        </span>
        <span className="text-sm underline underline-offset-4">{open ? 'Close' : 'Set up'}</span>
      </button>
      {open && (
        <div className="mt-5 flex flex-col gap-3 border-t border-ink/10 pt-5">
          {num('Remind if not opened after', 'unopenedDays', 30, 'days (0 = off)')}
          {num('Ask for RSVP', 'rsvpDaysBefore', 60, 'days before (0 = off)')}
          {box('Day-before message with venue and map', 'dayBefore')}
          {box('Thank-you after the event, with the photo album', 'thanks')}
          <label className="mt-2 flex items-start gap-2 text-sm">
            <input type="checkbox" disabled={!paid} checked={rules.auto && paid} onChange={(e) => set({ auto: e.target.checked })} className="mt-1" />
            <span>
              Send these automatically from the {`Noyta`} WhatsApp number
              <span className="block text-ink-soft">
                {paid ? 'Only to guests with a mobile number, each message once.' : 'Part of the Website plan. Without it, due guests wait in the lists above for you to tap through.'}
              </span>
            </span>
          </label>
          <Button className="self-start" loading={save.isPending} onClick={() => save.mutate(rules)}>
            Save
          </Button>
        </div>
      )}
    </section>
  );
}
