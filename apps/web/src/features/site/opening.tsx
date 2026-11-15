'use client';

import type { SiteOpening } from '@cardai/shared';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * Tap-to-open scene in front of the page. The tap is also the user gesture that lets music
 * start on phones. Every scene is transforms + opacity only, then the layer unmounts.
 */
export function Opening({
  kind,
  label,
  greeting,
  title,
  monogram,
  onOpen,
  motionOff,
}: {
  kind: SiteOpening;
  label: string;
  greeting: string | null;
  title: string;
  monogram: string;
  onOpen: () => void;
  motionOff: boolean;
}) {
  const [state, setState] = useState<'closed' | 'opening' | 'gone'>(kind === 'none' ? 'gone' : 'closed');

  useEffect(() => {
    if (state !== 'opening') return;
    const t = setTimeout(() => setState('gone'), motionOff ? 0 : 2300);
    return () => clearTimeout(t);
  }, [state, motionOff]);

  // Lock page scroll while the scene is up.
  useEffect(() => {
    if (state === 'gone') return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [state]);

  if (state === 'gone') return null;

  const open = () => {
    if (state !== 'closed') return;
    setState('opening');
    onOpen();
  };

  const cta = (
    <div className="inv-cta relative z-10 flex flex-col items-center gap-5 px-8 text-center">
      {greeting && <p className="text-lg italic opacity-90">{greeting}</p>}
      <p className="inv-display max-w-xs text-3xl leading-tight">{title}</p>
      <button
        type="button"
        onClick={open}
        autoFocus
        className="h-14 rounded-full bg-[var(--inv-primary)] px-8 text-lg font-semibold text-[var(--inv-on-primary)] shadow-[0_10px_30px_-10px_rgb(0_0_0/0.5)] active:scale-95"
      >
        {label}
      </button>
    </div>
  );

  const panel = 'bg-[var(--inv-bg-alt)]';
  const pattern: CSSProperties = {
    backgroundImage:
      'radial-gradient(circle at 50% 50%, var(--inv-primary-a28) 0 2px, transparent 3px), radial-gradient(circle at 0 0, var(--inv-primary-a16) 0 1.5px, transparent 2.5px)',
    backgroundSize: '28px 28px, 14px 14px',
  };

  let scene: ReactNode;
  switch (kind) {
    case 'doors':
      scene = (
        <>
          {(['l', 'r'] as const).map((side) => (
            <div key={side} className={`inv-door ${side} ${panel}`} style={pattern}>
              <div className={`absolute inset-y-6 ${side === 'l' ? 'right-0 left-6 rounded-l-[40%_8%]' : 'left-0 right-6 rounded-r-[40%_8%]'} border-4 border-[var(--inv-primary)]`} />
              <span
                className={`absolute top-1/2 ${side === 'l' ? 'right-4' : 'left-4'} size-5 -translate-y-1/2 rounded-full border-2 border-[var(--inv-primary)] bg-[var(--inv-accent)]`}
              />
            </div>
          ))}
          <div className="inv-backdrop absolute inset-0 -z-10 bg-[var(--inv-bg)]" />
          {cta}
        </>
      );
      break;
    case 'curtain':
      scene = (
        <>
          {(['l', 'r'] as const).map((side) => (
            <div
              key={side}
              className={`inv-curtain ${side}`}
              style={{
                background: 'repeating-linear-gradient(90deg, var(--inv-primary) 0 22px, var(--inv-primary-deep) 22px 44px)',
              }}
            >
              <div className="absolute inset-x-0 top-0 h-10 bg-[var(--inv-accent)]" />
            </div>
          ))}
          <div className="inv-backdrop absolute inset-0 -z-10 bg-[var(--inv-bg)]" />
          <div className="relative z-10 rounded-3xl bg-[var(--inv-bg-a90)] py-8">{cta}</div>
        </>
      );
      break;
    case 'scroll':
      scene = (
        <>
          <div className="inv-backdrop absolute inset-0 bg-[var(--inv-bg-alt)]" style={pattern} />
          <div className="inv-scroll-wrap relative flex w-[min(86vw,380px)] flex-col items-center">
            <div className="z-10 h-6 w-[108%] rounded-full bg-[var(--inv-primary)]" />
            <div className="inv-scroll-paper -my-1 flex min-h-[46vh] w-full items-center justify-center bg-[var(--inv-surface)] py-10 text-[var(--inv-on-surface)]">
              {cta}
            </div>
            <div className="z-10 h-6 w-[108%] rounded-full bg-[var(--inv-primary)]" />
          </div>
        </>
      );
      break;
    case 'petals':
      scene = (
        <>
          <div className="inv-backdrop absolute inset-0 bg-[var(--inv-bg)]" />
          {Array.from({ length: 28 }, (_, i) => {
            const a = (i / 28) * Math.PI * 2;
            const d = 40 + (i % 5) * 12;
            return (
              <span
                key={i}
                className="inv-burst-petal absolute left-1/2 top-1/2 h-5 w-7 rounded-[80%_0_80%_0]"
                style={
                  {
                    background: i % 3 ? 'var(--inv-accent)' : 'var(--inv-primary)',
                    transform: `translate3d(${Math.cos(a) * 70}px, ${Math.sin(a) * 70}px, 0) rotate(${i * 40}deg)`,
                    '--bx': `${Math.cos(a) * d}vmax`,
                    '--by': `${Math.sin(a) * d}vmax`,
                    '--br': `${i * 90}deg`,
                  } as CSSProperties
                }
              />
            );
          })}
          {cta}
        </>
      );
      break;
    default:
      // envelope
      scene = (
        <>
          <div className="inv-backdrop absolute inset-0 bg-[var(--inv-bg-alt)]" style={pattern} />
          <div className="inv-envelope relative z-10 w-[min(84vw,360px)]">
            <div className="relative aspect-[4/3] w-full">
              <div className="inv-letter-card absolute inset-x-4 top-3 bottom-6 rounded-xl bg-[var(--inv-surface)] p-4 text-center text-[var(--inv-on-surface)] shadow">
                <p className="inv-display mt-6 text-2xl tracking-[0.3em]">{monogram}</p>
              </div>
              <div className="absolute inset-0 rounded-2xl bg-[var(--inv-primary)]" style={{ clipPath: 'polygon(0 30%, 50% 72%, 100% 30%, 100% 100%, 0 100%)' }} />
              <div className="inv-flap bg-[var(--inv-primary-deep)]" />
              <span className="absolute left-1/2 top-[54%] grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[var(--inv-accent)] text-sm font-bold text-[var(--inv-on-primary)] shadow-lg">
                {[...monogram].slice(0, 2).join('')}
              </span>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-[12vh] z-20">{cta}</div>
        </>
      );
  }

  return (
    <div className="inv-opening" data-state={state} role="dialog" aria-label={title}>
      {scene}
    </div>
  );
}
