'use client';

import { buildInviteProps, type EventDto, type InviteProps, type MediaAssetDto } from '@cardai/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '@/lib/api';
import { useTemplates } from '@/lib/template-hooks';

export function useEventMedia(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId, 'media'],
    queryFn: () => api<{ items: MediaAssetDto[] }>(`/events/${eventId}/media`),
    select: (d) => d.items,
    enabled: Boolean(eventId),
  });
}

/** Remotion props for an saved event, mirroring what the worker will render. */
export function useEventProps(event: EventDto | undefined): InviteProps | null {
  const { data: templates } = useTemplates();
  const { data: media } = useEventMedia(event?.id ?? '');

  return useMemo(() => {
    if (!event || !templates) return null;
    const template = templates.find((t) => t.id === event.templateId) ?? templates[0]!;
    const url = (id?: string) => media?.find((m) => m.id === id)?.url ?? null;
    return buildInviteProps({
      template,
      eventType: event.type,
      language: event.language,
      content: event.content,
      timezone: event.settings.timezone,
      functions: event.functions,
      photos: event.settings.photoAssetIds.map((id) => url(id)).filter((u): u is string => Boolean(u)),
      backgroundUrl: url(event.settings.backgroundAssetId),
      aiClipUrl: url(event.settings.aiClipAssetId),
      siteUrl: event.status === 'published' ? `${window.location.origin}/i/${event.slug}` : null,
      watermark: !event.features.includes('image_hd'),
    });
  }, [event, templates, media]);
}
