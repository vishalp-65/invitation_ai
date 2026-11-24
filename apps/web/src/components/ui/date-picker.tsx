'use client';

import { getLanguage } from '@cardai/shared';
import { clsx } from 'clsx';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { controlClass } from './control-class';
import { addDays, addMonths, parseYmd, sameDay, toYmd } from './date-utils';
import { Popover } from './popover';

export { parseYmd, todayYmd, toYmd } from './date-utils';

/** The UI locale as a BCP-47 tag for Intl (e.g. `hi` → `hi-IN`). */
export function useIntlLocale(): string {
  return getLanguage(useLocale()).locale;
}

/** "in 38 days" / "tomorrow" in the UI language, for hints under a date. */
export function useRelativeDays() {
  const locale = useIntlLocale();
  return (ymd: string) => {
    const d = parseYmd(ymd);
    if (!d) return '';
    const n = new Date();
    const days = Math.round((d.getTime() - new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime()) / 86_400_000);
    const rel = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    return Math.abs(days) >= 60 ? rel.format(Math.round(days / 30), 'month') : rel.format(days, 'day');
  };
}

export interface DatePickerProps {
  id?: string;
  /** `YYYY-MM-DD`, or '' for none. */
  value: string;
  onChange: (value: string) => void;
  /** Earliest / latest pickable day (`YYYY-MM-DD`). */
  min?: string;
  max?: string;
  placeholder?: string;
  /** Show a clear button (for optional dates). */
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/**
 * Date field with our own calendar: month grid in the UI language, today marked, keyboard
 * (arrows, PageUp/PageDown for months, Home/End for the week, Enter), quick month/year jump,
 * and a bottom sheet on phones. Value in and out is `YYYY-MM-DD`, like `<input type="date">`.
 */
export function DatePicker({ id, value, onChange, min, max, placeholder, clearable, disabled, className, ...aria }: DatePickerProps) {
  const t = useTranslations('picker');
  const locale = useIntlLocale();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selected = parseYmd(value);
  const label = selected
    ? new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(selected)
    : (placeholder ?? t('chooseDate'));

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
        <CalendarDays className="size-4 shrink-0 text-ink-soft" aria-hidden />
        <span className={clsx('min-w-0 flex-1 truncate tabular-nums', !selected && 'text-ink-soft/70')}>{label}</span>
      </button>
      {clearable && value && !disabled && (
        <button type="button" onClick={() => onChange('')} aria-label={t('clear')} className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-[6px] text-ink-soft hover:bg-ink/[0.06] hover:text-ink">
          <X className="size-3.5" />
        </button>
      )}
      <Popover anchor={trigger} open={open} onClose={() => setOpen(false)} label={t('chooseDate')}>
        <Calendar
          value={value}
          min={min}
          max={max}
          onPick={(v) => {
            onChange(v);
            setOpen(false);
            trigger.current?.focus();
          }}
        />
      </Popover>
    </div>
  );
}

