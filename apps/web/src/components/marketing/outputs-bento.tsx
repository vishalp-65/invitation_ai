import { CalendarDays, Film, Globe2, Image as ImageIcon, MapPin, Play } from 'lucide-react';
import Image from 'next/image';
import { Reveal } from '@/components/fx/reveal';

interface Step {
  title: string;
  body: string;
}

/**
 * "One form, three invitations" as a static bento grid. Replaces the old pinned scroll story,
 * which re-rendered on every scroll frame; this one costs nothing after the reveal.
 */
export function OutputsBento({ title, card, video, site }: { eyebrow?: string; title: string; card: Step; video: Step; site: Step }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
      <Reveal as="h2" className="max-w-2xl text-[1.875rem] sm:text-[2.5rem]">
        {title}
      </Reveal>

      <div className="mt-10 grid gap-4 md:grid-cols-6 md:grid-rows-[auto_auto]">
        {/* Website: the tall hero tile */}
        <Reveal className="panel lift flex flex-col overflow-hidden rounded-[var(--radius-card)] md:col-span-3 md:row-span-2">
          <Copy icon={Globe2} {...site} />
          <div className="relative mt-auto flex justify-center bg-sand px-6 pt-8">
            <div className="relative aspect-[9/16] w-[62%] max-w-[250px] overflow-hidden rounded-t-xl border-[6px] border-b-0 border-night">
              <SiteMock />
            </div>
          </div>
        </Reveal>

        {/* Image card */}
        <Reveal delay={1} className="panel lift grid overflow-hidden rounded-[var(--radius-card)] sm:grid-cols-[1fr_auto] md:col-span-3">
          <Copy icon={ImageIcon} {...card} />
          <div className="flex items-end justify-center gap-3 bg-sand px-6 pt-6 sm:w-56 sm:pt-8">
            <Image src="/showcase/genda-jharokha-maroon.jpg" alt="Image card example" width={432} height={768} sizes="120px" className="w-[42%] rounded-t-xl object-cover sm:w-[46%]" />
            <Image src="/showcase/kanjeevaram-wine.jpg" alt="" width={432} height={768} sizes="120px" className="w-[42%] translate-y-3 rounded-t-xl object-cover sm:w-[46%]" />
          </div>
        </Reveal>

        {/* Video */}
        <Reveal delay={2} className="panel lift grid overflow-hidden rounded-[var(--radius-card)] sm:grid-cols-[1fr_auto] md:col-span-3">
          <Copy icon={Film} {...video} />
          <div className="relative flex items-end justify-center bg-sand px-6 pt-6 sm:w-56 sm:pt-8">
            <div className="relative w-[50%] overflow-hidden rounded-t-xl sm:w-[70%]">
              <Image src="/showcase/varmala-maroon.jpg" alt="Video invite example" width={432} height={768} sizes="160px" className="aspect-[9/12] w-full object-cover object-top" />
              <div className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface text-ink">
                  <Play className="size-3 fill-current" aria-hidden />
                </span>
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface/40">
                  <span className="block h-full w-[62%] rounded-full bg-surface" />
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Copy({ icon: Icon, title, body }: Step & { icon: typeof Film }) {
  return (
    <div className="p-6 sm:p-8">
      <span className="grid size-10 place-items-center rounded-lg border border-hairline text-ink">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="mt-5 text-xl sm:text-2xl">{title}</h3>
      <p className="mt-2 max-w-sm text-ink-soft">{body}</p>
    </div>
  );
}

/** A miniature invitation website: hero, countdown, schedule and RSVP. */
function SiteMock() {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#4A0C16] p-3.5 text-[#FFF6E5]">
      <p className="mt-5 text-center text-[0.65rem] text-[#E9B949]">॥ श्री गणेशाय नमः ॥</p>
      <p className="font-display mt-1 text-center text-2xl leading-tight">
        राहुल
        <span className="block text-sm italic text-[#E9B949]">संग</span>
        प्रिया
      </p>
      <div className="mt-3 grid grid-cols-4 gap-1 text-center">
        {[
          ['26', 'Days'],
          ['10', 'Hrs'],
          ['04', 'Min'],
          ['51', 'Sec'],
        ].map(([v, l]) => (
          <div key={l} className="rounded-lg bg-surface/10 py-1">
            <p className="font-display text-base leading-none">{v}</p>
            <p className="text-[0.55rem] text-white/70">{l}</p>
          </div>
        ))}
      </div>
      <div className="mt-2.5 rounded-xl bg-[#FFF6E5] p-2.5 text-[#3B1F14]">
        <p className="font-display text-base leading-none">विवाह</p>
        <p className="mt-1 flex items-center gap-1 text-[0.65rem]">
          <CalendarDays className="size-3" aria-hidden /> शुक्रवार, 11 दिसंबर, 8:00 PM
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[0.65rem]">
          <MapPin className="size-3" aria-hidden /> रामबाग पैलेस, जयपुर
        </p>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-1.5 pb-1">
        <span className="rounded-full bg-[#E9B949] py-1.5 text-center text-[0.65rem] font-semibold text-[#3B1F14]">Coming</span>
        <span className="rounded-full border border-white/30 py-1.5 text-center text-[0.65rem] font-semibold">Can&apos;t come</span>
      </div>
    </div>
  );
}
