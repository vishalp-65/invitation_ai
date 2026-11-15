'use client';

import { clsx } from 'clsx';
import { ChevronDown, Pipette, Plus } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { tip } from '@/components/ui/tooltip';
import { useEditor } from './store';

/** Slider + number box that records one undo step per drag. */
export function Slider({ label, value, min, max, step = 1, onChange, suffix = '' }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string }) {
  const s = useEditor.getState;
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-sm font-semibold text-ink-soft">
        {label}
        <span className="flex items-center gap-1">
          <input
            type="number"
            className="w-16 rounded-md border border-hairline bg-surface px-1.5 py-0.5 text-right text-sm tabular-nums touch:h-9 touch:w-[4.5rem] touch:text-base text-ink focus:border-primary focus:outline-none"
            value={Math.round(value * 100) / 100}
            min={min}
            max={max}
            step={step}
            onFocus={() => s().begin()}
            onBlur={() => s().end()}
            onChange={(e) => e.target.value !== '' && onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
            aria-label={`${label} value`}
          />
          {suffix && <span className="w-3 text-xs">{suffix}</span>}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={() => s().begin()}
        onPointerUp={() => s().end()}
        // A touch that turns into a scroll cancels instead of lifting: close the undo step either way.
        onPointerCancel={() => s().end()}
        onLostPointerCapture={() => s().end()}
        onBlur={() => s().end()}
        onKeyUp={() => s().end()}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range"
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        aria-valuetext={`${value}${suffix}`}
      />
    </label>
  );
}

