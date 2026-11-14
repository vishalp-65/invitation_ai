'use client';

import { useEffect, useRef, type ElementType, type ReactNode } from 'react';

let observer: IntersectionObserver | null = null;
function getObserver() {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.setAttribute('data-in', '');
          observer!.unobserve(e.target); // reveal once, like apple.com
        }
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
  );
  return observer;
}

/**
 * Scroll reveal: content rises, sharpens from blur and settles with Apple's easing.
 * One shared IntersectionObserver for the whole page; `delay` staggers siblings.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className,
}: {
  children: ReactNode;
  delay?: number;
  as?: ElementType;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = getObserver();
    obs.observe(el);
    return () => obs.unobserve(el);
  }, []);
  return (
    <Tag ref={ref} data-reveal="" className={className} style={{ '--d': delay } as React.CSSProperties}>
      {children}
    </Tag>
  );
}

/** Splits a headline into words that blur-in one after another (server-safe, no JS needed). */
export function Words({ text, offset = 0 }: { text: string; offset?: number }) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <span key={i} className="word" style={{ '--i': i + offset } as React.CSSProperties}>
          {w}
          {' '}
        </span>
      ))}
    </>
  );
}
