import { catalogTemplates, eq, marketplaceTemplates, templateOverrides, users, type Database } from '@cardai/db';
import {
  BUILTIN_TEMPLATES,
  searchTemplates,
  type Community,
  type EventTypeId,
  type LayoutId,
  type TemplateDefinition,
} from '@cardai/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DB } from '../../infra/infra.module.js';

export interface TemplateFilter {
  eventType?: string;
  community?: string;
  q?: string;
  premium?: boolean;
  styles?: string[];
  colors?: string[];
}

const CACHE_MS = 60_000;

export type AdminTemplate = TemplateDefinition & { hidden: boolean };

/**
 * Built-in templates (code) + admin-published catalogue templates + approved marketplace templates
 * (DB), with admin overrides (hide / feature / premium) applied. Cached briefly in memory.
 */
@Injectable()
export class TemplatesService {
  private cache: { at: number; items: AdminTemplate[] } | null = null;

  constructor(@Inject(DB) private readonly db: Database) {}

  /** What customers can see: hidden templates are left out. Featured ones come first. */
  async all(): Promise<TemplateDefinition[]> {
    const items = (await this.everything()).filter((t) => !t.hidden);
    return [...items.filter((t) => t.featured), ...items.filter((t) => !t.featured)];
  }

  /** Every template including hidden ones (admin console). */
  async everything(): Promise<AdminTemplate[]> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.items;
    const [overrides, published] = await Promise.all([
      this.db.select().from(templateOverrides),
      this.db.select().from(catalogTemplates).where(eq(catalogTemplates.status, 'published')),
    ]);
    const byBase = new Map(BUILTIN_TEMPLATES.map((t) => [t.id, t]));
    const catalog: TemplateDefinition[] = published.flatMap((c) => {
      const base = byBase.get(c.baseTemplateId) ?? BUILTIN_TEMPLATES[0]!;
      return [
        {
          id: c.templateKey,
          name: c.name,
          // Layout + theme of the template it was designed from power the video and website.
          layout: base.layout,
          theme: base.theme,
          design: base.design,
          category: base.category,
          styles: base.styles,
          eventTypes: c.eventTypes as EventTypeId[],
          communities: c.communities as Community[],
          tags: c.tags,
          premium: c.premium,
          source: 'catalog' as const,
          doc: { ...c.design, templateId: c.templateKey },
        },
      ];
    });
    const rows = await this.db
      .select({ t: marketplaceTemplates, designerName: users.name })
      .from(marketplaceTemplates)
      .innerJoin(users, eq(users.id, marketplaceTemplates.designerId))
      .where(eq(marketplaceTemplates.status, 'approved'));

    const marketplace: TemplateDefinition[] = rows.map(({ t, designerName }) => ({
      id: t.templateKey,
      name: t.name,
      layout: t.layout as LayoutId,
      theme: t.theme,
      eventTypes: t.eventTypes as EventTypeId[],
      communities: t.communities as Community[],
      tags: t.tags,
      premium: true,
      source: 'marketplace',
      designer: { id: t.designerId, name: designerName ?? 'Designer' },
    }));
    const ov = new Map(overrides.map((o) => [o.templateId, o]));
    const items: AdminTemplate[] = [...catalog, ...BUILTIN_TEMPLATES, ...marketplace].map((t) => {
      const o = ov.get(t.id);
      return { ...t, premium: o?.premium ?? t.premium, featured: o?.featured ?? false, hidden: o?.hidden ?? false };
    });
    this.cache = { at: Date.now(), items };
    return items;
  }

  invalidate() {
    this.cache = null;
  }

  async list(filter: TemplateFilter): Promise<TemplateDefinition[]> {
    // Free text understands Hindi/Hinglish (shaadi, mehndi, griha pravesh) and ranks the best matches first.
    return searchTemplates(await this.all(), filter).map((h) => h.template);
  }

  /** Hidden templates still resolve, so invitations already made with them keep working. */
  async resolve(id: string): Promise<TemplateDefinition> {
    const found = (await this.everything()).find((t) => t.id === id);
    if (!found) throw new NotFoundException(`Template "${id}" not found`);
    return found;
  }
}
