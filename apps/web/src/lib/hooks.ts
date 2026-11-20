'use client';

import type { EventDto, MeResponse, RenderDto } from '@cardai/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { api, ApiError } from './api';
import { track } from './track';

export const qk = {
  me: ['me'] as const,
  events: ['events'] as const,
  event: (id: string) => ['events', id] as const,
  renders: (id: string) => ['events', id, 'renders'] as const,
  templates: (eventType?: string) => ['templates', eventType ?? 'all'] as const,
  guests: (id: string) => ['events', id, 'guests'] as const,
  rsvpSummary: (id: string) => ['events', id, 'rsvp-summary'] as const,
};

const noopSubscribe = () => () => {};
/**
 * False during SSR and hydration, true afterwards. Layout pieces hydrate before nested page
 * segments, so a query can resolve in between; data-driven markup waits for this to match the server.
 */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function useMe() {
  const hydrated = useHydrated();
  const q = useQuery({
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
  return hydrated ? q : { ...q, data: undefined, isLoading: true as const };
}

// Template lookups (findTemplate, useTemplate, useTemplates) are in ./template-hooks: they carry
// the whole design catalogue, which pages that only need the session should not download.

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
    onSuccess: (r) => {
      track('render_download', { props: { format: r.format } });
      return qc.invalidateQueries({ queryKey: qk.renders(eventId) });
    },
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
