'use client';

import { getEventType, getLanguage, type EventContent } from '@cardai/shared';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { useRequireLogin } from '@/features/auth/use-require-login';
import { api, ApiError } from '@/lib/api';
import { defaultWording } from './default-wording';
import { emptyFunction, useDraft } from './draft-store';

/** The function shown on the card: the ceremony itself for weddings, else the first one. */
export function mainFunctionName(type: Parameters<typeof getEventType>[0]): string {
  const fns = getEventType(type).defaultFunctions as readonly string[];
  return fns.find((f) => /wedding|nikah|anand karaj|matrimony/i.test(f)) ?? fns[0] ?? 'Event';
}

/**
 * Quick start: just names, date and venue. Everything else (wording, layout, colours) is edited
 * straight on the card in the editor.
 */
export function StepQuick() {
  const d = useDraft();
  const hi = useLocale() === 'hi';
  const ev = getEventType(d.type);
  const lang = getLanguage(d.language);
  const people = ev.primaryPeople;
  const fn = d.functions[0];
  const [more, setMore] = useState(Boolean(d.hosts));
  const [converting, setConverting] = useState(false);
  const [writing, setWriting] = useState(false);
  const { ensureLogin, dialog } = useRequireLogin(hi ? 'AI के लिए अपना नंबर सत्यापित करें' : 'Verify your number to use AI');
  const latinNames = d.language !== 'en' && d.names.some((n) => /[a-z]/i.test(n));

  // One function to start with (more can be added later); untouched drafts get the main one.
  useEffect(() => {
    const s = useDraft.getState();
    const name = mainFunctionName(s.type);
    if (s.functions.length !== 1 || (!s.functions[0]!.venueName && s.functions[0]!.name !== name)) {
      const keep = s.functions.find((f) => f.venueName) ?? emptyFunction(name);
      s.set({ functions: [{ ...keep, name: keep.venueName ? keep.name : name }] });
    }
  }, [d.type]);

  const setName = (i: number, v: string) => {
    const names = [...d.names] as [string, string];
    names[i] = v;
    const s = useDraft.getState();
    // Default wording follows the names; hand-written or AI wording is kept.
    const content: EventContent = s.contentIsDefault ? { ...defaultWording(s.type, s.language, names, s.hosts), primaryNames: names.filter(Boolean) } : { ...s.content, primaryNames: names.filter(Boolean) };
    d.set({ names, content });
  };

  async function convertNames() {
    if (!(await ensureLogin())) return;
    setConverting(true);
    try {
      const { results } = await api<{ results: string[] }>('/ai/transliterate', { method: 'POST', json: { texts: d.names.map((t) => t || '-'), language: d.language } });
      const clean = (s?: string) => (s && s !== '-' ? s : '');
      setName(0, clean(results[0]));
      setName(1, clean(results[1]));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not convert names.');
    } finally {
      setConverting(false);
    }
  }

  async function writeWithAi() {
    if (!(await ensureLogin())) return;
    setWriting(true);
    try {
      const content = await api<EventContent>('/ai/wording', {
        method: 'POST',
        json: { eventType: d.type, language: d.language, tone: d.tone, community: d.community, facts: { primaryNames: d.names.filter(Boolean), hosts: d.hosts || undefined } },
      });
      d.set({ content, contentIsDefault: false });
      toast.success(hi ? 'शब्द तैयार हैं' : 'Wording ready. You can change any word on the card.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'AI is unavailable right now. Try again.');
    } finally {
      setWriting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {dialog}
      <div>
        <h2 className="text-2xl sm:text-3xl">{hi ? 'बस तीन बातें' : 'Just three things'}</h2>
        <p className="mt-1 text-ink-soft">{hi ? 'बाकी सब कार्ड पर टैप करके बदलें।' : 'Everything else you can change by tapping it on the card.'}</p>
      </div>

      {people > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: people }, (_, i) => (
            <Field key={i} label={people === 2 ? (i === 0 ? (hi ? 'पहला नाम' : 'First name') : hi ? 'दूसरा नाम' : 'Second name') : ev.category === 'family' || ev.id === 'birthday' ? (hi ? 'किसका कार्यक्रम है' : 'Whose celebration') : hi ? 'नाम' : 'Name'}>
              {(id) => <Input id={id} value={d.names[i]} lang={d.language} autoComplete="off" onChange={(e) => setName(i, e.target.value)} />}
            </Field>
          ))}
        </div>
      )}

      {latinNames && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-hairline bg-sand p-3">
          <p className="flex-1 text-[0.95rem]">{hi ? `नाम ${lang.nativeName} लिपि में बदलें?` : `Write these names in ${lang.name} script?`}</p>
          <Button size="sm" variant="outline" onClick={convertNames} loading={converting}>
            {hi ? `${lang.nativeName} में बदलें` : `Convert to ${lang.nativeName}`}
          </Button>
        </div>
      )}

      {fn && (
        <>
          <div className="grid grid-cols-[1.35fr_1fr] gap-3">
            <Field label={hi ? 'तारीख' : 'Date'}>{(id) => <Input id={id} type="date" value={fn.date} onChange={(e) => d.updateFunction(fn.key, { date: e.target.value })} />}</Field>
            <Field label={hi ? 'समय' : 'Time'}>{(id) => <Input id={id} type="time" value={fn.time} onChange={(e) => d.updateFunction(fn.key, { time: e.target.value })} />}</Field>
          </div>
          <Field label={hi ? 'स्थान' : 'Venue'} hint={hi ? 'जैसे: रामबाग पैलेस' : 'e.g. Rambagh Palace'}>
            {(id, desc) => <Input id={id} aria-describedby={desc} value={fn.venueName} lang={d.language} onChange={(e) => d.updateFunction(fn.key, { venueName: e.target.value })} />}
          </Field>
          <Field label={hi ? 'पता या शहर' : 'Address or city'}>
            {(id) => <Input id={id} value={fn.venueAddress} lang={d.language} onChange={(e) => d.updateFunction(fn.key, { venueAddress: e.target.value })} />}
          </Field>
        </>
      )}

      <div className="rounded-2xl border border-hairline bg-surface">
        <button type="button" onClick={() => setMore(!more)} aria-expanded={more} className="flex w-full items-center justify-between px-4 py-3.5 font-semibold">
          {hi ? 'और जानकारी (वैकल्पिक)' : 'More (optional)'}
          <ChevronDown className={`size-5 transition-transform ${more ? 'rotate-180' : ''}`} />
        </button>
        {more && (
          <div className="flex flex-col gap-4 border-t border-hairline p-4">
            <Field label={hi ? 'आमंत्रित करने वाले' : 'Who is inviting'} hint={hi ? 'जैसे: श्रीमती सुनीता एवं श्री रमेश शर्मा' : 'e.g. Mrs. Sunita & Mr. Ramesh Sharma'}>
              {(id, desc) => (
                <Input
                  id={id}
                  aria-describedby={desc}
                  value={d.hosts}
                  onChange={(e) => {
                    const s = useDraft.getState();
                    d.set({ hosts: e.target.value, ...(s.contentIsDefault ? { content: { ...defaultWording(s.type, s.language, s.names, e.target.value), primaryNames: s.names.filter(Boolean) } } : {}) });
                  }}
                />
              )}
            </Field>
            <Button variant="outline" onClick={writeWithAi} loading={writing} className="self-start">
              <Sparkles className="size-4" />
              {hi ? `AI से ${lang.nativeName} में शब्द लिखें` : `Write the wording with AI in ${lang.name}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
