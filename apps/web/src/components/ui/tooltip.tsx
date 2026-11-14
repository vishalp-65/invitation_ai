'use client';

import { cloneElement, isValidElement, useEffect, type ReactElement } from 'react';

/**
 * Global tooltips.
 *
 * Any element with `data-tip="Label"` gets a tooltip — no wrappers, no per-button state.
 * Optional: `data-tip-kbd="Ctrl+Z"` (shortcut hint), `data-tip-side="top|bottom|left|right"`.
 *
 * One <TooltipLayer/> (mounted in Providers) listens with delegated pointer/focus events and
 * positions a single fixed element imperatively, so hovering a toolbar costs no React renders.
 * Mouse/pen and keyboard focus only: touch devices never see sticky tooltips.
 */

type Side = 'top' | 'bottom' | 'left' | 'right';

/** Props helper: `<button {...tip('Undo', 'Ctrl+Z')}>` (also sets aria-label). */
export function tip(label: string, kbd?: string, side?: Side) {
  return { 'data-tip': label, 'aria-label': label, ...(kbd ? { 'data-tip-kbd': kbd } : {}), ...(side ? { 'data-tip-side': side } : {}) } as const;
}

/** Wrapper form for elements you'd rather not spread props onto. */
export function Tooltip({ content, kbd, side, children }: { content: string; kbd?: string; side?: Side; children: ReactElement<Record<string, unknown>> }) {
  if (!isValidElement(children)) return children;
  return cloneElement(children, { 'data-tip': content, ...(kbd ? { 'data-tip-kbd': kbd } : {}), ...(side ? { 'data-tip-side': side } : {}) });
}

const SHOW_DELAY = 380;
/** After one tooltip, moving to a neighbour shows the next instantly (like native toolbars). */
const WARM_WINDOW = 450;
const GAP = 8;

export function TooltipLayer() {
  useEffect(() => {
    const el = document.createElement('div');
    el.className = 'tip-layer';
    el.setAttribute('role', 'tooltip');
    el.id = 'app-tooltip';
    document.body.appendChild(el);

    let target: HTMLElement | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastHide = 0;

    const position = (t: HTMLElement) => {
      const r = t.getBoundingClientRect();
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let side = (t.dataset.tipSide as Side | undefined) ?? 'bottom';
      // Flip when there isn't room.
      if (side === 'bottom' && r.bottom + GAP + h > vh) side = 'top';
      else if (side === 'top' && r.top - GAP - h < 0) side = 'bottom';
      else if (side === 'right' && r.right + GAP + w > vw) side = 'left';
      else if (side === 'left' && r.left - GAP - w < 0) side = 'right';
      let x = side === 'left' ? r.left - GAP - w : side === 'right' ? r.right + GAP : r.left + r.width / 2 - w / 2;
      let y = side === 'top' ? r.top - GAP - h : side === 'bottom' ? r.bottom + GAP : r.top + r.height / 2 - h / 2;
      x = Math.max(6, Math.min(vw - w - 6, x));
      y = Math.max(6, Math.min(vh - h - 6, y));
      el.dataset.side = side;
      el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    };

    const show = (t: HTMLElement) => {
      const label = t.dataset.tip;
      if (!label) return;
      const kbd = t.dataset.tipKbd;
      el.replaceChildren(document.createTextNode(label));
      if (kbd) {
        const k = document.createElement('kbd');
        k.textContent = kbd;
        el.appendChild(k);
      }
      el.dataset.open = '';
      position(t);
      t.setAttribute('aria-describedby', 'app-tooltip');
    };

    const hide = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      if (el.dataset.open !== undefined) lastHide = performance.now();
      delete el.dataset.open;
      target?.removeAttribute('aria-describedby');
      target = null;
    };

    const arm = (t: HTMLElement) => {
      if (t === target) return;
      hide();
      target = t;
      const warm = performance.now() - lastHide < WARM_WINDOW;
      timer = setTimeout(() => target === t && t.isConnected && show(t), warm ? 0 : SHOW_DELAY);
    };

    const find = (n: EventTarget | null) => (n instanceof Element ? (n.closest('[data-tip]') as HTMLElement | null) : null);

    const onOver = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const t = find(e.target);
      if (!t) return target && hide();
      if ((t as HTMLButtonElement).disabled && !t.dataset.tipDisabled) return;
      arm(t);
    };
    const onOut = (e: PointerEvent) => {
      if (!target) return;
      const to = find(e.relatedTarget);
      if (to !== target) hide();
    };
    const onFocus = (e: FocusEvent) => {
      const t = find(e.target);
      // Keyboard focus only (mouse clicks also focus buttons).
      if (t && (e.target as HTMLElement).matches(':focus-visible')) arm(t);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide();

    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('pointerout', onOut, { passive: true });
    document.addEventListener('pointerdown', hide, { passive: true, capture: true });
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', hide);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', hide, { passive: true, capture: true });
    window.addEventListener('blur', hide);
    return () => {
      hide();
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
      document.removeEventListener('pointerdown', hide, { capture: true });
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', hide, { capture: true });
      window.removeEventListener('blur', hide);
      el.remove();
    };
  }, []);
  return null;
}
