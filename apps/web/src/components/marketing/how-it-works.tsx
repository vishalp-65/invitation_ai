'use client';

import { clsx } from 'clsx';
import { CheckCheck, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Reveal } from '@/components/fx/reveal';

interface Step {
  title: string;
  body: string;
}

/**
 * The three real steps as a stepper: the step list on the left fills a gold progress line and
 * advances on its own (paused while hovered, off-screen or with reduced motion); the picture of
 * that step's screen sits on the right. Clicking a step jumps to it.
 */
export function HowItWorks({ title, steps, hi }: { title: string; steps: [Step, Step, Step]; hi: boolean }) {
  const visuals = [<TypeVisual key="1" hi={hi} />, <PickVisual key="2" hi={hi} />, <ShareVisual key="3" hi={hi} />];
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [auto, setAuto] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAuto(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const running = auto && inView && !paused;

  return (
    <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
      <Reveal as="h2" className="max-w-2xl text-[2rem] sm:text-[2.75rem]">
        {title}
      </Reveal>
      <div
        ref={ref}
        className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:gap-12"
        onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
        onPointerLeave={() => setPaused(false)}
      >
        <ol className="flex flex-col gap-2" role="tablist" aria-label={title} aria-orientation="vertical">
          {steps.map((s, i) => {
            const on = i === active;
            return (
              <li key={s.title}>
                <button
                  type="button"
                  role="tab"
                  id={`how-tab-${i}`}
                  aria-selected={on}
                  aria-controls="how-panel"
                  onClick={() => setActive(i)}
                  className={clsx(
                    'group relative flex w-full gap-4 overflow-hidden rounded-[var(--radius-card)] border p-5 text-left transition-colors duration-300',
                    on ? 'border-hairline bg-surface' : 'border-transparent hover:bg-surface/60',
                  )}
                >
                  <span
                    className={clsx(
                      'grid size-9 shrink-0 place-items-center rounded-full border text-sm font-semibold tabular-nums transition-colors duration-300',
                      on ? 'border-primary bg-primary text-on-primary' : 'border-hairline text-ink-soft group-hover:text-ink',
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={clsx('block text-lg font-semibold tracking-[-0.01em] transition-colors', on ? 'text-ink' : 'text-ink-soft group-hover:text-ink')}>{s.title}</span>
                    <span
                      className={clsx(
                        'grid transition-[grid-template-rows,opacity] duration-500 ease-[var(--ease-out-quint)]',
                        on ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                      )}
                    >
                      <span className="overflow-hidden">
                        <span className="block pt-1.5 text-[0.95rem] text-ink-soft">{s.body}</span>
                      </span>
                    </span>
                  </span>
                  {/* Progress: fills while this step is showing, then hands over to the next. */}
                  {on && auto && (
                    <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-hairline">
                      <span
                        key={active}
                        onAnimationEnd={() => setActive((a) => (a + 1) % steps.length)}
                        className="block h-full origin-left animate-[how-fill_5.5s_linear_both] bg-gold"
                        style={{ animationPlayState: running ? 'running' : 'paused' }}
                      />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>

        <div
          id="how-panel"
          role="tabpanel"
          aria-labelledby={`how-tab-${active}`}
          className="relative flex min-h-[300px] items-center overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-sand p-6 sm:min-h-[340px] sm:p-10"
        >
          <span aria-hidden className="absolute right-5 top-4 font-display text-[5.5rem] leading-none text-ink/[0.06] tabular-nums">
            0{active + 1}
          </span>
          <div key={active} className="relative w-full animate-[fade-up_0.5s_var(--ease-out-quint)_both] rounded-[var(--radius-card)] border border-hairline bg-surface p-5 sm:p-6">
            {visuals[active]}
          </div>
        </div>
      </div>
    </section>
  );
}

function PickVisual({ hi }: { hi: boolean }) {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {(hi ? ['शादी', 'गृह प्रवेश', 'जन्मदिन'] : ['Wedding', 'Griha Pravesh', 'Birthday']).map((x, i) => (
          <span key={x} className={i === 0 ? 'badge !border-primary !bg-primary !text-on-primary' : 'badge'}>
            {x}
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        {['genda-jharokha-maroon', 'kanjeevaram-wine', 'botanical-sage'].map((id, i) => (
          <Image
            key={id}
            src={`/showcase/${id}.jpg`}
            alt=""
            width={432}
            height={768}
            sizes="80px"
            className={`aspect-[3/4] w-1/3 rounded-lg object-cover object-top ${i === 0 ? 'ring-2 ring-gold ring-offset-2 ring-offset-surface' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

function TypeVisual({ hi }: { hi: boolean }) {
  const rows: Array<[string, string]> = hi
    ? [
        ['दूल्हा', 'राहुल'],
        ['दुल्हन', 'प्रिया'],
        ['संगीत', '14 फ़रवरी, शाम 7 बजे'],
      ]
    : [
        ['Groom', 'राहुल'],
        ['Bride', 'प्रिया'],
        ['Sangeet', '14 Feb, 7 pm'],
      ];
  return (
    <div className="flex w-full flex-col gap-2">
      {rows.map(([k, v], i) => (
        <div key={k} className={`flex h-9 items-center justify-between rounded-lg border px-3 text-sm ${i === 1 ? 'border-primary' : 'border-hairline'}`}>
          <span className="text-ink-soft">{k}</span>
          <span className="font-medium">
            {v}
            {i === 1 && <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-ink" aria-hidden />}
          </span>
        </div>
      ))}
    </div>
  );
}

function ShareVisual({ hi }: { hi: boolean }) {
  return (
    <div className="flex w-full flex-col gap-2 text-sm">
      <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef]">
        {hi ? 'आप सादर आमंत्रित हैं' : "You're invited!"} <span className="text-[#027eb5] dark:text-[#53bdeb]">rahul-priya.in</span>
        <CheckCheck className="ml-1 inline size-3.5 text-[#53bdeb]" aria-hidden />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-hairline px-3 py-2">
        <span className="flex items-center gap-2 text-ink-soft">
          <MessageCircle className="size-4" aria-hidden />
          {hi ? 'जवाब' : 'Replies'}
        </span>
        <span className="font-semibold tabular-nums">
          {hi ? '86 आएँगे, 12 शायद' : '86 coming, 12 maybe'}
        </span>
      </div>
    </div>
  );
}
