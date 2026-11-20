'use client';

import { LazyMotion, m, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';

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

interface Placement {
  cos: number;
  sin: number;
  rx: number;
  ry: number;
  rotZ: number;
}

const SPRING = { stiffness: 60, damping: 25, mass: 0.5 };

/** The renderer arrives in its own chunk after first paint; until then cards render at their start values. */
const loadMotionFeatures = () => import("./motion-features").then((mod) => mod.default);

/** Golden-angle spiral so neighbouring cards never stack on the same side of the corridor. */
const place = (i: number): Placement => {
  const a = i * 137.5 * (Math.PI / 180);
  return {
    cos: Math.cos(a),
    sin: Math.sin(a),
    rx: 0.28 + (i % 3) * 0.07,
    ry: 0.24 + (i % 2) * 0.08,
    rotZ: (i % 2 === 0 ? 1 : -1) * (2 + (i % 4) * 1.5),
  };
};

function useStage() {
  const [stage, setStage] = useState<Stage>({ width: 1440, height: 900, isMobile: false });
  useEffect(() => {
    const update = () => setStage({ width: window.innerWidth, height: window.innerHeight, isMobile: window.innerWidth < 768 });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return stage;
}

/** Mouse-driven camera pan (fine pointers only). */
function useCameraParallax(enabled: boolean) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, SPRING);
  const y = useSpring(rawY, SPRING);
  useEffect(() => {
    if (!enabled || !window.matchMedia('(pointer: fine)').matches) return;
    const onMove = (e: PointerEvent) => {
      rawX.set((e.clientX / window.innerWidth - 0.5) * 2);
      rawY.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [enabled, rawX, rawY]);
  return { x, y };
}

function TunnelCard({
  item,
  index,
  total,
  progress,
  pointer,
  stage,
}: {
  item: TunnelItem;
  index: number;
  total: number;
  progress: MotionValue<number>;
  pointer: { x: MotionValue<number>; y: MotionValue<number> };
  stage: Stage;
}) {
  const p = place(index);
  const span = 0.5;
  const start = (index / total) * (1 - span);
  const local = useTransform(progress, [start, start + span], [0, 1]);

  const farZ = stage.isMobile ? -1200 : -1700;
  const nearZ = stage.isMobile ? 320 : 480;
  const z = useTransform(local, [0, 1], [farZ, nearZ]);
  const opacity = useTransform(local, [0, 0.16, 0.82, 0.98], [0, 1, 1, 0]);
  const pointerEvents = useTransform(opacity, (o) => (o > 0.4 ? 'auto' : 'none'));

  const width = stage.isMobile ? Math.max(110, Math.min(150, stage.width * 0.34)) : Math.max(160, Math.min(230, stage.width * 0.15));
  const baseX = p.cos * stage.width * p.rx;
  const baseY = p.sin * stage.height * p.ry;
  const pan = stage.isMobile ? 20 : 45;

  const transform = useTransform([z, pointer.x, pointer.y], ([cz, px, py]: number[]) => {
    const ox = baseX - px! * pan;
    const oy = baseY - py! * pan;
    return `translate3d(calc(-50% + ${ox}px), calc(-50% + ${oy}px), ${cz}px) rotateZ(${p.rotZ}deg)`;
  });

  return (
    <m.div style={{ width, transform, opacity, pointerEvents }} className="absolute left-1/2 top-1/2 aspect-[9/16] select-none will-change-transform">
      <Link
        href={item.href}
        draggable={false}
        className="group relative block h-full w-full overflow-hidden rounded-[var(--radius-card)] bg-ink/5 ring-1 ring-ink/10 transition-[box-shadow] duration-500 hover:ring-ink/40 focus-visible:ring-2 focus-visible:ring-ink"
      >
        <Image
          src={item.src}
          alt={item.title}
          width={432}
          height={768}
          sizes="(max-width: 768px) 40vw, 240px"
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
        <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3 pt-10 sm:p-4 sm:pt-12">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/95 sm:text-xs">{item.title}</span>
          {item.caption && <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">{item.caption}</span>}
        </span>
      </Link>
    </m.div>
  );
}

/**
 * Scroll-driven 3D corridor: the section is several screens tall and pins a full-screen stage while
 * the page scrolls, so cards fly from the far end towards the viewer. Page scroll is never hijacked.
 * With reduced motion it falls back to a plain scrolling row.
 */
export function PerspectiveTunnel({
  items,
  kicker,
  title,
  subtitle,
  prompt,
  footer,
  screens = 4,
}: {
  items: TunnelItem[];
  kicker?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** "Scroll to explore" line, fades out as travel starts. */
  prompt?: ReactNode;
  /** Shown once the corridor has been flown through (e.g. a CTA). */
  footer?: ReactNode;
  /** Section height in viewport heights; more = slower travel. */
  screens?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const stage = useStage();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 30, restDelta: 0.0001 });
  const pointer = useCameraParallax(!reduce);

  const titleScale = useTransform(progress, [0, 0.5, 1], [0.8, 1, 1.25]);
  const titleOpacity = useTransform(progress, [0, 0.1, 0.8, 0.92], [0.35, 1, 1, 0]);
  const promptOpacity = useTransform(progress, [0, 0.1], [1, 0]);
  const footerOpacity = useTransform(progress, [0.86, 0.96], [0, 1]);
  const footerY = useTransform(progress, [0.86, 0.96], [24, 0]);
  const footerEvents = useTransform(footerOpacity, (o) => (o > 0.5 ? 'auto' : 'none'));

  if (reduce) {
    return (
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-[1400px] px-5 text-center sm:px-6 lg:px-12">
          {kicker}
          <h2 className="display-md mt-6">{title}</h2>
          {subtitle && <p className="mx-auto mt-4 max-w-[44ch] text-ink-soft">{subtitle}</p>}
        </div>
        <ul className="mt-12 flex snap-x gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:px-12">
          {items.map((it) => (
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

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <section ref={ref} className="relative" style={{ height: `${screens * 100}svh` }}>
        <div
          className="sticky top-0 flex h-[100svh] w-full items-center justify-center overflow-hidden"
          style={{ perspective: stage.isMobile ? '900px' : '1200px', transformStyle: 'preserve-3d' }}
        >
          {/* Dot grid + depth rings */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(color-mix(in_srgb,var(--color-ink)_14%,transparent)_1px,transparent_1.2px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_55%,transparent_100%)]"
          />
          <div aria-hidden className="pointer-events-none absolute size-[48vmin] rounded-full border border-ink/10" />
          <div aria-hidden className="pointer-events-none absolute size-[76vmin] rounded-full border border-dashed border-ink/10" />

          <m.div style={{ scale: titleScale, opacity: titleOpacity }} className="pointer-events-none z-0 flex max-w-xl flex-col items-center px-6 text-center">
            {kicker}
            <h2 className="display-md mt-6">{title}</h2>
            {subtitle && <p className="mt-4 max-w-[38ch] text-sm text-ink-soft sm:text-base">{subtitle}</p>}
          </m.div>

          {prompt && (
            <m.div
              style={{ opacity: promptOpacity }}
              className="pointer-events-none absolute bottom-8 z-20 flex flex-col items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-ink-soft"
            >
              <span>{prompt}</span>
              <span className="h-6 w-px bg-gradient-to-b from-ink/60 to-transparent" />
            </m.div>
          )}

          <div className="pointer-events-none absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
            {items.map((it, i) => (
              <TunnelCard key={it.href} item={it} index={i} total={items.length} progress={progress} pointer={pointer} stage={stage} />
            ))}
          </div>

          {footer && (
            <m.div style={{ opacity: footerOpacity, y: footerY, pointerEvents: footerEvents }} className="absolute bottom-10 z-30 flex justify-center sm:bottom-14">
              {footer}
            </m.div>
          )}
        </div>
      </section>
    </LazyMotion>
  );
}
