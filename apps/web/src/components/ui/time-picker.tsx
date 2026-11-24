'use client';

import { clsx } from 'clsx';
import { Clock, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from './button';
import { controlClass } from './control-class';
import { DatePicker, useIntlLocale } from './date-picker';
import { joinTime as join, splitTime as split } from './date-utils';
import { Popover } from './popover';

/** Times people actually put on invitations: one tap for most cards. */
const PRESETS = ['07:00', '10:00', '12:30', '16:00', '18:30', '19:00', '19:30', '20:00'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export function useFormatTime() {
  const locale = useIntlLocale();
  return (v?: string) => {
    const p = split(v);
    if (!p) return '';
    const d = new Date(2000, 0, 1, (p.h12 % 12) + (p.pm ? 12 : 0), p.min);
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
  };
}

export interface TimePickerProps {
  id?: string;
  /** `HH:mm` (24 h) or '' for none, like `<input type="time">`. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/**
 * Time field: common invitation times as one-tap chips, then hour / minute / AM-PM columns for
 * anything else (5-minute steps). 12-hour display in the UI language; value stays `HH:mm`.
 */
export function TimePicker({ id, value, onChange, placeholder, clearable, disabled, className, ...aria }: TimePickerProps) {
  const t = useTranslations('picker');
  const format = useFormatTime();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const cur = split(value) ?? { h12: 7, min: 0, pm: true };
  const [draft, setDraft] = useState(cur);
  useEffect(() => {
    if (open) setDraft(split(value) ?? { h12: 7, min: 0, pm: true });
  }, [open, value]);
  // Bring the selected hour and minute into view inside their columns (never scroll the page).
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => {
      document.querySelectorAll<HTMLElement>('[data-time-col] [aria-selected="true"]').forEach((el) => {
        const col = el.parentElement!;
        col.scrollTop = el.offsetTop - col.offsetTop - col.clientHeight / 2 + el.offsetHeight / 2;
      });
    }, 40);
    return () => clearTimeout(id);
  }, [open]);

  const set = (next: typeof draft) => {
    setDraft(next);
    onChange(join(next.h12, next.min, next.pm));
  };
  const col = 'thin-scroll flex max-h-48 flex-col gap-0.5 overflow-y-auto overscroll-contain pr-0.5';
  const cell = (on: boolean) =>
    clsx('h-9 shrink-0 rounded-[var(--radius-control)] text-sm tabular-nums transition-colors duration-100', on ? 'bg-ink font-medium text-ivory' : 'hover:bg-ink/[0.07]');

  return (
    <div className={clsx('relative', className)}>
      <button
        ref={trigger}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={aria['aria-invalid']}
        aria-describedby={aria['aria-describedby']}
        onClick={() => setOpen((o) => !o)}
        className={clsx(controlClass, 'flex h-10 w-full items-center gap-2.5 pl-3 text-left text-[0.95rem]', clearable && value ? 'pr-9' : 'pr-3', open && 'border-ink')}
      >
        <Clock className="size-4 shrink-0 text-ink-soft" aria-hidden />
        <span className={clsx('min-w-0 flex-1 truncate tabular-nums', !value && 'text-ink-soft/70')}>{value ? format(value) : (placeholder ?? t('chooseTime'))}</span>
      </button>
      {clearable && value && !disabled && (
        <button type="button" onClick={() => onChange('')} aria-label={t('clear')} className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-[6px] text-ink-soft hover:bg-ink/[0.06] hover:text-ink">
          <X className="size-3.5" />
        </button>
      )}
      <Popover anchor={trigger} open={open} onClose={() => setOpen(false)} label={t('chooseTime')} width={300}>
        <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-soft">{t('common')}</p>
        <div className="grid grid-cols-4 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                onChange(p);
                setOpen(false);
                trigger.current?.focus();
              }}
              className={clsx('h-9 rounded-[var(--radius-control)] border text-[0.8125rem] tabular-nums transition-colors', value === p ? 'border-ink bg-ink text-ivory' : 'border-hairline hover:border-ink/40')}
            >
              {format(p)}
            </button>
          ))}
        </div>

        <p className="mb-2 mt-4 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-soft">{t('exact')}</p>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <div role="listbox" data-time-col aria-label={t('hour')} className={col}>
            {HOURS.map((h) => (
              <button key={h} type="button" role="option" aria-selected={draft.h12 === h} className={cell(draft.h12 === h)} onClick={() => set({ ...draft, h12: h })}>
                {h}
              </button>
            ))}
          </div>
          <div role="listbox" data-time-col aria-label={t('minute')} className={col}>
            {MINUTES.map((m) => (
              <button key={m} type="button" role="option" aria-selected={draft.min === m} className={cell(draft.min === m)} onClick={() => set({ ...draft, min: m })}>
                {String(m).padStart(2, '0')}
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label="AM / PM" className="flex w-16 flex-col gap-0.5">
            {[false, true].map((pm) => (
              <button key={String(pm)} type="button" role="radio" aria-checked={draft.pm === pm} className={cell(draft.pm === pm)} onClick={() => set({ ...draft, pm })}>
                {pm ? 'PM' : 'AM'}
              </button>
            ))}
          </div>
        </div>
        <Button
          variant="solid"
          className="mt-3 h-10 w-full"
          onClick={() => {
            onChange(join(draft.h12, draft.min, draft.pm));
            setOpen(false);
            trigger.current?.focus();
          }}
        >
          {t('done')}
        </Button>
      </Popover>
    </div>
  );
}

/**
 * `YYYY-MM-DDTHH:mm` (like `<input type="datetime-local">`) as a date picker + time picker pair.
 */
export function DateTimePicker({ id, value, onChange, clearable, required }: { id?: string; value: string; onChange: (value: string) => void; clearable?: boolean; required?: boolean }) {
  const [date = '', time = ''] = value ? value.split('T') : [];
  return (
    <div className="relative grid grid-cols-[1.4fr_1fr] gap-2">
      <DatePicker id={id} value={date} clearable={clearable} onChange={(d) => onChange(d ? `${d}T${time.slice(0, 5) || '10:00'}` : '')} />
      <TimePicker value={time.slice(0, 5)} disabled={!date} onChange={(tm) => date && onChange(`${date}T${tm || '00:00'}`)} />
      {/* Keeps native form validation (and our ValidationLayer) for required values. */}
      {required && <input tabIndex={-1} aria-hidden required value={value} onChange={() => undefined} className="pointer-events-none absolute bottom-0 left-4 h-px w-px opacity-0" />}
    </div>
  );
}
