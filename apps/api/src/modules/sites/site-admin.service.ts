import { and, desc, eq, events, inArray, mediaAssets, siteUpdates, siteWishes, sql, type Database } from '@cardai/db';
import {
  siteCharacterFor,
  newSection,
  siteDocSchema,
  type SiteDoc,
  type SiteDraftInput,
  type SiteSettingsDto,
  type SiteUpdateInput,
} from '@cardai/shared';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../common/auth.decorators.js';
import { hashPassword } from '../../common/crypto.js';
import { DB } from '../../infra/infra.module.js';
import { AiService } from '../ai/ai.service.js';
import { EntitlementsService } from '../entitlements/entitlements.service.js';
import { EventsService } from '../events/events.service.js';
import { MediaService } from '../media/media.service.js';
import { ShortLinksService } from '../short-links/short-links.service.js';
import { sectionAssetIds, SitesService } from './sites.service.js';

/** Owner side of the invitation website: builder document, AI draft, links, access, live updates. */
@Injectable()
export class SiteAdminService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly events: EventsService,
    private readonly sites: SitesService,
    private readonly entitlements: EntitlementsService,
    private readonly links: ShortLinksService,
    private readonly ai: AiService,
    private readonly media: MediaService,
  ) {}

  async settings(user: AuthUser, eventId: string): Promise<SiteSettingsDto> {
    const event = await this.events.getOwned(user, eventId, 'view');
    const [plan, fns, alias] = await Promise.all([this.sites.planOf(event.id), this.events.functionsOf(event.id), this.links.aliasOf(event.id)]);
    const code = await this.links.eventCode(event.id, event.shortCode);
    return {
      site: this.sites.docOf(event),
      isDefault: !event.site,
      tier: plan.tier,
      shortUrl: this.links.url(code),
      vanityAlias: alias,
      vanityUrl: alias ? this.links.url(alias) : null,
      hasPassword: Boolean(event.sitePasswordHash),
      expiresAt: this.sites.expiry(fns, plan.tier, plan.extraYears)?.toISOString() ?? null,
      updatedAt: event.site ? event.updatedAt.toISOString() : null,
      visitors: event.visitorCount,
    };
  }

  /** Builder autosave. Everything can be saved; the public page applies the plan. */
  async save(user: AuthUser, eventId: string, doc: SiteDoc): Promise<{ updatedAt: string }> {
    const owned = await this.events.getOwned(user, eventId, 'edit');
    await this.sites.forgetSite(owned.slug);
    const ids = [...new Set(sectionAssetIds(doc))];
    if (ids.length) {
      const owned = await this.db
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(and(inArray(mediaAssets.id, ids), eq(mediaAssets.userId, user.id)));
      if (owned.length !== ids.length) throw new BadRequestException('One of the photos could not be found. Upload it again.');
    }
    const [row] = await this.db.update(events).set({ site: doc, updatedAt: new Date() }).where(eq(events.id, eventId)).returning({ updatedAt: events.updatedAt });
    return { updatedAt: row!.updatedAt.toISOString() };
  }

  /** Owner preview payload (not published yet, all sections, no access checks). */
  async preview(user: AuthUser, eventId: string) {
    const event = await this.events.getOwned(user, eventId, 'view');
    const dto = await this.sites.build(event, { guest: null, owner: true });
    // The builder may use any of the host's photos for this event, not only the ones already
    // used. Guest album uploads are left out of the picker.
    const own = await this.db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.eventId, eventId), eq(mediaAssets.ready, true), eq(mediaAssets.kind, 'photo'), sql`coalesce(${mediaAssets.meta}->>'source', '') <> 'guest_album'`))
      .orderBy(desc(mediaAssets.createdAt))
      .limit(200);
    for (const a of own) dto.media.assets[a.id] ??= this.media.toDto(a).url;
    return dto;
  }

  /**
   * AI writes the words and picks an opening + character; we pour them into the current (or
   * default) document without touching the host's layout choices.
   */
  async draft(user: AuthUser, eventId: string, input: SiteDraftInput): Promise<SiteDoc> {
    const event = await this.events.getOwned(user, eventId, 'edit');
    const out = await this.ai.draftSite(user, eventId, input);
    const doc = structuredClone(this.sites.docOf(event));
    const ensure = <T extends SiteDoc['sections'][number]['type']>(type: T) => {
      let s = doc.sections.find((x) => x.type === type);
      if (!s) {
        s = newSection(type, doc.sections.map((x) => x.id));
        doc.sections.splice(Math.max(1, doc.sections.length - 1), 0, s);
      }
      return s as Extract<SiteDoc['sections'][number], { type: T }>;
    };

    if (out.welcome) ensure('welcome').body = out.welcome.slice(0, 1200);
    if (out.people.length && doc.sections.some((s) => s.type === 'couple')) {
      const couple = ensure('couple');
      couple.people = out.people.slice(0, 4).map((p, i) => ({
        name: p.name.slice(0, 60),
        role: p.role.slice(0, 60),
        bio: p.bio.slice(0, 400),
        photoAssetId: couple.people[i]?.photoAssetId,
      }));
    }
    if (out.story.length) {
      const story = ensure('story');
      story.chapters = out.story.slice(0, 8).map((c, i) => ({
        title: c.title.slice(0, 80),
        date: c.date.slice(0, 40),
        text: c.text.slice(0, 500),
        photoAssetId: story.chapters[i]?.photoAssetId,
      }));
    }
    if (out.faq.length) ensure('faq').items = out.faq.slice(0, 10).map((f) => ({ q: f.q.slice(0, 160), a: f.a.slice(0, 600) }));
    if (out.dressCode.length && doc.sections.some((s) => s.type === 'dresscode')) {
      const hex = /^#[0-9a-fA-F]{6}$/;
      ensure('dresscode').items = out.dressCode.slice(0, 8).map((d) => ({
        label: d.label.slice(0, 60),
        note: d.note.slice(0, 160),
        colors: d.colors.filter((c) => hex.test(c)).slice(0, 5),
      }));
    }
    // Built-in headings exist in English and Hindi only; other languages get the AI's headings
    // (only where the host hasn't typed their own).
    if (!['en', 'hi', 'mr'].includes(event.language)) {
      for (const h of out.headings) {
        const title = h.title.trim().slice(0, 80);
        if (!title || h.type === 'hero' || h.type === 'closing') continue; // these show no heading
        for (const s of doc.sections) if (s.type === h.type && !s.title) s.title = title;
      }
    }
    doc.opening = { ...doc.opening, kind: out.opening };
    doc.character = { ...doc.character, kind: siteCharacterFor(out.character, event.type, event.community, 'ai') };
    // Re-validate: the model's strings went through length caps, enums are schema-checked.
    return siteDocSchema.parse(doc);
  }

  async setPassword(user: AuthUser, eventId: string, password: string | null) {
    await this.events.getOwned(user, eventId, 'edit');
    if (password) await this.entitlements.require(eventId, 'website_royale', 'Password-protected websites are part of Site Royale');
    await this.db
      .update(events)
      .set({ sitePasswordHash: password ? await hashPassword(password) : null })
      .where(eq(events.id, eventId));
    return { hasPassword: Boolean(password) };
  }

  /** Custom links are Site Premium (or any admin). Admin-owned events pass inside `require`. */
  private async requireCustomLink(user: AuthUser, eventId: string) {
    if (user.role === 'admin' && !user.imp) return;
    await this.entitlements.require(eventId, 'website_premium', 'Your own link name is part of Site Premium');
  }

  /** Live availability while the host types (no plan needed to look). */
  async checkAlias(user: AuthUser, eventId: string, alias: string) {
    await this.events.getOwned(user, eventId, 'view');
    return this.links.checkAlias(eventId, alias);
  }

  async setAlias(user: AuthUser, eventId: string, alias: string) {
    await this.events.getOwned(user, eventId, 'edit');
    await this.requireCustomLink(user, eventId);
    const previous = await this.links.aliasOf(eventId);
    const saved = await this.links.setAlias(eventId, alias);
    if (previous && previous !== saved) await this.links.forgetCodes([previous]);
    return { vanityAlias: saved, vanityUrl: this.links.url(saved) };
  }

  async removeAlias(user: AuthUser, eventId: string) {
    await this.events.getOwned(user, eventId, 'edit');
    const previous = await this.links.aliasOf(eventId);
    await this.links.removeAlias(eventId);
    if (previous) await this.links.forgetCodes([previous]);
  }

  // ---------------- live updates ----------------

  async listUpdates(user: AuthUser, eventId: string) {
    await this.events.getOwned(user, eventId, 'view');
    return { items: await this.sites.listUpdates(eventId) };
  }

  async addUpdate(user: AuthUser, eventId: string, input: SiteUpdateInput) {
    const owned = await this.events.getOwned(user, eventId, 'guests');
    await this.sites.forgetSite(owned.slug);
    await this.entitlements.require(eventId, 'website_royale', 'Live updates are part of Site Royale');
    if (input.pinned) await this.db.update(siteUpdates).set({ pinned: false }).where(eq(siteUpdates.eventId, eventId));
    const [row] = await this.db.insert(siteUpdates).values({ eventId, text: input.text, pinned: input.pinned }).returning();
    return { id: row!.id, text: row!.text, pinned: row!.pinned, createdAt: row!.createdAt.toISOString() };
  }

  async removeUpdate(user: AuthUser, eventId: string, updateId: string) {
    const owned = await this.events.getOwned(user, eventId, 'guests');
    await this.sites.forgetSite(owned.slug);
    await this.db.delete(siteUpdates).where(and(eq(siteUpdates.id, updateId), eq(siteUpdates.eventId, eventId)));
  }

  // ---------------- wishes & album moderation ----------------

  async listWishes(user: AuthUser, eventId: string) {
    await this.events.getOwned(user, eventId, 'view');
    return { items: await this.sites.listWishes(eventId, true) };
  }

  async setWishHidden(user: AuthUser, eventId: string, wishId: string, hidden: boolean) {
    const owned = await this.events.getOwned(user, eventId, 'guests');
    await this.sites.forgetSite(owned.slug);
    const [row] = await this.db
      .update(siteWishes)
      .set({ hidden })
      .where(and(eq(siteWishes.id, wishId), eq(siteWishes.eventId, eventId)))
      .returning({ id: siteWishes.id });
    if (!row) throw new NotFoundException('Wish not found');
    return { ok: true };
  }

  /** Removes a guest's album photo (host moderation). */
  async removeAlbumPhoto(user: AuthUser, eventId: string, assetId: string) {
    await this.events.getOwned(user, eventId, 'guests');
    const [asset] = await this.db.select().from(mediaAssets).where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.eventId, eventId)));
    if (!asset || asset.meta.source !== 'guest_album') throw new NotFoundException('Photo not found');
    await this.media.remove(user, assetId);
  }

  /** Shows guest photos on the photo wall (one, or every one still waiting). */
  async approveAlbum(user: AuthUser, eventId: string, assetIds: string[] | 'all') {
    const owned = await this.events.getOwned(user, eventId, 'guests');
    await this.db
      .update(mediaAssets)
      .set({ meta: sql`${mediaAssets.meta} || '{"approved": true}'::jsonb` })
      .where(
        and(
          eq(mediaAssets.eventId, eventId),
          sql`${mediaAssets.meta}->>'source' = 'guest_album'`,
          assetIds === 'all' ? undefined : inArray(mediaAssets.id, assetIds),
        ),
      );
    await this.sites.forgetSite(owned.slug);
    return { ok: true };
  }

  async album(user: AuthUser, eventId: string) {
    await this.events.getOwned(user, eventId, 'view');
    return { items: await this.sites.albumOf(eventId) };
  }
}
