'use client';

import { useEffect, useRef, type ElementType, type ReactNode } from 'react';
import { observeOnce } from '@/lib/observe';

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
    // Reveal once, like apple.com.
    return observeOnce(el, () => el.setAttribute('data-in', ''), 0.12, '0px 0px -12% 0px');
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
