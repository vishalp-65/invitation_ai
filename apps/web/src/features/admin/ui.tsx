'use client';

import { ANALYTICS_RANGES, formatINR, type AnalyticsRange } from '@cardai/shared';
import { clsx } from 'clsx';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { buttonClass } from '@/components/ui/button';

// ---------- Formatting ----------

/** Raw SQL rows come back as "2026-11-15 02:16:49.77+00"; make that a Date everywhere. */
export function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v.includes('T') ? v : v.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'));
  return Number.isNaN(d.getTime()) ? null : d;
}

const nf = new Intl.NumberFormat('en-IN');
export const num = (n: number) => nf.format(n);
export const inr = (paise: number) => formatINR(paise);
export const pct = (part: number, whole: number, digits = 1) => (whole > 0 ? `${((part / whole) * 100).toFixed(digits)}%` : '—');

export function compactINR(paise: number) {
  const r = paise / 100;
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(2)} Cr`;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(2)} L`;
  if (r >= 1e3) return `₹${(r / 1e3).toFixed(1)}k`;
  return `₹${Math.round(r)}`;
}

export function dateTime(v: string | Date | null | undefined) {
  const d = toDate(v);
  return d ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';
}

export function shortDate(v: string | Date | null | undefined) {
  const d = toDate(v);
  return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

export function ago(v: string | Date | null | undefined) {
  const d = toDate(v);
  if (!d) return 'Never';
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return shortDate(d);
}

/** Datetime-local input value (local time) <-> ISO string with offset. */
export function toLocalInput(v: string | Date | null | undefined) {
  const d = toDate(v);
  if (!d) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function fromLocalInput(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

// ---------- Range (kept in the URL so links and reloads keep it) ----------

export function useRange(): [AnalyticsRange, (r: AnalyticsRange) => void] {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = sp.get('range');
  const range = (ANALYTICS_RANGES as readonly string[]).includes(raw ?? '') ? (raw as AnalyticsRange) : '30d';
  return [
    range,
    (r) => {
      const next = new URLSearchParams(sp);
      next.set('range', r);
      router.replace(`${pathname}?${next}`, { scroll: false });
    },
  ];
}

const RANGE_LABEL: Record<AnalyticsRange, string> = { '7d': '7 days', '30d': '30 days', '90d': '90 days' };

export function RangePicker() {
  const [range, setRange] = useRange();
  return <Segmented value={range} onChange={setRange} options={ANALYTICS_RANGES.map((r) => ({ value: r, label: RANGE_LABEL[r] }))} label="Date range" />;
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string; count?: number }>; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full shrink-0 overflow-x-auto border border-ink/15 p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className="whitespace-nowrap px-3 py-1.5 text-[0.8125rem] text-ink-soft transition-colors duration-200 hover:text-ink aria-checked:bg-ink/[0.08] aria-checked:text-ink"
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 font-mono text-[0.6875rem] opacity-60">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------- Layout pieces ----------

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <span className="kicker mb-5">Admin</span>
        <h1 className="page-title">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, action, children, className, pad = true }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={clsx('overflow-clip border border-ink/10 bg-ink/[0.015]', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/10 px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="text-[0.9375rem] font-medium">{title}</h2>}
            {description && <p className="mt-0.5 text-[0.8125rem] text-ink-soft">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={clsx(pad && 'p-5')}>{children}</div>
    </section>
  );
}

export function Delta({ now, before, invert }: { now: number; before: number; invert?: boolean }) {
  if (!before && !now) return <span className="font-mono text-[0.6875rem] text-ink-soft">No data yet</span>;
  if (!before) return <span className="font-mono text-[0.6875rem] text-ink-soft">New this period</span>;
  const change = ((now - before) / before) * 100;
  const flat = Math.abs(change) < 0.5;
  const good = invert ? change < 0 : change > 0;
  const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={clsx('inline-flex items-center gap-0.5 font-mono text-[0.6875rem]', flat ? 'text-ink-soft' : good ? 'text-leaf' : 'text-sindoor')}>
      <Icon className="size-3" aria-hidden />
      {flat ? 'No change' : `${Math.abs(change).toFixed(0)}%`}
      <span className="text-ink-soft">&nbsp;vs prev.</span>
    </span>
  );
}

export function StatCard({ label, value, hint, delta, icon }: { label: string; value: ReactNode; hint?: ReactNode; delta?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 border border-ink/10 bg-ink/[0.015] px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between gap-2 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft sm:text-[0.6875rem]">
        <span className="truncate">{label}</span>
        {icon && <span className="text-ink-soft/60 [&_svg]:size-3.5">{icon}</span>}
      </div>
      <div className="mt-1 font-display text-[1.625rem] leading-none tabular-nums sm:text-[1.75rem]">{value}</div>
      {delta}
      {hint && <div className="text-xs text-ink-soft">{hint}</div>}
    </div>
  );
}

export { Badge } from '@/components/ui/field';

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 border border-dashed border-ink/15 px-6 py-12 text-center">
      {icon && <div className="mb-2 grid size-10 place-items-center border border-ink/15 text-ink [&_svg]:size-[1.1rem]">{icon}</div>}
      <p className="text-[0.9375rem]">{title}</p>
      {children && <div className="max-w-sm text-sm text-ink-soft">{children}</div>}
    </div>
  );
}

export { Skeleton } from '@/components/ui/skeletons';

/** Table that scrolls sideways on phones instead of squashing. */
export function Table({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-ink/10 bg-ink/[0.02] font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-ink-soft">
            {head.map((h, i) => (
              <th key={i} scope="col" className="whitespace-nowrap px-4 py-2.5 font-normal first:pl-5 last:pr-5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:transition-colors [&>tr:hover]:bg-ink/[0.02] [&>tr]:border-b [&>tr]:border-ink/10 [&>tr:last-child]:border-0 [&_td]:px-4 [&_td]:py-3 [&_td:first-child]:pl-5 [&_td:last-child]:pr-5">{children}</tbody>
      </table>
    </div>
  );
}

export function Pager({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-ink/10 px-5 py-3 text-sm">
      <span className="font-mono text-xs text-ink-soft">
        {num((page - 1) * pageSize + 1)}–{num(Math.min(page * pageSize, total))} of {num(total)}
      </span>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className={buttonClass('line', 'xs')}>
          Previous
        </button>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className={buttonClass('line', 'xs')}>
          Next
        </button>
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-ink/15 transition-colors duration-200 aria-checked:bg-ink disabled:opacity-50"
    >
      <span className={clsx('absolute left-0.5 size-4 rounded-full bg-ivory transition-transform duration-200 ease-[var(--ease-out-quint)]', checked && 'translate-x-4')} />
    </button>
  );
}

export const EVENT_LABELS: Record<string, string> = {
  page_view: 'Viewed a page',
  signup_start: 'Opened sign-in',
  otp_requested: 'Requested email code',
  signup: 'Signed up',
  login: 'Signed in',
  template_view: 'Viewed a template',
  template_select: 'Picked a template',
  event_created: 'Created an invitation',
  editor_open: 'Opened the editor',
  render_download: 'Downloaded a card / video',
  site_published: 'Published a website',
  checkout_start: 'Started checkout',
  coupon_applied: 'Applied a coupon',
  purchase: 'Paid',
  share: 'Shared an invitation',
};
