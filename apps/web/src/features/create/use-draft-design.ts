'use client';

import { BUILTIN_TEMPLATES, buildDesign, designDataFrom, type DesignData, type DesignDoc } from '@cardai/shared';
import { useMemo } from 'react';
import { findTemplate } from '@/lib/template-hooks';
import { toIso, type Draft } from './draft-store';

/** The wizard draft as a layered card (what the editor will open with). */
export function useDraftDesign(draft: Draft, templateId = draft.templateId): { doc: DesignDoc; data: DesignData } {
  return useMemo(() => {
    const template = findTemplate(templateId) ?? BUILTIN_TEMPLATES[0]!;
    const data = designDataFrom({
      content: { ...draft.content, primaryNames: draft.names.filter(Boolean) },
      functions: draft.functions
        // A function without a (valid) date yet (cleared, or not on a scanned card) stays off the preview.
        .filter((f) => f.name && !Number.isNaN(Date.parse(toIso(f.date, f.time))))
        .map((f) => ({ name: f.name, startsAt: toIso(f.date, f.time), venueName: f.venueName || '…', venueAddress: f.venueAddress || undefined })),
      language: draft.language,
      eventType: draft.type,
      community: draft.community,
    });
    return { doc: buildDesign({ template, data, language: draft.language, eventType: draft.type, community: draft.community }), data };
  }, [draft.content, draft.names, draft.functions, draft.language, draft.type, draft.community, templateId]);
}
