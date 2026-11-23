import { and, asc, desc, eq, eventFunctions, eventMembers, events, guests, inArray, isNotNull, isNull, ne, or, rsvps, sql, users, type Database } from '@cardai/db';
import {
  eventSettingsSchema,
  getEventType,
  mergeSettings,
  slugify,
  templateSupportsEvent,
  type CreateEventInput,
  type DesignDoc,
  type EventDto,
  type EventFunctionInput,
  type UpdateEventInput,
} from '@cardai/shared';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import type { AuthUser } from '../../common/auth.decorators.js';
import { DB } from '../../infra/infra.module.js';
import { EntitlementsService } from '../entitlements/entitlements.service.js';
import { ShortLinksService } from '../short-links/short-links.service.js';
import { TemplatesService } from '../templates/templates.service.js';

const suffix = customAlphabet('abcdefghijkmnpqrstuvwxyz23456789', 4);

export type EventRow = typeof events.$inferSelect;
export type FunctionRow = typeof eventFunctions.$inferSelect;

const OUTER_EVENT_ID = sql.raw('"events"."id"');

/** What a call needs: read, manage guests, edit the invitation, or owner-only (billing, co-hosts, delete). */
export type Need = 'view' | 'guests' | 'edit' | 'owner';
export type Access = 'owner' | 'editor' | 'guests' | 'viewer';
const RANK: Record<Access, number> = { viewer: 0, guests: 1, editor: 2, owner: 3 };
const NEED_RANK: Record<Need, number> = { view: 0, guests: 1, edit: 2, owner: 3 };

export function accessAllows(access: Access, need: Need): boolean {
  return RANK[access] >= NEED_RANK[need];
}

