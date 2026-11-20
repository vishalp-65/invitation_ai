'use client';

import { BUILTIN_TEMPLATES, getEventType, SHOWCASE, templateSupportsEvent, type Community, type ScanField, type EventContent, type EventTypeId, type LanguageCode, type WordingTone } from '@cardai/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { findTemplate } from '@/lib/template-hooks';

export interface DraftFunction {
  key: string;
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  venueName: string;
  venueAddress: string;
  mapUrl: string;
}

export interface Draft {
  step: number;
  type: EventTypeId;
  language: LanguageCode;
  community?: Community;
  tone: WordingTone;
  names: [string, string];
  parentage: [string, string];
  hosts: string;
  family: string;
  notes: string;
  content: EventContent;
  /** True while the wording is our auto-filled default (safe to regenerate). */
  contentIsDefault: boolean;
  functions: DraftFunction[];
  templateId: string;
  /** How the user started: the form, or a photo of their printed card (changes the step order). */
  source: 'form' | 'scan';
  /** Set after a card scan: which fields to double-check and how it was read. */
  scan?: { uncertain: ScanField[]; method: 'vision' | 'ocr' | 'local'; eventTypeFound: boolean };
}

interface DraftStore extends Draft {
  set: (patch: Partial<Draft>) => void;
  setContent: (patch: Partial<EventContent>) => void;
  setType: (type: EventTypeId) => void;
  updateFunction: (key: string, patch: Partial<DraftFunction>) => void;
  addFunction: () => void;
  removeFunction: (key: string) => void;
  reset: () => void;
}

const inTwoWeeks = () => new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
const key = () => Math.random().toString(36).slice(2, 9);

export const emptyFunction = (name = ''): DraftFunction => ({
  key: key(),
  name,
  date: inTwoWeeks(),
  time: '19:00',
  venueName: '',
  venueAddress: '',
  mapUrl: '',
});

const initial = (type: EventTypeId = 'wedding'): Draft => ({
  step: 0,
  type,
  language: 'hi',
  tone: 'traditional',
  names: ['', ''],
  parentage: ['', ''],
  hosts: '',
  family: '',
  notes: '',
  content: { headline: '', primaryNames: [], primaryDetails: [], familyLines: [] },
  contentIsDefault: true,
  functions: getEventType(type).defaultFunctions.slice(0, 3).map((n) => emptyFunction(n)),
  templateId: SHOWCASE.defaultTemplate,
  source: 'form',
  scan: undefined,
});

/** Wizard draft survives refreshes and the login step (localStorage). */
export const useDraft = create<DraftStore>()(
  persist(
    (set) => ({
      ...initial(),
      set: (patch) => set(patch),
      setContent: (patch) => set((s) => ({ content: { ...s.content, ...patch }, contentIsDefault: false })),
      setType: (type) =>
        set((s) => {
          const current = findTemplate(s.templateId);
          const templateId =
            current && templateSupportsEvent(current, type)
              ? s.templateId
              : (BUILTIN_TEMPLATES.find((t) => templateSupportsEvent(t, type))?.id ?? s.templateId);
          return {
            type,
            templateId,
            // Untouched default wording is regenerated for the new occasion (empty headline triggers it).
            content: s.contentIsDefault ? { ...s.content, headline: '' } : s.content,
            functions:
              s.functions.every((f) => !f.venueName) // untouched → swap in this occasion's defaults
                ? getEventType(type).defaultFunctions.slice(0, 3).map((n) => emptyFunction(n))
                : s.functions,
          };
        }),
      updateFunction: (k, patch) => set((s) => ({ functions: s.functions.map((f) => (f.key === k ? { ...f, ...patch } : f)) })),
      addFunction: () => set((s) => ({ functions: [...s.functions, emptyFunction()] })),
      removeFunction: (k) => set((s) => ({ functions: s.functions.filter((f) => f.key !== k) })),
      reset: () => set(initial()),
    }),
    { name: 'cardai-draft-v1', storage: createJSONStorage(() => localStorage) },
  ),
);

export function toIso(date: string, time: string) {
  return `${date}T${time || '18:00'}:00+05:30`;
}
