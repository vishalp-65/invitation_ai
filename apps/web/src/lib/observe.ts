'use client';

import { useEffect, useState, type RefObject } from 'react';

type Callback = (entry: IntersectionObserverEntry) => void;

/**
 * One IntersectionObserver per (threshold, rootMargin) pair for the whole page, shared by every
 * element that asks for the same options, instead of one observer per section or gallery tile.
 */
const pools = new Map<string, { io: IntersectionObserver; cbs: Map<Element, Callback> }>();

/** Watches `el` through the shared observer for these options. Returns the function that stops it. */
export function observe(el: Element, cb: Callback, threshold = 0, rootMargin = '0px'): () => void {
  const key = `${threshold}|${rootMargin}`;
  let pool = pools.get(key);
  if (!pool) {
    const cbs = new Map<Element, Callback>();
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => cbs.get(e.target)?.(e)),
      { threshold, rootMargin },
    );
    pool = { io, cbs };
    pools.set(key, pool);
  }
  const p = pool;
  p.cbs.set(el, cb);
  p.io.observe(el);
  return () => {
    p.cbs.delete(el);
    p.io.unobserve(el);
  };
}

/** Runs `onEnter` the first time `el` intersects, then stops watching it. */
export function observeOnce(
  el: Element,
  onEnter: () => void,
  threshold = 0,
  rootMargin = '0px',
): () => void {
  const stop = observe(
    el,
    (e) => {
      if (!e.isIntersecting) return;
      stop();
      onEnter();
    },
    threshold,
    rootMargin,
  );
  return stop;
}

/**
 * True once the element has come within `rootMargin` of the viewport (and stays true): for
 * mounting heavy previews only when they are about to be seen. `enabled: false` means "always".
 */
export function useNearViewport(
  ref: RefObject<Element | null>,
  { enabled = true, rootMargin = '200px' }: { enabled?: boolean; rootMargin?: string } = {},
) {
  const [near, setNear] = useState(!enabled);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || near || !el) return;
    return observeOnce(el, () => setNear(true), 0, rootMargin);
  }, [enabled, near, ref, rootMargin]);
  return near;
}
