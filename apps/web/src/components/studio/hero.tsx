'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { useOnScreen, useTicker } from './primitives';

const STOPS = ['#eca8d6', '#a78bfa', '#67e8f9', '#fbbf24', '#eca8d6'];
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (pos: number) => {
  const lo = Math.floor(pos);
  const hi = Math.min(lo + 1, STOPS.length - 1);
  const t = pos - lo;
  const [r1, g1, b1] = hex(STOPS[lo]!);
  const [r2, g2, b2] = hex(STOPS[hi]!);
  return `rgb(${Math.round(r1! + (r2! - r1!) * t)},${Math.round(g1! + (g2! - g1!) * t)},${Math.round(b1! + (b2! - b1!) * t)})`;
};

/**
 * Indic scripts shape conjuncts and matras across characters, so splitting them into separate
 * spans breaks the text. Those words animate as one unit; Latin words go letter by letter.
 */
const units = (word: string) => (/[ऀ-෿]/.test(word) ? [word] : Array.from(word));

/**
 * A word whose letters sharpen out of a blur one after another, tinted with the gradient, then
 * settle to white. The motion is pure CSS (`.letter-in` + per-letter delay); React only flips the
 * tint off once per word.
 */
function BlurWord({ word }: { word: string }) {
  const letters = units(word);
  const [tinted, setTinted] = useState(true);
  useEffect(() => {
    setTinted(true);
    const id = setTimeout(() => setTinted(false), 45 * letters.length + 700);
    return () => clearTimeout(id);
  }, [word, letters.length]);
  const whole = letters.length === 1;
  return (
    <>
      {letters.map((ch, i) => (
        <span
          key={`${word}-${i}`}
          className={whole && tinted ? 'letter-in word-gradient' : 'letter-in'}
          style={{
            animationDelay: `${i * 45}ms`,
            color: whole || !tinted ? '#fff' : mix((i / Math.max(letters.length - 1, 1)) * (STOPS.length - 1)),
          }}
        >
          {ch}
        </span>
      ))}
    </>
  );
}

/**
 * Full-screen hero: the studio background video, a faint grid, a large headline with one rotating
 * word, two CTAs and three stats. Always dark (it sits on video).
 * Performance: poster paints immediately, phones get a 960px file, the video only loads once the
 * hero is on screen, pauses when scrolled away, and stays a still image for reduced motion / data saver.
 */
export function StudioHero({ hi, cta, whatsappHref }: { hi: boolean; cta: string; whatsappHref: string }) {
  const words = hi ? ['उत्सव', 'आशीर्वाद', 'मिलन', 'स्वागत'] : ['celebrate', 'gather', 'bless', 'say yes'];
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScreen = useOnScreen(sectionRef);
  useTicker(() => setI((n) => (n + 1) % words.length), 2600, onScreen);
  useEffect(() => setShown(true), []);

  // Play only while visible; skip video entirely for reduced motion or Save-Data.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || saveData) return;
    if (onScreen) {
      if (v.preload === 'none') {
        v.preload = 'auto';
        v.load();
      }
      v.play().catch(() => {});
    } else v.pause();
  }, [onScreen]);

  const fade = (d = '') => `transition-[opacity,transform] duration-1000 ease-[var(--ease-out-quint)] ${d} ${shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`;

  return (
    <section ref={sectionRef} className="hero-scroll relative flex min-h-[100svh] flex-col overflow-clip bg-black text-white [color-scheme:dark]">
      <div className="hero-media absolute inset-0">
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          poster="/video/hero-poster.jpg"
          aria-hidden
          className="h-full w-full object-cover object-[70%_center] opacity-80 sm:object-center"
        >
          <source src="/video/hero-sm.mp4" type="video/mp4" media="(max-width: 900px)" />
          <source src="/video/hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent max-sm:bg-black/45" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/75" />
      </div>

      {/* Faint grid (one gradient layer instead of 18 divs) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgb(255_255_255/0.1)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.1)_1px,transparent_1px)] [background-size:8.33%_12.5%]"
      />

      <div className="hero-copy relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-5 pb-10 pt-28 sm:px-6 lg:px-12 lg:pb-14 lg:pt-36">
        <div className="lg:mt-auto lg:max-w-[62%]">
          <p className={`mb-6 inline-flex items-center gap-3 font-mono text-xs text-white/60 sm:mb-8 sm:text-sm ${fade()}`}>
            <span className="h-px w-8 bg-white/30" />
            {hi ? 'हर भारतीय अवसर के लिए AI निमंत्रण' : 'AI invitations for every Indian occasion'}
          </p>
          <h1 className={`display-hero text-white ${fade('delay-100')}`}>
            <span className="block">{hi ? 'सुंदर निमंत्रण,' : 'Beautiful invitations,'}</span>
            <span className="block">
              {hi ? 'मिलकर करें ' : 'made to '}
              <span className="relative inline-block whitespace-nowrap">
                <BlurWord word={words[i]!} />
              </span>
            </span>
          </h1>
          <p className={`mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:mt-8 sm:text-lg ${fade('delay-200')}`}>
            {hi
              ? 'एक बार लिखिए, हिन्दी या 12 भारतीय भाषाओं में। मिलेगा छपाई जैसा कार्ड, WhatsApp वीडियो और RSVP वेबसाइट, दो मिनट में।'
              : 'Write once in Hindi, Tamil, Marathi or any of 12 languages. Get a print-quality card, a WhatsApp-ready video and an RSVP website in two minutes.'}
          </p>
          <div className={`mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row ${fade('delay-300')}`}>
            <Link
              href="/create"
              className="press group inline-flex h-13 items-center justify-center gap-2 rounded-full bg-white px-8 text-base font-medium text-black transition-colors hover:bg-white/90 sm:h-14"
            >
              {cta}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener"
              className="press inline-flex h-13 items-center justify-center gap-2 rounded-full border border-white/25 px-8 text-base text-white transition-colors hover:bg-white/10 sm:h-14"
            >
              <WhatsAppIcon className="size-[18px] text-[#1fa855]" />
              {hi ? 'WhatsApp पर बनाएँ' : 'Make it on WhatsApp'}
            </a>
          </div>
        </div>

        {/* Stats: in the flow on phones (never collide with the buttons), pushed to the bottom on desktop. */}
        <dl className={`mt-12 grid grid-cols-3 gap-4 transition-opacity delay-500 duration-700 sm:flex sm:gap-10 lg:mt-auto lg:gap-20 lg:pt-16 ${shown ? 'opacity-100' : 'opacity-0'}`}>
          {[
            ['140+', hi ? 'डिज़ाइन, हर परंपरा के लिए' : 'designs for every tradition'],
            ['12', hi ? 'भारतीय भाषाएँ' : 'Indian languages'],
            ['2 min', hi ? 'फ़ॉर्म से निमंत्रण तक' : 'from form to invite'],
          ].map(([v, l]) => (
            <div key={l} className="flex flex-col-reverse gap-1.5 sm:gap-2">
              <dt className="text-[0.6875rem] leading-tight text-white/55 sm:text-xs">{l}</dt>
              <dd className="font-display text-2xl text-white sm:text-3xl lg:text-4xl">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
