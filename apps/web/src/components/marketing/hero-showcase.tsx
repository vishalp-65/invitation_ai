'use client';

import { BUILTIN_TEMPLATES, sampleInviteProps } from '@cardai/shared';
import { CheckCircle2, Play, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { useMemo, useState } from 'react';

// Remotion (~300 KB) is only downloaded when someone presses play.
const InvitePlayer = dynamic(() => import('@/components/invite/invite-player').then((m) => m.InvitePlayer), {
  ssr: false,
  loading: () => <div className="skeleton aspect-[9/16] w-full" />,
});

const FRONT = 'varmala-maroon';

/**
 * Hero visual: three real designs fanned on paper. Each card settles in once with a CSS
 * keyframe (transform + opacity only), then the page is still: no scroll or pointer listeners.
 */
export function HeroShowcase() {
  const locale = useLocale() as 'en' | 'hi';
  const [playing, setPlaying] = useState(false);
  const props = useMemo(() => sampleInviteProps(BUILTIN_TEMPLATES.find((t) => t.id === FRONT)!, locale), [locale]);

  return (
    <div className="relative mx-auto aspect-[5/6] w-full max-w-[30rem]">
      {/* Back cards */}
      <Image
        src="/showcase/golden-vows-onyx.jpg"
        alt=""
        width={432}
        height={768}
        sizes="(max-width: 640px) 40vw, 210px"
        priority
        className="absolute left-[2%] top-[14%] w-[42%] animate-card-in rounded-2xl border-4 border-white shadow-[0_24px_48px_-24px_rgb(30_34_80/0.5)] [--rot:-8deg] [animation-delay:120ms]"
      />
      <Image
        src="/showcase/genda-jharokha-maroon.jpg"
        alt=""
        width={432}
        height={768}
        sizes="(max-width: 640px) 40vw, 210px"
        priority
        className="absolute right-[2%] top-[14%] w-[42%] animate-card-in rounded-2xl border-4 border-white shadow-[0_24px_48px_-24px_rgb(30_34_80/0.5)] [--rot:8deg] [animation-delay:200ms]"
      />

      {/* Front card (plays the real video invite on demand) */}
      <div className="absolute left-1/2 top-0 w-[52%] -translate-x-1/2">
        <div className="animate-card-in overflow-hidden rounded-[22px] border-[5px] border-white bg-night shadow-[0_40px_80px_-30px_rgb(30_34_80/0.6)]">
          {playing ? (
            <InvitePlayer props={props} mode="video" autoPlay controls={false} />
          ) : (
            <div className="relative">
              <Image
                src={`/showcase/${FRONT}.jpg`}
                alt="Example Hindi wedding invitation with an illustrated couple"
                width={432}
                height={768}
                sizes="(max-width: 640px) 52vw, 260px"
                priority
                className="aspect-[9/16] w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="press absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-lg hover:bg-ivory"
              >
                <Play className="size-3.5 fill-current" aria-hidden />
                Play video invite
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Proof chips */}
      <div className="panel absolute bottom-[8%] left-0 flex animate-fade-up items-center gap-3 rounded-2xl px-3.5 py-2.5 [animation-delay:650ms] sm:-left-4">
        <span className="grid size-9 place-items-center rounded-xl bg-sand text-sindoor">
          <Users className="size-4.5" aria-hidden />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold">142 coming</span>
          <span className="block text-xs text-ink-soft">Sangeet RSVP</span>
        </span>
      </div>
      <div className="panel absolute bottom-[22%] right-0 hidden animate-fade-up items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium [animation-delay:800ms] sm:flex sm:-right-4">
        <CheckCircle2 className="size-4 text-leaf" aria-hidden />
        Video ready · 9.8 MB
      </div>
    </div>
  );
}
