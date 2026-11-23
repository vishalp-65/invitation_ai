import { getEventType } from '../constants/event-types.js';
import { characterSuitsFaith, faithOf } from '../constants/faith.js';
import type { SiteCharacter, SiteSection, SiteSectionType } from './schema.js';

/*
 * Section labels and the page character: plain lookups used by the public invite page, kept
 * apart from defaults.ts (which parses with zod) so guests do not download zod.
 */

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
  familytree: { label: 'Family tree', hi: 'परिवार', help: 'Both families’ elders and close family, with photos.' },
  travel: { label: 'Travel & stay', hi: 'ठहरने की व्यवस्था', help: 'Hotels, pickup and each guest’s own room details.' },
  rsvp: { label: 'RSVP', hi: 'उपस्थिति', help: 'Guests reply per function.' },
  gifts: { label: 'Shagun & gifts', hi: 'शगुन', help: 'Your UPI id / QR or a gift registry link.' },
  livestream: { label: 'Live stream', hi: 'सीधा प्रसारण', help: 'For guests who can’t travel.' },
  updates: { label: 'Live updates', hi: 'ताज़ा जानकारी', help: 'Post “Baraat is leaving now” — guests see it instantly.' },
  faq: { label: 'Questions', hi: 'सवाल-जवाब', help: 'Parking, timings, kids, weather…' },
  wishes: { label: 'Wishes', hi: 'शुभकामनाएँ', help: 'Guests leave blessings on the page.' },
  album: { label: 'Photo wall', hi: 'मेहमानों की तस्वीरें', help: 'Guests share photos from the venue (scan the QR); you approve each one before it shows.' },
  custom: { label: 'Text & photo', hi: 'विशेष', help: 'Anything else you want to say.' },
  countdown: { label: 'Countdown', hi: 'उलटी गिनती', help: 'Live days / hours / minutes to the first function.' },
  things: { label: 'Things to know', hi: 'ज़रूरी बातें', help: 'Hashtag, weather, parking, stay, Instagram and more.' },
  closing: { label: 'Closing', hi: 'आभार', help: 'Closing line and signature.' },
};

export function sectionHeading(section: Pick<SiteSection, 'type' | 'title'>, language: string): string {
  if (section.title) return section.title;
  const info = SECTION_INFO[section.type];
  return language === 'hi' || language === 'mr' ? info.hi : info.label;
}

/**
 * The character an "auto" site shows. Sacred ones (Ganesha, kalash) only for faiths they belong
 * to: a Muslim family's shop opening gets a peacock, not a kalash.
 */
export function autoCharacter(eventType: string, community?: string | null): Exclude<SiteCharacter, 'auto'> {
  const kind = baseCharacter(eventType);
  return characterSuitsFaith(kind, faithOf(eventType, community)) ? kind : 'peacock';
}

/** A host's explicit pick is kept; "auto" and AI picks follow the faith. */
export function siteCharacterFor(kind: SiteCharacter, eventType: string, community?: string | null, picked: 'host' | 'ai' = 'host'): Exclude<SiteCharacter, 'auto'> {
  if (kind === 'auto') return autoCharacter(eventType, community);
  if (picked === 'ai' && !characterSuitsFaith(kind, faithOf(eventType, community))) return autoCharacter(eventType, community);
  return kind;
}

function baseCharacter(eventType: string): Exclude<SiteCharacter, 'auto'> {
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
