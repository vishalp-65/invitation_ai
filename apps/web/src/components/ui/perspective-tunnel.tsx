'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLite } from '@/lib/perf';

export interface TunnelItem {
  /** Showcase image (9:16). */
  src: string;
  title: string;
  /** Small line under the title (colourway, region…). */
  caption?: string;
  href: string;
}

interface Stage {
  width: number;
  height: number;
  isMobile: boolean;
}

interface Slot {
  baseX: number;
  baseY: number;
  rotZ: number;
  width: number;
  /** Share of the section's scroll at which this card starts / the span it travels over. */
  start: number;
}

/** Cards flying at once are the cost, so the corridor never holds more than this many. */
const MAX_DESKTOP = 14;
const MAX_MOBILE = 8;
/** Share of the whole scroll one card takes to fly through. */
const SPAN = 0.5;
/** A card is laid out (but still invisible) this far before it starts, so its image has loaded. */
const LEAD = 0.1;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mapRange = (v: number, a: number, b: number, from: number, to: number) => from + (to - from) * clamp01((v - a) / (b - a));

/** Golden-angle spiral so neighbouring cards never stack on the same side of the corridor. */
function place(i: number, total: number, stage: Stage): Slot {
  const a = i * 137.5 * (Math.PI / 180);
  const rx = 0.28 + (i % 3) * 0.07;
  const ry = 0.24 + (i % 2) * 0.08;
  return {
    baseX: Math.cos(a) * stage.width * rx,
    baseY: Math.sin(a) * stage.height * ry,
    rotZ: (i % 2 === 0 ? 1 : -1) * (2 + (i % 4) * 1.5),
    width: stage.isMobile ? Math.max(110, Math.min(150, stage.width * 0.34)) : Math.max(160, Math.min(230, stage.width * 0.15)),
    start: (i / total) * (1 - SPAN),
  };
}

/** Width and phone/desktop only: phones fire `resize` when the URL bar hides, which must not re-render the stage. */
function useStage() {
  const [stage, setStage] = useState<Stage>({ width: 1440, height: 900, isMobile: false });
  useEffect(() => {
    let w = 0;
    let raf = 0;
    const update = () => {
      const width = window.innerWidth;
      if (width === w) return;
      w = width;
      setStage({ width, height: window.innerHeight, isMobile: width < 768 });
    };
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);
  return stage;
}

/**
 * Scroll-driven 3D corridor: the section is several screens tall and pins a full-screen stage while
 * the page scrolls, so cards fly from the far end towards the viewer. Page scroll is never hijacked.
 *
 * Built for low CPU cost: no animation library and no per-card React work. One passive scroll
 * listener feeds a small rAF loop that eases towards the target and writes `transform` / `opacity`
 * straight to the few cards that are currently in flight (everything else is `display:none`, so it
 * costs no layer and no image). The loop sleeps as soon as the scroll stops.
 *
 * Phones get fewer, smaller cards. Reduced motion and low-end devices (`data-perf="lite"`) get a
 * plain swipeable row instead.
 */
export function PerspectiveTunnel(props: TunnelProps) {
  const lite = useLite();
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return lite || reduce ? <TunnelRow {...props} /> : <TunnelStage {...props} />;
}

interface TunnelProps {
  items: TunnelItem[];
  kicker?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** "Scroll to explore" line, fades out as travel starts. */
  prompt?: ReactNode;
  /** Shown once the corridor has been flown through (e.g. a CTA). */
  footer?: ReactNode;
  /** Section height in viewport heights on desktop; more = slower travel. */
  screens?: number;
}

/** Plain scrolling row: no pinned stage, no 3D, a handful of lazy images. */
function TunnelRow({ items, kicker, title, subtitle, footer }: TunnelProps) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-[1400px] px-5 text-center sm:px-6 lg:px-12">
        {kicker}
        <h2 className="display-md mt-6">{title}</h2>
        {subtitle && <p className="mx-auto mt-4 max-w-[44ch] text-ink-soft">{subtitle}</p>}
      </div>
      <ul className="mt-12 flex snap-x gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:px-12">
        {items.slice(0, 12).map((it) => (
          <li key={it.href} className="w-40 shrink-0 snap-start sm:w-52">
            <Link href={it.href} className="block overflow-hidden rounded-[var(--radius-card)] ring-1 ring-ink/10">
              <Image src={it.src} alt={it.title} width={432} height={768} sizes="208px" className="aspect-[9/16] w-full object-cover" />
            </Link>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">{it.title}</p>
          </li>
        ))}
      </ul>
      {footer && <div className="mt-10 flex justify-center">{footer}</div>}
    </section>
  );
}

