'use client';

import { sampleInviteProps, type TemplateDefinition } from '@cardai/shared';
import { clsx } from 'clsx';
import { ArrowRight, Check, Crown, Eye } from 'lucide-react';
import Image from 'next/image';
import { coverOf, TemplateCover } from './template-cover';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { InviteThumb } from './lazy-player';
import { track } from '@/lib/track';

interface Props {
  name: string;
  variants: TemplateDefinition[];
  /** Navigate on click (gallery/landing)… */
  href?: (t: TemplateDefinition) => string;
  /** …or select in place (wizard). */
  onPick?: (t: TemplateDefinition) => void;
  selectedId?: string;
  priority?: boolean;
  /** Show a "Preview" button over the art (wizard). */
  onPreview?: (t: TemplateDefinition) => void;
  /** Gallery: clicking the art opens a preview; `href` becomes a hover "Use this design" button. */
  onOpen?: (t: TemplateDefinition) => void;
  /** Show colourway count and Free/Premium under the name. */
  meta?: boolean;
  hi?: boolean;
}

/**
 * One design family: a pre-rendered thumbnail (fast, CDN-cached) + colourway swatches.
 * Marketplace designs have no pre-render, so they fall back to a lazy live thumbnail.
 */
export function FamilyTile({ name, variants, href, onPick, selectedId, priority, onPreview, onOpen, meta, hi }: Props) {
  const selectedIdx = variants.findIndex((v) => v.id === selectedId);
  const [active, setActive] = useState(selectedIdx >= 0 ? selectedIdx : 0);
  useEffect(() => {
    if (selectedIdx >= 0) setActive(selectedIdx);
  }, [selectedIdx]);

  const t = variants[active] ?? variants[0]!;
  const isSelected = selectedIdx >= 0;

  const art = (
    <div
      className={clsx(
        'relative overflow-clip border bg-ink/[0.04] transition-[transform,border-color] duration-500 ease-[var(--ease-out-quint)] group-hover:-translate-y-1.5',
        isSelected ? 'border-ink ring-1 ring-ink' : 'border-ink/10 group-hover:border-ink/30',
      )}
    >
      {t.source === 'marketplace' ? (
        <InviteThumb props={sampleInviteProps(t, 'en')} />
      ) : t.doc ? (
        <TemplateCover id={t.id} name={t.name} coverPage={coverOf(t.doc)} />
      ) : (
        <Image
          src={`/showcase/${t.id}.jpg`}
          alt={`${t.name} invitation design`}
          width={432}
          height={768}
          sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 240px"
          className="skeleton aspect-[9/16] w-full object-cover transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:scale-[1.03]"
          priority={priority}
        />
      )}
      {t.premium && (
        <span className="absolute right-2 top-2 flex items-center gap-1 bg-black/70 px-2 py-1 font-mono text-[0.625rem] uppercase tracking-wider text-white backdrop-blur">
          <Crown className="size-3 text-amber" /> Premium
        </span>
      )}
      {isSelected && (
        <span className="absolute left-2 top-2 inline-flex h-7 animate-pop items-center gap-1 bg-ink pl-1.5 pr-2.5 font-mono text-[0.625rem] uppercase tracking-wider text-ivory">
          <Check className="size-3.5" strokeWidth={2.5} aria-hidden /> Selected
        </span>
      )}
    </div>
  );

  return (
    <li className="group/tile">
      <div className="relative">
        {onOpen ? (
          <button
            type="button"
            onClick={() => {
              track('template_view', { templateId: t.id });
              onOpen(t);
            }}
            aria-label={`${hi ? 'देखें' : 'Preview'} ${name}`}
            className="group block w-full text-left"
          >
            {art}
          </button>
        ) : onPick ? (
          <button type="button" onClick={() => {
            track('template_select', { templateId: t.id });
            onPick(t);
          }} aria-pressed={isSelected} className="group block w-full text-left">
            {art}
          </button>
        ) : (
          <Link href={href?.(t) ?? '/create'} onClick={() => track('template_select', { templateId: t.id })} className="group block">
            {art}
          </Link>
        )}
        {onOpen && href && (
          <Link
            href={href(t)}
            onClick={() => track('template_select', { templateId: t.id })}
            className="absolute inset-x-2.5 bottom-2.5 hidden h-10 items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-medium text-on-primary opacity-0 transition-[opacity,transform] duration-200 hover:bg-primary-hover focus-visible:opacity-100 lg:inline-flex lg:translate-y-1 lg:group-hover/tile:translate-y-0 lg:group-hover/tile:opacity-100"
          >
            {hi ? 'यह डिज़ाइन चुनें' : 'Use this design'}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
        {onPreview && (
          <button
            type="button"
            onClick={() => {
              track('template_view', { templateId: t.id });
              onPreview(t);
            }}
            className="absolute bottom-2.5 right-2.5 inline-flex h-9 items-center gap-1.5 rounded-full bg-ivory/95 px-3.5 text-xs font-medium text-ink backdrop-blur transition-[opacity,transform] duration-200 hover:bg-surface lg:translate-y-1 lg:opacity-0 lg:group-hover/tile:translate-y-0 lg:group-hover/tile:opacity-100 lg:focus-visible:opacity-100"
          >
            <Eye className="size-3.5" aria-hidden />
            Preview
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="truncate">{name}</p>
          {meta && (
            <p className="mt-1 truncate font-mono text-[0.6875rem] text-ink-soft">
              {variants.length > 1 ? (hi ? `${variants.length} रंग` : `${variants.length} colourways`) : hi ? '1 रंग' : '1 colourway'}
              {' · '}
              {t.premium ? (hi ? 'प्रीमियम' : 'Premium') : hi ? 'मुफ़्त' : 'Free'}
            </p>
          )}
        </div>
        {variants.length > 1 && (
          <div className="flex shrink-0 gap-1.5 lg:gap-1" role="group" aria-label={`${name} colours`}>
            {variants.map((v, i) => (
              <button
                key={v.id}
                type="button"
                aria-label={v.family?.variant ?? v.name}
                aria-pressed={i === active}
                onClick={() => {
                  setActive(i);
                  if (onPick && isSelected) onPick(v);
                }}
                className="size-7 rounded-full border-2 border-white shadow-[0_0_0_1px_var(--color-line)] transition-transform aria-pressed:scale-110 aria-pressed:shadow-[0_0_0_2px_var(--color-ink)] lg:size-5"
                style={{ background: `linear-gradient(135deg, ${v.theme.palette.background} 55%, ${v.theme.palette.primary} 55%)` }}
              />
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
