import { and, desc, eq, userTemplates, type Database } from '@cardai/db';
import type { DesignDoc, SaveUserTemplateInput, UserTemplateDto } from '@cardai/shared';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../common/auth.decorators.js';
import { DB } from '../../infra/infra.module.js';

/** Keeps the list useful and the table small. */
const MAX_PER_USER = 50;

type Row = typeof userTemplates.$inferSelect;

@Injectable()
export class UserTemplatesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(user: AuthUser): Promise<{ items: UserTemplateDto[] }> {
    const rows = await this.db.select().from(userTemplates).where(eq(userTemplates.userId, user.id)).orderBy(desc(userTemplates.createdAt)).limit(MAX_PER_USER);
    return { items: rows.map(toDto) };
  }

  async create(user: AuthUser, input: SaveUserTemplateInput & { eventType?: string }): Promise<UserTemplateDto> {
    const existing = await this.db.$count(userTemplates, eq(userTemplates.userId, user.id));
    if (existing >= MAX_PER_USER) throw new BadRequestException(`You can keep up to ${MAX_PER_USER} templates. Delete one to save another.`);
    // Photos belong to the original invitation: keep the frames, drop the pictures.
    const design: DesignDoc = {
      ...input.design,
      pages: input.design.pages.map((p) => ({ ...p, elements: p.elements.map((e) => (e.type === 'image' ? { ...e, src: null } : e)) })),
    };
    const [row] = await this.db.insert(userTemplates).values({ userId: user.id, name: input.name, eventType: input.eventType ?? null, design }).returning();
    return toDto(row!);
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const [row] = await this.db.delete(userTemplates).where(and(eq(userTemplates.id, id), eq(userTemplates.userId, user.id))).returning({ id: userTemplates.id });
    if (!row) throw new NotFoundException('Template not found');
  }
}

function toDto(r: Row): UserTemplateDto {
  return { id: r.id, name: r.name, eventType: r.eventType, design: r.design, createdAt: r.createdAt.toISOString() };
}
