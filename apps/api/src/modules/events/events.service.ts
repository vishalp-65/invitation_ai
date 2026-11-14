import { and, asc, desc, eq, eventFunctions, events, inArray, ne, type Database } from '@cardai/db';
import {
  eventSettingsSchema,
  getEventType,
  mergeSettings,
  slugify,
  templateSupportsEvent,
  type CreateEventInput,
  type EventDto,
  type EventFunctionInput,
  type UpdateEventInput,
} from '@cardai/shared';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import type { AuthUser } from '../../common/auth.decorators.js';
import { DB } from '../../infra/infra.module.js';
import { EntitlementsService } from '../entitlements/entitlements.service.js';
import { TemplatesService } from '../templates/templates.service.js';

const suffix = customAlphabet('abcdefghijkmnpqrstuvwxyz23456789', 4);

export type EventRow = typeof events.$inferSelect;
export type FunctionRow = typeof eventFunctions.$inferSelect;

@Injectable()
export class EventsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly templates: TemplatesService,
    private readonly entitlements: EntitlementsService,
  ) {}

  /** Loads an event the caller owns (admins can access all). 404 instead of 403 to avoid leaking ids. */
  async getOwned(user: AuthUser, eventId: string): Promise<EventRow> {
    const [row] = await this.db.select().from(events).where(eq(events.id, eventId));
    if (!row || (row.userId !== user.id && user.role !== 'admin')) throw new NotFoundException('Event not found');
    return row;
  }

  async functionsOf(eventId: string): Promise<FunctionRow[]> {
    return this.db.select().from(eventFunctions).where(eq(eventFunctions.eventId, eventId)).orderBy(asc(eventFunctions.sortOrder));
  }

  async create(user: AuthUser, input: CreateEventInput): Promise<EventDto> {
    const template = await this.templates.resolve(input.templateId);
    if (!templateSupportsEvent(template, input.type)) {
      throw new BadRequestException('This template does not support the selected event type');
    }
    // Prefer names; non-Latin names slugify to nothing, so fall back to the title, then the event type.
    const seed =
      [input.content.primaryNames.join(' '), input.title].find((s) => s && !slugify(s).startsWith('invite')) ??
      getEventType(input.type).label;
    const slug = await this.uniqueSlug(seed);
    const settings = eventSettingsSchema.parse(input.settings ?? {});

    const eventId = await this.db.transaction(async (tx) => {
      const [event] = await tx
        .insert(events)
        .values({
          userId: user.id,
          slug,
          type: input.type,
          language: input.language,
          secondaryLanguage: input.secondaryLanguage,
          community: input.community,
          templateId: template.id,
          title: input.title,
          content: input.content,
          settings,
        })
        .returning({ id: events.id });
      await tx.insert(eventFunctions).values(input.functions.map((f, i) => toFunctionRow(event!.id, f, i)));
      return event!.id;
    });
    return this.getDto(user, eventId);
  }

  async list(user: AuthUser) {
    const rows = await this.db
      .select({
        id: events.id,
        slug: events.slug,
        title: events.title,
        type: events.type,
        status: events.status,
        templateId: events.templateId,
        language: events.language,
        viewCount: events.viewCount,
        updatedAt: events.updatedAt,
      })
      .from(events)
      .where(and(eq(events.userId, user.id), ne(events.status, 'archived')))
      .orderBy(desc(events.updatedAt))
      .limit(100);
    return { items: rows };
  }

  async getDto(user: AuthUser, eventId: string): Promise<EventDto> {
    const event = await this.getOwned(user, eventId);
    return this.toDto(event, await this.functionsOf(eventId));
  }

  async update(user: AuthUser, eventId: string, input: UpdateEventInput): Promise<EventDto> {
    const event = await this.getOwned(user, eventId);

    if (input.templateId && input.templateId !== event.templateId) {
      const template = await this.templates.resolve(input.templateId);
      if (!templateSupportsEvent(template, input.type ?? event.type)) {
        throw new BadRequestException('This template does not support the selected event type');
      }
    }
    if (input.slug && input.slug !== event.slug) {
      await this.entitlements.require(eventId, 'website_premium', 'A custom link is part of the Website plan');
      const [taken] = await this.db.select({ id: events.id }).from(events).where(eq(events.slug, input.slug));
      if (taken) throw new ConflictException('That link is already taken');
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(events)
        .set({
          type: input.type,
          language: input.language,
          secondaryLanguage: input.secondaryLanguage,
          community: input.community,
          templateId: input.templateId,
          title: input.title,
          slug: input.slug,
          content: input.content,
          settings: input.settings ? mergeSettings(event.settings, input.settings) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(events.id, eventId));

      if (input.functions) {
        const keepIds = input.functions.map((f) => f.id).filter((id): id is string => Boolean(id));
        const existing = await tx.select({ id: eventFunctions.id }).from(eventFunctions).where(eq(eventFunctions.eventId, eventId));
        const existingIds = new Set(existing.map((e) => e.id));
        const toDelete = [...existingIds].filter((id) => !keepIds.includes(id));
        if (toDelete.length) await tx.delete(eventFunctions).where(inArray(eventFunctions.id, toDelete));

        for (const [i, f] of input.functions.entries()) {
          const row = toFunctionRow(eventId, f, i);
          if (f.id && existingIds.has(f.id)) {
            await tx.update(eventFunctions).set(row).where(eq(eventFunctions.id, f.id));
          } else {
            await tx.insert(eventFunctions).values(row);
          }
        }
      }
    });
    return this.getDto(user, eventId);
  }

  async setStatus(user: AuthUser, eventId: string, status: 'published' | 'archived' | 'draft'): Promise<EventDto> {
    await this.getOwned(user, eventId);
    await this.db
      .update(events)
      .set({ status, publishedAt: status === 'published' ? new Date() : undefined })
      .where(eq(events.id, eventId));
    return this.getDto(user, eventId);
  }

  async duplicate(user: AuthUser, eventId: string): Promise<EventDto> {
    const dto = await this.getDto(user, eventId);
    return this.create(user, {
      type: dto.type,
      language: dto.language,
      secondaryLanguage: dto.secondaryLanguage ?? undefined,
      community: dto.community ?? undefined,
      templateId: dto.templateId,
      title: `${dto.title} (copy)`,
      content: dto.content,
      functions: dto.functions.map(({ id: _id, sortOrder: _s, ...f }) => f),
      settings: { ...dto.settings, aiClipAssetId: undefined },
    });
  }

  async toDto(event: EventRow, fns: FunctionRow[]): Promise<EventDto> {
    const ent = await this.entitlements.forEvent(event.id);
    return {
      id: event.id,
      slug: event.slug,
      status: event.status,
      type: event.type as EventDto['type'],
      language: event.language as EventDto['language'],
      secondaryLanguage: (event.secondaryLanguage as EventDto['secondaryLanguage']) ?? null,
      community: (event.community as EventDto['community']) ?? null,
      templateId: event.templateId,
      title: event.title,
      content: event.content,
      settings: event.settings,
      functions: fns.map(fromFunctionRow),
      features: [...ent.features],
      credits: ent.credits as Record<string, number>,
      viewCount: event.viewCount,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  private async uniqueSlug(seed: string): Promise<string> {
    const base = slugify(seed, 32);
    for (let i = 0; i < 5; i++) {
      const candidate = `${base}-${suffix()}`;
      const [taken] = await this.db.select({ id: events.id }).from(events).where(eq(events.slug, candidate));
      if (!taken) return candidate;
    }
    throw new ConflictException('Could not allocate a link, please retry');
  }
}

function toFunctionRow(eventId: string, f: EventFunctionInput, sortOrder: number) {
  return {
    eventId,
    name: f.name,
    startsAt: new Date(f.startsAt),
    endsAt: f.endsAt ? new Date(f.endsAt) : null,
    venueName: f.venueName,
    venueAddress: f.venueAddress ?? null,
    mapUrl: f.mapUrl ?? null,
    dressCode: f.dressCode ?? null,
    notes: f.notes ?? null,
    sortOrder,
  };
}

export function fromFunctionRow(f: FunctionRow) {
  return {
    id: f.id,
    name: f.name,
    startsAt: f.startsAt.toISOString(),
    endsAt: f.endsAt?.toISOString(),
    venueName: f.venueName,
    venueAddress: f.venueAddress ?? undefined,
    mapUrl: f.mapUrl ?? undefined,
    dressCode: f.dressCode ?? undefined,
    notes: f.notes ?? undefined,
    sortOrder: f.sortOrder,
  };
}