/** Compact labelled number input (X / Y / W / H). Commits on Enter/blur; arrow keys step (Shift ×10). */
export function NumberField({ label, value, onChange, min = -Infinity, max = Infinity, disabled }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; disabled?: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft);
    setDraft(null);
    if (Number.isFinite(n) && n !== value) onChange(Math.min(max, Math.max(min, Math.round(n))));
  };
  return (
    <label className={clsx('flex h-10 items-center gap-1.5 rounded-lg border border-hairline bg-surface px-2 focus-within:border-primary touch:h-11', disabled && 'opacity-50')}>
      <span className="text-xs font-bold text-ink-soft">{label}</span>
      <input
        inputMode="numeric"
        disabled={disabled}
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d.-]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const d = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1);
            setDraft(null);
            onChange(Math.min(max, Math.max(min, value + d)));
          }
        }}
        className="w-full min-w-0 bg-transparent text-sm tabular-nums outline-none touch:h-full touch:text-base"
        aria-label={label}
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
          {...(o.title ? tip(o.title) : {})}
          onClick={() => onChange(o.v)}
          className={clsx(
            'flex h-9 min-w-9 shrink-0 items-center justify-center gap-1 rounded-lg border px-2.5 touch:h-10 touch:min-w-10 text-sm font-semibold transition-colors duration-100',
            o.v === value ? 'border-primary tint-primary' : 'border-hairline bg-surface text-ink hover:border-ink/40',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Inspector group. Collapsible when `onToggle` is given. */
export function Section({ title, children, collapsed, onToggle, action }: { title: string; children: ReactNode; collapsed?: boolean; onToggle?: () => void; action?: ReactNode }) {
  return (
    <section className="border-b border-hairline px-4 py-3.5 last:border-0">
      <div className="flex items-center justify-between gap-2">
        {onToggle ? (
          <button type="button" onClick={onToggle} aria-expanded={!collapsed} className="-mx-1 flex flex-1 items-center justify-between rounded-md px-1 py-0.5 text-left hover:text-ink touch:py-2">
            <h3 className="font-sans text-[0.78rem] font-bold uppercase tracking-wide text-ink-soft">{title}</h3>
            <ChevronDown className={clsx('size-4 text-ink-soft transition-transform duration-150', collapsed && '-rotate-90')} />
          </button>
        ) : (
          <h3 className="font-sans text-[0.78rem] font-bold uppercase tracking-wide text-ink-soft">{title}</h3>
        )}
        {action}
      </div>
      {!collapsed && <div className="mt-3 flex flex-col gap-3">{children}</div>}
    </section>
  );
}

const PRESETS = ['#FFFFFF', '#FBF5EA', '#F4D58D', '#E9B949', '#C9973F', '#A8741A', '#F2A900', '#E8730C', '#B5121B', '#8A0D14', '#5B0F1B', '#D6336C', '#B8466E', '#6A4C93', '#1E2250', '#0E1F4D', '#1971C2', '#0B4F4A', '#2E7D4F', '#4E6B4F', '#3B2A1A', '#2B1A12', '#121212', '#000000'];

// ---- recently used colours (shared by every picker, kept for the browser session)
const RECENT_KEY = 'cardai-recent-colors';
const recentListeners = new Set<() => void>();
let recent: string[] | null = null;
function getRecent(): string[] {
  if (recent) return recent;
  try {
    recent = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[];
  } catch {
    recent = [];
  }
  return recent;
}
function pushRecent(c: string) {
  const up = c.toUpperCase();
  recent = [up, ...getRecent().filter((x) => x !== up)].slice(0, 8);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch {
    /* storage blocked */
  }
  recentListeners.forEach((l) => l());
}
const EMPTY: string[] = [];
function useRecent() {
  return useSyncExternalStore(
    (l) => {
      recentListeners.add(l);
      return () => recentListeners.delete(l);
    },
    getRecent,
    () => EMPTY,
  );
}

const HEX = /^#?[0-9a-fA-F]{6}$/;

/** Swatches (design colours, recents, presets) + hex input + native picker + eyedropper. */
export function ColorPicker({ value, onChange, docColors = [] }: { value: string; onChange: (c: string) => void; docColors?: string[] }) {
  const s = useEditor.getState;
  const ref = useRef<HTMLInputElement>(null);
  const rec = useRecent();
  const [hex, setHex] = useState(value.toUpperCase());
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setHex(value.toUpperCase());
  }
  const pick = (c: string) => {
    onChange(c.toUpperCase());
    pushRecent(c);
  };
  const uniq = [...new Set(docColors.map((c) => c.toUpperCase()))].filter((c) => !PRESETS.includes(c)).slice(0, 10);
  const hasDropper = typeof window !== 'undefined' && 'EyeDropper' in window;
  const sw = (c: string) => (
    <button
      key={c}
      type="button"
      onClick={() => pick(c)}
      {...tip(c)}
      aria-pressed={value.toUpperCase() === c.toUpperCase()}
      className="size-7 rounded-full border border-black/10 touch:size-9 transition-transform duration-100 hover:scale-110 aria-pressed:scale-110 aria-pressed:ring-2 aria-pressed:ring-primary aria-pressed:ring-offset-2 aria-pressed:ring-offset-surface dark:border-white/15"
      style={{ background: c }}
    />
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => ref.current?.click()} {...tip('Custom colour')} className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-hairline touch:size-11" style={{ background: value }}>
          <input
            ref={ref}
            type="color"
            value={value}
            onFocus={() => s().begin()}
            onBlur={() => {
              s().end();
              pushRecent(value);
            }}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 cursor-pointer opacity-0"
            tabIndex={-1}
          />
        </button>
        <label className="flex h-9 flex-1 items-center gap-1 rounded-lg border border-hairline bg-surface px-2.5 focus-within:border-primary touch:h-11">
          <span className="text-sm text-ink-soft">#</span>
          <input
            value={hex.replace('#', '')}
            maxLength={7}
            onChange={(e) => {
              const v = e.target.value.trim();
              setHex(v);
              if (HEX.test(v)) pick(v.startsWith('#') ? v : `#${v}`);
            }}
            spellCheck={false}
            className="w-full min-w-0 bg-transparent font-mono text-sm uppercase outline-none touch:h-full touch:text-base"
            aria-label="Hex colour"
          />
        </label>
        {hasDropper && (
          <button
            type="button"
            {...tip('Pick a colour from screen')}
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-hairline bg-surface hover:border-ink/40 touch:size-11"
            onClick={async () => {
              try {
                const r = await new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper().open();
                pick(r.sRGBHex);
              } catch {
                /* cancelled */
              }
            }}
          >
            <Pipette className="size-4" />
          </button>
        )}
      </div>
      {uniq.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink-soft">In this design</p>
          <div className="flex flex-wrap gap-1.5 touch:gap-2.5">{uniq.map(sw)}</div>
        </div>
      )}
      {rec.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink-soft">Recent</p>
          <div className="flex flex-wrap gap-1.5 touch:gap-2.5">{rec.map(sw)}</div>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 touch:gap-2.5">
        {PRESETS.map(sw)}
        <button type="button" onClick={() => ref.current?.click()} {...tip('More colours')} className="grid size-7 place-items-center rounded-full border border-dashed touch:size-9 border-ink/30 text-ink-soft hover:border-ink/60">
          <Plus className="size-3.5" />
        </button>
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
