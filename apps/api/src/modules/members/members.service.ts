import { and, asc, eq, eventMembers, users, type Database } from '@cardai/db';
import { MEMBER_ROLE_LABELS, type EventMemberDto, type InviteMemberInput, type MemberRole } from '@cardai/shared';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../common/auth.decorators.js';
import { isUniqueViolation } from '../../common/db.js';
import { DB } from '../../infra/infra.module.js';
import { EventsService } from '../events/events.service.js';
import { MailService } from '../mail/mail.service.js';

const MAX_MEMBERS = 10;

/** Co-hosts: family members who help run one invitation (owner-managed). */
@Injectable()
export class MembersService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly events: EventsService,
    private readonly mail: MailService,
  ) {}

  async list(user: AuthUser, eventId: string): Promise<{ items: EventMemberDto[] }> {
    await this.events.getOwned(user, eventId, 'view');
    const rows = await this.db
      .select({ m: eventMembers, name: users.name })
      .from(eventMembers)
      .leftJoin(users, eq(users.id, eventMembers.userId))
      .where(eq(eventMembers.eventId, eventId))
      .orderBy(asc(eventMembers.createdAt));
    return { items: rows.map(({ m, name }) => this.toDto(m, name)) };
  }

  async invite(user: AuthUser, eventId: string, input: InviteMemberInput): Promise<EventMemberDto> {
    const event = await this.events.getOwned(user, eventId, 'owner');
    const email = input.email.trim().toLowerCase();
    const [me] = await this.db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, user.id));
    if (me?.email?.toLowerCase() === email) throw new BadRequestException('That is your own email. Co-hosts are other family members.');
    const existing = await this.db.select({ id: eventMembers.id }).from(eventMembers).where(eq(eventMembers.eventId, eventId));
    if (existing.length >= MAX_MEMBERS) throw new BadRequestException(`An invitation can have up to ${MAX_MEMBERS} co-hosts.`);

    // Someone who already has a verified account with this email joins right away.
    const [account] = await this.db.select({ id: users.id, name: users.name, verified: users.emailVerifiedAt }).from(users).where(eq(users.email, email));
    const joined = account?.verified ? account : undefined;
    const [row] = await this.db
      .insert(eventMembers)
      .values({ eventId, email, role: input.role, invitedBy: user.id, userId: joined?.id ?? null, acceptedAt: joined ? new Date() : null })
      .returning()
      .catch((err: unknown) => {
        throw isUniqueViolation(err) ? new BadRequestException('This person is already a co-host.') : err;
      });
    await this.mail.send(
      'event.cohost',
      email,
      { inviterName: me?.name ?? null, eventTitle: event.title, role: MEMBER_ROLE_LABELS[input.role], eventId },
      { key: `${eventId}-${email}` },
    );
    return this.toDto(row!, joined?.name ?? null);
  }

  async setRole(user: AuthUser, eventId: string, memberId: string, role: MemberRole): Promise<EventMemberDto> {
    await this.events.getOwned(user, eventId, 'owner');
    const [row] = await this.db
      .update(eventMembers)
      .set({ role })
      .where(and(eq(eventMembers.id, memberId), eq(eventMembers.eventId, eventId)))
      .returning();
    if (!row) throw new NotFoundException('Co-host not found');
    return this.toDto(row, null);
  }

  /** The owner removes a co-host, or a co-host leaves. */
  async remove(user: AuthUser, eventId: string, memberId: string): Promise<void> {
    const [row] = await this.db.select().from(eventMembers).where(and(eq(eventMembers.id, memberId), eq(eventMembers.eventId, eventId)));
    if (!row) throw new NotFoundException('Co-host not found');
    if (row.userId !== user.id) await this.events.getOwned(user, eventId, 'owner');
    await this.db.delete(eventMembers).where(eq(eventMembers.id, memberId));
  }

  private toDto(m: typeof eventMembers.$inferSelect, name: string | null): EventMemberDto {
    return {
      id: m.id,
      email: m.email,
      name,
      role: m.role as MemberRole,
      accepted: Boolean(m.acceptedAt),
      createdAt: m.createdAt.toISOString(),
    };
  }
}
