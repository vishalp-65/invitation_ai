'use client';

import { clsx } from 'clsx';
import Image from 'next/image';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { observe } from '@/lib/observe';
import { isLite } from '@/lib/perf';

// ---------------------------------------------------------------- visibility
// Shared, pooled IntersectionObservers: see lib/observe.

/** True once the element has scrolled into view (reveals once). */
export function useInView<T extends Element = HTMLElement>(threshold = 0.1) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = observe(
      el,
      (e) => {
        if (e.isIntersecting) {
          setInView(true);
          stop();
        }
      },
      threshold,
      '0px 0px -8% 0px',
    );
    return stop;
  }, [threshold]);
  return [ref, inView] as const;
}

/** True while the element is on screen and the tab is visible (for loops that should pause). */
export function useOnScreen<T extends Element = HTMLElement>(ref: React.RefObject<T | null>) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let inter = false;
    const update = () => setOn(inter && document.visibilityState === 'visible');
    const stop = observe(
      el,
      (e) => {
        inter = e.isIntersecting;
        update();
      },
      0,
      '100px',
    );
    document.addEventListener('visibilitychange', update);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', update);
    };
  }, [ref]);
  return on;
}

/** setInterval that only ticks while `active` (pass useOnScreen's result). */
export function useTicker(fn: () => void, ms: number, active: boolean) {
  const cb = useRef(fn);
  cb.current = fn;
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => cb.current(), ms);
    return () => clearInterval(id);
  }, [ms, active]);
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Runs `frame(dt)` on requestAnimationFrame only while the canvas is on screen and the tab is
 * visible. Returns a cleanup. Draws a single frame when the user prefers reduced motion.
 */
function animateWhileVisible(el: Element, frame: (steps: number) => void) {
  let raf = 0;
  let running = false;
  // ~30fps is plenty for slowly drifting dots and halves the main-thread cost. `frame` gets the
  // elapsed time in 60fps frames, so speed stays the same whatever the draw rhythm or refresh rate.
  let last = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (now - last < 28) return;
    const steps = last ? Math.min((now - last) / (1000 / 60), 4) : 1;
    last = now;
    frame(steps);
  };
  const start = () => {
    if (running || document.visibilityState !== 'visible') return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };
  frame(1);
  // Reduced motion and low-end devices keep the single drawn frame.
  if (reducedMotion() || isLite()) return () => {};
  let inter = false;
  const unobserve = observe(
    el,
    (e) => {
      inter = e.isIntersecting;
      if (inter) start();
      else stop();
    },
    0,
    '50px',
  );
  const onVis = () => (inter && document.visibilityState === 'visible' ? start() : stop());
  document.addEventListener('visibilitychange', onVis);
  return () => {
    stop();
    unobserve();
    document.removeEventListener('visibilitychange', onVis);
  };
}

// ---------------------------------------------------------------- layout bits

/** Fade + rise classes used across the studio sections (opacity/transform only: compositor-friendly). */
export const rise = (on: boolean, dist: 'sm' | 'md' | 'lg' = 'md') =>
  clsx(
    'transition-[opacity,transform] duration-1000 ease-[var(--ease-out-quint)]',
    on ? 'translate-y-0 opacity-100' : dist === 'sm' ? 'translate-y-4 opacity-0' : dist === 'md' ? 'translate-y-8 opacity-0' : 'translate-y-12 opacity-0',
  );

/** Shared section frame: wide container with the template's gutters. */
export function Frame({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('relative mx-auto max-w-[1400px] px-5 sm:px-6 lg:px-12', className)}>{children}</div>;
}

/** Mono label with a rule before it ("—— Process"). */
export function Kicker({ children, center, className }: { children: ReactNode; center?: boolean; className?: string }) {
  return <span className={clsx('kicker', center && 'kicker-center', className)}>{children}</span>;
}

/**
 * Which `/landing/<name>.jpg` files exist, read on the server (see app/page.tsx). With it, empty
 * slots render their placeholder (or collapse) from the first paint: no 404s, no layout shift.
 */
const ArtContext = createContext<ReadonlySet<string> | null>(null);
export function ArtProvider({ names, children }: { names: string[]; children: ReactNode }) {
  return <ArtContext.Provider value={new Set(names)}>{children}</ArtContext.Provider>;
}

/**
 * Atmospheric art slot. Drop a generated image at `/landing/<name>.jpg` (see docs/landing-art-prompts.md);
 * until it exists a soft rose/violet glow stands in, so the layout never shows a broken image.
 * `collapse` hides the slot entirely on phones while it has no art (saves an empty block of scrolling).
 */
export function ArtImage({ name, className, imgClassName, alt = '', collapse }: { name: string; className?: string; imgClassName?: string; alt?: string; collapse?: boolean }) {
  const known = useContext(ArtContext);
  const [errored, setErrored] = useState(false);
  const failed = errored || (known !== null && !known.has(name));
  const imgRef = useRef<HTMLImageElement>(null);
  // An image that 404'd before hydration never fires onError in React; check once mounted.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setErrored(true);
  }, []);
  return (
    <div
      className={clsx('relative overflow-clip', failed && collapse && 'max-lg:hidden', className)}
      data-empty={failed && collapse ? '' : undefined}
      aria-hidden={alt ? undefined : true}
    >
      {failed ? (
        <div className="absolute inset-0">
          {/* Radial gradients, not blurred circles: same soft glow without a big filter to rasterise. */}
          <div className="absolute left-[10%] top-[10%] size-[75%] rounded-full [background:radial-gradient(closest-side,color-mix(in_srgb,var(--color-rose)_28%,transparent),transparent)]" />
          <div className="absolute bottom-[5%] right-[5%] size-[65%] rounded-full [background:radial-gradient(closest-side,color-mix(in_srgb,var(--color-violet)_22%,transparent),transparent)]" />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={`/landing/${name}.jpg`}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setErrored(true)}
          className={clsx('absolute inset-0 h-full w-full', imgClassName ?? 'object-cover')}
        />
      )}
    </div>
  );
}

