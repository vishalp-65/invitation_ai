'use client';

import { BUILTIN_TEMPLATES, buildDesign, designDataFrom, type DesignData, type DesignDoc } from '@cardai/shared';
import { useMemo } from 'react';
import { toIso, type Draft } from './draft-store';

/** The wizard draft as a layered card (what the editor will open with). */
export function useDraftDesign(draft: Draft, templateId = draft.templateId): { doc: DesignDoc; data: DesignData } {
  return useMemo(() => {
    const template = BUILTIN_TEMPLATES.find((t) => t.id === templateId) ?? BUILTIN_TEMPLATES[0]!;
    const data = designDataFrom({
      content: { ...draft.content, primaryNames: draft.names.filter(Boolean) },
      functions: draft.functions
        .filter((f) => f.name)
        .map((f) => ({ name: f.name, startsAt: toIso(f.date, f.time), venueName: f.venueName || '…', venueAddress: f.venueAddress || undefined })),
      language: draft.language,
      eventType: draft.type,
    });
    return { doc: buildDesign({ template, data, language: draft.language, eventType: draft.type }), data };
  }, [draft.content, draft.names, draft.functions, draft.language, draft.type, templateId]);
}
