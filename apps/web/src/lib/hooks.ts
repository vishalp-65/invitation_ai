'use client';

import type { EventDto, MeResponse, RenderDto, TemplateDefinition } from '@cardai/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api';

export const qk = {
  me: ['me'] as const,
  events: ['events'] as const,
  event: (id: string) => ['events', id] as const,
  renders: (id: string) => ['events', id, 'renders'] as const,
  templates: (eventType?: string) => ['templates', eventType ?? 'all'] as const,
  guests: (id: string) => ['events', id, 'guests'] as const,
  rsvpSummary: (id: string) => ['events', id, 'rsvp-summary'] as const,
};

export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: async () => {
      try {
        return await api<MeResponse>('/auth/me');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 5 * 60_000,
  });
}

export function useTemplates(eventType?: string) {
  return useQuery({
    queryKey: qk.templates(eventType),
    queryFn: () => api<{ items: TemplateDefinition[] }>(`/templates${eventType ? `?eventType=${eventType}` : ''}`),
    staleTime: 10 * 60_000,
    select: (d) => d.items,
  });
}

export function useEvent(id: string) {
  return useQuery({ queryKey: qk.event(id), queryFn: () => api<EventDto>(`/events/${id}`) });
}

/** Polls while any render is still running. */
export function useRenders(eventId: string) {
  return useQuery({
    queryKey: qk.renders(eventId),
    queryFn: () => api<{ items: RenderDto[] }>(`/events/${eventId}/renders`),
    select: (d) => d.items,
    refetchInterval: (q) =>
      q.state.data?.items.some((r) => r.status === 'queued' || r.status === 'processing') ? 2500 : false,
  });
}

export function useCreateRender(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (format: RenderDto['format']) => api<RenderDto>('/renders', { method: 'POST', json: { eventId, format } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.renders(eventId) }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.setQueryData(qk.me, null);
      qc.clear();
    },
  });
}
