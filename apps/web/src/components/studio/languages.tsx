'use client';

import { clsx } from 'clsx';
import { useState } from 'react';
import { ArtImage, Frame, Kicker, rise, useInView, useOnScreen, useTicker } from './primitives';

const SCRIPTS = [
  { word: 'शुभ विवाह', lang: 'Hindi', script: 'Devanagari' },
  { word: 'शुभ मंगल सावधान', lang: 'Marathi', script: 'Devanagari' },
  { word: 'திருமண அழைப்பு', lang: 'Tamil', script: 'Tamil' },
  { word: 'শুভ বিবাহ', lang: 'Bengali', script: 'Bengali' },
];

/** "Every language. Every tradition." — big language stat, design counts and a cycling script list. */
export function StudioLanguages({ hi }: { hi: boolean }) {
  const [ref, on] = useInView<HTMLElement>();
  const [active, setActive] = useState(0);
  const live = useOnScreen(ref);
  useTicker(() => setActive((n) => (n + 1) % SCRIPTS.length), 3000, live);

  return (
    <section id="languages" ref={ref} className="relative overflow-clip py-24 sm:py-32 lg:py-40">
      <Frame>
        <div className="mb-20">
          <Kicker className={clsx('mb-8 transition-opacity duration-700', on ? 'opacity-100' : 'opacity-0')}>{hi ? 'भाषाएँ और परंपराएँ' : 'Languages & traditions'}</Kicker>
          <div className="grid items-stretch gap-8 lg:grid-cols-[auto_1fr] lg:gap-16">
            <ArtImage name="languages-sphere" collapse className={clsx('parallax aspect-square w-40 shrink-0 sm:w-48 lg:w-72 xl:w-80', rise(on))} imgClassName="object-contain" />
            <div className="flex flex-col justify-center">
              <h2 className={clsx('display-xl', rise(on))}>
                {hi ? 'हर भाषा।' : 'Every language.'}
                <br />
                <span className="text-ink-soft">{hi ? 'हर परंपरा।' : 'Every tradition.'}</span>
              </h2>
              <p className={clsx('mt-8 max-w-lg text-xl leading-relaxed text-ink-soft transition-opacity delay-100 duration-1000', on ? 'opacity-100' : 'opacity-0')}>
                {hi
                  ? 'हिन्दू, मुस्लिम, सिख, ईसाई, बंगाली, दक्षिण भारतीय। पवित्र चिह्न आपके अवसर की परंपरा से आते हैं, डिज़ाइन से नहीं।'
                  : 'Hindu, Muslim, Sikh, Christian, Bengali, South Indian. Sacred marks follow your occasion’s tradition, never the template.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className={clsx('relative overflow-clip border border-ink/10 bg-ink/[0.02] p-6 sm:p-8 lg:col-span-2 lg:p-12', rise(on))}>
            {/* Dots joined by lines that draw in and fade */}
            <div aria-hidden className="absolute inset-0 opacity-70">
              <svg className="absolute inset-0 h-full w-full">
                {Array.from({ length: 19 }, (_, k) => (
                  <line
                    key={k}
                    x1={`${10 + (k % 5) * 20}%`}
                    y1={`${10 + Math.floor(k / 5) * 25}%`}
                    x2={`${10 + ((k + 1) % 5) * 20}%`}
                    y2={`${10 + Math.floor((k + 1) / 5) * 25}%`}
                    className="draw-line"
                    style={{ animationDelay: `${k * 0.15}s` }}
                  />
                ))}
              </svg>
              {Array.from({ length: 20 }, (_, k) => (
                <span
                  key={k}
                  className="absolute size-1.5 rounded-full bg-gold"
                  style={{ left: `${10 + (k % 5) * 20}%`, top: `${10 + Math.floor(k / 5) * 25}%`, animation: `dot-pulse 2s ease-in-out ${k * 0.1}s infinite` }}
                />
              ))}
            </div>
            <div className="relative z-10">
              <div className="mb-4 flex items-baseline gap-3">
                <span className="font-display text-7xl leading-none sm:text-8xl lg:text-[10rem]">12</span>
                <span className="text-2xl text-ink-soft">{hi ? 'भाषाएँ' : 'languages'}</span>
              </div>
              <p className="max-w-md text-ink-soft">
                {hi ? 'हर लिपि सही जुड़ाक्षरों के साथ, जैसे छपे हुए कार्ड में।' : 'Every script shaped correctly, conjuncts and all, exactly like a printed card.'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:flex lg:flex-col">
            {[
              ['43', hi ? 'डिज़ाइन परिवार' : 'design families'],
              ['5×7″', hi ? 'प्रिंट-तैयार PDF' : 'print-ready PDF'],
            ].map(([v, l], k) => (
              <div key={l} className={clsx('border border-ink/10 bg-ink/[0.02] p-6 sm:p-8', rise(on))} style={{ transitionDelay: `${(k + 1) * 100}ms` }}>
                <span className="font-display text-4xl sm:text-5xl lg:text-6xl">{v}</span>
                <span className="mt-2 block text-sm text-ink-soft">{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={clsx('mt-12 grid grid-cols-2 gap-4 transition-opacity delay-300 duration-1000 lg:grid-cols-4', on ? 'opacity-100' : 'opacity-0')}>
          {SCRIPTS.map((s, k) => (
            <button
              type="button"
              key={s.lang}
              onClick={() => setActive(k)}
              className={clsx('border p-4 text-left transition-[border-color,background-color] duration-300 sm:p-6', active === k ? 'border-ink/30 bg-ink/[0.04]' : 'border-ink/10 hover:border-ink/20')}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className={clsx('size-2 rounded-full transition-colors', active === k ? 'bg-gold' : 'bg-ink/20')} />
                <span className="font-mono text-xs uppercase tracking-wider text-ink-soft">{s.script}</span>
              </div>
              <span className="mb-1 block text-xl font-medium" lang={s.lang === 'Tamil' ? 'ta' : s.lang === 'Bengali' ? 'bn' : s.lang === 'Marathi' ? 'mr' : 'hi'}>
                {s.word}
              </span>
              <span className="text-sm text-ink-soft">{s.lang}</span>
            </button>
          ))}
        </div>
      </Frame>
    </section>
  );
}
