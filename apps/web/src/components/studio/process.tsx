'use client';

import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import { ArtImage, Frame, Kicker, useInView, useOnScreen } from './primitives';

const STEP_MS = 6000;

/** "Choose. Personalise. Share." — three auto-advancing steps on a darker band. */
export function StudioProcess({ hi }: { hi: boolean }) {
  const [ref, on] = useInView<HTMLElement>();
  const [active, setActive] = useState(0);
  const live = useOnScreen(ref);
  // Restarts after each step (or a click), and only runs while the section is on screen.
  useEffect(() => {
    if (!live) return;
    const id = setTimeout(() => setActive((n) => (n + 1) % 3), STEP_MS);
    return () => clearTimeout(id);
  }, [active, live]);

  const steps = hi
    ? [
        { n: '01', t: 'चुनें', s: 'अपना अवसर', d: 'शादी, गृह प्रवेश, जन्मदिन, पूजा। आपकी परंपरा के हिसाब से डिज़ाइन और शब्द पहले से तैयार।' },
        { n: '02', t: 'सजाएँ', s: 'अपनी भाषा में', d: 'नाम अंग्रेज़ी में टाइप करें, लिपि अपने-आप बदलेगी। या बोलकर बताइए, AI शब्द लिख देगा।' },
        { n: '03', t: 'भेजें', s: 'WhatsApp पर', d: 'कार्ड, वीडियो और लिंक एक टैप में परिवार के ग्रुप में। जवाब सीधे आपकी सूची में।' },
      ]
    : [
        { n: '01', t: 'Choose', s: 'your occasion', d: 'Wedding, griha pravesh, birthday, puja. Designs and wording already fit your tradition.' },
        { n: '02', t: 'Personalise', s: 'in your language', d: 'Type names in English and they convert to your script. Or speak, and AI writes the wording.' },
        { n: '03', t: 'Share', s: 'on WhatsApp', d: 'Card, video and link go to the family group in one tap. Replies land in your guest list.' },
      ];

  return (
    <section id="how-it-works" ref={ref} className="relative overflow-clip bg-sand py-20 sm:py-24 lg:py-32">
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 size-[400px] rounded-full [background:radial-gradient(closest-side,color-mix(in_srgb,var(--color-ink)_4%,transparent),transparent)]" />
      <Frame>
        <div className="grid items-end gap-4 lg:grid-cols-2 lg:gap-12">
          <div className="pb-0 lg:pb-32">
            <div className={clsx('transition-[opacity,transform] duration-1000', on ? 'translate-x-0 opacity-100' : '-translate-x-12 opacity-0')}>
              <Kicker className="mb-8">{hi ? 'कैसे काम करता है' : 'How it works'}</Kicker>
            </div>
            <h2 className={clsx('display-xl !leading-[0.85] transition-[opacity,transform] delay-100 duration-1000', on ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0')}>
              <span className="block">{hi ? 'चुनें।' : 'Choose.'}</span>
              <span className="block text-ink/30">{hi ? 'सजाएँ।' : 'Personalise.'}</span>
              <span className="block text-ink/10">{hi ? 'भेजें।' : 'Share.'}</span>
            </h2>
          </div>
          <div className={clsx('art-wrap parallax-slow relative h-[260px] transition-opacity delay-200 duration-1000 sm:h-[320px] lg:h-[600px]', on ? 'opacity-100' : 'opacity-0')}>
            <ArtImage name="process-tree" collapse className="absolute inset-0" imgClassName="object-contain object-bottom" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-sand via-transparent to-transparent" />
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3 lg:mt-0">
          {steps.map((s, k) => {
            const on = active === k;
            return (
              <button
                key={s.n}
                type="button"
                onClick={() => setActive(k)}
                aria-pressed={on}
                className={clsx('relative border bg-ivory p-6 text-left transition-[border-color] duration-500 sm:p-8 lg:p-12', on ? 'border-ink/60' : 'border-ink/20 hover:border-ink/45')}
              >
                <div className="mb-8 flex items-center gap-4">
                  <span className={clsx('font-display text-4xl transition-colors duration-300', on ? 'text-gold' : 'text-ink/20')}>{s.n}</span>
                  <div className="h-px flex-1 overflow-clip bg-ink/10">{on && <div key={active} className="bar-fill h-full bg-gold/60" style={{ animationDuration: `${STEP_MS}ms` }} />}</div>
                </div>
                <h3 className="mb-2 font-display text-4xl font-normal">{s.t}</h3>
                <span className="mb-6 block font-display text-xl text-ink-soft">{s.s}</span>
                <p className={clsx('leading-relaxed text-ink-soft transition-opacity duration-300', on ? 'opacity-100' : 'opacity-60')}>{s.d}</p>
                <div className={clsx('absolute inset-x-0 bottom-0 h-1 origin-left bg-gold transition-transform duration-500', on ? 'scale-x-100' : 'scale-x-0')} />
              </button>
            );
          })}
        </div>
      </Frame>
    </section>
  );
}
