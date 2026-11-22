'use client';

import { SHOWCASE } from '@cardai/shared';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { occasionHref } from '@/features/occasions/routes';
import { CardShot, Frame, useInView, useOnScreen } from './primitives';

const ROTATE_MS = 8000;

/**
 * Inverted band (ink ground): one occasion at a time with sample wording on the left and the real
 * design on the right. Sample wording, not testimonials.
 */
export function StudioOccasions({ hi }: { hi: boolean }) {
  const [ref, on] = useInView<HTMLElement>();
  const [i, setI] = useState(0);
  const items = hi
    ? [
        { occ: 'शादी', type: 'wedding', line: 'श्रीमती सुनीता एवं श्री रमेश शर्मा सादर आमंत्रित करते हैं, हमारे पुत्र राहुल और प्रिया के शुभ विवाह में।', who: 'नमूना शब्द · हिन्दी', card: SHOWCASE.weddingHindi },
        { occ: 'गृह प्रवेश', type: 'griha-pravesh', line: 'प्रभु कृपा से हमारे नए घर में गृह प्रवेश पूजा है। आप सपरिवार पधारें।', who: 'नमूना शब्द · हिन्दी', card: SHOWCASE.griha },
        { occ: 'निकाह', type: 'nikah', line: 'बिस्मिल्लाह-इर-रहमान-इर-रहीम। अयान और ज़ोया के निकाह में आपकी मौजूदगी हमारी ख़ुशी होगी।', who: 'नमूना शब्द · उर्दू शैली', card: SHOWCASE.nikah },
        { occ: 'जन्मदिन', type: 'birthday', line: 'आरव का पहला जन्मदिन है! केक, गुब्बारे और ढेर सारी मस्ती के लिए आइए।', who: 'नमूना शब्द · हिन्दी', card: SHOWCASE.birthday },
      ]
    : [
        { occ: 'Wedding', type: 'wedding', line: 'Mrs. Sunita & Mr. Ramesh Sharma request the pleasure of your company at the wedding of Rahul and Priya.', who: 'Sample wording · English', card: SHOWCASE.wedding },
        { occ: 'Griha Pravesh', type: 'griha-pravesh', line: 'By the grace of God, we invite you and your family to the griha pravesh puja of our new home.', who: 'Sample wording · English', card: SHOWCASE.griha },
        { occ: 'Nikah', type: 'nikah', line: 'Bismillah-ir-Rahman-ir-Rahim. Your presence at the nikah of Ayaan and Zoya would complete our joy.', who: 'Sample wording · English', card: SHOWCASE.nikah },
        { occ: 'Birthday', type: 'birthday', line: 'Aarav is turning one! Join us for cake, balloons and a lot of noise.', who: 'Sample wording · English', card: SHOWCASE.birthday },
      ];
  const live = useOnScreen(ref);
  // Restarts after each change (auto or manual), only while on screen.
  useEffect(() => {
    if (!live) return;
    const id = setTimeout(() => setI((n) => (n + 1) % items.length), ROTATE_MS);
    return () => clearTimeout(id);
  }, [i, items.length, live]);
  // Horizontal swipe on the card changes occasion on touch screens.
  const touchX = useRef<number | null>(null);
  const cur = items[i]!;
  const go = (n: number) => setI((n + items.length) % items.length);

  return (
    <section ref={ref} className="relative overflow-clip bg-ink py-24 text-ivory sm:py-32 lg:py-40">
      {/* Faint tick-mark texture (deterministic, so server and client match) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:radial-gradient(color-mix(in_srgb,var(--color-ivory)_5%,transparent)_1px,transparent_1.2px)] [background-size:14px_18px]" />
      <Frame className="z-10">
        <div className="mb-12 flex items-center justify-between sm:mb-20">
          <div>
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-sm text-ivory/40">
              <span className="h-px w-12 bg-ivory/20" />
              {hi ? 'हर अवसर' : 'Occasions'}
            </span>
            <h2 className={clsx('text-4xl transition-[opacity,transform] duration-1000 lg:text-5xl', on ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0')}>
              <span className="sr-only">
                {hi ? 'हर भारतीय अवसर के लिए निमंत्रण, सही शब्दों में' : 'Invitations for every Indian occasion, in the right words'}
              </span>
              <span aria-hidden>
                {hi ? 'हर अवसर के लिए,' : 'Made for every occasion,'}
                <span className="text-ivory/40">{hi ? ' सही शब्दों में।' : ' in the right words.'}</span>
              </span>
            </h2>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <button type="button" aria-label={hi ? 'पिछला' : 'Previous'} onClick={() => go(i - 1)} className="border border-ivory/20 p-4 transition-colors hover:bg-ivory/10">
              <ArrowLeft className="size-5" />
            </button>
            <button type="button" aria-label={hi ? 'अगला' : 'Next'} onClick={() => go(i + 1)} className="border border-ivory/20 p-4 transition-colors hover:bg-ivory/10">
              <ArrowRight className="size-5" />
            </button>
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-20">
          <div className="relative lg:col-span-7">
            <span aria-hidden className="parallax pointer-events-none absolute -left-4 -top-16 select-none font-display text-[140px] leading-none text-ivory/5 sm:text-[200px]">
              &ldquo;
            </span>
            <blockquote key={`q${i}`} className="slide-in-x relative font-display text-2xl leading-[1.25] tracking-tight sm:text-3xl lg:text-4xl xl:text-5xl">
              {cur.line}
            </blockquote>
            <div className="mt-12 flex items-center gap-6">
              <div className="flex size-14 items-center justify-center rounded-full bg-ivory/10 font-display text-xl">{cur.occ.charAt(0)}</div>
              <div>
                <p className="text-lg font-medium">{cur.occ}</p>
                <p className="text-ivory/60">{cur.who}</p>
              </div>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
              <Link href={`/create?type=${cur.type}`} className="group inline-flex items-center gap-2 font-mono text-sm text-ivory/60 transition-colors hover:text-ivory">
                {hi ? 'इस अवसर के लिए बनाएँ' : 'Make one for this occasion'}
                <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
              </Link>
              <Link href={occasionHref(cur.type)} className="font-mono text-sm text-ivory/40 underline decoration-ivory/20 underline-offset-4 transition-colors hover:text-ivory">
                {hi ? `${cur.occ} के निमंत्रण` : `${cur.occ} invitations`}
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-6 lg:col-span-5">
            <div
              key={`c${i}`}
              className="slide-in-x flex touch-pan-y justify-center border border-ivory/20 bg-ivory/5 p-6 lg:p-8"
              onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
              onTouchEnd={(e) => {
                const start = touchX.current;
                const end = e.changedTouches[0]?.clientX;
                touchX.current = null;
                if (start == null || end == null || Math.abs(end - start) < 40) return;
                go(end < start ? i + 1 : i - 1);
              }}
            >
              <CardShot id={cur.card} alt={cur.occ} sizes="(max-width: 768px) 60vw, 260px" className="w-full max-w-[220px] sm:max-w-[260px]" />
            </div>
            <div className="flex gap-2 overflow-clip">
              {items.map((it, k) => (
                <button key={it.type} type="button" aria-label={it.occ} onClick={() => setI(k)} className="tap-pad h-1 flex-1 bg-ivory/20">
                  <div
                    key={k === i ? `on${i}` : `off${k}`}
                    className={clsx('h-full bg-ivory', k === i ? 'bar-fill' : k < i ? 'w-full opacity-50' : 'w-0')}
                    style={k === i ? { animationDuration: `${ROTATE_MS}ms` } : undefined}
                  />
                </button>
              ))}
            </div>
            <div className="mt-4 border-t border-ivory/10 pt-6">
              <span className="mb-4 block font-mono text-xs uppercase tracking-widest text-ivory/30">{hi ? 'अवसर' : 'Occasions'}</span>
              <div className="flex flex-wrap gap-3">
                {items.map((it, k) => (
                  <button
                    key={it.type}
                    type="button"
                    onClick={() => setI(k)}
                    className={clsx('min-h-10 border px-4 py-2 text-sm transition-[border-color,color]', k === i ? 'border-ivory/40 text-ivory' : 'border-ivory/10 text-ivory/40 hover:border-ivory/30')}
                  >
                    {it.occ}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Frame>
    </section>
  );
}