/**
 * A real Noyta design render from /public/showcase, served through next/image so phones get a
 * small WebP/AVIF instead of the full JPEG.
 */
export function CardShot({ id, className, alt, sizes = '(max-width: 768px) 45vw, 240px', priority }: { id: string; className?: string; alt?: string; sizes?: string; priority?: boolean }) {
  return (
    <Image
      src={`/showcase/${id}.jpg`}
      alt={alt ?? ''}
      width={432}
      height={768}
      sizes={sizes}
      priority={priority}
      className={clsx('aspect-[9/16] object-cover', className)}
    />
  );
}

// ---------------------------------------------------------------- canvases

/** Resolves any CSS colour (oklch, named, rgb) to "r,g,b" by painting one pixel. */
function cssRgb(color: string): string {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const x = c.getContext('2d');
  if (!x) return '255,255,255';
  x.fillStyle = color;
  x.fillRect(0, 0, 1, 1);
  const [r, g, b] = x.getImageData(0, 0, 1, 1).data;
  return `${r},${g},${b}`;
}

/**
 * Drifting dots that lean toward the pointer (colour follows the element's text colour).
 * Animates only while on screen; fewer dots on small screens; no pointer tracking on touch.
 */
export function ParticleField({ className, count = 70 }: { className?: string; count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let w = 0;
    let h = 0;
    const mouse = { x: 0.5, y: 0.5 };
    const rgb = cssRgb(getComputedStyle(canvas).color);
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const fine = window.matchMedia('(pointer: fine)').matches;
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width;
      mouse.y = (e.clientY - r.top) / r.height;
    };
    if (fine) canvas.addEventListener('pointermove', onMove, { passive: true });
    const n = window.innerWidth < 768 ? Math.round(count * 0.5) : count;
    const ps = Array.from({ length: n }, (_, i) => {
      const s = i * 1.618;
      return { bx: (s * 127.1) % 1, by: (s * 311.7) % 1, ph: s * Math.PI * 2, sp: 0.4 + (s % 0.4), r: 1.2 + (s % 2.2) };
    });
    let t = 0;
    const stop = animateWhileVisible(canvas, (steps) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        const dx = p.bx - mouse.x;
        const dy = p.by - mouse.y;
        const inf = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 2.8);
        const x = p.bx * w + Math.sin(t * p.sp * 0.4 + p.ph) * 38 + inf * Math.cos(t + p.ph) * 36;
        const y = p.by * h + Math.cos(t * p.sp * 0.3 + p.ph * 0.7) * 24 + inf * Math.sin(t + p.ph) * 36;
        const pulse = Math.sin(t * p.sp + p.ph) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(x, y, p.r + pulse * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${0.08 + pulse * 0.18 + inf * 0.3})`;
        ctx.fill();
      }
      t += 0.016 * steps;
    });
    return () => {
      stop();
      ro.disconnect();
      canvas.removeEventListener('pointermove', onMove);
    };
  }, [count]);
  return <canvas ref={ref} aria-hidden className={clsx('absolute inset-0 h-full w-full', className)} />;
}

/** A row of dots tracing a slow wave (sparkline-like texture). Animates only while on screen. */
export function DotWave({ height = 32, accent = false, seed = 0 }: { height?: number; accent?: boolean; seed?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let W = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = canvas.clientWidth || 300;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    // Re-read the colour now and then so a theme switch recolours the dots.
    let rgb = cssRgb(getComputedStyle(canvas).color);
    let frame = 0;
    const f1 = 0.22 + seed * 0.08;
    const f2 = 0.07 + seed * 0.04;
    let t = seed * 13;
    const stop = animateWhileVisible(canvas, (steps) => {
      if (++frame % 60 === 0) rgb = cssRgb(getComputedStyle(canvas).color);
      ctx.clearRect(0, 0, W, height);
      const cols = Math.floor(W / 8);
      for (let i = 0; i < cols; i++) {
        const v = Math.max(0, Math.min(1, 0.35 + 0.55 * Math.sin(i * f1 + t) * Math.cos(i * f2 + t * 0.6)));
        ctx.beginPath();
        ctx.arc(i * 8 + 4, height - 4 - v * (height - 8), 1.5 + v * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${0.15 + v * 0.55})`;
        ctx.fill();
      }
      t += 0.02 * steps;
    });
    return () => {
      stop();
      ro.disconnect();
    };
  }, [height, seed]);
  return <canvas ref={ref} aria-hidden className={clsx('block w-full', accent ? 'text-gold' : 'text-ink')} style={{ height }} />;
}

/** Counts up once visible. Writes the DOM text directly (no React render per frame). */
export function Counter({ to, className, locale = 'en-IN' }: { to: number; className?: string; locale?: string }) {
  const [ref, on] = useInView<HTMLSpanElement>(0.5);
  useEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    if (reducedMotion()) {
      el.textContent = to.toLocaleString(locale);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / 2200, 1);
      el.textContent = Math.floor((1 - Math.pow(1 - p, 4)) * to).toLocaleString(locale);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, to, locale, ref]);
  return (
    <span ref={ref} className={clsx('tabular-nums', className)}>
      0
    </span>
  );
}
