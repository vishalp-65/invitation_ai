import { ALL_WEDDINGS, BUILTIN_TEMPLATES, BUSINESS, faithOf, KIDS, SACRED, sampleInviteProps, templateSupportsEvent, type TemplateDefinition } from '@cardai/shared';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

/** Template ids that have a pre-rendered thumbnail in public/showcase (read once per server). */
let thumbs: Promise<Set<string>> | null = null;
const showcase = () =>
  (thumbs ??= readdir(path.join(process.cwd(), 'public', 'showcase'))
    .then((files) => new Set(files.filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4))))
    .catch(() => new Set<string>()));

const cache = new Map<string, TemplateDefinition[]>();
/** Occasion groups the design catalogue is drawn for (design/families.ts). */
const GROUPS: ReadonlyArray<readonly string[]> = [ALL_WEDDINGS, KIDS, SACRED, BUSINESS];

/**
 * Designs to show on an occasion's landing page, one per family.
 *
 * A thumbnail is a fixed image, rendered for a sample occasion (see worker render-showcase), so its
 * sacred marks are baked in. A design is only shown when that sample's faith matches the page's, or
 * is secular — never a Ganesha card on the Nikah page, or a Bismillah card on the wedding page.
 * Covers rendered for this very occasion come first, then same-kind occasions, then the rest.
 */
export async function designsFor(type: string, limit = 12): Promise<TemplateDefinition[]> {
  const key = `${type}:${limit}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const have = await showcase();
  const pageFaith = faithOf(type);
  const best = new Map<string, { t: TemplateDefinition; rank: number }>();
  for (const t of BUILTIN_TEMPLATES) {
    if (!have.has(t.id) || !templateSupportsEvent(t, type)) continue;
    const shownAs = sampleInviteProps(t).eventType;
    const faith = faithOf(shownAs, t.communities[0]);
    if (faith !== pageFaith && faith !== 'secular') continue;
    // The cover's wording is the sample occasion's ("Farewell", "Puja"…), so prefer covers drawn
    // for this occasion, then for its group (weddings, kids, sacred, business), then fill with the rest.
    const rank = shownAs === type ? 0 : GROUPS.some((g) => g.includes(type) && g.includes(shownAs)) ? 1 : 2;
    const family = t.family?.id ?? t.id;
    const cur = best.get(family);
    if (!cur || rank < cur.rank) best.set(family, { t, rank });
  }
  // Stable sort keeps catalogue order (layered designs first) within each rank.
  const out = [...best.values()].sort((a, b) => a.rank - b.rank).slice(0, limit).map((x) => x.t);
  cache.set(key, out);
  return out;
}
