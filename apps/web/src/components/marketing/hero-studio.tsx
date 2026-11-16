'use client';

import { BUILTIN_TEMPLATES, sampleInviteProps } from '@cardai/shared';
import { clsx } from 'clsx';
import { Check, ImageIcon, Play, RotateCcw } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';

const InvitePlayer = dynamic(() => import('@/components/invite/invite-player').then((m) => m.InvitePlayer), { ssr: false });

const DESIGNS = ['varmala-maroon', 'genda-jharokha-maroon', 'darbar-arch-emerald', 'botanical-sage', 'deco-emerald'] as const;
type Design = (typeof DESIGNS)[number];

/**
 * The hero is a small working studio: type two names, pick a design, flip to the video.
 * The card is the real Remotion layout the worker renders (loaded after first paint, or on the
 * first interaction), so what visitors play with here is exactly what they would download.
 * Until it loads, the pre-rendered showcase JPG stands in, so first paint stays cheap.
 */
export function HeroStudio() {
  const locale = useLocale() as 'en' | 'hi';
  const hi = locale === 'hi';
  const [design, setDesign] = useState<Design>(DESIGNS[0]);
  const [names, setNames] = useState<[string, string] | null>(null);
  const [mode, setMode] = useState<'card' | 'video'>('card');
  const [live, setLive] = useState(false);

  // Warm the live renderer once the browser is idle, so typing feels instant.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const go = () => setLive(true);
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(go, { timeout: 2500 });
      return () => (window as unknown as { cancelIdleCallback: (n: number) => void }).cancelIdleCallback(id);
    }
    const id = setTimeout(go, 1800);
    return () => clearTimeout(id);
  }, []);

  const template = useMemo(() => BUILTIN_TEMPLATES.find((t) => t.id === design)!, [design]);
  const sample = useMemo(() => sampleInviteProps(template, locale), [template, locale]);
  const defaults = sample.content.primaryNames as [string, string];
  const shown: [string, string] = names ?? defaults;
  const props = useMemo(
    () => (names ? { ...sample, content: { ...sample.content, primaryNames: [names[0].trim() || defaults[0], names[1].trim() || defaults[1]] } } : sample),
    [sample, names, defaults],
  );
  const edited = names !== null || design !== DESIGNS[0];
  const startHref = `/create?type=wedding&template=${design}`;

  const setName = (i: 0 | 1, v: string) => {
    setLive(true);
    setNames((n) => {
      const next: [string, string] = [...(n ?? defaults)] as [string, string];
      next[i] = v.slice(0, 24);
      return next;
    });
  };

  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className="relative overflow-hidden rounded-[20px] bg-plum p-4 text-white sm:p-6 dark:bg-plum-deep">
        {/* Two hairline rings: the only decoration on the plum ground. */}
        <span aria-hidden className="pointer-events-none absolute -right-1/4 -top-1/3 size-[90%] rounded-full border border-white/[0.07]" />
        <span aria-hidden className="pointer-events-none absolute -right-[8%] -top-[12%] size-[56%] rounded-full border border-white/[0.07]" />

        <div className="relative grid grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] items-center gap-4 sm:gap-6">
          {/* The card */}
          <div className="animate-[scene-in_0.9s_var(--ease-out-quint)_both] [animation-delay:150ms]">
            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
              <Image
                key={design}
                src={`/showcase/${design}.jpg`}
                alt={hi ? `${template.name} निमंत्रण कार्ड` : `${template.name} invitation card`}
                fill
                sizes="(min-width: 1024px) 260px, 45vw"
                priority={design === DESIGNS[0]}
                className={clsx('animate-[fade-in_0.3s_ease-out] object-cover transition-opacity duration-300', live && 'opacity-0 delay-700')}
              />
              {live && (
                <div className="absolute inset-0 animate-[fade-in_0.4s_ease-out]">
                  <InvitePlayer key={mode} props={props} mode={mode} autoPlay controls={false} className="!rounded-none !bg-transparent" />
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex min-w-0 animate-[scene-in_0.9s_var(--ease-out-quint)_both] flex-col gap-4 [animation-delay:320ms]">
            <p className="text-sm font-medium text-white/70">{hi ? 'आज़माइए, यह असली कार्ड है' : 'Try it. This is the real card.'}</p>

            <fieldset className="flex min-w-0 flex-col gap-2">
              <legend className="sr-only">{hi ? 'नाम' : 'Names'}</legend>
              {([0, 1] as const).map((i) => (
                <label key={i} className="group/f flex h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-3 transition-colors focus-within:border-gold-soft focus-within:bg-white/10 hover:border-white/30">
                  <span className="w-12 shrink-0 text-xs text-white/55">{i === 0 ? (hi ? 'दूल्हा' : 'Groom') : hi ? 'दुल्हन' : 'Bride'}</span>
                  <input
                    value={shown[i]}
                    onFocus={() => setLive(true)}
                    onChange={(e) => setName(i, e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[0.95rem] font-medium text-white outline-none placeholder:text-white/40"
                    aria-label={i === 0 ? (hi ? 'दूल्हे का नाम' : "Groom's name") : hi ? 'दुल्हन का नाम' : "Bride's name"}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </label>
              ))}
            </fieldset>

            <div>
              <p className="mb-2 text-xs text-white/55">{hi ? 'डिज़ाइन' : 'Design'}</p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={hi ? 'डिज़ाइन चुनें' : 'Choose a design'}>
                {DESIGNS.map((id) => {
                  const on = id === design;
                  const name = BUILTIN_TEMPLATES.find((t) => t.id === id)!.name;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={name}
                      title={name}
                      onClick={() => {
                        setDesign(id);
                        setLive(true);
                      }}
                      className={clsx(
                        'press relative h-14 w-10 overflow-hidden rounded-md ring-offset-2 ring-offset-plum transition-[box-shadow,opacity] duration-200 dark:ring-offset-plum-deep',
                        on ? 'ring-2 ring-gold-soft' : 'opacity-70 ring-1 ring-white/15 hover:opacity-100',
                      )}
                    >
                      <Image src={`/showcase/${id}.jpg`} alt="" fill sizes="40px" className="object-cover object-top" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-black/20 p-1" role="tablist" aria-label={hi ? 'प्रकार' : 'Format'}>
              {(
                [
                  ['card', hi ? 'कार्ड' : 'Card', ImageIcon],
                  ['video', hi ? 'वीडियो' : 'Video', Play],
                ] as const
              ).map(([m, label, Icon]) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => {
                    setMode(m);
                    setLive(true);
                  }}
                  className={clsx(
                    'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-[0.8125rem] font-semibold transition-colors duration-200',
                    mode === m ? 'bg-white text-[#2e1031]' : 'text-white/70 hover:text-white',
                  )}
                >
                  <Icon className={clsx('size-3.5', m === 'video' && 'fill-current')} aria-hidden />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={startHref}
                className="press flex h-10 flex-1 items-center justify-center rounded-lg bg-gold-soft px-3 text-sm font-semibold text-[#2e1031] transition-colors hover:bg-[#f0d8a6]"
              >
                {hi ? 'यही बनाइए' : 'Make this one'}
              </Link>
              {edited && (
                <button
                  type="button"
                  onClick={() => {
                    setNames(null);
                    setDesign(DESIGNS[0]);
                    setMode('card');
                  }}
                  aria-label={hi ? 'रीसेट करें' : 'Reset'}
                  title={hi ? 'रीसेट करें' : 'Reset'}
                  className="grid size-10 animate-[pop-in_0.2s_ease-out] place-items-center rounded-lg border border-white/15 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Replies counted per function: the payoff of sharing. */}
      <div
        className="absolute -bottom-5 left-4 flex animate-[scene-in_0.7s_var(--ease-out-quint)_both] items-center gap-3 rounded-xl border border-hairline bg-surface px-3.5 py-2.5 sm:-left-6"
        style={{ animationDelay: '900ms' } as CSSProperties}
      >
        <span className="grid size-9 place-items-center rounded-lg bg-leaf/10 text-leaf">
          <Check className="size-4.5" strokeWidth={2.5} aria-hidden />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold tabular-nums">{hi ? '142 आ रहे हैं' : '142 coming'}</span>
          <span className="block text-xs text-ink-soft">{hi ? 'संगीत, 14 फ़रवरी' : 'Sangeet, 14 Feb'}</span>
        </span>
      </div>
    </div>
  );
}
