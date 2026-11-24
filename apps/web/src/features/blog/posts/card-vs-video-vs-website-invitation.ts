import type { BlogPost } from '../types';

export const post: BlogPost = {
  slug: 'card-vs-video-vs-website-invitation',
  title: 'Invitation Card vs Video vs Website: Which to Send?',
  h1: 'Invitation card, video or website: which one should you send?',
  description:
    'Image card, video invitation or RSVP website? Compare what each is best for, cost, and how Indian families combine all three for weddings, birthdays and griha pravesh.',
  excerpt:
    'The short answer: send the image card to everyone, add a video for big occasions like weddings and engagements, and use a website when you have several functions, outstation guests or need RSVPs. Here is how to choose, occasion by occasion.',
  published: '2026-11-24',
  updated: '2026-11-24',
  category: 'Planning',
  occasions: ['wedding', 'engagement', 'birthday', 'griha-pravesh', 'reception', 'anniversary'],
  keywords: ['invitation card vs video invitation', 'e invite or video invite', 'wedding website vs invitation card', 'best way to send invitation on whatsapp', 'digital invitation types'],
  readMinutes: 5,
  body: [
    {
      t: 'p',
      text: 'Quick answer: an image card is the universal format — it opens instantly on every phone and can be printed. A video invitation gets watched and feels special, so it suits weddings, engagements and milestone birthdays. An invitation website is the only format that can hold a full schedule, maps and RSVPs, so it suits multi-function events and outstation guests.',
    },
    { t: 'h2', id: 'compare', text: 'Side-by-side comparison' },
    {
      t: 'table',
      head: ['', 'Image card', 'Video invite', 'Website'],
      rows: [
        ['Best for', 'Every occasion, elders, printing', 'Weddings, engagements, big birthdays', 'Multi-day events, outstation guests'],
        ['Opens', 'Instantly in WhatsApp', 'Autoplays in the chat', 'One tap on a link'],
        ['Holds', 'Names, date, venue, QR', 'Every function, photos, music', 'Schedule, maps, RSVP, gallery, travel'],
        ['Can update later', 'No (send a new one)', 'No (send a new one)', 'Yes, same link'],
        ['Collects RSVPs', 'No', 'No', 'Yes, per function'],
        ['Printable', 'Yes (5×7 inch PDF)', 'No', 'No'],
      ],
    },
    { t: 'h2', id: 'card', text: 'When an image card is enough' },
    {
      t: 'p',
      text: 'For a puja, a naamkaran, a small birthday or a housewarming with one function at one venue, a well-designed image card says everything. Add a QR code that opens the map and you are done.',
    },
    { t: 'cta', text: 'Make an HD card and a print-ready PDF from the same design.', href: '/invitation-card-maker', label: 'Invitation card maker' },
    { t: 'h2', id: 'video', text: 'When to add a video' },
    {
      t: 'p',
      text: 'A video invitation stands out in a busy family group. It is also the best way to show several functions in sequence, with the couple’s photos and music. Keep it 30–60 seconds and under 16 MB so WhatsApp does not blur it.',
    },
    { t: 'cta', text: 'A 9:16 video with music, sized for WhatsApp.', href: '/video-invitation-maker', label: 'Video invitation maker' },
    { t: 'h2', id: 'website', text: 'When you need a website' },
    {
      t: 'ul',
      items: [
        'Three or more functions, or more than one venue.',
        'Guests travelling from other cities who need stay and travel details.',
        'You want a headcount per function for catering.',
        'Plans might change and you want one link that always shows the latest.',
      ],
    },
    { t: 'cta', text: 'RSVP per function, venue maps and personal guest links.', href: '/invitation-website-maker', label: 'Invitation website maker' },
    { t: 'h2', id: 'combine', text: 'The combination most families use' },
    {
      t: 'ol',
      items: [
        'Send the video to announce the occasion.',
        'Follow with the image card so the details are easy to find later in the chat.',
        'Send the website link for directions and RSVP, a few weeks before the event.',
        'Print a small batch of cards for elders you invite in person.',
      ],
    },
    { t: 'tip', text: 'Make all three from one form so names, dates and timings are identical everywhere — a mismatch between the card and the video is the most common invitation mistake.' },
  ],
  faq: [
    ['Is a video invitation better than a card?', 'Neither is better for everything. Video gets more attention; a card is quicker to read, works for everyone and can be printed. For weddings, send both.'],
    ['Do I need a website for a small function?', 'No. A single-venue puja or birthday is fine with a card. A website helps once you have several functions or need RSVPs.'],
    ['Can I make all three for free?', 'Yes. On Noyta a free account can make image cards, one video and a website, each with a small Noyta mark.'],
  ],
};
