import { ATELIER_FAMILIES, BUILTIN_TEMPLATES, HERITAGE_FAMILIES } from '@cardai/shared';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PerspectiveTunnel, type TunnelItem } from '@/components/ui/perspective-tunnel';
import { designHref } from '@/lib/links';
import { Kicker } from './primitives';

/** Colourways per family shown in the corridor (the Atelier + Heritage families, premium only). */
const PER_FAMILY = 2;

/**
 * The premium collection as a scroll-driven 3D corridor. Only the newest (heritage) design families
 * flagged premium, two colourways each, interleaved so neighbouring cards are different designs.
 */
function premiumItems(hidden: readonly string[]): TunnelItem[] {
  const off = new Set(hidden);
  const families = [...ATELIER_FAMILIES, ...HERITAGE_FAMILIES].filter((f) => f.premium).map((f) => f.id);
  const byFamily = families.map((id) => BUILTIN_TEMPLATES.filter((t) => t.premium && t.design === id && !off.has(t.id)).slice(0, PER_FAMILY));
  const items: TunnelItem[] = [];
  for (let k = 0; k < PER_FAMILY; k++) {
    for (const list of byFamily) {
      const t = list[k];
      if (!t) continue;
      items.push({
        src: `/showcase/${t.id}.jpg`,
        title: t.family?.name ?? t.name,
        caption: t.family?.variant,
        href: designHref(t),
      });
    }
  }
  return items;
}

/** `hidden`: template ids an admin removed from the catalogue (they leave the landing demos too). */
export function StudioPremiumTunnel({ hi, hidden = [] }: { hi: boolean; hidden?: readonly string[] }) {
  return (
    <PerspectiveTunnel
      items={premiumItems(hidden)}
      kicker={<Kicker center>{hi ? 'प्रीमियम संग्रह' : 'Premium collection'}</Kicker>}
      title={
        <>
          {hi ? 'हमारे सबसे नए' : 'Our newest'}
          <br />
          <span className="text-ink-soft">{hi ? 'डिज़ाइन।' : 'designs.'}</span>
        </>
      }
      subtitle={hi ? 'महल के मेहराब, लालटेन, मंडल और नूर। हर डिज़ाइन कई रंगों में।' : 'Palace arches, lanterns, mandalas and noor. Every design in several colourways.'}
      prompt={hi ? 'स्क्रॉल करें' : 'Scroll to explore'}
      footer={
        <Link
          href="/templates?price=premium"
          className="press group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-7 text-sm font-medium text-ivory transition-colors hover:bg-ink/90"
        >
          {hi ? 'सभी प्रीमियम डिज़ाइन देखें' : 'See all premium designs'}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      }
    />
  );
}
