'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * Native <dialog>: focus trap, Esc and focus return for free; slides up as a sheet on phones.
 * Page scroll is locked while it's open.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  focusField = true,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Move focus to the first field on open (off for filter sheets and previews). */
  focusField?: boolean;
  size?: 'md' | 'lg';
}) {
  const t = useTranslations('common');
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  /** Only a press that starts AND ends on the backdrop closes it, so drag-selecting text out of a field doesn't. */
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      // showModal() focuses the first button (Close); put the cursor in the first field instead.
      if (focusField) el.querySelector<HTMLElement>('input:not([type=hidden]), textarea, select')?.focus();
    }
    if (!open && el.open) el.close();
  }, [open, focusField]);

  // Lock page scroll behind the modal. Pad by the scrollbar's width (0 on overlay scrollbars and on
  // pages that don't scroll) so the page doesn't jump sideways on Windows.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const gap = window.innerWidth - root.clientWidth;
    const prev = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
    root.style.overflow = 'hidden';
    if (gap > 0) root.style.paddingRight = `${gap}px`;
    return () => {
      root.style.overflow = prev.overflow;
      root.style.paddingRight = prev.paddingRight;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onPointerDown={(e) => (pressedBackdrop.current = e.target === ref.current)}
      onClick={(e) => {
        if (pressedBackdrop.current && e.target === ref.current) onClose();
        pressedBackdrop.current = false;
      }}
      className={`fixed m-0 mt-auto w-full max-w-none animate-[sheet-up_0.2s_var(--ease-out-quint)] rounded-t-[var(--radius-card)] border border-ink/15 bg-ivory p-0 text-ink backdrop:bg-[var(--color-overlay)] sm:m-auto sm:rounded-[var(--radius-card)] ${size === 'lg' ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-ink/10 px-6 py-4">
        <h2 id={titleId} className="min-w-0 text-balance break-words text-2xl">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] border border-ink/10 text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
          aria-label={t('close')}
        >
          <X className="size-4.5" aria-hidden />
        </button>
      </div>
      <div className={`overflow-y-auto overscroll-contain px-6 py-6 ${size === 'lg' ? 'max-h-[85dvh]' : 'max-h-[75dvh]'}`}>{children}</div>
    </dialog>
  );
}
