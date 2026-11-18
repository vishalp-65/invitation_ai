'use client';

import { getEventType, type EventContent, type ScanField } from '@cardai/shared';
import { defaultWording } from '../default-wording';
import { emptyFunction, useDraft, type DraftFunction } from '../draft-store';
import { mainFunctionName } from '../step-quick';
import type { ScanOutcome } from './scan-card';

const cap = (s: string | null | undefined, max: number) => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const opt = (s: string | null | undefined, max: number) => cap(s, max) || undefined;
const lines = (xs: string[], max: number, n: number) => xs.map((x) => cap(x, max)).filter(Boolean).slice(0, n);
const validDate = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : '');
const validTime = (s: string | null) => (s && /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : '');

/** What was read off the card → the wizard draft. The card's own wording is kept as printed. */
export function applyScan(r: ScanOutcome) {
  const s = useDraft.getState();
  const type = r.eventType ?? s.type;
  // setType also swaps to a design made for this occasion.
  s.setType(type);
  const language = r.language ?? s.language;
  const community = r.community ?? s.community;
  const names: [string, string] = [cap(r.primaryNames[0], 60), cap(r.primaryNames[1], 60)];
  const parentage: [string, string] = [cap(r.primaryDetails[0], 160), cap(r.primaryDetails[1], 160)];
  const hosts = cap(r.hosts, 300);

  const base = defaultWording(type, language, names, hosts, community);
  const familyLines = lines(r.familyLines, 140, 16);
  const welcomeLines = lines(r.welcomeLines, 140, 16);
  const complimentsLines = lines(r.complimentsLines, 140, 12);
  const rsvpContacts = r.rsvpContacts
    .map((c) => ({ name: cap(c.name, 60), phone: cap(c.phone, 24) }))
    .filter((c) => c.phone)
    .slice(0, 3);
  const content: EventContent = {
    ...base,
    invocation: opt(r.invocation, 140) ?? base.invocation,
    headline: cap(r.headline, 80) || base.headline,
    hostLine: opt(r.hostLine, 320) ?? base.hostLine,
    primaryNames: names.filter(Boolean),
    primaryDetails: parentage.filter(Boolean),
    connector: opt(r.connector, 24) ?? base.connector,
    message: opt(r.message, 700) ?? base.message,
    familyTitle: opt(r.familyTitle, 60) ?? base.familyTitle,
    familyLines: familyLines.length ? familyLines : base.familyLines,
    closing: opt(r.closing, 240) ?? base.closing,
    ...(welcomeLines.length ? { welcomeTitle: opt(r.welcomeTitle, 60), welcomeLines } : {}),
    ...(complimentsLines.length ? { complimentsTitle: opt(r.complimentsTitle, 60), complimentsLines } : {}),
    ...(rsvpContacts.length ? { rsvpContacts } : {}),
    ...(r.note ? { note: opt(r.note, 240) } : {}),
    ...(r.hashtag ? { hashtag: opt(r.hashtag, 40) } : {}),
  };

  const defaults = getEventType(type).defaultFunctions as readonly string[];
  const functions: DraftFunction[] = r.functions.slice(0, 8).map((f, i) => ({
    ...emptyFunction(cap(f.name, 60) || (r.functions.length === 1 ? mainFunctionName(type) : (defaults[i] ?? mainFunctionName(type)))),
    date: validDate(f.date),
    time: validTime(f.time),
    venueName: cap(f.venueName, 120),
    venueAddress: cap(f.venueAddress, 300),
  }));
  if (!functions.length) functions.push({ ...emptyFunction(mainFunctionName(type)), date: '', time: '' });

  // A missing date or venue always needs a look, whatever the model said.
  const uncertain = new Set<ScanField>(r.uncertain);
  if (functions.some((f) => !f.date)) uncertain.add('date');
  if (functions.some((f) => !f.venueName)) uncertain.add('venue');
  const people = getEventType(type).primaryPeople;
  if (names.slice(0, people).some((n) => !n)) uncertain.add('names');

  s.set({
    language,
    community,
    names,
    parentage,
    hosts,
    content,
    contentIsDefault: false,
    functions,
    source: 'scan',
    scan: { uncertain: [...uncertain], method: r.method, eventTypeFound: Boolean(r.eventType) },
  });
}
