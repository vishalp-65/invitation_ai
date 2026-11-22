'use client';

import { SHOWCASE } from '@cardai/shared';
import { clsx } from 'clsx';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { CardShot, Frame, useInView } from './primitives';

/** Closing call to action: a bordered panel with a pointer spotlight and a stack of real designs. */
export function StudioCta({ hi, cta, whatsappHref }: { hi: boolean; cta: string; whatsappHref: string | null }) {
  const [ref, on] = useInView<HTMLElement>(0.2);

  return (
    <section ref={ref} className="relative overflow-clip py-24 lg:py-32">
      <Frame>
        <div
          className={clsx('spot relative overflow-clip border border-ink transition-[opacity,transform] duration-1000', on ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0')}
          style={{ ['--spot-r' as string]: '600px', ['--spot-a' as string]: '7%' }}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
            e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
          }}
        >
          <div aria-hidden className="spot-glow pointer-events-none absolute inset-0" />
          <div className="relative z-10 flex flex-col items-center justify-between gap-12 px-6 py-12 sm:px-8 sm:py-16 lg:flex-row lg:px-16 lg:py-24">
            <div className="flex-1">
              <h2 className="display-md mb-8">
                {hi ? 'पहला निमंत्रण' : 'Ready to send'}
                <br />
                {hi ? 'भेजने के लिए तैयार?' : 'your first invite?'}
              </h2>
              <p className="mb-12 max-w-xl text-xl leading-relaxed text-ink-soft">
                {hi
                  ? 'अपना अवसर चुनिए, नाम लिखिए, और दो मिनट में परिवार के ग्रुप में भेजिए।'
                  : 'Pick your occasion, type the names and send it to the family group in two minutes.'}
                {whatsappHref && (hi ? ' या WhatsApp पर "Hi" भेजिए।' : ' Or just send “Hi” on WhatsApp.')}
              </p>
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:gap-4">
                <Link href="/create" className="press group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-ink px-8 text-base font-medium text-ivory transition-colors hover:bg-ink/90">
                  {cta}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
                {whatsappHref && (
                  <a href={whatsappHref} target="_blank" rel="noopener" className="press inline-flex h-14 items-center justify-center gap-2 rounded-full border border-ink/20 px-8 text-base transition-colors hover:bg-ink/5">
                    <WhatsAppIcon className="size-[18px] text-[#1fa855]" />
                    {hi ? 'WhatsApp खोलें' : 'Open WhatsApp'}
                  </a>
                )}
              </div>
              <p className="mt-8 font-mono text-sm text-ink-soft">{hi ? 'बनाना मुफ़्त · HD ₹79 से' : 'Free to make · HD from ₹79'}</p>
            </div>
            <div className="parallax relative hidden h-[520px] w-[440px] shrink-0 lg:block">
              {[
                [SHOWCASE.floral, '-rotate-[8deg] left-0 top-10'],
                [SHOWCASE.romantic, 'rotate-[6deg] right-0 top-0'],
                [SHOWCASE.wedding, 'z-10 left-1/2 -translate-x-1/2 bottom-0'],
              ].map(([id, pos], k) => (
                <CardShot
                  key={id}
                  id={id!}
                  sizes="200px"
                  className={clsx('absolute w-[200px] border border-ink/10 transition-transform duration-700 ease-[var(--ease-out-quint)] hover:-translate-y-2', pos)}
                  alt={k === 2 ? (hi ? 'निमंत्रण कार्ड का उदाहरण' : 'Example invitation card') : ''}
                />
              ))}
            </div>
          </div>
          <div aria-hidden className="absolute right-0 top-0 size-32 border-b border-l border-ink/10" />
          <div aria-hidden className="absolute bottom-0 left-0 size-32 border-r border-t border-ink/10" />
        </div>
      </Frame>
    </section>
  );
}
