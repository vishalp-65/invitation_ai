import { eq, marketplaceTemplates, users, type Database } from '@cardai/db';
import {
  BUILTIN_TEMPLATES,
  templateSupportsEvent,
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
}

const CACHE_MS = 60_000;

/** Built-in templates (code) + approved marketplace templates (DB), cached briefly in memory. */
@Injectable()
export class TemplatesService {
  private cache: { at: number; items: TemplateDefinition[] } | null = null;

  constructor(@Inject(DB) private readonly db: Database) {}

  async all(): Promise<TemplateDefinition[]> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.items;
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
    const items = [...BUILTIN_TEMPLATES, ...marketplace];
    this.cache = { at: Date.now(), items };
    return items;
  }

  invalidate() {
    this.cache = null;
  }

  async list(filter: TemplateFilter): Promise<TemplateDefinition[]> {
    const q = filter.q?.toLowerCase().trim();
    return (await this.all()).filter(
      (t) =>
        (!filter.eventType || templateSupportsEvent(t, filter.eventType)) &&
        (!filter.community || t.communities.length === 0 || (t.communities as string[]).includes(filter.community)) &&
        (filter.premium === undefined || t.premium === filter.premium) &&
        (!q || t.name.toLowerCase().includes(q) || t.tags.some((tag) => tag.includes(q))),
    );
  }

  async resolve(id: string): Promise<TemplateDefinition> {
    const found = (await this.all()).find((t) => t.id === id);
    if (!found) throw new NotFoundException(`Template "${id}" not found`);
    return found;
  }
}
