'use client';

import { MEAL_PREFERENCES, type PublicSiteDto, type RsvpStatus } from '@cardai/shared';
import { useState } from 'react';

const LABELS: Record<RsvpStatus, string> = { yes: 'Coming', maybe: 'Maybe', no: "Can't come" };
const MEAL: Record<(typeof MEAL_PREFERENCES)[number], string> = { veg: 'Veg', non_veg: 'Non-veg', jain: 'Jain', vegan: 'Vegan' };

/** One reply per function, with headcount. Personal links pre-fill the guest's name. */
export function RsvpForm({ site, guestToken }: { site: PublicSiteDto; guestToken?: string }) {
  const maxPax = site.guest?.maxPax ?? 10;
  const [name, setName] = useState(site.guest?.name ?? '');
  const [phone, setPhone] = useState('');
  const [answers, setAnswers] = useState<Record<string, { status: RsvpStatus; headcount: number }>>(
    Object.fromEntries(site.functions.map((f) => [f.id, { status: 'yes' as RsvpStatus, headcount: Math.min(2, maxPax) }])),
  );
  const [meal, setMeal] = useState<string>('');
  const [stay, setStay] = useState(false);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    const res = await fetch(`/api/public/events/${site.event.slug}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestToken,
        name,
        phone: phone || undefined,
        responses: Object.entries(answers).map(([functionId, a]) => ({ functionId, ...a })),
        mealPreference: meal || undefined,
        needsAccommodation: site.event.settings.askAccommodation ? stay : undefined,
        note: note || undefined,
      }),
    });
    if (res.ok) setState('done');
    else {
      setError(((await res.json()) as { message?: string }).message ?? 'Could not send your reply.');
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <section className="my-10 rounded-[20px] bg-[var(--inv-surface)] p-8 text-center text-[#2b1a12]" role="status">
        <p className="text-3xl" style={{ fontFamily: 'var(--inv-display)' }}>
          Thank you, {name}!
        </p>
        <p className="mt-2">Your reply has been sent to the family. You can open this link again to change it.</p>
      </section>
    );
  }

  const field = 'h-12 w-full rounded-[12px] border-2 border-[#2b1a12]/20 bg-white px-3 text-[#2b1a12] focus:border-[#2b1a12] focus:outline-none';

  return (
    <section aria-labelledby="rsvp" className="my-10 rounded-[20px] bg-[var(--inv-surface)] p-6 text-[#2b1a12] sm:p-8">
      <h2 id="rsvp" className="text-3xl" style={{ fontFamily: 'var(--inv-display)' }}>
        Will you join us?
      </h2>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
        {!site.guest && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 font-semibold">
              Your name
              <input className={field} required value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 font-semibold">
              Mobile
              <input className={field} required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
          </div>
        )}

        {site.functions.map((f) => {
          const a = answers[f.id]!;
          return (
            <fieldset key={f.id} className="rounded-[14px] border-2 border-[#2b1a12]/15 p-4">
              <legend className="px-1 text-lg font-semibold">{f.name}</legend>
              <div className="flex flex-wrap gap-2">
                {(['yes', 'maybe', 'no'] as const).map((s) => (
                  <label
                    key={s}
                    className="cursor-pointer rounded-full border-2 border-[#2b1a12]/25 px-4 py-2 has-[:checked]:border-[#2b1a12] has-[:checked]:bg-[#2b1a12] has-[:checked]:text-white"
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name={`s-${f.id}`}
                      checked={a.status === s}
                      onChange={() => setAnswers({ ...answers, [f.id]: { ...a, status: s } })}
                    />
                    {LABELS[s]}
                  </label>
                ))}
              </div>
              {a.status !== 'no' && (
                <label className="mt-3 flex items-center gap-3">
                  People
                  <input
                    type="number"
                    min={1}
                    max={maxPax}
                    className={`${field} w-24`}
                    value={a.headcount}
                    onChange={(e) => setAnswers({ ...answers, [f.id]: { ...a, headcount: Math.min(maxPax, Math.max(1, Number(e.target.value))) } })}
                  />
                </label>
              )}
            </fieldset>
          );
        })}

        {site.event.settings.askMealPreference && (
          <label className="flex flex-col gap-1.5 font-semibold">
            Food preference
            <select className={field} value={meal} onChange={(e) => setMeal(e.target.value)}>
              <option value="">No preference</option>
              {MEAL_PREFERENCES.map((m) => (
                <option key={m} value={m}>
                  {MEAL[m]}
                </option>
              ))}
            </select>
          </label>
        )}
        {site.event.settings.askAccommodation && (
          <label className="flex items-center gap-3">
            <input type="checkbox" className="size-5" checked={stay} onChange={(e) => setStay(e.target.checked)} />I need a place to stay
          </label>
        )}
        <label className="flex flex-col gap-1.5 font-semibold">
          Message for the family (optional)
          <textarea className={`${field} h-auto min-h-20 py-2`} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        {state === 'error' && (
          <p className="text-[#b5121b]" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={state === 'sending'}
          className="h-14 rounded-full bg-[#2b1a12] text-lg font-semibold text-white disabled:opacity-60"
        >
          {state === 'sending' ? 'Sending…' : 'Send reply'}
        </button>
      </form>
    </section>
  );
}
