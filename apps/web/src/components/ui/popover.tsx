'use client';

import { clsx } from 'clsx';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/** Below this width a popover opens as a bottom sheet: big tap targets, no clipping at the edges. */
const SHEET_MAX = 520;

/**
 * Anchored popover for pickers: fixed to the viewport under (or above) its trigger, portalled into
 * the open modal <dialog> when there is one (top layer), closed by outside press / Escape, and a
 * bottom sheet on phones. Flat like `.menu`: hairline border, card radius, no shadow.
 */
export function Popover({
  anchor,
  open,
  onClose,
  label,
  width = 312,
  className,
  children,
}: {
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  label: string;
  width?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<CSSProperties | null>(null);
  const [host, setHost] = useState<Element | null>(null);
  const [sheet, setSheet] = useState(false);

  const place = useCallback(() => {
    const t = anchor.current;
    if (!t) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (vw < SHEET_MAX) {
      setSheet(true);
      setPos({ position: 'fixed', left: 0, right: 0, bottom: 0 });
      return;
    }
    setSheet(false);
    const r = t.getBoundingClientRect();
    const h = ref.current?.offsetHeight ?? 360;
    const below = vh - r.bottom - 8;
    const up = below < h && r.top - 8 > below;
    const left = Math.max(8, Math.min(r.left, vw - width - 8));
    // Short windows: neither side fits, so slide it to stay fully on screen (it may cover the trigger).
    const top = up ? Math.max(8, r.top - 6 - h) : Math.max(8, Math.min(r.bottom + 6, vh - h - 8));
    setPos({ position: 'fixed', left, width, top });
  }, [anchor, width]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    setHost(anchor.current?.closest('dialog[open]') ?? document.body);
    place();
    const raf = requestAnimationFrame(place); // again once the real height is known
    return () => cancelAnimationFrame(raf);
  }, [open, place, anchor]);

  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const onMove = (e: Event) => {
      if (e.target instanceof Node && ref.current?.contains(e.target)) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(place);
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !anchor.current?.contains(t)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Keep a dialog underneath from closing too.
      e.preventDefault();
      e.stopPropagation();
      onClose();
      anchor.current?.focus();
    };
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, place, onClose, anchor]);

  if (!open || !host) return null;
  return createPortal(
    <>
      {sheet && <div aria-hidden className="fixed inset-0 z-[999] bg-black/40 [animation:fade-in_160ms_ease-out]" />}
      <div
        ref={ref}
        role="dialog"
        aria-label={label}
        style={pos ?? { position: 'fixed', top: 0, left: 0, visibility: 'hidden' }}
        className={clsx(
          'z-[1000] border border-hairline bg-surface text-ink',
          sheet
            ? 'rounded-t-[var(--radius-card)] border-x-0 border-b-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 [animation:sheet-up_220ms_var(--ease-out-quint)]'
            : 'rounded-[var(--radius-card)] p-3 [animation:select-in_120ms_var(--ease-out-quint)]',
          className,
        )}
      >
        {sheet && <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-ink/15" />}
        {children}
      </div>
    </>,
    host,
  );
}
