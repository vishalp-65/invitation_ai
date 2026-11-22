import type { BlogPost } from '../types';

export const post: BlogPost = {
  slug: 'when-to-send-wedding-invitations',
  title: 'When to Send Wedding Invitations in India: Timeline',
  h1: 'When to send wedding invitations in India: a week-by-week timeline',
  description:
    'When to send save the dates, wedding cards and WhatsApp invitations for an Indian wedding, digital vs printed cards, and who should get a personal visit first.',
  excerpt:
    'A practical timeline for Indian wedding invitations: save the dates, the first card to the family deity, personal visits to elders, printed cards, WhatsApp invites and reminders, and when digital or print makes more sense.',
  published: '2026-11-22',
  updated: '2026-11-22',
  category: 'Planning',
  occasions: ['wedding', 'engagement', 'nikah'],
  keywords: ['when to send wedding invitations', 'wedding invitation timeline india', 'digital vs printed wedding invitation', 'e invite for wedding', 'save the date india'],
  readMinutes: 6,
  body: [
    {
      t: 'p',
      text: 'Send too early and guests forget; too late and the outstation family can’t book trains. Indian weddings also have customs that set the order: the first card goes to the deity, elders get a personal visit, and only then does the WhatsApp wave go out. Here is a timeline that works for most families.',
    },
    { t: 'h2', id: 'timeline', text: 'The timeline' },
    {
      t: 'table',
      head: ['When', 'What', 'Who'],
      rows: [
        ['3–4 months before', 'Save the date', 'Outstation and overseas guests, so they can book travel and leave'],
        ['8–10 weeks before', 'First card to the family deity or temple', 'Pratham nimantran: often done on an auspicious day'],
        ['6–8 weeks before', 'Personal visits with the printed card', 'Grandparents, elders, close relatives'],
        ['5–6 weeks before', 'Digital invitation with RSVP link', 'Everyone else: friends, colleagues, extended family'],
        ['3 weeks before', 'RSVP deadline', 'So the caterer and hotel get numbers on time'],
        ['10 days before', 'Gentle follow-up', 'Guests who haven’t replied'],
        ['1–2 days before', 'Reminder with venue map', 'Everyone who said yes'],
      ],
    },
    { t: 'tip', text: 'Peak wedding season dates (November to February) book trains and hotels months ahead. If your date is in season, send the save the date to outstation guests even earlier.' },

    { t: 'h2', id: 'save-the-date', text: 'Save the date: who needs one' },
    {
      t: 'p',
      text: 'A save the date is optional for local guests but very useful for anyone travelling. It only needs the names, the date, the city and “invitation to follow”. A short video or image on WhatsApp works well and can be sent before the venue and function times are final.',
    },

    { t: 'h2', id: 'digital-vs-print', text: 'Digital or printed invitations?' },
    {
      t: 'table',
      head: ['', 'Printed card', 'Digital (card, video, website)'],
      rows: [
        ['Best for', 'Elders, personal visits, keepsakes', 'Everyone on WhatsApp, outstation and overseas guests'],
        ['Time to make', 'Design, proof, print and deliver: weeks', 'Minutes to make; changes are instant'],
        ['Changes after sending', 'Reprint needed', 'Edit once, every guest sees the update'],
        ['RSVP', 'Phone calls', 'Built in, per function'],
        ['Venue directions', 'Printed address', 'Tap-to-open map'],
        ['Cost', 'Grows with every card printed and delivered', 'Same cost for 50 or 500 guests'],
      ],
    },
    {
      t: 'p',
      text: 'Most families now do both: a small run of printed cards for elders and the visits that matter, and a digital set for everyone else. If you do both, use the same design so the invitation feels like one thing, not two.',
    },
    { t: 'cta', text: 'Design once and get a WhatsApp card, a video, an RSVP website and a print-ready 5×7 PDF.', href: '/create?type=wedding', label: 'Make your invitation set' },

    { t: 'h2', id: 'etiquette', text: 'Etiquette that still matters' },
    {
      t: 'ul',
      items: [
        'Elders and close family should hear from you personally, by visit or call, before the WhatsApp invite reaches them.',
        'Don’t send an invitation to a family group as your only invitation. Send individually, then share in the group.',
        'Address the invite to the whole family (“Sharma ji and family”) when that’s who you mean, so there’s no confusion about the headcount.',
        'If a function is limited to close family, invite those guests separately rather than listing it on everyone’s card.',
      ],
    },

    { t: 'h2', id: 'checklist', text: 'Invitation checklist' },
    {
      t: 'ol',
      items: [
        'Finalise the guest list by side (bride, groom) and by group (family, friends, work).',
        'Decide which groups are invited to which functions.',
        'Confirm venues and times, then write the wording.',
        'Print a small batch for personal visits.',
        'Send digital invitations with RSVP links.',
        'Track replies, follow up once and share the final count with the caterer.',
      ],
    },
  ],
  faq: [
    ['How many weeks before the wedding should invitations be sent in India?', 'Send invitations about 5–6 weeks before the wedding, with save the dates 3–4 months ahead for outstation guests. Elders usually receive a personal visit with the card 6–8 weeks before.'],
    ['Is it acceptable to send wedding invitations on WhatsApp?', 'Yes, WhatsApp is now the most common way to invite friends, colleagues and extended family. For grandparents and close elders, many families still visit in person with a printed card first.'],
    ['Are digital wedding invitations cheaper than printed cards?', 'Usually, because a digital invitation costs the same however many guests you send it to, while printing and delivery costs grow with every card.'],
  ],
};
