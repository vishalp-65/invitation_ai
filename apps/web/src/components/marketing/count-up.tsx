'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Counts the number inside a stat ("140+", "2 min", "<16 MB") up from zero the first time it
 * scrolls into view. Prefix/suffix stay put; the final text is server-rendered for no-JS and SEO.
 */
export function CountUp({ value, duration = 1100 }: { value: string; duration?: number }) {
  const m = /^(\D*)(\d+)(.*)$/.exec(value);
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!m || !el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const [, pre, num, post] = m;
    const target = Number(num);
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / duration);
          const eased = 1 - Math.pow(1 - p, 4);
          setShown(`${pre}${Math.round(target * eased)}${post}`);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        setShown(`${pre}0${post}`);
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- value is static per mount
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown}
    </span>
  );
}
