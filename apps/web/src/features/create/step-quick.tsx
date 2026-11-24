'use client';

import { COMMUNITIES, getEventType, getLanguage, localizeFunctionName, type Community, type EventContent, type LanguageCode, type ScanField } from '@cardai/shared';
import { clsx } from 'clsx';
import { CalendarDays, Check, Languages, MapPin, Plus, Sparkles, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Chip, Field, Input, Select } from '@/components/ui/field';
import { DatePicker, todayYmd, useRelativeDays } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { useRequireLogin } from '@/features/auth/use-require-login';
import { api, ApiError } from '@/lib/api';
import { defaultWording } from './default-wording';
import { DraftPreview } from './draft-preview';
import { emptyFunction, useDraft } from './draft-store';
import { MapLinkField } from './map-link-field';

export { detailsProblem } from './validate';
import { CheckBadge, FLAGGED, FunctionList, resolveScanField, ScanReview } from './scan/scan-review';

/** The function shown on the card: the ceremony itself for weddings, else the first one. */
export function mainFunctionName(type: Parameters<typeof getEventType>[0], language: LanguageCode = 'en'): string {
  const fns = getEventType(type).defaultFunctions as readonly string[];
  return localizeFunctionName(fns.find((f) => /wedding|nikah|anand karaj|matrimony/i.test(f)) ?? fns[0] ?? 'Event', language);
}

/** Occasions where the tradition changes the blessing line and which designs come first. */
const TRADITION_CATEGORIES = new Set(['wedding', 'religious', 'family']);

/**
 * Details, in short cards beside a live preview. Only names, date and venue are required;
 * everything else is edited on the card later. The design is picked after this, with these details on it.
 */
