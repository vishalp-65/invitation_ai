'use client';

import type { SectionMotion } from '@cardai/shared';
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';

export type MotionLevel = 'full' | 'subtle' | 'off';

export const MotionContext = createContext<MotionLevel>('full');
export const useMotionLevel = () => useContext(MotionContext);

/**
 * Lite mode: honour "reduce motion", Data Saver and 2G/slow-3G so the page stays usable on
 * the cheapest phones. The host's own choice can only lower the level.
 */
export function useEffectiveMotion(chosen: MotionLevel): MotionLevel {
  const [auto, setAuto] = useState<MotionLevel>('full');
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const slow = Boolean(conn?.saveData) || ['slow-2g', '2g'].includes(conn?.effectiveType ?? '');
    const cores = navigator.hardwareConcurrency ?? 8;
    const update = () => setAuto(reduce.matches || slow ? 'off' : cores <= 2 || conn?.effectiveType === '3g' ? 'subtle' : 'full');
    update();
    reduce.addEventListener('change', update);
    return () => reduce.removeEventListener('change', update);
  }, []);
  const rank = { off: 0, subtle: 1, full: 2 } as const;
  return rank[auto] < rank[chosen] ? auto : chosen;
}

let observer: IntersectionObserver | null = null;
function getObserver() {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.setAttribute('data-in', '');
          observer!.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
  );
  return observer;
}

/** Scroll reveal with one shared observer; `delay` staggers siblings (×90ms). */
export function Reveal({
  motion = 'rise',
  delay = 0,
  as: Tag = 'div',
  className,
  style,
  children,
}: {
  motion?: SectionMotion | 'slide-r';
  delay?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = getObserver();
    obs.observe(el);
    return () => obs.unobserve(el);
  }, []);
  if (motion === 'none') {
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }
  return (
    <Tag ref={ref} data-sr={motion} className={className} style={{ ...style, '--d': delay } as CSSProperties}>
      {children}
    </Tag>
  );
}

/** Splits text into letters that drop in one by one (keeps words together for wrapping). */
export function Letters({ text, baseMs = 0 }: { text: string; baseMs?: number }) {
  let i = 0;
  // Intl.Segmenter keeps Devanagari / Tamil clusters (conjuncts, matras) intact.
  const seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const split = (w: string) => (seg ? [...seg.segment(w)].map((s) => s.segment) : [...w]);
  return (
    <span aria-label={text}>
      {text.split(' ').map((word, wi) => (
        <span key={wi} aria-hidden className="inline-block whitespace-nowrap">
          {split(word).map((ch, ci) => (
            <span key={ci} className="inv-letter" style={{ '--i': i++, '--base': `${baseMs}ms` } as CSSProperties}>
              {ch}
            </span>
          ))}
          {' '}
        </span>
      ))}
    </span>
  );
}

/** Moves an element against the scroll for depth (transform only, rAF-throttled). */
export function useParallax<T extends HTMLElement>(speed: number, enabled: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, window.innerHeight * 1.5);
        el.style.transform = `translate3d(0, ${y * speed}px, 0)`;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [speed, enabled]);
  return ref;
}

/** 0→1 as the element scrolls through the viewport (for the story timeline line). */
export function useScrollProgress<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled) {
      el.style.setProperty('--p', '1');
      return;
    }
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / Math.max(1, r.height)));
        el.style.setProperty('--p', p.toFixed(3));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [enabled]);
  return ref;
}

/** Ambient falling petals (fixed layer, 14 CSS-animated divs). */
export function Petals({ colors }: { colors: string[] }) {
  const petals = Array.from({ length: 14 }, (_, i) => {
    const r = (n: number) => ((Math.sin(i * 97.13 + n * 13.7) + 1) / 2) % 1;
    return {
      x: `${Math.round(r(1) * 100)}vw`,
      s: `${10 + Math.round(r(2) * 10)}px`,
      t: `${11 + Math.round(r(3) * 9)}s`,
      delay: `${-Math.round(r(4) * 18)}s`,
      c: colors[i % colors.length]!,
    };
  });
  return (
    <div aria-hidden>
      {petals.map((p, i) => (
        <span key={i} className="inv-petal" style={{ '--x': p.x, '--s': p.s, '--t': p.t, '--delay': p.delay, '--c': p.c } as CSSProperties} />
      ))}
    </div>
  );
}
