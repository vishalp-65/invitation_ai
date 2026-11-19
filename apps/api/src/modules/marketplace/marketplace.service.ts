import { and, desc, designerEarnings, designerProfiles, eq, marketplaceTemplates, users, type Database } from '@cardai/db';
import { DEFAULT_DESIGNER_REVENUE_SHARE_PCT, type MarketplaceTemplateInput } from '@cardai/shared';
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import type { AuthUser } from '../../common/auth.decorators.js';
import { DB } from '../../infra/infra.module.js';
import { MailService } from '../mail/mail.service.js';
import { TemplatesService } from '../templates/templates.service.js';

const key = customAlphabet('abcdefghijkmnpqrstuvwxyz23456789', 8);

/** Independent designers publish themes; they earn a revenue share when an event using one is paid. */
@Injectable()
export class MarketplaceService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly templates: TemplatesService,
    private readonly mail: MailService,
  ) {}

  async apply(user: AuthUser, input: { displayName: string; bio?: string; portfolioUrl?: string; payoutUpi: string }) {
    const [row] = await this.db
      .insert(designerProfiles)
      .values({ userId: user.id, ...input, revenueSharePct: DEFAULT_DESIGNER_REVENUE_SHARE_PCT })
      .onConflictDoUpdate({ target: designerProfiles.userId, set: { ...input } })
      .returning();
    return row;
  }

  async profile(user: AuthUser) {
    const [row] = await this.db.select().from(designerProfiles).where(eq(designerProfiles.userId, user.id));
    return row ?? null;
  }

  private async requireApprovedDesigner(user: AuthUser) {
    const profile = await this.profile(user);
    if (profile?.status !== 'approved' && user.role !== 'admin') {
      throw new ForbiddenException('Your designer profile is awaiting approval');
    }
  }

  myTemplates(user: AuthUser) {
    return this.db.select().from(marketplaceTemplates).where(eq(marketplaceTemplates.designerId, user.id)).orderBy(desc(marketplaceTemplates.updatedAt));
  }

  async createTemplate(user: AuthUser, input: MarketplaceTemplateInput) {
    await this.requireApprovedDesigner(user);
    const [row] = await this.db
      .insert(marketplaceTemplates)
      .values({ designerId: user.id, templateKey: `mkt-${key()}`, ...input })
      .returning();
    return row;
  }

  private async ownedTemplate(user: AuthUser, id: string) {
    const [row] = await this.db.select().from(marketplaceTemplates).where(eq(marketplaceTemplates.id, id));
    if (!row || (row.designerId !== user.id && user.role !== 'admin')) throw new NotFoundException('Template not found');
    return row;
  }

  async updateTemplate(user: AuthUser, id: string, input: Partial<MarketplaceTemplateInput>) {
    const tpl = await this.ownedTemplate(user, id);
    if (tpl.status === 'approved') throw new BadRequestException('Approved templates are locked; create a new version instead');
    const [row] = await this.db.update(marketplaceTemplates).set({ ...input, status: 'draft' }).where(eq(marketplaceTemplates.id, id)).returning();
    return row;
  }

  async submit(user: AuthUser, id: string) {
    await this.ownedTemplate(user, id);
    const [row] = await this.db.update(marketplaceTemplates).set({ status: 'submitted' }).where(eq(marketplaceTemplates.id, id)).returning();
    return row;
  }

  async earnings(user: AuthUser) {
    const rows = await this.db.select().from(designerEarnings).where(eq(designerEarnings.designerId, user.id)).orderBy(desc(designerEarnings.createdAt));
    const pendingPaise = rows.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amountPaise, 0);
    const paidPaise = rows.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amountPaise, 0);
    return { items: rows, pendingPaise, paidPaise };
  }

  // ---------- Admin ----------

  reviewQueue() {
    return this.db
      .select({ t: marketplaceTemplates, designer: users.name })
      .from(marketplaceTemplates)
      .innerJoin(users, eq(users.id, marketplaceTemplates.designerId))
      .where(eq(marketplaceTemplates.status, 'submitted'))
      .orderBy(marketplaceTemplates.updatedAt);
  }

  async review(id: string, decision: 'approved' | 'rejected', note?: string) {
    const [row] = await this.db
      .update(marketplaceTemplates)
      .set({ status: decision, reviewNote: note })
      .where(and(eq(marketplaceTemplates.id, id), eq(marketplaceTemplates.status, 'submitted')))
      .returning();
    if (!row) throw new NotFoundException('Template not in review');
    this.templates.invalidate();
    void this.mail.toUser(row.designerId, 'marketplace.template_reviewed', (u) => ({ name: u.name, templateName: row.name, approved: decision === 'approved', note: note ?? null }), { key: `${row.id}-${row.updatedAt.getTime()}` });
    return row;
  }

  designerQueue() {
    return this.db.select().from(designerProfiles).where(eq(designerProfiles.status, 'pending'));
  }

  async reviewDesigner(userId: string, decision: 'approved' | 'rejected') {
    const [row] = await this.db
      .update(designerProfiles)
      .set({ status: decision })
      .where(eq(designerProfiles.userId, userId))
      .returning();
    if (!row) throw new NotFoundException('Designer not found');
    void this.mail.toUser(userId, 'marketplace.designer_reviewed', (u) => ({ name: row.displayName || u.name, approved: decision === 'approved' }), { key: `${userId}-${decision}` });
    if (decision === 'approved') await this.db.update(users).set({ role: 'designer' }).where(and(eq(users.id, userId), eq(users.role, 'user')));
    return row;
  }
}
