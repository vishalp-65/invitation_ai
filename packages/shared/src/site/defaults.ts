import { getEventType } from '../constants/event-types.js';
import { attireFor, faithOf } from '../constants/faith.js';
import type { Attire } from '../templates/types.js';
import { defaultDesignFor, getSiteDesign, type SiteDesignId } from './designs.js';
import { siteDocSchema, type SiteDoc, type SiteSection, type SiteSectionType } from './schema.js';

type Plan = Array<SiteSectionType | [SiteSectionType, { hidden: true }]>;

function planFor(eventType: string): Plan {
  const t = getEventType(eventType);
  if (t.category === 'wedding') {
    return [
      'hero', 'welcome', 'countdown', 'couple', 'story', 'schedule', 'venue', 'dresscode', 'gallery', 'video', 'family', 'familytree', 'travel', 'things', 'rsvp', 'gifts',
      ['livestream', { hidden: true }], ['updates', { hidden: true }], 'faq', 'wishes', 'album', 'closing',
    ];
  }
  if (t.category === 'business') {
    return ['hero', 'welcome', 'schedule', 'venue', ['livestream', { hidden: true }], ['updates', { hidden: true }], 'faq', 'rsvp', 'closing'];
  }
  const people: Plan = t.primaryPeople > 0 ? ['couple'] : [];
  if (t.category === 'celebration') {
    return ['hero', 'welcome', ...people, 'schedule', 'dresscode', 'venue', 'gallery', 'rsvp', 'wishes', ['album', { hidden: true }], 'faq', 'closing'];
  }
  // family + religious
  return ['hero', 'welcome', ...people, 'schedule', 'venue', 'gallery', 'video', 'family', 'rsvp', ['gifts', { hidden: true }], 'wishes', 'faq', 'closing'];
}

const MOTION_CYCLE = ['rise', 'fade', 'zoom', 'slide', 'unfold'] as const;

/** A sensible starting page for any occasion; everything stays editable. */
export function defaultSiteDoc(opts: { eventType: string; community?: string | null; primaryNames?: string[]; cardDesign?: string | null }): SiteDoc {
  const plan = planFor(opts.eventType);
  const sections = plan.map((p, i) => {
    const [type, extra] = Array.isArray(p) ? p : [p, undefined];
    const motion = type === 'hero' ? 'fade' : MOTION_CYCLE[i % MOTION_CYCLE.length];
    const section: Record<string, unknown> = { id: type, type, motion, ...extra };
    if (type === 'couple') section.people = (opts.primaryNames ?? []).filter(Boolean).map((name) => ({ name, role: '', bio: '' }));
    return section;
  });
  const t = getEventType(opts.eventType);
  const base = siteDocSchema.parse({
    opening: { kind: t.category === 'business' ? 'none' : t.category === 'wedding' ? 'doors' : 'envelope' },
    character: { kind: 'auto', attire: attireFor(faithOf(opts.eventType, opts.community), opts.community) as Attire, style: 'watercolor' },
    look: { ornament: t.category === 'wedding' ? 'florals' : t.category === 'business' ? 'none' : 'mandala', dark: false },
    sections,
  });
  const withDesign = applyDesign(base, defaultDesignFor(opts.eventType, opts.community, opts.cardDesign));
  // Business events open straight onto the page.
  return t.category === 'business' ? { ...withDesign, opening: { ...withDesign.opening, kind: 'none' } } : withDesign;
}

/**
 * Pages saved with the retired "classic" look (no design) get the event's best design, so every
 * page — old or new — renders as a premium design.
 */
export function ensureDesign(doc: SiteDoc, opts: { eventType: string; community?: string | null; cardDesign?: string | null }): SiteDoc {
  if (getSiteDesign(doc.design)) return doc;
  const next = applyDesign(doc, defaultDesignFor(opts.eventType, opts.community, opts.cardDesign));
  // Keep the host's chosen opening unless it was none.
  return doc.opening.kind === 'none' ? next : { ...next, opening: doc.opening };
}

/** New section with defaults, given the ids already used. */
export function newSection(type: SiteSectionType, taken: Iterable<string>): SiteSection {
  const used = new Set(taken);
  let id: string = type;
  for (let n = 2; used.has(id); n++) id = `${type}-${n}`;
  return siteDocSchema.shape.sections.element.parse({ id, type });
}

/**
 * Switch a page to a design pack. Takes the pack's opening and turns on the scene cover and
 * ribbon schedule; the host's words and section order are kept.
 */
export function applyDesign(doc: SiteDoc, id: SiteDesignId): SiteDoc {
  const d = getSiteDesign(id);
  if (!d) return doc;
  return {
    ...doc,
    design: d.id,
    opening: { ...doc.opening, kind: d.opening },
    // The pack's ambient layer replaces the generic petals; its colours replace overrides.
    motion: { ...doc.motion, petals: false },
    look: { ...doc.look, primary: undefined, accent: undefined, background: undefined, ornament: 'none', dark: false },
    sections: doc.sections.map((s) => (s.type === 'hero' ? { ...s, variant: 'scene' } : s.type === 'schedule' ? { ...s, variant: 'ribbon' } : s)),
  };
}
