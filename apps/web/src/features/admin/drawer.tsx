'use client';

import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

/** Right-hand panel for one record (closes on Esc or a click outside). */
export function Drawer({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[var(--color-overlay)]" onClick={onClose} />
      <div className={`relative flex h-full w-full ${wide ? 'max-w-2xl' : 'max-w-xl'} flex-col overflow-hidden border-l border-ink/10 bg-ivory`}>
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-soft">{title}</h2>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center border border-ink/15 transition-colors hover:bg-ink/[0.05]" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/** A titled block inside a drawer. */
export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-ink/10 px-5 py-4 last:border-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Small key/value grid. */
export function Facts({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-2 border-l border-t border-ink/10 sm:grid-cols-3">
      {rows.map(([k, v]) => (
        <div key={k} className="min-w-0 border-b border-r border-ink/10 px-3 py-2.5">
          <dt className="font-mono text-[0.5625rem] uppercase tracking-[0.08em] text-ink-soft">{k}</dt>
          <dd className="mt-1 truncate text-sm tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
