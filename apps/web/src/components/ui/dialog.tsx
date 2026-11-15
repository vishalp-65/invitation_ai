'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

/** Native <dialog>: focus trap, Esc and backdrop for free; slides up as a sheet on phones. */
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      // showModal() focuses the first button (Close); put the cursor in the first field instead.
      el.querySelector<HTMLElement>('input:not([type=hidden]), textarea, select')?.focus();
    }
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="fixed m-0 mt-auto w-full max-w-none animate-[sheet-up_0.2s_var(--ease-out-quint)] rounded-t-[var(--radius-card)] border border-hairline bg-surface p-0 text-ink backdrop:bg-[var(--color-overlay)] sm:m-auto sm:max-w-lg sm:rounded-[var(--radius-card)]"
    >
      <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
        <h2 className="text-lg">{title}</h2>
        <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-[var(--radius-control)] text-ink-soft transition-colors hover:bg-mist hover:text-ink" aria-label="Close">
          <X className="size-4.5" />
        </button>
      </div>
      <div className="max-h-[75dvh] overflow-y-auto px-5 py-5">{children}</div>
    </dialog>
  );
}
