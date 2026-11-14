'use client';

import { clsx } from 'clsx';
import { useEffect, useRef, type ReactNode } from 'react';
import { useEditor } from './store';

/** Slider that records one undo step per drag. */
export function Slider({ label, value, min, max, step = 1, onChange, suffix = '' }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string }) {
  const s = useEditor.getState;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-sm font-semibold text-ink-soft">
        {label}
        <input
          type="number"
          className="w-16 rounded-md border border-hairline bg-white px-1.5 py-0.5 text-right text-sm text-ink"
          value={Math.round(value * 100) / 100}
          min={min}
          max={max}
          step={step}
          onChange={(e) => e.target.value !== '' && onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
          aria-label={`${label} value`}
        />
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={() => s().begin()}
        onPointerUp={() => s().end()}
        onKeyUp={() => s().end()}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 w-full accent-[#1E2250]"
        aria-valuetext={`${value}${suffix}`}
      />
    </label>
  );
}

export function Seg<T extends string>({ options, value, onChange, label, scroll = false }: { options: Array<{ v: T; label: ReactNode; title?: string }>; value: T; onChange: (v: T) => void; label?: string; scroll?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} className={clsx('flex gap-1.5', scroll ? 'w-max' : 'flex-wrap')}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={o.v === value}
          title={o.title}
          onClick={() => onChange(o.v)}
          className={clsx(
            'flex h-9 min-w-9 shrink-0 items-center justify-center gap-1 rounded-lg border px-2.5 text-sm font-semibold transition-colors',
            o.v === value ? 'border-ink bg-ink text-white' : 'border-hairline bg-white text-ink hover:border-ink/40',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-hairline px-4 py-4 last:border-0">
      <h3 className="text-[0.8rem] font-bold uppercase tracking-wide text-ink-soft">{title}</h3>
      {children}
    </section>
  );
}

const PRESETS = ['#FFFFFF', '#FBF5EA', '#F4D58D', '#E9B949', '#C9973F', '#A8741A', '#F2A900', '#E8730C', '#B5121B', '#8A0D14', '#5B0F1B', '#D6336C', '#B8466E', '#6A4C93', '#1E2250', '#0E1F4D', '#1971C2', '#0B4F4A', '#2E7D4F', '#4E6B4F', '#3B2A1A', '#2B1A12', '#121212', '#000000'];

/** Swatches (design colours first) + custom picker. */
export function ColorPicker({ value, onChange, docColors = [] }: { value: string; onChange: (c: string) => void; docColors?: string[] }) {
  const s = useEditor.getState;
  const ref = useRef<HTMLInputElement>(null);
  const uniq = [...new Set(docColors.map((c) => c.toUpperCase()))].filter((c) => !PRESETS.includes(c)).slice(0, 10);
  const sw = (c: string) => (
    <button
      key={c}
      type="button"
      onClick={() => onChange(c)}
      aria-label={`Colour ${c}`}
      aria-pressed={value.toUpperCase() === c.toUpperCase()}
      className="size-8 rounded-full border border-black/10 shadow-sm transition-transform aria-pressed:scale-110 aria-pressed:ring-2 aria-pressed:ring-ink aria-pressed:ring-offset-2"
      style={{ background: c }}
    />
  );
  return (
    <div className="flex flex-col gap-3">
      {uniq.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink-soft">In this design</p>
          <div className="flex flex-wrap gap-2">{uniq.map(sw)}</div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          aria-label="Custom colour"
          className="relative size-8 overflow-hidden rounded-full border border-black/10"
          style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
        >
          <input
            ref={ref}
            type="color"
            value={value}
            onFocus={() => s().begin()}
            onBlur={() => s().end()}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 cursor-pointer opacity-0"
            tabIndex={-1}
          />
        </button>
        {PRESETS.map(sw)}
      </div>
    </div>
  );
}

/** Calls `onVisible` once when the element scrolls into view (lazy font previews). */
export function useOnVisible<T extends HTMLElement>(onVisible: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e!.isIntersecting) {
        onVisible();
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}
