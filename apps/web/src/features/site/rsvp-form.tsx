'use client';

import { MEAL_PREFERENCES, type RsvpStatus } from '@cardai/shared';
import { useState } from 'react';
import { useSite } from './context';
import { postJson } from './utils';
import { Select } from '@/components/ui/select';

const LABELS: Record<RsvpStatus, string> = { yes: 'Coming', maybe: 'Maybe', no: "Can't come" };
const MEAL: Record<(typeof MEAL_PREFERENCES)[number], string> = { veg: 'Veg', non_veg: 'Non-veg', jain: 'Jain', vegan: 'Vegan' };

/** One reply per function, with headcount. Personal links pre-fill the guest's name. */
export function RsvpForm() {
  const { data: site, guestToken, accessKey, preview, t } = useSite();
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
    if (preview) return;
    setState('sending');
    try {
      await postJson(
        `/api/public/events/${site.event.slug}/rsvp`,
        {
          guestToken,
          key: accessKey,
          name,
          phone: phone || undefined,
          responses: Object.entries(answers).map(([functionId, a]) => ({ functionId, ...a })),
          mealPreference: meal || undefined,
          needsAccommodation: site.event.settings.askAccommodation ? stay : undefined,
          note: note || undefined,
        },
        'Could not send your reply.',
      );
      setState('done');
    } catch (err) {
      // Network drops used to leave the button stuck on "sending"; now the guest can retry.
      setError((err as Error).message);
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <div className="rounded-[22px] bg-[var(--inv-surface)] p-8 text-center text-[var(--inv-on-surface)]" role="status">
        <p className="inv-display inv-enter text-3xl">{t(`Thank you, ${name}!`, `धन्यवाद, ${name}!`)}</p>
        <p className="mt-2">{t('Your reply has been sent to the family. You can open this link again to change it.', 'आपका जवाब परिवार तक पहुँच गया है। बदलने के लिए यह लिंक फिर खोलें।')}</p>
      </div>
    );
  }

  const field = 'h-12 w-full rounded-[12px] border-2 inv-line bg-transparent px-3 text-inherit focus:border-current focus:outline-none';

  return (
    <div className="rounded-[22px] bg-[var(--inv-surface)] p-6 text-[var(--inv-on-surface)] sm:p-8">
      <p className="inv-display text-3xl">{t('Will you join us?', 'क्या आप पधारेंगे?')}</p>
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
            <fieldset key={f.id} className="rounded-[14px] border-2 inv-line p-4">
              <legend className="px-1 text-lg font-semibold">{f.name}</legend>
              <div className="flex flex-wrap gap-2">
                {(['yes', 'maybe', 'no'] as const).map((s) => (
                  <label
                    key={s}
                    className="cursor-pointer rounded-full border-2 inv-line px-4 py-2 has-[:checked]:border-[var(--inv-primary)] has-[:checked]:bg-[var(--inv-primary)] has-[:checked]:text-[var(--inv-on-primary)]"
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
            <Select variant="plain" className={`${field} font-normal`} value={meal} onChange={(e) => setMeal(e.target.value)}>
              <option value="">No preference</option>
              {MEAL_PREFERENCES.map((m) => (
                <option key={m} value={m}>
                  {MEAL[m]}
                </option>
              ))}
            </Select>
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
          <p className="text-[#C0392B]" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={state === 'sending' || preview}
          className="h-14 rounded-full bg-[var(--inv-primary)] text-lg font-semibold text-[var(--inv-on-primary)] disabled:opacity-60"
        >
          {state === 'sending' ? t('Sending…', 'भेज रहे हैं…') : t('Send reply', 'जवाब भेजें')}
        </button>
      </form>
    </div>
  );
}
