'use client';

import { MapPin, Plus, Trash2 } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { useDraft } from './draft-store';

export function StepFunctions() {
  const d = useDraft();
  const hi = useLocale() === 'hi';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl">{hi ? 'कार्यक्रम और स्थान' : 'Functions and venues'}</h2>
        <p className="mt-1 text-ink-soft">
          {hi ? 'हल्दी, मेहंदी, संगीत — हर कार्यक्रम अलग जोड़ें। मेहमान हर एक के लिए RSVP कर सकेंगे।' : 'Add each function separately — guests can RSVP to each one.'}
        </p>
      </div>

      <ol className="flex flex-col gap-4">
        {d.functions.map((f, i) => (
          <li key={f.key} className="panel rounded-[var(--radius-card)] p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-lg">{f.name || (hi ? `कार्यक्रम ${i + 1}` : `Function ${i + 1}`)}</span>
              {d.functions.length > 1 && (
                <Button variant="danger" size="sm" onClick={() => d.removeFunction(f.key)} aria-label={`Remove ${f.name || 'function'}`}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={hi ? 'नाम' : 'Name'}>
                {(id) => <Input id={id} value={f.name} lang={d.language} onChange={(e) => d.updateFunction(f.key, { name: e.target.value })} />}
              </Field>
              <div className="grid grid-cols-[1.4fr_1fr] gap-3">
                <Field label={hi ? 'तारीख़' : 'Date'}>
                  {(id) => <Input id={id} type="date" value={f.date} onChange={(e) => d.updateFunction(f.key, { date: e.target.value })} />}
                </Field>
                <Field label={hi ? 'समय' : 'Time'}>
                  {(id) => <Input id={id} type="time" value={f.time} onChange={(e) => d.updateFunction(f.key, { time: e.target.value })} />}
                </Field>
              </div>
              <Field label={hi ? 'स्थान' : 'Venue'}>
                {(id) => <Input id={id} value={f.venueName} lang={d.language} onChange={(e) => d.updateFunction(f.key, { venueName: e.target.value })} />}
              </Field>
              <Field label={hi ? 'पता (वैकल्पिक)' : 'Address (optional)'}>
                {(id) => <Input id={id} value={f.venueAddress} onChange={(e) => d.updateFunction(f.key, { venueAddress: e.target.value })} />}
              </Field>
              <div className="sm:col-span-2">
                <Field
                  label={hi ? 'Google Maps लिंक (वैकल्पिक)' : 'Google Maps link (optional)'}
                  hint={hi ? 'वेबसाइट पर "रास्ता देखें" बटन बनेगा।' : 'Adds a "Get directions" button on your website.'}
                >
                  {(id, desc) => (
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
                      <Input
                        id={id}
                        aria-describedby={desc}
                        className="pl-9"
                        type="url"
                        inputMode="url"
                        placeholder="https://maps.app.goo.gl/…"
                        value={f.mapUrl}
                        onChange={(e) => d.updateFunction(f.key, { mapUrl: e.target.value })}
                      />
                    </div>
                  )}
                </Field>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {d.functions.length < 12 && (
        <Button variant="outline" onClick={d.addFunction} className="self-start">
          <Plus className="size-4" />
          {hi ? 'कार्यक्रम जोड़ें' : 'Add a function'}
        </Button>
      )}
    </div>
  );
}