export function StepQuick({ showErrors, onRescan }: { showErrors: boolean; onRescan: () => void }) {
  const d = useDraft();
  const t = useTranslations('create');
  const hi = useLocale() === 'hi';
  const ev = getEventType(d.type);
  const lang = getLanguage(d.language);
  const people = ev.primaryPeople;
  const fn = d.functions[0];
  const [converting, setConverting] = useState(false);
  const [writing, setWriting] = useState(false);
  // The optional section stays folded until wanted (open when it already has something in it).
  const [moreOpen, setMoreOpen] = useState(() => d.source === 'scan' || Boolean(d.hosts.trim()) || !d.contentIsDefault);
  const relDays = useRelativeDays();
  const { ensureLogin, dialog } = useRequireLogin(t('loginAi'));
  const latinNames = d.language !== 'en' && d.names.some((n) => /[a-z]/i.test(n));
  const scanned = d.source === 'scan';
  /** Fields the card scan was unsure about, until the user edits them. */
  const check = (f: ScanField) => scanned && Boolean(d.scan?.uncertain.includes(f));

  // One function to start with (the main one); more are added with the chips below. Only a new
  // occasion starts the list afresh, so functions the user added survive going back and forth.
  useEffect(() => {
    const s = useDraft.getState();
    if (s.source === 'scan' || s.fnType === s.type) return; // every function read off the card is kept
    const name = mainFunctionName(s.type, s.language);
    const keep = s.functions.find((f) => f.venueName) ?? emptyFunction(name);
    s.set({ functions: [{ ...keep, name: keep.venueName ? keep.name : name }], fnType: s.type });
  }, [d.type]);

  /** Other functions of this occasion not on the list yet (e.g. Haldi, Mehendi, Sangeet for a wedding). */
  const suggestions = (ev.defaultFunctions as readonly string[])
    .map((f) => localizeFunctionName(f, d.language))
    .filter((name) => !d.functions.some((f) => f.name.trim().toLowerCase() === name.toLowerCase()));
  const addFunction = (name: string) => {
    const s = useDraft.getState();
    const main = s.functions[0];
    const order = (n: string) => (ev.defaultFunctions as readonly string[]).findIndex((f) => localizeFunctionName(f, s.language).toLowerCase() === n.toLowerCase());
    // Same day and venue as the main function to start with: usually right, always editable.
    const next = { ...emptyFunction(name), date: main?.date ?? '', time: '', venueName: main?.venueName ?? '', venueAddress: main?.venueAddress ?? '', mapUrl: main?.mapUrl ?? '' };
    const list = [...s.functions, next];
    // Keep the occasion's usual order (Haldi → Mehendi → Sangeet → Wedding → Reception); custom ones last.
    list.sort((a, b) => {
      const oa = order(a.name), ob = order(b.name);
      return (oa < 0 ? 99 : oa) - (ob < 0 ? 99 : ob);
    });
    s.set({ functions: list, fnType: s.type });
  };

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
      const { results } = await api<{ results: string[] }>('/ai/transliterate', { method: 'POST', json: { texts: d.names.map((x) => x || '-'), language: d.language } });
      const clean = (s?: string) => (s && s !== '-' ? s : '');
      setName(0, clean(results[0]));
      setName(1, clean(results[1]));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('convertFailed'));
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
      toast.success(t('aiReady'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('aiFailed'));
    } finally {
      setWriting(false);
    }
  }

  const namesDone = people === 0 || d.names.slice(0, people).every((n) => n.trim());
  const whenDone = Boolean(fn?.date && fn.venueName.trim());
  const err = (missing: boolean) => (showErrors && missing ? t('required') : undefined);
  const nameLabel = (i: number) => (people === 2 ? (i === 0 ? t('firstName') : t('secondName')) : ev.category === 'family' || ev.id === 'birthday' ? t('whoseCelebration') : t('name'));
  const tradition = TRADITION_CATEGORIES.has(ev.category) && (
    <Field label={t('tradition')} hint={t('traditionHint')}>
      {(id) => (
        <Select
          id={id}
          value={d.community ?? ''}
          className="h-11"
          onChange={(e) =>
            d.set({
              community: (e.target.value || undefined) as Community | undefined,
              // Untouched wording is rewritten for the new tradition (its blessing line changes).
              ...(d.contentIsDefault ? { content: { ...d.content, headline: '' } } : {}),
            })
          }
        >
          <option value="">{t('anyTradition')}</option>
          {COMMUNITIES.map((c) => (
            <option key={c} value={c}>
              {t(`community.${c}`)}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );

  let n = 0;
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
      {dialog}
      <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
        {scanned && <ScanReview hi={hi} onRescan={onRescan} />}
        {people > 0 && (
          <Section n={++n} done={namesDone} flag={check('names') || check('parentage')} icon={<Users className="size-4" />} title={people === 2 ? t('couple') : t('whoFor')} sub={t('asPrinted')}>
            <div className={clsx('grid gap-4', people === 2 && 'sm:grid-cols-2')}>
              {Array.from({ length: people }, (_, i) => (
                <Field key={i} label={nameLabel(i)} error={err(!d.names[i]?.trim())}>
                  {(id, desc) => (
                    <Input id={id} aria-describedby={desc} aria-invalid={Boolean(err(!d.names[i]?.trim()))} className={clsx(check('names') && FLAGGED)} value={d.names[i]} lang={d.language} autoComplete="off" autoFocus={i === 0 && !scanned} placeholder={people === 2 ? (i === 0 ? 'Aarav' : 'Diya') : 'Ananya'} onChange={(e) => setName(i, e.target.value)} />
                  )}
                </Field>
              ))}
              {scanned &&
                people === 2 &&
                [0, 1].map((i) => (
                  <Field key={`p${i}`} label={t('parentsLine')} hint={t('parentsHint')}>
                    {(id) => <Input id={id} value={d.parentage[i]} lang={d.language} className={clsx(check('parentage') && FLAGGED)} onChange={(e) => setParentage(i, e.target.value)} />}
                  </Field>
                ))}
            </div>
            {latinNames && (
              <div className="mt-5 flex flex-wrap items-center gap-3 border border-ink/10 bg-ink/[0.03] p-3 pl-4">
                <Languages className="size-4 shrink-0" aria-hidden />
                <p className="flex-1 text-[0.95rem]">{t('convertAsk', { language: lang.nativeName })}</p>
                <Button size="sm" variant="line" onClick={convertNames} loading={converting}>
                  {t('convertCta', { language: lang.nativeName })}
                </Button>
              </div>
            )}
            {tradition && <div className="mt-4 sm:max-w-xs">{tradition}</div>}
          </Section>
        )}

        {scanned ? (
          <Section
            n={++n}
            done={d.functions.every((f) => f.date && f.venueName.trim())}
            flag={check('date') || check('time') || check('venue')}
            icon={<CalendarDays className="size-4" />}
            title={t('functions')}
            sub={t('functionsFound', { n: d.functions.length })}
          >
            <FunctionList hi={hi} showErrors={showErrors} check={check} />
          </Section>
        ) : d.functions.length > 1 ? (
          <Section n={++n} done={d.functions.every((f) => f.date && f.venueName.trim())} icon={<CalendarDays className="size-4" />} title={t('functions')} sub={t('functionsSub')}>
            <FunctionList hi={hi} showErrors={showErrors} check={check} addButton={false} />
            <FunctionChips names={suggestions} onAdd={addFunction} />
          </Section>
        ) : (
          fn && (
            <Section n={++n} done={whenDone} icon={<CalendarDays className="size-4" />} title={t('whenWhere')} sub={t('whenWhereSub', { name: fn.name })}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('date')} error={err(!fn.date)} hint={fn.date ? relDays(fn.date) : undefined}>
                  {(id, desc) => <DatePicker id={id} aria-describedby={desc} aria-invalid={Boolean(err(!fn.date))} min={todayYmd()} value={fn.date} onChange={(v) => d.updateFunction(fn.key, { date: v })} />}
                </Field>
                <Field label={t('time')}>{(id) => <TimePicker id={id} value={fn.time} onChange={(v) => d.updateFunction(fn.key, { time: v })} />}</Field>
                <Field label={t('venue')} error={err(!fn.venueName.trim())}>
                  {(id, desc) => (
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
                      <Input id={id} aria-describedby={desc} aria-invalid={showErrors && !fn.venueName.trim()} className="pl-10" placeholder={t('venuePh')} value={fn.venueName} lang={d.language} onChange={(e) => d.updateFunction(fn.key, { venueName: e.target.value })} />
                    </div>
                  )}
                </Field>
                <Field label={t('address')}>
                  {(id) => <Input id={id} value={fn.venueAddress} lang={d.language} placeholder={t('addressPh')} onChange={(e) => d.updateFunction(fn.key, { venueAddress: e.target.value })} />}
                </Field>
                <MapLinkField value={fn.mapUrl} onChange={(mapUrl) => d.updateFunction(fn.key, { mapUrl })} />
              </div>
              <FunctionChips names={suggestions} onAdd={addFunction} />
              {people === 0 && tradition && <div className="mt-4 sm:max-w-xs">{tradition}</div>}
            </Section>
          )
        )}

        {moreOpen ? (
          <Section n={n + 1} optional flag={check('hosts') || check('wording')} done={Boolean(d.hosts.trim())} icon={<Sparkles className="size-4" />} title={t('hostsTitle')} sub={t('hostsSub')}>
            <Field label={t('whoInviting')}>
              {(id) => (
                <Input
                  id={id}
                  value={d.hosts}
                  placeholder={t('hostsPh')}
                  onChange={(e) => {
                    const s = useDraft.getState();
                    resolveScanField('hosts');
                    d.set({ hosts: e.target.value, ...(s.contentIsDefault ? { content: { ...defaultWording(s.type, s.language, s.names, e.target.value, s.community), primaryNames: s.names.filter(Boolean) } } : {}) });
                  }}
                />
              )}
            </Field>
            <div className="mt-5 flex flex-col gap-3 border border-dashed border-ink/15 p-4 sm:flex-row sm:items-center">
              <p className="flex-1 text-[0.95rem] text-ink-soft">{scanned ? t('wordingScanned') : d.contentIsDefault ? t('wordingDefault') : t('wordingAi')}</p>
              <Button variant="line" onClick={writeWithAi} loading={writing} className="shrink-0">
                <Sparkles className="size-4" />
                {scanned ? t('rewriteAi') : t('writeAi', { language: lang.nativeName })}
              </Button>
            </div>
          </Section>
        ) : (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="press flex w-full items-center gap-4 rounded-[var(--radius-card)] border border-dashed border-ink/15 p-4 text-left transition-colors hover:border-ink/40 sm:p-5"
          >
            <span className="grid size-10 shrink-0 place-items-center border border-ink/15 text-ink-soft">
              <Plus className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2.5">
                {t('hostsTitle')}
                <span className="border border-ink/15 px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider text-ink-soft">{t('optional')}</span>
              </span>
              <span className="mt-0.5 block text-sm text-ink-soft">{t('hostsSub')}</span>
            </span>
          </button>
        )}
      </div>

      {/* Live preview: sticky beside the form on desktop (phones get the thumbnail in the dock). */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 border border-ink/10 bg-ink/[0.02]">
          <div className="border-b border-ink/10 px-5 py-4">
            <p className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-wider text-gold">
              <span className="size-1.5 animate-pulse rounded-full bg-gold" aria-hidden />
              {t('livePreview')}
            </p>
            <p className="mt-1 text-sm text-ink-soft">{t('livePreviewSub')}</p>
          </div>
          <div className="editor-stage p-6">
            <DraftPreview className="mx-auto max-w-[290px]" />
          </div>
        </div>
      </aside>
    </div>
  );
}

/** One tap adds a function (pre-filled with the main day and venue); "Other" adds a blank one. */
function FunctionChips({ names, onAdd }: { names: string[]; onAdd: (name: string) => void }) {
  const t = useTranslations('create');
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-4">
      <span className="mr-1 text-sm text-ink-soft">{t('addFunction')}</span>
      {names.map((name) => (
        <Chip key={name} onClick={() => onAdd(name)} className="h-9 gap-1.5">
          <Plus className="size-3.5" aria-hidden />
          {name}
        </Chip>
      ))}
      <Chip onClick={() => onAdd('')} className="h-9 gap-1.5">
        <Plus className="size-3.5" aria-hidden />
        {t('otherFunction')}
      </Chip>
    </div>
  );
}

function Section({ n, done, flag, icon, title, sub, optional, children }: { n: number; done: boolean; flag?: boolean; icon: ReactNode; title: string; sub: string; optional?: boolean; children: ReactNode }) {
  const t = useTranslations('create');
  const hi = useLocale() === 'hi';
  return (
    <section className={clsx('border bg-ink/[0.02] p-5 transition-colors duration-500 sm:p-7', flag ? 'border-gold/50' : done ? 'border-ink/20' : 'border-ink/10')}>
      <header className="mb-6 flex items-start gap-4 sm:gap-5">
        <span
          className={clsx('grid size-10 shrink-0 place-items-center border font-mono text-xs transition-colors duration-500', done ? 'border-ink bg-ink text-ivory' : 'border-ink/15 text-ink-soft')}
          aria-hidden
        >
          {done ? <Check className="size-4 animate-pop" strokeWidth={2.5} /> : String(n).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2.5 text-lg sm:text-xl">
            {title}
            {optional && <span className="border border-ink/15 px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider text-ink-soft">{t('optional')}</span>}
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
