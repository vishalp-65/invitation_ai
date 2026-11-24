import type { BlogPost } from '../types';

export const post: BlogPost = {
  slug: 'birthday-invitation-card-and-video',
  title: 'Birthday Invitation Card & Video: Make One Free',
  h1: 'How to make a birthday invitation card and video, free',
  description:
    'Make a birthday invitation card or video for WhatsApp: first birthday, kids’ theme parties, 50th and 60th birthdays. What to write, design ideas and a free way to make one.',
  excerpt:
    'A birthday invitation needs four things — whose birthday, which one, when and where — and a design that matches the party. Here is how to make a birthday card and a short video invite for WhatsApp in a few minutes, free.',
  published: '2026-11-24',
  updated: '2026-11-24',
  category: 'Guides',
  occasions: ['birthday'],
  keywords: ['birthday invitation card', 'birthday invitation card maker', 'birthday invitation video', 'first birthday invitation card', 'birthday card invitation free', 'birthday invitation video maker free'],
  readMinutes: 5,
  body: [
    {
      t: 'p',
      text: 'Quick answer: pick a birthday design, enter the name and age, the date, time and venue, add a photo, and download the card or video. With Noyta this is free and takes about two minutes; send the card or video on WhatsApp with a short message.',
    },
    { t: 'h2', id: 'include', text: 'What to put on a birthday invitation' },
    {
      t: 'ul',
      items: [
        'Whose birthday it is, and which one (1st, 18th, 50th…).',
        'Day, date, start time — and an end time for kids’ parties.',
        'Venue with a map link or QR code.',
        'Theme or dress code, if there is one.',
        'RSVP contact and a date to reply by.',
      ],
    },
    { t: 'h2', id: 'by-age', text: 'Ideas by age' },
    {
      t: 'table',
      head: ['Birthday', 'Design idea', 'Tip'],
      rows: [
        ['1st birthday', 'Baby photo, pastel balloons, moon and stars', 'Invite from the baby: “Join me as I turn one”'],
        ['Kids (2–12)', 'Drawn themes: space, jungle, dinosaurs, princess', 'Add an end time and a parent contact'],
        ['18th / 21st', 'Bold type, neon or black and gold', 'A video invite works well for friends'],
        ['50th / 60th', 'Elegant gold, family photo', 'Hosted by the children; add a blessing line'],
        ['75th / Amrit Mahotsav', 'Traditional, floral, family photo', 'Print a few cards for elders'],
      ],
    },
    { t: 'cta', text: 'Birthday cards and videos, free to make.', href: '/birthday-invitation', label: 'Birthday invitations' },
    { t: 'h2', id: 'video', text: 'Making a birthday invitation video' },
    {
      t: 'p',
      text: 'A 20–40 second video with the child’s photos and cheerful music is the most-forwarded birthday invite. Noyta makes a 9:16 video under 16 MB, so it plays sharply on WhatsApp and Status. A free account can make one video with two remakes.',
    },
    { t: 'cta', text: 'Turn the card into a video with music.', href: '/video-invitation-maker', label: 'Video invitation maker' },
    { t: 'h2', id: 'wording', text: 'Wording' },
    { t: 'p', text: 'Need the words? Our birthday invitation message guide has 20 samples in English and Hindi, from a first birthday to a 60th.' },
    { t: 'cta', text: '20 ready-to-copy birthday messages.', href: '/blog/birthday-invitation-message', label: 'Birthday invitation messages' },
  ],
  faq: [
    ['Can I make a birthday invitation card for free?', 'Yes. Noyta lets you make birthday invitation cards free with a small watermark, plus one free video invitation.'],
    ['How do I make a birthday invitation video?', 'Pick a birthday design, add photos and details, choose music, and download the MP4. Send it on WhatsApp.'],
    ['When should I send birthday invitations?', 'Two to three weeks before the party, with a reminder two days before.'],
  ],
};
