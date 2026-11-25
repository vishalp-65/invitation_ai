'use client';

import { ALL_BUILTIN_TEMPLATES, BUILTIN_TEMPLATES, templateSupportsEvent, type EventTypeId, type TemplateDefinition } from '@cardai/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { qk } from './hooks';

/*
 * Template lookups live apart from `hooks.ts` on purpose: they need the whole built-in design
 * catalogue, and `hooks.ts` (useMe, useLogout…) is imported by the site header on every page.
 * Only screens that actually pick or render a template load this module.
 */

/**
 * Every template this browser has seen from the API (incl. admin-published ones that aren't in
 * the built-in list), so synchronous lookups like the create wizard's preview can find them.
 */
const seen = new Map<string, TemplateDefinition>();
/** Retired built-ins included: invitations made with them must keep rendering. */
const BUILTIN_BY_ID = new Map(ALL_BUILTIN_TEMPLATES.map((t) => [t.id, t]));

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

/**
 * Templates for an occasion (all when unset). `initial` is a server-rendered first page, so the
 * gallery's designs are in the HTML for crawlers and no-JS visitors instead of a loading state.
 */
type TemplatePage = { items: TemplateDefinition[]; offline?: boolean };

export function useTemplates(eventType?: string, initial?: TemplateDefinition[]) {
  return useQuery({
    queryKey: qk.templates(eventType),
    queryFn: async (): Promise<TemplatePage> => {
      try {
        const r = await api<{ items: TemplateDefinition[] }>(`/templates${eventType ? `?eventType=${eventType}` : ''}`);
        remember(r.items);
        return r;
      } catch {
        // API unreachable: the built-in designs still work (pictures are static files), so show
        // those instead of an empty "No designs match", and ask again on the next visit.
        return { items: BUILTIN_TEMPLATES.filter((t) => !eventType || templateSupportsEvent(t, eventType as EventTypeId)), offline: true };
      }
    },
    initialData: initial ? (): TemplatePage => ({ items: remember(initial) }) : undefined,
    staleTime: (q) => (q.state.data?.offline ? 0 : 10 * 60_000),
    select: (d) => d.items,
  });
}
