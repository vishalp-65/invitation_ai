'use client';

import { clsx } from 'clsx';
import { useId, useMemo, useState, type ReactNode } from 'react';

/**
 * Small hand-rolled SVG charts for the admin console. One measure per chart (never two y-axes),
 * a single ink hue that follows the theme (`--color-primary`), recessive grid, hover tooltips.
 */

const W = 640;
const H = 200;
const PAD = { l: 44, r: 12, t: 12, b: 26 };

function niceMax(v: number) {
  if (v <= 0) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function dayLabel(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function TrendChart({
  data,
  format = (v) => String(v),
  label,
  kind = 'area',
}: {
  data: Array<{ day: string; value: number }>;
  format?: (v: number) => string;
  label: string;
  kind?: 'area' | 'bar';
}) {
  const gid = useId();
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const step = data.length > 1 ? iw / (data.length - 1) : iw;
  const x = (i: number) => (kind === 'bar' ? PAD.l + (iw / data.length) * (i + 0.5) : PAD.l + (data.length > 1 ? i * step : iw / 2));
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join('');
  const area = `${line}L${x(data.length - 1)},${PAD.t + ih}L${x(0)},${PAD.t + ih}Z`;
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));
  const barW = Math.max(2, Math.min(18, iw / data.length - 2));
  const total = data.reduce((s, d) => s + d.value, 0);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = kind === 'bar' ? Math.floor(((px - PAD.l) / iw) * data.length) : Math.round((px - PAD.l) / step);
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  const h = hover !== null ? data[hover] : null;

  return (
    <figure className="relative m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none overflow-visible"
        role="img"
        aria-label={`${label}: ${format(total)} in total over ${data.length} days`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--color-hairline)" strokeDasharray={t ? '3 4' : undefined} />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="fill-ink-soft font-mono text-[10px] tabular-nums">
              {format(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text key={d.day} x={x(i)} y={H - 6} textAnchor="middle" className="fill-ink-soft font-mono text-[10px]">
              {dayLabel(d.day)}
            </text>
          ) : null,
        )}
        {kind === 'area' ? (
          <>
            <path d={area} fill={`url(#${gid})`} />
            <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
          </>
        ) : (
          data.map((d, i) => {
            const top = y(d.value);
            const hh = PAD.t + ih - top;
            return hh > 0 ? (
              <rect key={d.day} x={x(i) - barW / 2} y={top} width={barW} height={hh} fill="var(--color-primary)" opacity={hover === null || hover === i ? 1 : 0.45} />
            ) : null;
          })
        )}
        {h && hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="var(--color-ink-soft)" strokeOpacity={0.4} />
            {kind === 'area' && <circle cx={x(hover)} cy={y(h.value)} r={4} fill="var(--color-gold)" stroke="var(--color-ivory)" strokeWidth={2} />}
          </g>
        )}
      </svg>
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap border border-ink/15 bg-ivory px-3 py-1.5 text-xs"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <div className="font-mono text-[0.625rem] uppercase tracking-[0.06em] text-ink-soft">{dayLabel(h.day)}</div>
          <div className="font-medium tabular-nums">
            {format(h.value)} <span className="font-normal text-ink-soft">{label.toLowerCase()}</span>
          </div>
        </div>
      )}
    </figure>
  );
}

/** Ranked horizontal bars with the value at the end. */
export function BarList({ items, format = (v) => String(v), empty = 'No data yet' }: { items: Array<{ label: ReactNode; value: number; hint?: string; key: string }>; format?: (v: number) => string; empty?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  if (!items.length) return <p className="py-6 text-center text-sm text-ink-soft">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((i) => (
        <li key={i.key} className="group" title={i.hint}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{i.label}</span>
            <span className="shrink-0 font-mono text-xs tabular-nums">{format(i.value)}</span>
          </div>
          <div className="h-px bg-ink/10">
            <div className="h-px bg-ink transition-[width] duration-500" style={{ width: `${Math.max(2, (i.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Conversion funnel: each step's bar is relative to the first step; drop-off is shown between steps. */
export function Funnel({ steps }: { steps: Array<{ key: string; label: string; count: number }> }) {
  const top = steps[0]?.count || 0;
  return (
    <ol className="flex flex-col gap-1">
      {steps.map((s, i) => {
        const prev = i ? steps[i - 1]!.count : s.count;
        const share = top ? (s.count / top) * 100 : 0;
        const stepRate = prev ? (s.count / prev) * 100 : 0;
        return (
          <li key={s.key}>
            {i > 0 && (
              <div className="py-0.5 pl-3 text-xs text-ink-soft">
                {/* Steps can be skipped (e.g. sign up without browsing), so a rate over 100% means nothing. */}
                ↓ {prev && s.count <= prev ? `${stepRate.toFixed(0)}% continued` : prev ? 'Some people skip the step above' : '—'}
              </div>
            )}
            <div className="relative overflow-hidden border border-ink/10">
              <div className="absolute inset-y-0 left-0 bg-ink/[0.07]" style={{ width: `${Math.max(share, s.count ? 1.5 : 0)}%` }} />
              <div className="relative flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span>{s.label}</span>
                <span className="tabular-nums">
                  <strong>{s.count.toLocaleString('en-IN')}</strong>
                  <span className="ml-2 text-ink-soft">{top ? `${share.toFixed(1)}%` : ''}</span>
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** When visitors come: day of week × hour (IST). One hue, light → dark. */
export function Heatmap({ cells }: { cells: Array<{ dow: number; hour: number; count: number }> }) {
  const grid = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
    for (const c of cells) g[c.dow - 1]![c.hour] = c.count;
    return g;
  }, [cells]);
  const max = Math.max(1, ...cells.map((c) => c.count));
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="grid grid-cols-[40px_repeat(24,1fr)] gap-[2px]">
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-center font-mono text-[9px] text-ink-soft">
              {h % 3 === 0 ? (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`) : ''}
            </span>
          ))}
          {grid.map((row, d) => (
            <div key={d} className="contents">
              <span className="font-mono text-[10px] uppercase leading-5 text-ink-soft">{DAYS[d]}</span>
              {row.map((v, h) => (
                <span
                  key={h}
                  onPointerEnter={() => setHover({ d, h })}
                  onPointerLeave={() => setHover(null)}
                  className={clsx('h-5', hover?.d === d && hover.h === h && 'ring-1 ring-ink')}
                  style={{ background: v ? `color-mix(in oklab, var(--color-primary) ${Math.round(12 + (v / max) * 88)}%, var(--color-surface))` : 'var(--color-mist)' }}
                  aria-label={`${DAYS[d]} ${h}:00 — ${v} page views`}
                />
              ))}
            </div>
          ))}
        </div>
        <p className="mt-2 h-4 text-xs text-ink-soft">
          {hover ? `${DAYS[hover.d]}, ${hover.h}:00–${hover.h + 1}:00 IST · ${grid[hover.d]![hover.h]} page views` : 'Hover a cell for details. Darker = busier.'}
        </p>
      </div>
    </div>
  );
}
