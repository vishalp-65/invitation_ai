import type { BlogPost } from '../types';

export const post: BlogPost = {
  slug: 'wedding-website-guide',
  title: 'Wedding Website for an Indian Wedding: Complete Guide',
  h1: 'Wedding website for an Indian wedding: what to include and how to make one',
  description:
    'What an Indian wedding website should include — schedule of every function, venue maps, dress codes, RSVP, travel and stay — and how to make one free in minutes.',
  excerpt:
    'A wedding website puts every function, venue, dress code and RSVP on one link you can send on WhatsApp and update any time. This guide lists the sections guests actually use, what to leave out, and how to make one in a few minutes.',
  published: '2026-11-24',
  updated: '2026-11-24',
  category: 'Guides',
  occasions: ['wedding', 'reception', 'engagement', 'anand-karaj', 'christian-wedding', 'nikah'],
  keywords: ['wedding website', 'wedding website india', 'indian wedding website', 'wedding website maker free', 'wedding invitation website', 'what to put on wedding website'],
  readMinutes: 6,
  body: [
    {
      t: 'p',
      text: 'Quick answer: an Indian wedding website should have the couple and families, a schedule with every function’s date, time and venue map, dress codes, an RSVP per function, and travel and stay details for outstation guests. Send it as one short link on WhatsApp alongside the card or video.',
    },
    { t: 'h2', id: 'sections', text: 'Sections guests actually use' },
    {
      t: 'ol',
      items: [
        'Welcome: the couple’s names, the date and a countdown.',
        'Schedule: Haldi, Mehendi, Sangeet, Baraat, Pheras, Reception — each with time, venue and a map button.',
        'RSVP: per function, with headcount and food preference.',
        'Dress code: colours or themes per function, if you have them.',
        'Travel and stay: hotel, airport or station pickup, contact person.',
        'Family: who is who on both sides — helpful for new relatives.',
        'Photos and wishes: a gallery and a wall where guests leave blessings.',
      ],
    },
    { t: 'cta', text: 'Every section above is ready to fill in — no design work.', href: '/invitation-website-maker', label: 'Make a wedding website' },
    { t: 'h2', id: 'leave-out', text: 'What to leave out' },
    {
      t: 'ul',
      items: [
        'Long love stories on the first screen — keep them lower down.',
        'Gift registry links, unless your family is comfortable with them.',
        'Exact home addresses for private family functions; share those personally.',
      ],
    },
    { t: 'h2', id: 'privacy', text: 'Keeping it private' },
    {
      t: 'p',
      text: 'A wedding website is for your guests, not for Google. Noyta’s invitation websites are marked noindex so search engines do not list them, and you can send each family a personal link that greets them by name.',
    },
    { t: 'h2', id: 'when', text: 'When to send the link' },
    {
      t: 'p',
      text: 'Send the website link three to four weeks before the wedding, with the card or video. Send a reminder a week before with the RSVP deadline, and on the day itself share the link again so guests can open the map.',
    },
    { t: 'tip', text: 'Send the website link as a separate WhatsApp message so it shows its own preview with the couple’s names.' },
  ],
  faq: [
    ['Is a wedding website free?', 'On Noyta, a free website opens in full for the first 50 guests and keeps showing names, date, venue and map to everyone after that. Upgrade once for unlimited guests.'],
    ['Can guests RSVP on the wedding website?', 'Yes, for each function separately, with headcount and meal preference. You see a live list.'],
    ['Do guests need an app to open it?', 'No. It opens in the phone’s browser from the WhatsApp link.'],
  ],
};
