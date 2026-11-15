import { getEventType } from '../constants/event-types.js';
import type { Attire } from '../templates/types.js';
import { siteDocSchema, type SiteCharacter, type SiteDoc, type SiteSection, type SiteSectionType } from './schema.js';

/** Builder labels + public headings (English / Hindi; other languages fall back to English). */
export const SECTION_INFO: Record<SiteSectionType, { label: string; hi: string; help: string }> = {
  hero: { label: 'Cover', hi: 'आमंत्रण', help: 'Names, blessing, photo, character and countdown.' },
  welcome: { label: 'Welcome note', hi: 'स्वागत', help: 'A warm message to your guests.' },
  couple: { label: 'Meet them', hi: 'परिचय', help: 'Photos and short intros of the main people.' },
  story: { label: 'Our story', hi: 'हमारी कहानी', help: 'Chapters that reveal one by one as guests scroll.' },
  schedule: { label: 'Schedule', hi: 'कार्यक्रम', help: 'All functions with date, time and venue.' },
  dresscode: { label: 'Dress code', hi: 'परिधान', help: 'What to wear for each function, with colour swatches.' },
  venue: { label: 'Venue & directions', hi: 'स्थान', help: 'Map and one-tap directions.' },
  gallery: { label: 'Gallery', hi: 'तस्वीरें', help: 'Your photos in a grid, masonry or carousel.' },
  video: { label: 'Video invite', hi: 'वीडियो', help: 'Your video invite or a YouTube link.' },
  family: { label: 'Family', hi: 'स्वागतोत्सुक', help: 'Family members who welcome the guests.' },
  travel: { label: 'Travel & stay', hi: 'ठहरने की व्यवस्था', help: 'Hotels, pickup and each guest’s own room details.' },
  rsvp: { label: 'RSVP', hi: 'उपस्थिति', help: 'Guests reply per function.' },
  gifts: { label: 'Shagun & gifts', hi: 'शगुन', help: 'Your UPI id / QR or a gift registry link.' },
  livestream: { label: 'Live stream', hi: 'सीधा प्रसारण', help: 'For guests who can’t travel.' },
  updates: { label: 'Live updates', hi: 'ताज़ा जानकारी', help: 'Post “Baraat is leaving now” — guests see it instantly.' },
  faq: { label: 'Questions', hi: 'सवाल-जवाब', help: 'Parking, timings, kids, weather…' },
  wishes: { label: 'Wishes', hi: 'शुभकामनाएँ', help: 'Guests leave blessings on the page.' },
  album: { label: 'Guest album', hi: 'मेहमानों की तस्वीरें', help: 'Guests upload their photos after the event.' },
  custom: { label: 'Text & photo', hi: 'विशेष', help: 'Anything else you want to say.' },
  closing: { label: 'Closing', hi: 'आभार', help: 'Closing line and signature.' },
};

export function sectionHeading(section: Pick<SiteSection, 'type' | 'title'>, language: string): string {
  if (section.title) return section.title;
  const info = SECTION_INFO[section.type];
  return language === 'hi' || language === 'mr' ? info.hi : info.label;
}

const COMMUNITY_ATTIRE: Record<string, Attire> = {
  'hindu-north': 'north',
  'hindu-south': 'south',
  bengali: 'bengali',
  marathi: 'marathi',
  sikh: 'sikh',
  punjabi: 'sikh',
  muslim: 'muslim',
  christian: 'christian',
};

export function autoCharacter(eventType: string): Exclude<SiteCharacter, 'auto'> {
  const t = getEventType(eventType);
  if (t.category === 'wedding') return 'couple';
  switch (t.id) {
    case 'anniversary':
      return 'doves';
    case 'birthday':
      return 'cake';
    case 'baby-shower':
    case 'naming-ceremony':
    case 'annaprashan':
    case 'mundan':
      return 'baby';
    case 'griha-pravesh':
      return 'house';
    case 'shop-opening':
      return 'kalash';
    case 'corporate':
      return 'none';
    case 'retirement':
      return 'peacock';
    case 'upanayana':
      return 'ganesha';
    default:
      return 'diya';
  }
}

type Plan = Array<SiteSectionType | [SiteSectionType, { hidden: true }]>;

function planFor(eventType: string): Plan {
  const t = getEventType(eventType);
  if (t.category === 'wedding') {
    return [
      'hero', 'welcome', 'couple', 'story', 'schedule', 'dresscode', 'venue', 'gallery', 'video', 'family', 'travel', 'rsvp', 'gifts',
      ['livestream', { hidden: true }], ['updates', { hidden: true }], 'faq', 'wishes', ['album', { hidden: true }], 'closing',
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
export function defaultSiteDoc(opts: { eventType: string; community?: string | null; primaryNames?: string[] }): SiteDoc {
  const plan = planFor(opts.eventType);
  const sections = plan.map((p, i) => {
    const [type, extra] = Array.isArray(p) ? p : [p, undefined];
    const motion = type === 'hero' ? 'fade' : MOTION_CYCLE[i % MOTION_CYCLE.length];
    const section: Record<string, unknown> = { id: type, type, motion, ...extra };
    if (type === 'couple') section.people = (opts.primaryNames ?? []).filter(Boolean).map((name) => ({ name, role: '', bio: '' }));
    return section;
  });
  const t = getEventType(opts.eventType);
  return siteDocSchema.parse({
    opening: { kind: t.category === 'business' ? 'none' : t.category === 'wedding' ? 'doors' : 'envelope' },
    character: { kind: 'auto', attire: COMMUNITY_ATTIRE[opts.community ?? ''] ?? 'north', style: 'watercolor' },
    look: { ornament: t.category === 'wedding' ? 'florals' : t.category === 'business' ? 'none' : 'mandala', dark: false },
    sections,
  });
}

/** New section with defaults, given the ids already used. */
export function newSection(type: SiteSectionType, taken: Iterable<string>): SiteSection {
  const used = new Set(taken);
  let id: string = type;
  for (let n = 2; used.has(id); n++) id = `${type}-${n}`;
  return siteDocSchema.shape.sections.element.parse({ id, type });
}
