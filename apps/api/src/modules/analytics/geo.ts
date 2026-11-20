export interface Geo {
  country: string | null;
  region: string | null;
  city: string | null;
}

/** `cai_geo` = "IN|MH|Mumbai" (URI-encoded), set by the web edge from its own geo headers. */
export function parseGeo(raw: string | undefined | null): Geo | null {
  if (!raw) return null;
  try {
    const [country, region, city] = decodeURIComponent(raw).split('|');
    const clean = (v: string | undefined, max: number) => (v && /^[\p{L}\p{N} .'-]{1,60}$/u.test(v) ? v.slice(0, max) : null);
    return { country: clean(country, 2)?.toUpperCase() ?? null, region: clean(region, 3)?.toUpperCase() ?? null, city: clean(city, 60) };
  } catch {
    return null;
  }
}
