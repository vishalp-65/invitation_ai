import { getEventType } from '@cardai/shared';
import type { Draft } from './draft-store';

/** Map links guests can open: Google Maps (long and short links) and Apple Maps. */
export const isMapUrl = (v: string) => /^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps|maps\.apple\.com)/i.test(v.trim());

/** What still blocks "Create", as a `create.*` message key, or null. */
export function detailsProblem(d: Pick<Draft, 'type' | 'names' | 'functions'>): 'errNames' | 'errName' | 'errFnName' | 'errDate' | 'errVenue' | 'errMap' | null {
  const people = getEventType(d.type).primaryPeople;
  if (d.names.slice(0, people).some((n) => !n.trim())) return people === 2 ? 'errNames' : 'errName';
  if (d.functions.length > 1 && d.functions.some((f) => !f.name.trim())) return 'errFnName';
  if (d.functions.some((f) => !f.date)) return 'errDate';
  if (d.functions.some((f) => !f.venueName.trim())) return 'errVenue';
  if (d.functions.some((f) => f.mapUrl && !isMapUrl(f.mapUrl))) return 'errMap';
  return null;
}
