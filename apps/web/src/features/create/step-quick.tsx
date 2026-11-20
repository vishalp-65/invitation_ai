'use client';

import { getEventType, getLanguage, type EventContent, type ScanField } from '@cardai/shared';
import { clsx } from 'clsx';
import { CalendarDays, Check, Languages, MapPin, Paintbrush, Sparkles, Users } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { useRequireLogin } from '@/features/auth/use-require-login';
import { api, ApiError } from '@/lib/api';
import { defaultWording } from './default-wording';
import { DraftPreview } from './draft-preview';
import { emptyFunction, useDraft, type Draft } from './draft-store';
import { findTemplate } from '@/lib/template-hooks';
import { CheckBadge, FLAGGED, FunctionList, resolveScanField, ScanReview } from './scan/scan-review';

/** The function shown on the card: the ceremony itself for weddings, else the first one. */
export function mainFunctionName(type: Parameters<typeof getEventType>[0]): string {
  const fns = getEventType(type).defaultFunctions as readonly string[];
  return fns.find((f) => /wedding|nikah|anand karaj|matrimony/i.test(f)) ?? fns[0] ?? 'Event';
}

/** What still blocks "Create", or null. */
export function detailsProblem(d: Pick<Draft, 'type' | 'names' | 'functions'>, hi: boolean): string | null {
  const people = getEventType(d.type).primaryPeople;
  if (d.names.slice(0, people).some((n) => !n.trim())) return hi ? 'नाम भरिए।' : people === 2 ? 'Add both names.' : 'Add the name.';
  if (d.functions.some((f) => !f.date)) return hi ? 'तारीख भरिए।' : 'Add the date.';
  if (d.functions.some((f) => !f.venueName.trim())) return hi ? 'स्थान भरिए।' : 'Add the venue.';
  return null;
}

/**
 * Details, in three short cards beside a live preview of the chosen design. Only names, date and
 * venue are required; everything else is edited on the card later.
 */
