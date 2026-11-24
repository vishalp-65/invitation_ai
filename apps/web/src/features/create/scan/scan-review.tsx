'use client';

import { EVENT_TYPES, LANGUAGES, type EventTypeId, type LanguageCode, type ScanField } from '@cardai/shared';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { AlertTriangle, MapPin, Plus, RotateCcw, ScanText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { MapLinkField } from '../map-link-field';
import { useDraft, type DraftFunction } from '../draft-store';
import { useScanPhotos } from './scan-photos';

/** Gold outline on a value the card scan wasn't sure about. */
export const FLAGGED = '!border-gold/70 bg-gold/[0.05]';
/** FLAGGED for a picker: its wrapper carries the class, the trigger button gets the look. */
const FLAGGED_WRAP = '[&>button]:!border-gold/70 [&>button]:bg-gold/[0.05]';

/** The user touched a field the scan flagged: stop flagging it. */
export function resolveScanField(f: ScanField) {
  const s = useDraft.getState();
  if (s.scan?.uncertain.includes(f)) s.set({ scan: { ...s.scan, uncertain: s.scan.uncertain.filter((x) => x !== f) } });
}

/** `hi` is accepted for older callers; the label follows the UI language. */
export function CheckBadge(_: { hi?: boolean }) {
  const t = useTranslations('scan');
  return (
    <span className="inline-flex items-center gap-1 border border-gold/50 bg-gold/[0.08] px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider text-gold">
      <AlertTriangle className="size-3" aria-hidden />
      {t('check')}
    </span>
  );
}

/** Top of the review step after a card scan: what was read, from which photos, occasion + language. */
export function ScanReview({ onRescan }: { hi?: boolean; onRescan: () => void }) {
  const t = useTranslations('scan');
  const tc = useTranslations('create');
  const d = useDraft();
  const photos = useScanPhotos((s) => s.photos);
  const scan = d.scan;
  const flagType = Boolean(scan && (!scan.eventTypeFound || scan.uncertain.includes('eventType')));
  const flagLang = Boolean(scan?.uncertain.includes('language'));
  const toCheck = scan?.uncertain.filter((f) => f !== 'eventType' && f !== 'language').length ?? 0;

  return (
    <section className="border border-ink/15 p-5 sm:p-7" aria-label={t('detailsReadFromYour')}>
      <div className="flex flex-wrap items-start gap-4">
        {photos.length > 0 && (
          <div className="flex -space-x-5 pl-1">
            {photos.slice(0, 4).map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL
              <img key={p.id} src={p.url} alt="" className="h-16 w-12 border-2 border-ivory object-cover" style={{ transform: `rotate(${(i - 1) * 4}deg)` }} />
            ))}
          </div>
        )}
        <div className="min-w-0 flex-1 basis-56">
          <p className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-wider text-gold">
            <ScanText className="size-3.5" aria-hidden />
            {t('readFromYourCard')}
          </p>
          <p className="mt-1.5 text-[0.95rem]">
            {toCheck > 0
              ? t('partsNeedLook', { n: toCheck })
              : t('everythingIsFilledIn')}
          </p>
          {scan?.method === 'local' && (
            <p className="mt-2 text-sm text-ink-soft">
              {t('ourAiReaderWas')}
            </p>
          )}
        </div>
        <Button variant="line" size="sm" onClick={onRescan} className="shrink-0">
          <RotateCcw className="size-3.5" />
          {t('scanAgain')}
        </Button>
      </div>

      <div className="mt-6 grid gap-4 border-t border-ink/10 pt-6 sm:grid-cols-2">
        <Field label={t('occasion')} action={flagType ? <CheckBadge /> : undefined}>
          {(id) => (
            <Select
              id={id}
              value={d.type}
              className={clsx(flagType && FLAGGED)}
              onChange={(e) => {
                d.setType(e.target.value as EventTypeId);
                const s = useDraft.getState();
                if (s.scan) s.set({ scan: { ...s.scan, eventTypeFound: true, uncertain: s.scan.uncertain.filter((x) => x !== 'eventType') } });
              }}
            >
              {EVENT_TYPES.map((e) => (
                <option key={e.id} value={e.id}>
                  {tc(`occ.${e.id}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('cardLanguage')} action={flagLang ? <CheckBadge /> : undefined}>
          {(id) => (
            <Select
              id={id}
              value={d.language}
              className={clsx(flagLang && FLAGGED)}
              onChange={(e) => {
                d.set({ language: e.target.value as LanguageCode });
                resolveScanField('language');
              }}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName} · {l.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </section>
  );
}

/** Every function read off the card, each editable; at least one is kept. */
export function FunctionList({ showErrors, check, addButton = true }: { hi?: boolean; showErrors: boolean; check: (f: ScanField) => boolean; addButton?: boolean }) {
  const t = useTranslations('scan');
  const d = useDraft();
  const many = d.functions.length > 1;
  const edit = (key: string, patch: Partial<DraftFunction>, field: ScanField) => {
    d.updateFunction(key, patch);
    resolveScanField(field);
  };

  return (
    <div className="flex flex-col gap-4">
      {d.functions.map((f, i) => {
        const noDate = !f.date;
        const noVenue = !f.venueName.trim();
        return (
          <div key={f.key} className={clsx('grid gap-4 sm:grid-cols-2', many && i > 0 && 'border-t border-ink/10 pt-5')}>
            {many && (
              <div className="flex items-end gap-2 sm:col-span-2">
                <span className="mb-2.5 font-mono text-xs text-ink-soft">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex-1">
                  <Field label={t('function')}>
                    {(id) => <Input id={id} value={f.name} lang={d.language} onChange={(e) => d.updateFunction(f.key, { name: e.target.value })} />}
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() => d.removeFunction(f.key)}
                  className="press grid size-10 shrink-0 place-items-center rounded-[var(--radius-field)] border border-ink/15 text-ink-soft transition-colors hover:border-sindoor/50 hover:text-sindoor"
                  aria-label={t('removeFunction', { name: f.name || t('function') })}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            )}
            <Field label={t('date')} error={showErrors && noDate ? (t('required')) : undefined}>
              {(id) => (
                <DatePicker id={id} value={f.date} aria-invalid={showErrors && noDate} className={clsx(check('date') && FLAGGED_WRAP)} onChange={(v) => edit(f.key, { date: v }, 'date')} />
              )}
            </Field>
            <Field label={t('time')}>
              {(id) => <TimePicker id={id} value={f.time} className={clsx(check('time') && FLAGGED_WRAP)} onChange={(v) => edit(f.key, { time: v }, 'time')} />}
            </Field>
            <Field label={t('venue')} error={showErrors && noVenue ? (t('required')) : undefined}>
              {(id) => (
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
                  <Input
                    id={id}
                    aria-invalid={showErrors && noVenue}
                    className={clsx('pl-10', check('venue') && FLAGGED)}
                    value={f.venueName}
                    lang={d.language}
                    onChange={(e) => edit(f.key, { venueName: e.target.value }, 'venue')}
                  />
                </div>
              )}
            </Field>
            <Field label={t('addressOrCity')}>
              {(id) => (
                <Input id={id} value={f.venueAddress} lang={d.language} className={clsx(check('venue') && FLAGGED)} onChange={(e) => edit(f.key, { venueAddress: e.target.value }, 'venue')} />
              )}
            </Field>
            <MapLinkField value={f.mapUrl} onChange={(mapUrl) => d.updateFunction(f.key, { mapUrl })} />
          </div>
        );
      })}
      {addButton && d.functions.length < 8 && (
        <Button variant="line" size="sm" onClick={d.addFunction} className="self-start">
          <Plus className="size-3.5" />
          {t('addFunction')}
        </Button>
      )}
    </div>
  );
}
