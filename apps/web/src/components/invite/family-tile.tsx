'use client';

import { sampleInviteProps, type TemplateDefinition } from '@cardai/shared';
import { clsx } from 'clsx';
import { Check, Crown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { InviteThumb } from './lazy-player';

interface Props {
  name: string;
  variants: TemplateDefinition[];
  /** Navigate on click (gallery/landing)… */
  href?: (t: TemplateDefinition) => string;
  /** …or select in place (wizard). */
  onPick?: (t: TemplateDefinition) => void;
  selectedId?: string;
  priority?: boolean;
}

/**
 * One design family: a pre-rendered thumbnail (fast, CDN-cached) + colourway swatches.
 * Marketplace designs have no pre-render, so they fall back to a lazy live thumbnail.
 */
export function FamilyTile({ name, variants, href, onPick, selectedId, priority }: Props) {
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
        'relative overflow-hidden rounded-[18px] bg-mist shadow-[var(--shadow-soft)] transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:-translate-y-1.5',
        isSelected && 'ring-4 ring-ink ring-offset-2',
      )}
    >
      {t.source === 'marketplace' ? (
        <InviteThumb props={sampleInviteProps(t, 'en')} />
      ) : (
        <Image
          src={`/showcase/${t.id}.jpg`}
          alt={`${t.name} invitation design`}
          width={432}
          height={768}
          sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 240px"
          className="aspect-[9/16] w-full object-cover"
          priority={priority}
        />
      )}
      {t.premium && (
        <span className="glass absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-white">
          <Crown className="size-3.5 text-marigold" /> Premium
        </span>
      )}
      {isSelected && (
        <span className="absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-ink text-marigold">
          <Check className="size-4" aria-label="Selected" />
        </span>
      )}
    </div>
  );

  return (
    <li>
      {onPick ? (
        <button type="button" onClick={() => onPick(t)} aria-pressed={isSelected} className="group block w-full rounded-[20px] text-left">
          {art}
        </button>
      ) : (
        <Link href={href?.(t) ?? '/create'} className="group block rounded-[20px]">
          {art}
        </Link>
      )}
      <div className="mt-2.5 flex flex-col gap-2 px-0.5 lg:flex-row lg:items-center lg:justify-between">
        <p className="truncate font-semibold">{name}</p>
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
