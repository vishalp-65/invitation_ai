import type { TemplateDefinition } from './types.js';

/** Groups templates into families (marketplace templates become single-variant families). */
export function groupByFamily(templates: TemplateDefinition[]): Array<{ id: string; name: string; variants: TemplateDefinition[] }> {
  const map = new Map<string, { id: string; name: string; variants: TemplateDefinition[] }>();
  for (const t of templates) {
    const id = t.family?.id ?? t.id;
    const entry = map.get(id) ?? { id, name: t.family?.name ?? t.name, variants: [] };
    entry.variants.push(t);
    map.set(id, entry);
  }
  return [...map.values()];
}
