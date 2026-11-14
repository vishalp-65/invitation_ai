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
      className="fixed m-0 mt-auto w-full max-w-none animate-[sheet-up_0.4s_var(--ease-out-quint)] rounded-t-[28px] border border-hairline bg-white p-0 text-ink shadow-lift backdrop:bg-night/40 sm:m-auto sm:max-w-lg sm:rounded-[24px]"
    >
      <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
        <h2 className="text-xl">{title}</h2>
        <button type="button" onClick={onClose} className="press rounded-full bg-ink/5 p-2 hover:bg-ink/10" aria-label="Close">
          <X className="size-5" />
        </button>
      </div>
      <div className="max-h-[75dvh] overflow-y-auto px-6 py-5">{children}</div>
    </dialog>
  );
}
