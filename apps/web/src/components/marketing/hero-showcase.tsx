'use client';

import { BUILTIN_TEMPLATES, sampleInviteProps } from '@cardai/shared';
import { CheckCircle2, Play, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { useMemo, useState, type CSSProperties } from 'react';

// Remotion (~300 KB) is only downloaded when someone presses play.
const InvitePlayer = dynamic(() => import('@/components/invite/invite-player').then((m) => m.InvitePlayer), {
  ssr: false,
  loading: () => <div className="skeleton aspect-[9/16] w-full" />,
});

const FRONT = 'varmala-maroon';

/** Left to right. Offsets are in card widths, so the fan scales with the card. */
const FAN = [
  { id: 'golden-vows-onyx', tx: '-172%', ty: '15%', rot: '-12deg', z: 1, delay: 320 },
  { id: 'genda-jharokha-maroon', tx: '-90%', ty: '4.5%', rot: '-6deg', z: 2, delay: 220 },
  { id: FRONT, tx: '0%', ty: '0%', rot: '0deg', z: 3, delay: 120 },
  { id: 'kanjeevaram-wine', tx: '90%', ty: '4.5%', rot: '6deg', z: 2, delay: 220 },
  { id: 'botanical-sage', tx: '172%', ty: '15%', rot: '12deg', z: 1, delay: 320 },
] as const;

/**
 * Hero visual: five real designs dealt out into a fan. The cards start stacked and spread once
 * (one CSS keyframe each, transform + opacity only); after that nothing runs: no scroll or
 * pointer listeners. The middle card plays the real video invite on demand.
 */
export function HeroShowcase() {
  const locale = useLocale() as 'en' | 'hi';
  const [playing, setPlaying] = useState(false);
  const props = useMemo(() => sampleInviteProps(BUILTIN_TEMPLATES.find((t) => t.id === FRONT)!, locale), [locale]);

  return (
    <div className="relative mx-auto w-full max-w-5xl [--w:clamp(124px,23vw,214px)]">
      {/* Height = one card (9:16) plus the drop of the outer cards. */}
      <div className="relative h-[calc(var(--w)*2.02)]">
        {FAN.map((c) => {
          const front = c.id === FRONT;
          return (
            <div
              key={c.id}
              className="absolute left-1/2 top-0 -ml-[calc(var(--w)/2)] w-[var(--w)] animate-card-in"
              style={{ '--tx': c.tx, '--ty': c.ty, '--rot': c.rot, zIndex: c.z, animationDelay: `${c.delay}ms` } as CSSProperties}
            >
              <div
                className={
                  'overflow-hidden rounded-xl border border-hairline bg-night transition-transform duration-500 ease-[var(--ease-out-quint)] ' +
                  (front ? '' : 'hover:-translate-y-2')
                }
              >
                {front && playing ? (
                  <InvitePlayer props={props} mode="video" autoPlay controls={false} />
                ) : (
                  <div className="relative">
                    <Image
                      src={`/showcase/${c.id}.jpg`}
                      alt={front ? 'Example Hindi wedding invitation with an illustrated couple' : ''}
                      width={432}
                      height={768}
                      sizes="(max-width: 640px) 23vw, 214px"
                      priority
                      className="aspect-[9/16] w-full object-cover"
                    />
                    {front && (
                      <button
                        type="button"
                        onClick={() => setPlaying(true)}
                        className="press group absolute inset-x-2 bottom-2 flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-white text-[0.8125rem] font-semibold text-[#15173a] sm:inset-x-3 sm:bottom-3 sm:h-10 sm:text-sm"
                      >
                        <Play className="size-3.5 fill-current transition-transform duration-300 group-hover:scale-110" aria-hidden />
                        <span className="max-[420px]:hidden">Play video invite</span>
                        <span className="min-[421px]:hidden">Play</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* What the other two formats give you */}
      <div className="panel absolute left-[4%] top-[58%] z-10 hidden animate-fade-up items-center gap-3 rounded-xl px-3.5 py-2.5 [animation-delay:800ms] md:flex">
        <span className="grid size-9 place-items-center rounded-lg border border-hairline text-ink">
          <Users className="size-4.5" aria-hidden />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold">142 coming</span>
          <span className="block text-xs text-ink-soft">Sangeet RSVP</span>
        </span>
      </div>
      <div className="panel absolute right-[4%] top-[42%] z-10 hidden animate-fade-up items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium [animation-delay:950ms] md:flex">
        <CheckCircle2 className="size-4 text-ink-soft" aria-hidden />
        Video ready, 9.8 MB
      </div>
    </div>
  );
}