function TunnelStage({ items, kicker, title, subtitle, prompt, footer, screens = 4 }: TunnelProps) {
  const stage = useStage();
  const shown = useMemo(() => items.slice(0, stage.isMobile ? MAX_MOBILE : MAX_DESKTOP), [items, stage.isMobile]);
  const slots = useMemo(() => shown.map((_, i) => place(i, shown.length, stage)), [shown, stage]);

  const sectionRef = useRef<HTMLElement>(null);
  const panRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  /** Re-applies the current frame after a layout change (new slots / stage size). */
  const repaint = useRef<() => void>(() => {});
  const live = useRef({ slots, stage });
  live.current = { slots, stage };

  useLayoutEffect(() => repaint.current(), [slots]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let top = 0;
    let span = 1;
    let target = 0;
    let cur = 0;
    let panX = 0;
    let panY = 0;
    let panTX = 0;
    let panTY = 0;
    let raf = 0;
    let visible = new Set<number>();
    const clickable = new Map<number, boolean>();
    const fine = window.matchMedia('(pointer: fine)').matches;

    /** `force`: after a layout change, write every card's state instead of only the ones that changed. */
    const render = (force = false) => {
      const { slots: sl, stage: st } = live.current;
      const farZ = st.isMobile ? -1200 : -1700;
      const nearZ = st.isMobile ? 320 : 480;
      const next = new Set<number>();
      sl.forEach((s, i) => {
        const el = cardRefs.current[i];
        if (!el) return;
        const local = (cur - s.start) / SPAN;
        if (local < -LEAD / SPAN || local > 1) {
          if (force || visible.has(i)) {
            el.style.display = 'none';
            clickable.delete(i);
          }
          return;
        }
        next.add(i);
        if (force || !visible.has(i)) el.style.display = '';
        const z = farZ + (nearZ - farZ) * clamp01(local);
        const o = local <= 0 ? 0 : local < 0.16 ? local / 0.16 : local < 0.82 ? 1 : local < 0.98 ? (0.98 - local) / 0.16 : 0;
        el.style.transform = `translate3d(calc(-50% + ${s.baseX.toFixed(1)}px), calc(-50% + ${s.baseY.toFixed(1)}px), ${z.toFixed(1)}px) rotateZ(${s.rotZ}deg)`;
        el.style.opacity = o.toFixed(3);
        const on = o > 0.4;
        if (clickable.get(i) !== on) {
          clickable.set(i, on);
          el.style.pointerEvents = on ? 'auto' : 'none';
        }
      });
      visible = next;

      const t = titleRef.current;
      if (t) {
        t.style.transform = `scale(${mapRange(cur, 0, 0.5, 0.8, 1) * (cur > 0.5 ? mapRange(cur, 0.5, 1, 1, 1.25) : 1)})`;
        t.style.opacity = String(cur < 0.1 ? mapRange(cur, 0, 0.1, 0.35, 1) : cur < 0.8 ? 1 : mapRange(cur, 0.8, 0.92, 1, 0));
      }
      if (promptRef.current) promptRef.current.style.opacity = String(mapRange(cur, 0, 0.1, 1, 0));
      const f = footerRef.current;
      if (f) {
        const fo = mapRange(cur, 0.86, 0.96, 0, 1);
        f.style.opacity = String(fo);
        f.style.transform = `translate3d(0, ${(1 - fo) * 24}px, 0)`;
        f.style.pointerEvents = fo > 0.5 ? 'auto' : 'none';
      }
      if (panRef.current && fine) {
        const pan = st.isMobile ? 20 : 45;
        panRef.current.style.transform = `translate3d(${(-panX * pan).toFixed(1)}px, ${(-panY * pan).toFixed(1)}px, 0)`;
      }
    };

    /** Eases towards the scroll position; sleeps once settled. */
    const tick = () => {
      raf = 0;
      cur += (target - cur) * 0.16;
      panX += (panTX - panX) * 0.08;
      panY += (panTY - panY) * 0.08;
      const settled = Math.abs(target - cur) < 0.0004 && Math.abs(panTX - panX) < 0.004 && Math.abs(panTY - panY) < 0.004;
      if (settled) {
        cur = target;
        panX = panTX;
        panY = panTY;
      }
      render();
      if (!settled) raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    repaint.current = () => {
      clickable.clear();
      render(true);
    };

    const onScroll = () => {
      const v = clamp01((window.scrollY - top) / span);
      if (v === target) return;
      target = v;
      wake();
    };
    const measure = () => {
      const r = section.getBoundingClientRect();
      top = r.top + window.scrollY;
      span = Math.max(1, r.height - window.innerHeight);
      target = clamp01((window.scrollY - top) / span);
      cur = target;
      render(true);
    };
    const onPointer = (e: PointerEvent) => {
      panTX = (e.clientX / window.innerWidth - 0.5) * 2;
      panTY = (e.clientY / window.innerHeight - 0.5) * 2;
      wake();
    };

    measure();
    // Content above (lazy images, fonts) shifts the section; the body's size catches that.
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    ro.observe(section);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);

    // Pointer pan only while the corridor is on screen.
    let io: IntersectionObserver | undefined;
    if (fine) {
      io = new IntersectionObserver(([e]) => {
        if (e?.isIntersecting) window.addEventListener('pointermove', onPointer, { passive: true });
        else window.removeEventListener('pointermove', onPointer);
      });
      io.observe(section);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      window.removeEventListener('pointermove', onPointer);
      repaint.current = () => {};
    };
  }, []);

  return (
    <section ref={sectionRef} data-tunnel-stage="" className="relative" style={{ height: `${(stage.isMobile ? screens - 1 : screens) * 100}svh` }}>
      <div
        className="sticky top-0 flex h-[100svh] w-full items-center justify-center overflow-hidden [contain:layout_paint]"
        style={{ perspective: stage.isMobile ? '900px' : '1200px' }}
      >
        {/* Dot grid + depth rings (static) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(color-mix(in_srgb,var(--color-ink)_14%,transparent)_1px,transparent_1.2px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_55%,transparent_100%)]"
        />
        <div aria-hidden className="pointer-events-none absolute size-[48vmin] rounded-full border border-ink/10" />
        <div aria-hidden className="pointer-events-none absolute size-[76vmin] rounded-full border border-dashed border-ink/10" />

        <div ref={titleRef} className="pointer-events-none z-0 flex max-w-xl origin-center flex-col items-center px-6 text-center will-change-transform" style={{ opacity: 0.35, transform: 'scale(0.8)' }}>
          {kicker}
          <h2 className="display-md mt-6">{title}</h2>
          {subtitle && <p className="mt-4 max-w-[38ch] text-sm text-ink-soft sm:text-base">{subtitle}</p>}
        </div>

        {prompt && (
          <div ref={promptRef} className="pointer-events-none absolute bottom-8 z-20 flex flex-col items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
            <span>{prompt}</span>
            <span className="h-6 w-px bg-gradient-to-b from-ink/60 to-transparent" />
          </div>
        )}

        <div ref={panRef} className="pointer-events-none absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          {shown.map((it, i) => (
            <div
              key={it.href}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="absolute left-1/2 top-1/2 aspect-[9/16] select-none will-change-transform"
              style={{ width: slots[i]!.width, display: 'none', opacity: 0, pointerEvents: 'none' }}
            >
              <Link
                href={it.href}
                draggable={false}
                className="group relative block h-full w-full overflow-hidden rounded-[var(--radius-card)] bg-ink/5 ring-1 ring-ink/10 transition-colors hover:ring-ink/40 focus-visible:ring-2 focus-visible:ring-ink"
              >
                <Image
                  src={it.src}
                  alt={it.title}
                  width={432}
                  height={768}
                  sizes={stage.isMobile ? '150px' : '230px'}
                  draggable={false}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3 pt-10 sm:p-4 sm:pt-12">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/95 sm:text-xs">{it.title}</span>
                  {it.caption && <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">{it.caption}</span>}
                </span>
              </Link>
            </div>
          ))}
        </div>

        {footer && (
          <div ref={footerRef} className="absolute bottom-10 z-30 flex justify-center sm:bottom-14" style={{ opacity: 0, pointerEvents: 'none' }}>
            {footer}
          </div>
        )}
      </div>
    </section>
  );
}
