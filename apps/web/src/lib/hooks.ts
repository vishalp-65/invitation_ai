'use client';

import { BUILTIN_TEMPLATES, type EventDto, type MeResponse, type RenderDto, type TemplateDefinition } from '@cardai/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

/**
 * Every template this browser has seen from the API (incl. admin-published ones that aren't in
 * the built-in list), so synchronous lookups like the create wizard's preview can find them.
 */
const seen = new Map<string, TemplateDefinition>();
const BUILTIN_BY_ID = new Map(BUILTIN_TEMPLATES.map((t) => [t.id, t]));

export function findTemplate(id: string | null | undefined): TemplateDefinition | undefined {
  return id ? (BUILTIN_BY_ID.get(id) ?? seen.get(id)) : undefined;
}

function remember(items: TemplateDefinition[]) {
  for (const t of items) if (!BUILTIN_BY_ID.has(t.id)) seen.set(t.id, t);
  return items;
}

/** One template by id, including hidden ones (invitations made with them keep working). */
export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['template', id],
    queryFn: async () => remember([await api<TemplateDefinition>(`/templates/${id}`)])[0]!,
    enabled: Boolean(id),
    initialData: () => findTemplate(id),
    staleTime: 10 * 60_000,
  });
}

export function useTemplates(eventType?: string) {
  return useQuery({
    queryKey: qk.templates(eventType),
    queryFn: async () => {
      const r = await api<{ items: TemplateDefinition[] }>(`/templates${eventType ? `?eventType=${eventType}` : ''}`);
      remember(r.items);
      return r;
    },
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
