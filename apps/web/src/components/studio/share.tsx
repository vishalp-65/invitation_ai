'use client';

import { clsx } from 'clsx';
import { CalendarPlus, Clapperboard, FileDown, Link2, Mail, MapPin, MessageSquare, Printer, QrCode, Send, Smartphone, Video } from 'lucide-react';
import Link from 'next/link';
import type { ComponentType, PointerEvent } from 'react';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { ArtImage, Frame, Kicker, useInView } from './primitives';

type Item = { name: string; nameHi: string; tag: string; Icon: ComponentType<{ className?: string }> };
const ITEMS: Item[] = [
  { name: 'WhatsApp', nameHi: 'WhatsApp', tag: 'Share', Icon: WhatsAppIcon },
  { name: 'Instagram story', nameHi: 'Instagram स्टोरी', tag: '9:16', Icon: Clapperboard },
  { name: 'Short link', nameHi: 'छोटी लिंक', tag: 'Web', Icon: Link2 },
  { name: 'QR code', nameHi: 'QR कोड', tag: 'Print', Icon: QrCode },
  { name: 'Add to calendar', nameHi: 'कैलेंडर में जोड़ें', tag: 'Guests', Icon: CalendarPlus },
  { name: 'Venue map', nameHi: 'स्थान का नक्शा', tag: 'Guests', Icon: MapPin },
  { name: 'Print PDF', nameHi: 'प्रिंट PDF', tag: '5×7″', Icon: Printer },
  { name: 'HD download', nameHi: 'HD डाउनलोड', tag: 'PNG', Icon: FileDown },
  { name: 'MP4 video', nameHi: 'MP4 वीडियो', tag: '<16 MB', Icon: Video },
  { name: 'Email', nameHi: 'ईमेल', tag: 'Share', Icon: Mail },
  { name: 'SMS', nameHi: 'SMS', tag: 'Share', Icon: MessageSquare },
  { name: 'Telegram', nameHi: 'Telegram', tag: 'Share', Icon: Send },
];

/** "Share everywhere": centred title over a full-bleed art strip, then a grid of share targets. */
export function StudioShare({ hi }: { hi: boolean }) {
  const [ref, on] = useInView<HTMLElement>();
  // Pointer halo: CSS variables written straight to the hovered tile, no React re-render.
  const track = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <section id="share" ref={ref} className="relative overflow-clip">
      <div className="relative z-10 px-5 pt-24 text-center sm:pt-32 lg:pt-40">
        <Kicker center className={clsx('mb-8 transition-opacity duration-700', on ? 'opacity-100' : 'opacity-0')}>
          {hi ? 'शेयर करें' : 'Sharing'}
        </Kicker>
        <h2 className={clsx('display-xl transition-[opacity,transform] duration-1000', on ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0')}>
          {hi ? 'हर जगह' : 'Share it'}
          <br />
          <span className="text-ink-soft">{hi ? 'भेजिए।' : 'everywhere.'}</span>
        </h2>
        <p className={clsx('mx-auto mt-6 max-w-lg text-lg leading-relaxed sm:mt-8 sm:text-xl text-ink-soft transition-opacity delay-100 duration-1000', on ? 'opacity-100' : 'opacity-0')}>
          {hi
            ? 'परिवार के WhatsApp ग्रुप से लेकर छपे कार्ड पर QR तक। हर फ़ॉर्मैट सही आकार में, अपने-आप।'
            : 'From the family WhatsApp group to a QR on the printed card. Every format comes out at the right size, automatically.'}
        </p>
      </div>

      <ArtImage name="share-arcs" collapse className={clsx('parallax-slow relative -mt-16 h-[320px] w-full transition-opacity delay-200 duration-1000 lg:h-[520px]', on ? 'opacity-100' : 'opacity-0')} />

      <Frame className="z-10 mt-12 lg:-mt-24">
        <div className="mb-16 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {ITEMS.map((it, k) => (
            <div
              key={it.name}
              onPointerMove={track}
              className={clsx(
                'spot group relative cursor-default overflow-clip border border-ink/10 bg-ivory p-4 duration-500 sm:p-6 lg:p-8',
                'transition-[opacity,transform,border-color,background-color] hover:scale-[1.02] hover:border-ink hover:bg-ink/[0.04]',
                on ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
              )}
              style={{ transitionDelay: on ? `${k * 30}ms` : '0ms' }}
            >
              <span aria-hidden className="spot-glow pointer-events-none absolute inset-0" />
              <span className="absolute right-3 top-3 bg-ink/10 px-2 py-0.5 font-mono text-[10px] text-ink-soft transition-colors group-hover:bg-ink group-hover:text-ivory">{it.tag}</span>
              <div className="mb-5 flex size-10 items-center justify-center text-ink/60 transition-colors group-hover:text-ink sm:mb-6">
                <it.Icon className="size-6" />
              </div>
              <span className="block text-sm font-medium sm:text-base">{hi ? it.nameHi : it.name}</span>
              <div className="absolute inset-x-0 bottom-0 h-px overflow-clip bg-ink/20">
                <div className="h-full w-full origin-left scale-x-0 bg-ink transition-transform duration-500 group-hover:scale-x-100" />
              </div>
            </div>
          ))}
        </div>

        <div className={clsx('flex flex-wrap items-center justify-between gap-8 border-t border-ink/10 pb-24 pt-10 transition-opacity delay-500 duration-1000 sm:pb-32 sm:pt-12 lg:pb-40', on ? 'opacity-100' : 'opacity-0')}>
          <div className="flex flex-wrap gap-x-10 gap-y-4 sm:gap-12">
            {[
              ['1 tap', hi ? 'परिवार ग्रुप में' : 'to the family group'],
              ['9:16', hi ? 'फ़ोन के लिए बना' : 'made for phones'],
              [<Smartphone key="p" className="size-7" />, hi ? 'कोई ऐप ज़रूरी नहीं' : 'no app for guests'],
            ].map(([v, l]) => (
              <div key={l as string} className="flex items-baseline gap-3">
                <span className="font-display text-3xl">{v}</span>
                <span className="text-sm text-ink-soft">{l}</span>
              </div>
            ))}
          </div>
          <Link href="/templates" className="group inline-flex items-center gap-2 font-mono text-sm text-ink-soft transition-colors hover:text-ink">
            {hi ? 'सभी डिज़ाइन देखें' : 'Browse all designs'}
            <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
          </Link>
        </div>
      </Frame>
    </section>
  );
}
