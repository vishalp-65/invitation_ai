'use client';

/**
 * Scroll-dealt deck. Adapted from "Project Deck" by Aakash Mehra.
 *
 * Each card rises from below, leaning back in 3D, then flattens as it lands. The cards underneath
 * lift a little, sink back and dim. The bottom-right corner of each card is cut away to hold its
 * link. One spring-smoothed scroll value drives every card, and only transform and opacity animate,
 * so frames stay on the compositor. Under prefers-reduced-motion the cards just swap in place.
 *
 * Below `sm` there is no pinned scroll stage. The cards stack with plain CSS `position: sticky`,
 * which needs no JS and stays light on phones. The page ground (the `bg-ivory` token) fills the
 * cut-out corner, so it follows light and dark mode.
 */

import { clsx } from 'clsx';
import {
  LazyMotion,
  m,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

const loadFeatures = () => import('./motion-features').then((r) => r.default);

export type DeckCard = {
  id: string;
  /** Screen-reader description of the card. */
  label: string;
  /** Visit-button title and subtitle. */
  title: string;
  sub: string;
  href: string;
  /** Background of the round arrow button. */
  accent: string;
  /** The card face, filling the card edge to edge. */
  face: ReactNode;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const ENTER = 0.72; // share of each card's screen spent arriving; the rest it rests in place

/** How far card `j` has arrived (0 below the window, 1 landed) at deck progress `v`. */
function arrived(j: number, v: number, count: number) {
  if (j <= 0) return 1;
  const span = Math.max(1, count - 1);
  return easeOut(clamp01((v * span - (j - 1)) / ENTER));
}

export function StackingDeck({ cards, className }: { cards: DeckCard[]; className?: string }) {
  return (
    <div className={className}>
      <PinnedDeck cards={cards} />
      <StickyStack cards={cards} />
    </div>
  );
}

/**
 * False below `sm`, where the pinned stage is hidden. Starts true so desktop renders the cards
 * from the first paint. Phones drop them after hydration (they were display:none anyway), so no
 * motion values keep updating there.
 */
function useWide() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return wide;
}

/**
 * 0 → 1 as the deck scrolls past, pinned from its top to its bottom. The deck's position is
 * measured once and again only when the page resizes, so scrolling itself never reads layout
 * (framer-motion's `useScroll({ target })` re-measures the target on every scroll event).
 */
function useDeckProgress(ref: RefObject<HTMLElement | null>) {
  const progress = useMotionValue(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let top = 0;
    let span = 1;
    const update = () => progress.set(clamp01((window.scrollY - top) / span));
    const measure = () => {
      const r = el.getBoundingClientRect();
      top = r.top + window.scrollY;
      span = Math.max(1, r.height - window.innerHeight);
      update();
    };
    measure();
    // Content above the deck (lazy images, fonts) can move it; the body's size catches that.
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    ro.observe(el);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', measure);
    };
  }, [ref, progress]);
  return progress;
}

/** sm and up: a pinned stage, one screen of scroll per card. */
function PinnedDeck({ cards }: { cards: DeckCard[] }) {
  const deck = useRef<HTMLDivElement>(null);
  const still = useReducedMotion() ?? false;
  const wide = useWide();
  const scrollYProgress = useDeckProgress(deck);
  // Light, critically damped smoothing: follows the wheel closely and never overshoots. With
  // reduced motion the cards only swap, so the raw scroll value is enough.
  const smooth = useSpring(scrollYProgress, {
    stiffness: 380,
    damping: 48,
    mass: 0.35,
    restDelta: 0.0005,
  });
  const progress = still ? scrollYProgress : smooth;

  return (
    <LazyMotion features={loadFeatures} strict>
      <div
        ref={deck}
        className="relative hidden w-full sm:block"
        style={{ height: `${Math.max(1, cards.length) * 100}svh` }}
      >
        <div className="sticky top-0 grid h-svh place-items-center overflow-hidden px-6 [contain:layout_paint] [perspective:1800px] lg:px-12">
          {wide &&
            cards.map((c, i) => (
              <PinnedCard
                key={c.id}
                card={c}
                i={i}
                count={cards.length}
                progress={progress}
                still={still}
              />
            ))}
        </div>
      </div>
    </LazyMotion>
  );
}

