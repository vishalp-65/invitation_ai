import { eq, marketplaceTemplates, users, type Database } from '@cardai/db';
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
    // Free text understands Hindi/Hinglish (shaadi, mehndi, griha pravesh) and ranks the best matches first.
    return searchTemplates(await this.all(), filter).map((h) => h.template);
  }

  async resolve(id: string): Promise<TemplateDefinition> {
    const found = (await this.all()).find((t) => t.id === id);
    if (!found) throw new NotFoundException(`Template "${id}" not found`);
    return found;
  }
}
