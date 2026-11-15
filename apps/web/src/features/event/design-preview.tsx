'use client';

import { buildDesign, type EventDto } from '@cardai/shared';
import { Brush } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { DesignView } from '@/components/design/design-view';
import { useDesignData } from '@/features/editor/use-event-data';
import { useTemplate } from '@/lib/hooks';
import { useEventMedia } from './use-event-props';

const DesignPlayer = dynamic(() => import('@/components/design/design-player').then((m) => m.DesignPlayer), {
  ssr: false,
  loading: () => <div className="skeleton aspect-[9/16] w-full rounded-xl" />,
});

/** The event's card exactly as the editor saved it (or the template's layout), plus its video. */
export function EventDesignPreview({ event, mode }: { event: EventDto; mode: 'card' | 'video' }) {
  const { data: template } = useTemplate(event.design ? undefined : event.templateId);
  const { data: media } = useEventMedia(event.id);
  const photos = useMemo(
    () => event.settings.photoAssetIds.map((id) => media?.find((m) => m.id === id)?.url).filter((u): u is string => Boolean(u)),
    [event.settings.photoAssetIds, media],
  );
  const data = useDesignData(event, photos);
  const doc = useMemo(() => {
    if (event.design) return event.design;
    return template && data ? buildDesign({ template, data, language: event.language, eventType: event.type, community: event.community }) : null;
  }, [event, template, data]);
  const [page, setPage] = useState(0);
  if (!doc || !data) return <div className="skeleton aspect-[9/16] w-full rounded-xl" />;
  const current = Math.min(page, doc.pages.length - 1);

  return (
    <div>
      {mode === 'video' ? (
        <DesignPlayer design={doc} data={data} language={event.language} />
      ) : (
        <Link href={`/editor/${event.id}`} className="group relative block overflow-hidden rounded-xl" aria-label="Edit the card">
          <DesignView page={doc.pages[current]!} data={data} language={event.language} />
          <span className="absolute inset-x-3 bottom-3 flex h-11 items-center justify-center gap-2 rounded-lg bg-surface/95 font-semibold text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Brush className="size-4" /> Edit the card
          </span>
        </Link>
      )}
      {mode === 'card' && doc.pages.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {doc.pages.map((p, i) => (
            <button key={p.id} type="button" onClick={() => setPage(i)} aria-label={`Page ${i + 1}`} aria-current={i === current} className="size-3 rounded-full bg-line aria-[current=true]:bg-primary" />
          ))}
        </div>
      )}
    </div>
  );
}
