'use client';

import { BUILTIN_TEMPLATES, buildInviteProps, type InviteProps, type TemplateDefinition } from '@cardai/shared';
import { useMemo } from 'react';
import { toIso, type Draft } from './draft-store';

/** Turns the wizard draft into Remotion props for the live preview. */
export function useDraftProps(draft: Draft, template?: TemplateDefinition, watermark = false): InviteProps {
  return useMemo(() => {
    const tpl = template ?? BUILTIN_TEMPLATES.find((t) => t.id === draft.templateId) ?? BUILTIN_TEMPLATES[0]!;
    return buildInviteProps({
      template: tpl,
      eventType: draft.type,
      language: draft.language,
      content: draft.content,
      functions: draft.functions
        .filter((f) => f.name)
        .map((f) => ({ name: f.name, startsAt: toIso(f.date, f.time), venueName: f.venueName || '…', venueAddress: f.venueAddress || undefined })),
      watermark,
    });
  }, [draft.content, draft.functions, draft.language, draft.templateId, draft.type, template, watermark]);
}