export function StepQuick({ showErrors, onChangeDesign, onRescan }: { showErrors: boolean; onChangeDesign: () => void; onRescan: () => void }) {
  const d = useDraft();
  const hi = useLocale() === 'hi';
  const ev = getEventType(d.type);
  const lang = getLanguage(d.language);
  const people = ev.primaryPeople;
  const fn = d.functions[0];
  const template = findTemplate(d.templateId);
  const [converting, setConverting] = useState(false);
  const [writing, setWriting] = useState(false);
  const { ensureLogin, dialog } = useRequireLogin(hi ? 'AI के लिए अपना ईमेल सत्यापित करें' : 'Verify your email to use AI');
  const latinNames = d.language !== 'en' && d.names.some((n) => /[a-z]/i.test(n));
  const scanned = d.source === 'scan';
  /** Fields the card scan was unsure about, until the user edits them. */
  const check = (f: ScanField) => scanned && Boolean(d.scan?.uncertain.includes(f));

  // One function to start with (more are added in the editor); untouched drafts get the main one.
  useEffect(() => {
    const s = useDraft.getState();
    if (s.source === 'scan') return; // every function read off the card is kept
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
    const content: EventContent = s.contentIsDefault
      ? { ...defaultWording(s.type, s.language, names, s.hosts, s.community), primaryNames: names.filter(Boolean) }
      : { ...s.content, primaryNames: names.filter(Boolean) };
    d.set({ names, content });
    resolveScanField('names');
  };

  const setParentage = (i: number, v: string) => {
    const parentage = [...d.parentage] as [string, string];
    parentage[i] = v;
    d.set({ parentage, content: { ...useDraft.getState().content, primaryDetails: parentage.filter(Boolean) } });
    resolveScanField('parentage');
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

  const namesDone = people === 0 || d.names.slice(0, people).every((n) => n.trim());
  const whenDone = Boolean(fn?.date && fn.venueName.trim());
  const err = (missing: boolean, msg: string) => (showErrors && missing ? msg : undefined);
  const nameLabel = (i: number) =>
    people === 2
      ? i === 0
        ? hi ? 'वर / पहला नाम' : 'First name'
        : hi ? 'वधू / दूसरा नाम' : 'Second name'
      : ev.category === 'family' || ev.id === 'birthday'
        ? hi ? 'किसका कार्यक्रम है' : 'Whose celebration'
        : hi ? 'नाम' : 'Name';

  let n = 0;
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
      {dialog}
      <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
        {scanned && <ScanReview hi={hi} onRescan={onRescan} />}
        {people > 0 && (
          <Section n={++n} done={namesDone} flag={check('names') || check('parentage')} hi={hi} icon={<Users className="size-4" />} title={people === 2 ? (hi ? 'जोड़े के नाम' : 'The couple') : hi ? 'किसके लिए' : 'Who it’s for'} sub={hi ? 'जैसे कार्ड पर छपना चाहिए।' : 'Exactly as they should appear on the card.'}>
            <div className={clsx('grid gap-4', people === 2 && 'sm:grid-cols-2')}>
              {Array.from({ length: people }, (_, i) => (
                <Field key={i} label={nameLabel(i)} error={err(!d.names[i]?.trim(), hi ? 'नाम ज़रूरी है' : 'Required')}>
                  {(id, desc) => (
                    <Input id={id} aria-describedby={desc} aria-invalid={Boolean(err(!d.names[i]?.trim(), 'x'))} className={clsx(check('names') && FLAGGED)} value={d.names[i]} lang={d.language} autoComplete="off" placeholder={people === 2 ? (i === 0 ? 'Aarav' : 'Diya') : 'Ananya'} onChange={(e) => setName(i, e.target.value)} />
                  )}
                </Field>
              ))}
              {scanned &&
                people === 2 &&
                [0, 1].map((i) => (
                  <Field key={`p${i}`} label={hi ? 'माता-पिता की पंक्ति' : 'Parents line'} hint={hi ? 'वैकल्पिक' : 'Optional, e.g. “S/o Mr. & Mrs. Sharma”'}>
                    {(id) => <Input id={id} value={d.parentage[i]} lang={d.language} className={clsx(check('parentage') && FLAGGED)} onChange={(e) => setParentage(i, e.target.value)} />}
                  </Field>
                ))}
            </div>
            {latinNames && (
              <div className="mt-5 flex flex-wrap items-center gap-3 border border-ink/10 bg-ink/[0.03] p-3 pl-4">
                <Languages className="size-4 shrink-0" aria-hidden />
                <p className="flex-1 text-[0.95rem]">{hi ? `नाम ${lang.nativeName} लिपि में बदलें?` : `Your card is in ${lang.name}. Write the names in ${lang.name} script?`}</p>
                <Button size="sm" variant="line" onClick={convertNames} loading={converting}>
                  {hi ? `${lang.nativeName} में बदलें` : `Convert to ${lang.nativeName}`}
                </Button>
              </div>
            )}
          </Section>
        )}

        {scanned ? (
          <Section
            n={++n}
            done={d.functions.every((f) => f.date && f.venueName.trim())}
            flag={check('date') || check('time') || check('venue')}
            hi={hi}
            icon={<CalendarDays className="size-4" />}
            title={hi ? 'कार्यक्रम' : 'Functions'}
            sub={hi ? `कार्ड पर ${d.functions.length} कार्यक्रम मिले। तारीख़ और स्थान ज़रूरी हैं।` : `${d.functions.length} ${d.functions.length === 1 ? 'function' : 'functions'} found on your card. Date and venue are required.`}
          >
            <FunctionList hi={hi} showErrors={showErrors} check={check} />
          </Section>
        ) : fn && (
          <Section n={++n} done={whenDone} icon={<CalendarDays className="size-4" />} title={hi ? 'कब और कहाँ' : 'When & where'} sub={hi ? `${fn.name} की तारीख और स्थान। बाकी कार्यक्रम एडिटर में जोड़ें।` : `For the ${fn.name.toLowerCase()}. Add more functions in the editor.`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={hi ? 'तारीख' : 'Date'} error={err(!fn.date, hi ? 'तारीख ज़रूरी है' : 'Required')}>
                {(id) => <Input id={id} type="date" value={fn.date} onChange={(e) => d.updateFunction(fn.key, { date: e.target.value })} />}
              </Field>
              <Field label={hi ? 'समय' : 'Time'}>
                {(id) => <Input id={id} type="time" value={fn.time} onChange={(e) => d.updateFunction(fn.key, { time: e.target.value })} />}
              </Field>
              <Field label={hi ? 'स्थान' : 'Venue'} error={err(!fn.venueName.trim(), hi ? 'स्थान ज़रूरी है' : 'Required')}>
                {(id, desc) => (
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
                    <Input id={id} aria-describedby={desc} aria-invalid={showErrors && !fn.venueName.trim()} className="pl-10" placeholder={hi ? 'जैसे: रामबाग पैलेस' : 'e.g. Rambagh Palace'} value={fn.venueName} lang={d.language} onChange={(e) => d.updateFunction(fn.key, { venueName: e.target.value })} />
                  </div>
                )}
              </Field>
              <Field label={hi ? 'पता या शहर' : 'Address or city'}>
                {(id) => <Input id={id} value={fn.venueAddress} lang={d.language} placeholder={hi ? 'जयपुर, राजस्थान' : 'Jaipur, Rajasthan'} onChange={(e) => d.updateFunction(fn.key, { venueAddress: e.target.value })} />}
              </Field>
            </div>
          </Section>
        )}

        <Section n={n + 1} optional hi={hi} flag={check('hosts') || check('wording')} done={Boolean(d.hosts.trim())} icon={<Sparkles className="size-4" />} title={hi ? 'निमंत्रक और शब्द' : 'Hosts & wording'} sub={hi ? 'कौन आमंत्रित कर रहा है, और कार्ड के शब्द।' : 'Who is inviting, and the words on the card.'}>
          <Field label={hi ? 'आमंत्रित करने वाले' : 'Who is inviting'}>
            {(id) => (
              <Input
                id={id}
                value={d.hosts}
                placeholder={hi ? 'श्रीमती सुनीता एवं श्री रमेश शर्मा' : 'Mrs. Sunita & Mr. Ramesh Sharma'}
                onChange={(e) => {
                  const s = useDraft.getState();
                  resolveScanField('hosts');
                  d.set({ hosts: e.target.value, ...(s.contentIsDefault ? { content: { ...defaultWording(s.type, s.language, s.names, e.target.value, s.community), primaryNames: s.names.filter(Boolean) } } : {}) });
                }}
              />
            )}
          </Field>
          <div className="mt-5 flex flex-col gap-3 border border-dashed border-ink/15 p-4 sm:flex-row sm:items-center">
            <p className="flex-1 text-[0.95rem] text-ink-soft">
              {scanned
                ? hi ? 'आपके छपे कार्ड के शब्द वैसे ही लगाए गए हैं। हर पंक्ति एडिटर में बदल सकते हैं।' : 'The wording from your printed card is used as is. Change any line in the editor.'
                : d.contentIsDefault
                  ? hi ? 'अभी कार्ड पर सामान्य शब्द हैं।' : 'Your card has standard wording right now.'
                  : hi ? 'AI के शब्द कार्ड पर लगे हैं।' : 'AI wording is on your card.'}
            </p>
            <Button variant="line" onClick={writeWithAi} loading={writing} className="shrink-0">
              <Sparkles className="size-4" />
              {scanned ? (hi ? 'AI से नए शब्द' : 'Rewrite with AI') : hi ? `AI से ${lang.nativeName} में लिखें` : `Write in ${lang.name} with AI`}
            </Button>
          </div>
        </Section>
      </div>

      {/* Live preview of the chosen design: sticky beside the form on desktop. */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 border border-ink/10 bg-ink/[0.02]">
          <div className="flex items-center justify-between gap-3 border-b border-ink/10 px-5 py-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-wider text-gold">
                <span className="size-1.5 animate-pulse rounded-full bg-gold" aria-hidden />
                {hi ? 'लाइव झलक' : 'Live preview'}
              </p>
              <p className="mt-1 truncate">{template?.family?.name ?? template?.name}</p>
            </div>
            <Button variant="line" size="sm" onClick={onChangeDesign} className="shrink-0">
              <Paintbrush className="size-3.5" />
              {hi ? 'बदलें' : 'Change'}
            </Button>
          </div>
          <div className="editor-stage p-6">
            <DraftPreview className="mx-auto max-w-[290px]" />
          </div>
        </div>
      </aside>
    </div>
  );
}

function Section({ n, done, flag, icon, title, sub, optional, hi, children }: { n: number; done: boolean; flag?: boolean; icon: ReactNode; title: string; sub: string; optional?: boolean; hi?: boolean; children: ReactNode }) {
  return (
    <section className={clsx('border bg-ink/[0.02] p-5 transition-colors duration-500 sm:p-7', flag ? 'border-gold/50' : done ? 'border-ink/20' : 'border-ink/10')}>
      <header className="mb-6 flex items-start gap-4 sm:gap-5">
        <span
          className={clsx(
            'grid size-10 shrink-0 place-items-center border font-mono text-xs transition-colors duration-500',
            done ? 'border-ink bg-ink text-ivory' : 'border-ink/15 text-ink-soft',
          )}
          aria-hidden
        >
          {done ? <Check className="size-4 animate-pop" strokeWidth={2.5} /> : String(n).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2.5 text-lg sm:text-xl">
            {title}
            {optional && <span className="border border-ink/15 px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider text-ink-soft">{hi ? 'वैकल्पिक' : 'Optional'}</span>}
            {flag && <CheckBadge hi={hi} />}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <span className="text-ink-soft/70" aria-hidden>
              {icon}
            </span>
            {sub}
          </p>
        </div>
      </header>
      {children}
    </section>
  );
}
