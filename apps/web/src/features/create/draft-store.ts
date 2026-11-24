'use client';

import { BUILTIN_TEMPLATES, getEventType, SHOWCASE, templateSampleLanguage, templateSupportsEvent, type Community, type ScanField, type EventContent, type EventTypeId, type LanguageCode, type WordingTone } from '@cardai/shared';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { findTemplate } from '@/lib/template-hooks';
import { cardForSiteDesign } from '@/lib/design-match';
import { localizeFunctions, rewordForLanguage } from './default-wording';

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
  /** The language was chosen (by the user, or by the design they picked), not just our default. */
  languageSet?: boolean;
  /** The user picked the language themselves: a design picked later keeps it. */
  languageByUser?: boolean;
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
  /** The occasion the functions were set up for; a different occasion starts them afresh. */
  fnType?: EventTypeId;
  templateId: string;
  /**
   * Video + website design the user picked (gallery or design step). Unset = the card's matching
   * design, else the best one for the occasion — decided by the server.
   */
  siteDesign?: string;
  /** How the user started: the form, or a photo of their printed card (changes the step order). */
  source: 'form' | 'scan';
  /** Set after a card scan: which fields to double-check and how it was read. */
  scan?: { uncertain: ScanField[]; method: 'vision' | 'ocr' | 'local'; eventTypeFound: boolean };
}

interface DraftStore extends Draft {
  set: (patch: Partial<Draft>) => void;
  setContent: (patch: Partial<EventContent>) => void;
  setType: (type: EventTypeId) => void;
  /** Switch the card language: our ready-made wording and function names follow, user text stays. */
  setLanguage: (language: LanguageCode, byUser?: boolean) => void;
  /** Pick a design: the card takes the language that design was shown in, unless the user chose one. */
  pickTemplate: (templateId: string) => void;
  /** Pick the video + website design; with `withCard`, also the card in the same art (if it suits the occasion). */
  pickSiteDesign: (id: string | undefined, withCard?: boolean) => void;
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
  siteDesign: undefined, // explicit, so reset() clears an earlier pick
  source: 'form',
  scan: undefined,
});

/** The draft's wording and function names in another language (see setLanguage). */
export function inLanguage(s: Draft, language: LanguageCode): Pick<Draft, 'content' | 'functions'> {
  if (s.language === language && s.content.headline) return { content: s.content, functions: s.functions };
  const names = s.names.filter(Boolean);
  return {
    content: { ...rewordForLanguage(s.content, { type: s.type, language, names, hosts: s.hosts, community: s.community }), primaryNames: names },
    functions: localizeFunctions(s.functions, language),
  };
}

/** Wizard draft survives refreshes and the login step (localStorage). */
export const useDraft = create<DraftStore>()(
  persist(
    (set) => ({
      ...initial(),
      set: (patch) => set(patch),
      setContent: (patch) => set((s) => ({ content: { ...s.content, ...patch }, contentIsDefault: false })),
      setLanguage: (language, byUser = true) => set((s) => ({ language, languageSet: true, languageByUser: s.languageByUser || byUser, ...inLanguage(s, language) })),
      pickTemplate: (templateId) =>
        set((s) => {
          const t = findTemplate(templateId);
          const language = t && !s.languageByUser ? templateSampleLanguage(t) : s.language;
          return { templateId, language, languageSet: true, ...inLanguage(s, language) };
        }),
      pickSiteDesign: (id, withCard = false) =>
        set((s) => {
          const card = id && withCard ? cardForSiteDesign(id, s.type) : undefined;
          if (!card) return { siteDesign: id };
          const language = !s.languageByUser ? templateSampleLanguage(card) : s.language;
          return { siteDesign: id, templateId: card.id, language, languageSet: true, ...inLanguage(s, language) };
        }),
      setType: (type) =>
        set((s) => {
          const current = findTemplate(s.templateId);
          // The card stays if it suits the new occasion; otherwise the picked video design's matching card, then any.
          const templateId =
            current && templateSupportsEvent(current, type)
              ? s.templateId
              : ((s.siteDesign && cardForSiteDesign(s.siteDesign, type)?.id) ?? BUILTIN_TEMPLATES.find((t) => templateSupportsEvent(t, type))?.id ?? s.templateId);
          return {
            type,
            templateId,
            // Untouched default wording is regenerated for the new occasion (empty headline triggers it).
            content: s.contentIsDefault ? { ...s.content, headline: '' } : s.content,
            functions:
              s.functions.every((f) => !f.venueName) // untouched → swap in this occasion's defaults
                ? localizeFunctions(getEventType(type).defaultFunctions.slice(0, 3).map((n) => emptyFunction(n)), s.language)
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

/** True once the saved draft is loaded, so nothing reads (or overwrites) the defaults first. */
export function useDraftHydrated(): boolean {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (useDraft.persist.hasHydrated()) setDone(true);
    return useDraft.persist.onFinishHydration(() => setDone(true));
  }, []);
  return done;
}

export function toIso(date: string, time: string) {
  return `${date}T${time || '18:00'}:00+05:30`;
}