@Injectable()
export class EventsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly templates: TemplatesService,
    private readonly entitlements: EntitlementsService,
    private readonly links: ShortLinksService,
  ) {}

  /**
   * Loads an event the caller may act on with `need` (default: edit). Owners can do everything,
   * co-hosts what their role allows. Admins may only *read* customer invitations here: changes go
   * through AdminGuard routes (DB re-check, MFA, scopes), never a bare JWT role claim.
   * 404 instead of 403 when there is no access at all, to avoid leaking ids.
   */
  async getOwned(user: AuthUser, eventId: string, need: Need = 'edit'): Promise<EventRow> {
    return (await this.access(user, eventId, need)).event;
  }

  async access(user: AuthUser, eventId: string, need: Need = 'edit'): Promise<{ event: EventRow; access: Access }> {
    const [row] = await this.db.select().from(events).where(eq(events.id, eventId));
    if (!row) throw new NotFoundException('Event not found');
    let access: Access | null = row.userId === user.id ? 'owner' : null;
    if (!access) {
      const [m] = await this.db
        .select({ role: eventMembers.role })
        .from(eventMembers)
        .where(and(eq(eventMembers.eventId, eventId), eq(eventMembers.userId, user.id), isNotNull(eventMembers.acceptedAt)));
      if (m) access = m.role as Access;
    }
    if (!access && user.role === 'admin' && need === 'view') access = 'viewer';
    if (!access) throw new NotFoundException('Event not found');
    if (!accessAllows(access, need)) {
      throw new ForbiddenException(need === 'owner' ? 'Only the person who created this invitation can do this.' : 'Your co-host role does not allow this. Ask the host to change it.');
    }
    return { event: row, access };
  }

  /** Links pending co-host invites to this account once its email is verified. */
  async acceptInvites(user: AuthUser): Promise<number> {
    // One statement (runs on every dashboard load): match pending invites to this account's verified email.
    const res = await this.db
      .update(eventMembers)
      .set({ userId: user.id, acceptedAt: new Date() })
      .where(
        and(
          isNull(eventMembers.userId),
          sql`${eventMembers.email} = (select lower(${users.email}) from ${users} where ${users.id} = ${user.id} and ${users.emailVerifiedAt} is not null)`,
        ),
      );
    return res.rowCount ?? 0;
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
          // Admin-published templates are finished editor layouts: the invitation starts from that design.
          design: input.design ? { ...input.design, templateId: template.id } : template.doc ? structuredClone(template.doc) : null,
        })
        .returning({ id: events.id });
      await tx.insert(eventFunctions).values(input.functions.map((f, i) => toFunctionRow(event!.id, f, i)));
      return event!.id;
    });
    return this.getDto(user, eventId);
  }

  async list(user: AuthUser) {
    await this.acceptInvites(user);
    const shared = this.db
      .select({ id: eventMembers.eventId })
      .from(eventMembers)
      .where(and(eq(eventMembers.userId, user.id), isNotNull(eventMembers.acceptedAt)));
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
        // Dashboard summary: first function date, guest list size and confirmed headcount.
        // The outer id is written out in full: Drizzle renders `${events.id}` unqualified inside a subquery.
        firstStartsAt: sql<Date | null>`(select min(${eventFunctions.startsAt}) from ${eventFunctions} where ${eventFunctions.eventId} = ${OUTER_EVENT_ID})`.mapWith(eventFunctions.startsAt),
        guestCount: sql<number>`(select count(*)::int from ${guests} where ${guests.eventId} = ${OUTER_EVENT_ID})`,
        comingCount: sql<number>`(select coalesce(sum(${rsvps.headcount}), 0)::int from ${rsvps} where ${rsvps.eventId} = ${OUTER_EVENT_ID} and ${rsvps.status} = 'yes')`,
        shared: sql<boolean>`${events.userId} <> ${user.id}`,
      })
      .from(events)
      .where(and(or(eq(events.userId, user.id), inArray(events.id, shared)), ne(events.status, 'archived')))
      .orderBy(desc(events.updatedAt))
      .limit(100);
    return { items: rows };
  }

  async getDto(user: AuthUser, eventId: string): Promise<EventDto> {
    // Functions load alongside the access check (they are only returned if access passes).
    const [{ event, access }, fns] = await Promise.all([this.access(user, eventId, 'view'), this.functionsOf(eventId)]);
    return this.toDto(event, fns, access);
  }

  async update(user: AuthUser, eventId: string, input: UpdateEventInput): Promise<EventDto> {
    const event = await this.getOwned(user, eventId);

    let switchedDesign: DesignDoc | undefined;
    if (input.templateId && input.templateId !== event.templateId) {
      const template = await this.templates.resolve(input.templateId);
      if (!templateSupportsEvent(template, input.type ?? event.type)) {
        throw new BadRequestException('This template does not support the selected event type');
      }
      if (template.doc) switchedDesign = structuredClone(template.doc);
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
          ...(switchedDesign ? { design: switchedDesign } : {}),
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
    // Short links cache the slug they point at.
    if (input.slug && input.slug !== event.slug) await this.links.forgetCodes(await this.links.codesOfEvent(eventId));
    return this.getDto(user, eventId);
  }

  async saveDesign(user: AuthUser, eventId: string, design: DesignDoc | null): Promise<{ updatedAt: string }> {
    await this.getOwned(user, eventId);
    const [row] = await this.db.update(events).set({ design, updatedAt: new Date() }).where(eq(events.id, eventId)).returning({ updatedAt: events.updatedAt });
    return { updatedAt: row!.updatedAt.toISOString() };
  }

  async setStatus(user: AuthUser, eventId: string, status: 'published' | 'archived' | 'draft'): Promise<EventDto> {
    const owned = await this.getOwned(user, eventId, status === 'archived' ? 'owner' : 'edit');
    if (status === 'published' && owned.suspendedAt) {
      throw new ForbiddenException('This invitation was taken down by our team. Write to support if you think this is a mistake.');
    }
    await this.db
      .update(events)
      .set({ status, publishedAt: status === 'published' ? new Date() : undefined })
      .where(eq(events.id, eventId));
    return this.getDto(user, eventId);
  }

  async duplicate(user: AuthUser, eventId: string): Promise<EventDto> {
    const source = await this.getOwned(user, eventId);
    const dto = await this.toDto(source, await this.functionsOf(eventId));
    const copy = await this.create(user, {
      type: dto.type,
      language: dto.language,
      secondaryLanguage: dto.secondaryLanguage ?? undefined,
      community: dto.community ?? undefined,
      templateId: dto.templateId,
      title: `${dto.title} (copy)`,
      content: dto.content,
      functions: dto.functions.map(({ id: _id, sortOrder: _s, ...f }) => f),
      settings: { ...dto.settings, aiClipAssetId: undefined },
      design: dto.design ?? undefined,
    });
    // Keep the website design too. Function ids are new, so per-function links (venue, dress
    // code) fall back to defaults, and guest-group targeting is kept as is.
    if (source.site) {
      const fnIds = new Set(copy.functions.map((f) => f.id));
      const site = structuredClone(source.site);
      for (const sec of site.sections) {
        if (sec.type === 'venue' && sec.functionId && !fnIds.has(sec.functionId)) sec.functionId = undefined;
        if (sec.type === 'dresscode') for (const d of sec.items) if (d.functionId && !fnIds.has(d.functionId)) d.functionId = undefined;
      }
      await this.db.update(events).set({ site }).where(eq(events.id, copy.id));
    }
    return copy;
  }

  async toDto(event: EventRow, fns: FunctionRow[], access: Access = 'owner'): Promise<EventDto> {
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
      design: event.design ?? null,
      functions: fns.map(fromFunctionRow),
      features: [...ent.features],
      credits: ent.credits as Record<string, number>,
      viewCount: event.viewCount,
      access,
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
