'use client';

import { useEffect } from 'react';

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/**
 * Replaces the browser's own "Please fill out this field" bubble with an in-app one.
 *
 * Forms keep using native constraints (`required`, `type="email"`, `min`…); this layer cancels the
 * default bubble on `invalid`, marks the field `aria-invalid` (so `controlClass` paints the red
 * border), focuses the first bad field and shows the browser's localised message under it.
 * Mounted once in Providers.
 */
export function ValidationLayer() {
  useEffect(() => {
    const bubble = document.createElement('div');
    bubble.className = 'tip-layer tip-error';
    bubble.setAttribute('role', 'alert');
    bubble.id = 'app-validation';
    document.body.appendChild(bubble);

    let current: Field | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let shownAt = 0;
    let firstAt = -1e9;

    const hide = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      delete bubble.dataset.open;
      current = null;
    };

    const place = (f: Field) => {
      const r = f.getBoundingClientRect();
      const w = bubble.offsetWidth;
      const h = bubble.offsetHeight;
      const below = r.bottom + 8 + h < window.innerHeight;
      const x = Math.max(6, Math.min(window.innerWidth - w - 6, r.left));
      const y = below ? r.bottom + 8 : r.top - 8 - h;
      bubble.dataset.side = below ? 'bottom' : 'top';
      bubble.style.setProperty('--tip-arrow', `${Math.round(Math.min(Math.max(14, r.left - x + 18), w - 10))}px`);
      bubble.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    };

    const show = (f: Field) => {
      current = f;
      // Native modal dialogs sit in the top layer: the bubble must live inside them to be seen.
      const host = f.closest('dialog[open]') ?? document.body;
      if (bubble.parentElement !== host) host.appendChild(bubble);
      bubble.textContent = f.validationMessage;
      bubble.dataset.open = '';
      place(f);
      shownAt = performance.now();
      if (timer) clearTimeout(timer);
      timer = setTimeout(hide, 5000);
    };

    const onInvalid = (e: Event) => {
      const f = e.target as Field;
      if (!(f instanceof HTMLElement)) return;
      e.preventDefault();
      if (f.getAttribute('aria-invalid') !== 'true') {
        f.setAttribute('aria-invalid', 'true');
        f.dataset.nativeInvalid = '';
      }
      // `invalid` fires for every bad field of a submit in DOM order; point at the first one only.
      if (f.type === 'hidden' || f.offsetParent === null) return;
      if (performance.now() - firstAt < 80) return;
      firstAt = performance.now();
      f.focus({ preventScroll: true });
      f.scrollIntoView({ block: 'center', behavior: 'smooth' });
      // Wait for the scroll to settle before placing the bubble.
      setTimeout(() => show(f), 220);
    };

    const onEdit = (e: Event) => {
      const f = e.target as Field;
      if (!(f instanceof HTMLElement) || f.dataset.nativeInvalid === undefined) return;
      if (f.checkValidity?.() === false && e.type === 'input') {
        if (f === current) bubble.textContent = f.validationMessage;
        return;
      }
      f.removeAttribute('aria-invalid');
      delete f.dataset.nativeInvalid;
      if (f === current) hide();
    };

    const onScroll = () => current && performance.now() - shownAt > 400 && hide();

    document.addEventListener('invalid', onInvalid, true);
    document.addEventListener('input', onEdit, true);
    document.addEventListener('change', onEdit, true);
    const onLeave = (e: FocusEvent) => e.target === current && hide();
    document.addEventListener('focusout', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', hide);
    return () => {
      hide();
      document.removeEventListener('invalid', onInvalid, true);
      document.removeEventListener('input', onEdit, true);
      document.removeEventListener('change', onEdit, true);
      document.removeEventListener('focusout', onLeave);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', hide);
      bubble.remove();
    };
  }, []);
  return null;
}
