import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { VideoDesignCoverflow } from '@/components/marketing/design-coverflow';
import { Frame, Kicker } from './primitives';

function Heading({ kicker, title, soft, body, href, cta }: { kicker: string; title: string; soft: string; body: string; href: string; cta: string }) {
  return (
    <Frame className="grid gap-8 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-7">
        <Kicker className="mb-8">{kicker}</Kicker>
        <h2 className="display-md">
          {title}
          <br />
          <span className="text-ink-soft">{soft}</span>
        </h2>
      </div>
      <div className="lg:col-span-5">
        <p className="max-w-md text-lg leading-relaxed text-ink-soft">{body}</p>
        <Link href={href} className="group mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink underline-offset-4 hover:underline">
          {cta}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </Link>
      </div>
    </Frame>
  );
}

function Band({ id, heading, children }: { id: string; heading: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="relative overflow-clip pt-20 sm:pt-24 lg:pt-32">
      {heading}
      <div className="mt-4 sm:mt-8">{children}</div>
    </section>
  );
}

/** Cinematic video invites: the painted scenes, drawn live. */
export function StudioVideoCarousel({ hi }: { hi: boolean }) {
  return (
    <Band
      id="video-designs"
      heading={
        <Heading
          kicker={hi ? 'वीडियो निमंत्रण' : 'Video invites'}
          title={hi ? 'चित्रित दृश्य,' : 'Painted scenes,'}
          soft={hi ? 'चलते हुए।' : 'in motion.'}
          body={hi ? 'लालटेन, महल, घाट और बगीचे। 9:16 वीडियो जो WhatsApp पर साफ़ चलता है, और वही डिज़ाइन आपकी वेबसाइट पर।' : 'Lanterns, palaces, ghats and gardens. A 9:16 video that plays crisp on WhatsApp, and the same design on your invitation website.'}
          href="/templates?format=video"
          cta={hi ? 'सभी वीडियो डिज़ाइन देखें' : 'See all video designs'}
        />
      }
    >
      <VideoDesignCoverflow hi={hi} />
    </Band>
  );
}
