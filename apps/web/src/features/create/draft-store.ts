'use client';

import { BUILTIN_TEMPLATES, getEventType, SHOWCASE, templateSampleLanguage, templateSupportsEvent, type Community, type EventDto, type ScanField, type EventContent, type EventTypeId, type LanguageCode, type WordingTone } from '@cardai/shared';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { findTemplate } from '@/lib/template-hooks';
import { cardForSiteDesign } from '@/lib/design-match';
import { defaultWording, localizeFunctions, rewordForLanguage } from './default-wording';

export interface DraftFunction {
  key: string;
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  venueName: string;
  venueAddress: string;
  mapUrl: string;
  /** Venue not decided yet: the card leaves it out and "Create" doesn't ask for it. */
  venueLater?: boolean;
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
  /** Festival / holiday greeting card (no venue or RSVP) instead of a party invitation. */
  greeting?: boolean;
  /** How the user started: the form, or a photo of their printed card (changes the step order). */
  source: 'form' | 'scan';
  /** Set after a card scan: which fields to double-check and how it was read. */
  scan?: { uncertain: ScanField[]; method: 'vision' | 'ocr' | 'local'; eventTypeFound: boolean };
  /**
   * The invitation these details already belong to (made here, or loaded from the account). While
   * the details are unchanged (`key`), the design step offers to change its design instead of
   * making a duplicate.
   */
  lastEvent?: { id: string; key: string; title: string };
  /** The account's latest invitation was offered once (or the user chose to start afresh). */
  prefilled?: boolean;
  /** With `lastEvent`: the user chose to make another invitation rather than change that one's design. */
  newInvite?: boolean;
}

interface DraftStore extends Draft {
  set: (patch: Partial<Draft>) => void;
  setContent: (patch: Partial<EventContent>) => void;
  /** Greeting card on / off (festivals): venue fields and wording follow. */
  setGreeting: (on: boolean) => void;
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
  /** Start a brand-new event: everything back to the defaults. */
  reset: () => void;
  /**
   * After an invitation is made: keep the event details (names, functions, occasion, language) so
   * the next design for the same event is one tap, and open straight on the design step.
   */
  keepDetails: (event: { id: string; title: string }) => void;
  /** Fill the draft from a saved invitation (the account's latest), as its details. */
  fromEvent: (event: EventDto) => void;
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
    content: { ...rewordForLanguage(s.content, { type: s.type, language, names, hosts: s.hosts, community: s.community, greeting: s.greeting }), primaryNames: names },
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
      setGreeting: (on) =>
        set((s) => ({
          greeting: on,
          // A greeting has no venue; switching back asks for one again.
          functions: s.functions.map((f) => ({ ...f, venueLater: on, ...(on ? { venueName: '', venueAddress: '', mapUrl: '' } : {}) })),
          content: s.contentIsDefault ? { ...defaultWording(s.type, s.language, s.names, s.hosts, s.community, on), primaryNames: s.names.filter(Boolean) } : s.content,
        })),
      setType: (type) =>
        set((s) => {
          const current = findTemplate(s.templateId);
          // The card stays if it suits the new occasion; otherwise the picked video design's matching card, then any.
          const templateId =
            current && templateSupportsEvent(current, type)
              ? s.templateId
              : ((s.siteDesign && cardForSiteDesign(s.siteDesign, type)?.id) ?? BUILTIN_TEMPLATES.find((t) => templateSupportsEvent(t, type))?.id ?? s.templateId);
          // Festivals and holidays start as a greeting card (the host can switch to a party invite).
          const greeting = Boolean(getEventType(type).greeting);
          return {
            type,
            templateId,
            greeting,
            // Untouched default wording is regenerated for the new occasion (empty headline triggers it).
            content: s.contentIsDefault ? { ...s.content, headline: '' } : s.content,
            functions:
              s.functions.every((f) => !f.venueName) // untouched → swap in this occasion's defaults
                ? localizeFunctions(getEventType(type).defaultFunctions.slice(0, 3).map((n) => ({ ...emptyFunction(n), venueLater: greeting })), s.language)
                : s.functions,
          };
        }),
      updateFunction: (k, patch) => set((s) => ({ functions: s.functions.map((f) => (f.key === k ? { ...f, ...patch } : f)) })),
      addFunction: () => set((s) => ({ functions: [...s.functions, emptyFunction()] })),
      removeFunction: (k) => set((s) => ({ functions: s.functions.filter((f) => f.key !== k) })),
      // A deliberate fresh start: don't offer the latest invitation's details again.
      reset: () => set({ ...initial(), lastEvent: undefined, prefilled: true }),
      keepDetails: (event) =>
        set((s) => ({ step: 2, siteDesign: undefined, scan: undefined, source: 'form', prefilled: true, newInvite: false, lastEvent: { ...event, key: detailsKey(s) } })),
      fromEvent: (ev) =>
        set((s) => {
          const names = ev.content.primaryNames;
          const details = ev.content.primaryDetails ?? [];
          const next: Partial<Draft> = {
            type: ev.type,
            language: ev.language,
            languageSet: true,
            languageByUser: true,
            community: ev.community ?? undefined,
            names: [names[0] ?? '', names[1] ?? ''],
            parentage: [details[0] ?? '', details[1] ?? ''],
            content: ev.content,
            contentIsDefault: false,
            functions: ev.functions.map((f) => ({ key: key(), name: f.name, ...fromIso(f.startsAt), venueName: f.venueName, venueAddress: f.venueAddress ?? '', mapUrl: f.mapUrl ?? '', venueLater: !f.venueName })),
            fnType: ev.type,
            templateId: ev.templateId,
            siteDesign: undefined,
            source: 'form',
            scan: undefined,
            prefilled: true,
            newInvite: false,
          };
          return { ...next, lastEvent: { id: ev.id, title: ev.title, key: detailsKey({ ...s, ...next } as Draft) } };
        }),
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

/** The details an invitation is made of: when these change, it is a different invitation. */
export function detailsKey(d: Pick<Draft, 'type' | 'names' | 'functions'>): string {
  return JSON.stringify([d.type, d.names, d.functions.map((f) => [f.name, f.date, f.time, f.venueName])]);
}

/** An ISO time as the wizard's date + time fields, in India time (how the wizard saves them). */
export function fromIso(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? '';
  return { date: `${p('year')}-${p('month')}-${p('day')}`, time: `${p('hour')}:${p('minute')}` };
}

export function toIso(date: string, time: string) {
  return `${date}T${time || '18:00'}:00+05:30`;
}