function PinnedCard({
  card,
  i,
  count,
  progress,
  still,
}: {
  card: DeckCard;
  i: number;
  count: number;
  progress: MotionValue<number>;
  still: boolean;
}) {
  // Two shared values per card, each computed once per frame: how far this card has arrived, and
  // how many cards now lie on top of it. Everything else derives from them.
  const here = useTransform(progress, (v) => arrived(i, v, count));
  const above = useTransform(progress, (v) => {
    let n = 0;
    for (let j = i + 1; j < count; j++) n += arrived(j, v, count);
    return Math.min(3, n);
  });
  // Only compositor-friendly properties (transform, opacity): no blur or other filter, which would
  // repaint the whole card on every frame.
  const y = useTransform([here, above], ([a, b]: number[]) => `${(1 - a!) * 108 - b! * 4}svh`);
  const rotateX = useTransform([here, above], ([a, b]: number[]) => -(1 - a!) * 30 + b! * 5);
  const scale = useTransform([here, above], ([a, b]: number[]) => 0.9 + 0.1 * a! - b! * 0.05);
  const dim = useTransform(above, (b) => b * 0.15);
  // A card still below the window is skipped entirely, so it costs no layer or paint.
  const visibility = useTransform(here, (a) => (a > 0.001 ? 'visible' : 'hidden'));
  const stillY = useTransform(here, (a) => (a >= 0.5 ? '0svh' : '110svh'));

  return (
    <m.article
      aria-label={card.label}
      className="col-start-1 row-start-1 mt-[4svh] w-[min(100%,calc(80svh*16/9),1400px)] origin-[50%_25%] will-change-transform [backface-visibility:hidden] [contain:layout_paint]"
      style={{ zIndex: i + 1, visibility, ...(still ? { y: stillY } : { y, rotateX, scale }) }}
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-ivory">
        {card.face}
        <Visit card={card} />
        {!still && (
          <m.div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[#0A0C14] will-change-[opacity]"
            style={{ opacity: dim }}
          />
        )}
      </div>
    </m.article>
  );
}

/** Phones: CSS-only sticky stack, each card pinning a little lower than the one before. */
function StickyStack({ cards }: { cards: DeckCard[] }) {
  return (
    <ol className="flex flex-col gap-6 px-5 sm:hidden">
      {cards.map((c, i) => (
        <li
          key={c.id}
          aria-label={c.label}
          className="sticky"
          style={{ top: `calc(5rem + ${i * 14}px)` }}
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-ivory">
            {c.face}
            <Visit card={c} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** The link, set into a corner cut out of the card. */
function Visit({ card }: { card: DeckCard }) {
  const R = 18;
  const corner = (
    <svg aria-hidden width={R} height={R} viewBox={`0 0 ${R} ${R}`} className="block fill-ivory">
      <path d={`M${R} 0 V${R} H0 A${R} ${R} 0 0 0 ${R} 0 Z`} />
    </svg>
  );
  return (
    <div className="absolute bottom-0 right-0 z-10">
      <div className="absolute bottom-full right-0">{corner}</div>
      <div className="absolute bottom-0 right-full">{corner}</div>
      <Link
        href={card.href}
        aria-label={`${card.title}: ${card.sub}`}
        className="group flex items-center gap-4 rounded-tl-[20px] bg-ivory py-3 pl-5 pr-1 text-ink outline-none sm:gap-5 sm:py-4 sm:pl-7"
      >
        <span className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight sm:text-lg">{card.title}</span>
          <span className="text-[13px] text-ink-soft underline-offset-4 group-hover:underline group-focus-visible:underline sm:text-sm">
            {card.sub}
          </span>
        </span>
        <span
          className={clsx(
            'grid size-11 place-items-center rounded-full text-white sm:size-12',
            'transition-transform duration-200 ease-out group-hover:rotate-45 group-active:scale-90 group-focus-visible:outline-2 group-focus-visible:outline-offset-2',
          )}
          style={{ background: card.accent, outlineColor: card.accent }}
        >
          <ArrowUpRight className="size-5" strokeWidth={2.2} aria-hidden />
        </span>
      </Link>
    </div>
  );
}
