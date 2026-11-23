'use client';

import { BUILTIN_TEMPLATES, designDataFrom, sampleInviteProps, type DesignData, type DesignPage, type TemplateDefinition } from '@cardai/shared';
import { clsx } from 'clsx';
import Image from 'next/image';
import { useState } from 'react';
import { DesignView } from '@/components/design/design-view';

let sample: DesignData | null = null;
/** Sample wedding details for live thumbnails of admin-published templates (built once). */
export function sampleDesignData(): DesignData {
  if (sample) return sample;
  const s = sampleInviteProps(BUILTIN_TEMPLATES[0]!, 'en');
  sample = designDataFrom({
    content: s.content,
    functions: s.functions.map((f, i) => ({ name: f.name, startsAt: `2026-12-${12 + i}T19:00:00+05:30`, venueName: f.venue, venueAddress: f.address ?? undefined })),
    language: 'en',
    eventType: s.eventType,
  });
  return sample;
}

export function coverOf(doc: NonNullable<TemplateDefinition['doc']>): DesignPage {
  return doc.pages.find((p) => p.id === 'cover') ?? doc.pages[0]!;
}

/**
 * 9:16 template thumbnail. Built-in templates use the pre-rendered showcase JPEG; templates
 * published from the editor (no JPEG) render their cover page live.
 */
export function TemplateCover({ id, name, coverPage, className, sizes = '160px', priority }: { id: string; name: string; coverPage?: unknown; className?: string; sizes?: string; priority?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (coverPage) {
    return (
      <div className={clsx('aspect-[9/16] w-full overflow-hidden bg-mist', className)}>
        <DesignView page={coverPage as DesignPage} data={sampleDesignData()} language="en" lazy />
      </div>
    );
  }
  if (broken) return <div className={clsx('grid aspect-[9/16] w-full place-items-center bg-mist p-2 text-center text-xs text-ink-soft', className)}>{name}</div>;
  return (
    <Image
      src={`/showcase/${id}.jpg`}
      alt={`${name} invitation design`}
      width={432}
      height={768}
      sizes={sizes}
      priority={priority}
      onError={() => setBroken(true)}
      className={clsx('skeleton aspect-[9/16] w-full object-cover', className)}
    />
  );
}