/** The month grid on its own (also usable inline). */
export function Calendar({ value, min, max, onPick }: { value: string; min?: string; max?: string; onPick: (value: string) => void }) {
  const t = useTranslations('picker');
  const locale = useIntlLocale();
  const today = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);
  const selected = parseYmd(value);
  const lo = parseYmd(min);
  const hi = parseYmd(max);
  const [focus, setFocus] = useState<Date>(selected ?? (lo && lo > today ? lo : today));
  const [mode, setMode] = useState<'days' | 'months'>('days');
  const grid = useRef<HTMLDivElement>(null);
  const out = (d: Date) => Boolean((lo && d < lo) || (hi && d > hi));

  // Keep keyboard focus on the focused day as it moves.
  // (After a frame: the popover is measured hidden first, and hidden elements can't take focus.)
  useEffect(() => {
    if (mode !== 'days') return;
    const id = setTimeout(() => grid.current?.querySelector<HTMLButtonElement>(`[data-day="${toYmd(focus)}"]`)?.focus({ preventScroll: true }), 40);
    return () => clearTimeout(id);
  }, [focus, mode]);

  const fmt = useMemo(
    () => ({
      title: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
      month: new Intl.DateTimeFormat(locale, { month: 'short' }),
      weekday: new Intl.DateTimeFormat(locale, { weekday: 'narrow' }),
      full: new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      num: new Intl.NumberFormat(locale),
    }),
    [locale],
  );

  // Six weeks starting on the Sunday on or before the 1st (the usual Indian wall calendar).
  const first = new Date(focus.getFullYear(), focus.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const weekdays = days.slice(0, 7).map((d) => fmt.weekday.format(d));

  const move = (d: Date) => setFocus(lo && d < lo ? lo : hi && d > hi ? hi : d);
  const onKey = (e: KeyboardEvent) => {
    const k = e.key;
    const map: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      PageUp: () => addMonths(focus, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focus, e.shiftKey ? 12 : 1),
      Home: () => addDays(focus, -focus.getDay()),
      End: () => addDays(focus, 6 - focus.getDay()),
    };
    if (map[k]) {
      e.preventDefault();
      move(map[k]());
    } else if ((k === 'Enter' || k === ' ') && !out(focus)) {
      e.preventDefault();
      onPick(toYmd(focus));
    }
  };

  const navBtn = 'grid size-9 place-items-center rounded-[var(--radius-control)] text-ink-soft transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:opacity-30';
  const canPrev = !lo || new Date(focus.getFullYear(), focus.getMonth(), 0) >= lo;
  const canNext = !hi || new Date(focus.getFullYear(), focus.getMonth() + 1, 1) <= hi;

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setMode((m) => (m === 'days' ? 'months' : 'days'))}
          aria-expanded={mode === 'months'}
          className="mr-auto flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-[0.95rem] font-medium capitalize transition-colors hover:bg-ink/[0.06]"
          aria-live="polite"
        >
          {mode === 'days' ? fmt.title.format(focus) : fmt.num.format(focus.getFullYear()).replace(/[,٬]/g, '')}
          <ChevronRight className={clsx('size-3.5 text-ink-soft transition-transform', mode === 'months' && 'rotate-90')} aria-hidden />
        </button>
        <button type="button" className={navBtn} aria-label={mode === 'days' ? t('prevMonth') : t('prevYear')} disabled={mode === 'days' && !canPrev} onClick={() => setFocus(addMonths(focus, mode === 'days' ? -1 : -12))}>
          <ChevronLeft className="size-4" />
        </button>
        <button type="button" className={navBtn} aria-label={mode === 'days' ? t('nextMonth') : t('nextYear')} disabled={mode === 'days' && !canNext} onClick={() => setFocus(addMonths(focus, mode === 'days' ? 1 : 12))}>
          <ChevronRight className="size-4" />
        </button>
      </div>

      {mode === 'months' ? (
        <div className="grid grid-cols-3 gap-1.5 py-1" role="group" aria-label={t('pickMonth')}>
          {Array.from({ length: 12 }, (_, m) => {
            const d = new Date(focus.getFullYear(), m, 1);
            const on = m === focus.getMonth();
            const disabled = Boolean((lo && new Date(focus.getFullYear(), m + 1, 0) < lo) || (hi && d > hi));
            return (
              <button
                key={m}
                type="button"
                disabled={disabled}
                onClick={() => {
                  move(new Date(focus.getFullYear(), m, Math.min(focus.getDate(), new Date(focus.getFullYear(), m + 1, 0).getDate())));
                  setMode('days');
                }}
                className={clsx('h-11 rounded-[var(--radius-control)] text-sm capitalize transition-colors disabled:opacity-30', on ? 'bg-ink text-ivory' : 'hover:bg-ink/[0.06]')}
              >
                {fmt.month.format(d)}
              </button>
            );
          })}
        </div>
      ) : (
        <div ref={grid} role="grid" aria-label={fmt.title.format(focus)} onKeyDown={onKey}>
          <div role="row" className="grid grid-cols-7">
            {weekdays.map((w, i) => (
              <span key={i} role="columnheader" className="grid h-8 place-items-center font-mono text-[0.6875rem] uppercase text-ink-soft">
                {w}
              </span>
            ))}
          </div>
          {Array.from({ length: 6 }, (_, w) => (
            <div key={w} role="row" className="grid grid-cols-7">
              {days.slice(w * 7, w * 7 + 7).map((d) => {
                const inMonth = d.getMonth() === focus.getMonth();
                const isSel = sameDay(d, selected);
                const isToday = sameDay(d, today);
                const isFocus = sameDay(d, focus);
                const disabled = out(d);
                return (
                  <div key={d.getTime()} role="gridcell" aria-selected={isSel} className="grid place-items-center py-0.5">
                    <button
                      type="button"
                      data-day={toYmd(d)}
                      tabIndex={isFocus ? 0 : -1}
                      disabled={disabled}
                      aria-label={fmt.full.format(d)}
                      aria-current={isToday ? 'date' : undefined}
                      onClick={() => onPick(toYmd(d))}
                      className={clsx(
                        'relative grid size-10 place-items-center rounded-[var(--radius-control)] text-sm tabular-nums transition-colors duration-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-ink sm:size-9',
                        isSel ? 'bg-ink font-medium text-ivory' : disabled ? 'cursor-not-allowed text-ink-soft/30 line-through decoration-ink/20' : 'hover:bg-ink/[0.07]',
                        !isSel && !inMonth && !disabled && 'text-ink-soft/45',
                        !isSel && d.getDay() === 0 && inMonth && !disabled && 'text-sindoor',
                      )}
                    >
                      {fmt.num.format(d.getDate())}
                      {isToday && <span aria-hidden className={clsx('absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full', isSel ? 'bg-ivory' : 'bg-gold')} />}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-hairline pt-2">
        <button
          type="button"
          disabled={out(today)}
          onClick={() => {
            setMode('days');
            onPick(toYmd(today));
          }}
          className="h-8 rounded-[var(--radius-control)] px-2.5 text-sm text-ink-soft transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:opacity-30"
        >
          {t('today')}
        </button>
        {selected && <span className="truncate pl-2 text-xs text-ink-soft">{fmt.full.format(selected)}</span>}
      </div>
    </div>
  );
}
