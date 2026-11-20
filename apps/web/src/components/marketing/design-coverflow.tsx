'use client';

import { BUILTIN_TEMPLATES, EVENT_TYPES, groupByFamily, HERITAGE_FAMILIES, SITE_DESIGNS, visibleDesigns, type TemplateDefinition } from '@cardai/shared';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useMemo, type CSSProperties } from 'react';
import { DesignPoster } from '@/components/invite/design-poster';
import GlassyCarousel, { type GlassyCarouselItem } from '@/components/ui/glassy-coverflow-carousel';
import { googleFontsHref } from '@/features/site/theme';
import { useDesignVisibility } from '@/lib/offers';
import { designHref } from './family-showcase';

/** Maps the carousel's theme roles onto Noyta's tokens, so it follows light / dark with the site. */
const THEME = {
  '--carousel-background': 'transparent',
  '--color-foreground': 'var(--color-ink)',
  '--color-card': 'var(--color-surface)',
  '--color-card-foreground': 'var(--color-ink)',
  '--color-muted-foreground': 'var(--color-ink-soft)',
  '--color-border': 'var(--color-hairline)',
  '--color-primary-foreground': 'var(--color-on-primary)',
  '--carousel-shadow-color': 'var(--color-night)',
  '--carousel-font-body': 'var(--font-sans)',
  '--carousel-font-display': 'var(--font-display)',
  height: 'min(100svh, 860px)',
} as CSSProperties;

const CATEGORY_ORDER = ['wedding', 'religious', 'wedding', 'kids', 'wedding', 'business'] as const;

const occasion = (t: TemplateDefinition, hi: boolean) => {
  const id = t.eventTypes === 'all' ? 'wedding' : t.eventTypes[0];
  const e = EVENT_TYPES.find((x) => x.id === id);
  return e ? (hi ? e.labelHi : e.label.split(' / ')[0]!) : '';
};

function Hint({ hi }: { hi: boolean }) {
  return hi ? (
    <>
      <span>खींचकर देखें</span>
      <span className="gc-hint-separator">या</span>
      <ArrowLeft size={12} />
      <ArrowRight size={12} />
    </>
  ) : (
    <>
      <span>Drag to explore</span>
      <span className="gc-hint-separator">or</span>
      <ArrowLeft size={12} />
      <ArrowRight size={12} />
      <span>to browse</span>
    </>
  );
}

/**
 * Card designs as a coverflow: one card per design family (its first colourway), mixed across
 * occasions so neighbours differ. The premium heritage families have their own corridor on the
 * landing page, so they are left out by default.
 */
export function TemplateCoverflow({ hi, limit = 14, includeHeritage = false, className }: { hi: boolean; limit?: number; includeHeritage?: boolean; className?: string }) {
  const { hiddenTemplates } = useDesignVisibility();
  const items = useMemo<GlassyCarouselItem[]>(() => {
    const heritage = new Set(HERITAGE_FAMILIES.map((f) => f.id));
    const off = new Set(hiddenTemplates);
    const families = groupByFamily(BUILTIN_TEMPLATES.filter((t) => !off.has(t.id) && (includeHeritage || !t.design || !heritage.has(t.design))));
    // Round-robin over categories so a wedding card is never next to three more wedding cards.
    const buckets = new Map<string, typeof families>();
    for (const f of families) {
      const cat = f.variants[0]!.category ?? 'wedding';
      buckets.set(cat, [...(buckets.get(cat) ?? []), f]);
    }
    const picked: typeof families = [];
    for (let round = 0; picked.length < limit && round < families.length; round++) {
      let added = false;
      for (const cat of CATEGORY_ORDER) {
        const f = buckets.get(cat)?.shift();
        if (f && picked.length < limit) {
          picked.push(f);
          added = true;
        }
      }
      if (!added) break;
    }
    return picked.map((f) => {
      const t = f.variants[0]!;
      const n = f.variants.length;
      const colours = n > 1 ? (hi ? `${n} रंग` : `${n} colourways`) : hi ? '1 रंग' : '1 colourway';
      return {
        id: f.id,
        title: f.name,
        subtitle: `${occasion(t, hi)} · ${colours}${t.premium ? ' · Premium' : ''}`,
        image: `/showcase/${t.id}.jpg`,
        description: hi
          ? 'यह डिज़ाइन इमेज कार्ड, वीडियो और वेबसाइट, तीनों में मिलता है। अपने नाम डालकर मुफ़्त में देखें।'
          : 'Works as an image card, a video invite and a website. Add your names and preview it free.',
        href: designHref(t),
        linkLabel: hi ? 'यह डिज़ाइन चुनें' : 'Use this design',
        badge: hi ? 'देखें' : 'Preview',
      };
    });
  }, [hi, limit, includeHeritage, hiddenTemplates]);

  return (
    <GlassyCarousel
      items={items}
      layout="poster"
      posterRatio={16 / 9}
      initialIndex={Math.min(2, items.length - 1)}
      autoPlay
      label={hi ? 'कार्ड डिज़ाइन' : 'Card designs'}
      hint={<Hint hi={hi} />}
      className={className}
      style={THEME}
    />
  );
}

/** The cinematic video / website designs, each drawn live from its painted scene. */
export function VideoDesignCoverflow({ hi, className }: { hi: boolean; className?: string }) {
  const visibility = useDesignVisibility();
  // Admin can drop a pack from these demos (Designs page) or feature it first.
  const designs = useMemo(() => visibleDesigns(SITE_DESIGNS, visibility, 'showcase'), [visibility]);
  const items = useMemo<GlassyCarouselItem[]>(
    () =>
      designs.map((d) => ({
        id: d.id,
        title: d.name,
        subtitle: `${d.region} · ${hi ? 'वीडियो + वेबसाइट' : 'Video + website'}${d.isNew ? (hi ? ' · नया' : ' · New') : ''}`,
        description: hi
          ? `${d.blurb}। 9:16 वीडियो, WhatsApp पर 16 MB से कम, और यही डिज़ाइन आपकी निमंत्रण वेबसाइट पर।`
          : `${d.blurb}. A 9:16 video under 16 MB for WhatsApp, and the same design as your invitation website.`,
        media: <DesignPoster design={d} still />,
        preview: <DesignPoster design={d} />,
        href: '/create?type=wedding',
        linkLabel: hi ? 'वीडियो निमंत्रण बनाएँ' : 'Make a video invite',
        badge: hi ? 'चलाकर देखें' : 'Play preview',
      })),
    [hi, designs],
  );
  // Each design's own lettering; the browser only downloads the faces the visible cards use.
  const fonts = useMemo(() => googleFontsHref(designs.flatMap((d) => [d.fonts.script, d.fonts.body])), [designs]);

  return (
    <>
      <link rel="stylesheet" href={fonts} precedence="default" />
      <GlassyCarousel
        items={items}
        layout="poster"
        posterRatio={16 / 9}
        initialIndex={1}
        label={hi ? 'वीडियो निमंत्रण डिज़ाइन' : 'Video invitation designs'}
        hint={<Hint hi={hi} />}
        className={className}
        style={THEME}
      />
    </>
  );
}
