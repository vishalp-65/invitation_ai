import { OCCASION_SLUGS, type OccasionWithPage } from '@/features/occasions/routes';
import type { BlogPost } from '../types';

export const post: BlogPost = {
  slug: 'how-to-make-an-invitation-online',
  title: 'How to Make an Invitation Online (Any Occasion)',
  h1: 'How to make an invitation online for any occasion, in 5 steps',
  description:
    'Make a wedding, birthday, griha pravesh, puja or any invitation online: card, WhatsApp video and RSVP website, in Hindi or 11 more languages. Free, step by step',
  excerpt:
    'The short answer: pick the occasion, type the names, date and venue, choose a design, and share the card, video or RSVP link on WhatsApp. This guide walks through each step, what every invitation must say, and which format suits which occasion.',
  published: '2026-11-22',
  updated: '2026-11-22',
  category: 'Guides',
  occasions: Object.keys(OCCASION_SLUGS) as OccasionWithPage[],
  keywords: ['how to make an invitation online', 'invitation maker', 'online invitation card maker', 'e invitation card', 'digital invitation india', 'invitation card maker free'],
  readMinutes: 6,
  body: [
    {
      t: 'p',
      text: 'Quick answer: to make an invitation online, choose your occasion, enter the hosts’ names, the date, time and venue, pick a design, let AI write the wording in your language, and share it as an image card, a video or a website link on WhatsApp. With Noyta this takes about two minutes and is free to make and share.',
    },
    { t: 'h2', id: 'steps', text: 'The 5 steps' },
    {
      t: 'ol',
      items: [
        'Pick the occasion: wedding, engagement, reception, griha pravesh, birthday, puja, naamkaran, mundan, annaprashan, thread ceremony, anniversary, baby shower, jagran, bhandara, retirement, shop opening, a corporate event, or your own.',
        'Add the details: who is inviting, the names, and each function with its date, time and venue. You can type in English or speak the details.',
        'Choose a design: every design works as a card, a video and a website, so all three match.',
        'Check the wording: AI writes it in your chosen language and script. Edit any line, and the blessing at the top follows your family’s tradition.',
        'Share it: download the card or video, or send the short website link on WhatsApp. Guests reply on the link, and you see who is coming.',
      ],
    },
    { t: 'cta', text: 'Free to make and share. No app or design skills needed.', href: '/create', label: 'Make an invitation' },

    { t: 'h2', id: 'what-to-include', text: 'What every invitation must include' },
    {
      t: 'ul',
      items: [
        'Who is inviting (the parents, the family, the couple, or the company).',
        'What the occasion is, and whose it is.',
        'The day, date and time, with the weekday to avoid mistakes.',
        'The venue’s full name, city and a map link.',
        'How to reply (RSVP) and by when.',
        'For religious occasions: the blessing line of your tradition at the top.',
      ],
    },

    { t: 'h2', id: 'formats', text: 'Card, video or website: which to send' },
    {
      t: 'table',
      head: ['Format', 'Best for', 'Why'],
      rows: [
        ['Image card', 'Every occasion; elders; printing', 'Opens instantly on any phone; prints as a 5×7 inch card'],
        ['Video invite', 'Weddings, engagements, big birthdays', 'Autoplays in WhatsApp chats and gets watched to the end'],
        ['Invitation website', 'Multi-function events; outstation guests', 'Schedule, venue map and RSVP for each function on one link'],
      ],
    },
    {
      t: 'p',
      text: 'Many families send all three: the video to announce, the card for quick reference, and the website link for directions and replies. Making all three from one form keeps names and timings identical everywhere.',
    },

    { t: 'h2', id: 'by-occasion', text: 'Tips by occasion' },
    {
      t: 'table',
      head: ['Occasion', 'What to remember'],
      rows: [
        ['Wedding', 'List Haldi, Mehendi, Sangeet, wedding and reception separately; ask for RSVP per function.'],
        ['Engagement / Roka', 'Keep it short: couple, families, ring ceremony time and venue.'],
        ['Griha pravesh', 'Give the puja muhurat and the arrival time separately, plus a map: guests have never been to the address.'],
        ['Birthday', 'Add an end time for kids’ parties and any theme or dress code.'],
        ['Puja, jagran, bhandara', 'Mention the prasad or bhandara timing so guests know whether to stay for the meal.'],
        ['Naamkaran, mundan, annaprashan', 'Name the child and parents, and invite family to bless the child.'],
        ['Retirement, shop opening, corporate', 'Use a formal tone; no religious symbols by default; add the address with a landmark.'],
      ],
    },

    { t: 'h2', id: 'languages', text: 'Making an invitation in your language' },
    {
      t: 'p',
      text: 'Noyta writes invitations in English, Hindi, Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam, Punjabi, Odia and Urdu, each in its own script. Type names in English and convert them to the script, or speak the details and let AI write the wording.',
    },
    { t: 'tip', text: 'Use Unicode text, not images of text, for regional scripts. Unicode stays sharp after WhatsApp compression and can be read aloud by screen readers.' },

    { t: 'h2', id: 'cost', text: 'What it costs' },
    {
      t: 'p',
      text: 'Making, previewing every design and sharing a watermarked card and website is free. HD files without the watermark, the video and full RSVP are a one-time payment per event, with no subscription. Current prices are on the pricing page.',
    },
  ],
  faq: [
    ['How can I make an invitation card online for free?', 'Open an online invitation maker such as Noyta, choose the occasion, enter the names, date and venue, pick a design and share it. Making and sharing a watermarked card is free on Noyta.'],
    ['What is the best app to make Indian invitations?', 'Look for one that supports your occasion’s functions, your language’s script, WhatsApp-friendly video and RSVP. Noyta covers weddings and 19 other Indian family occasions in 12 languages and runs in the browser, so there is nothing to install.'],
    ['Can I make an invitation in Hindi online?', 'Yes. Noyta writes the invitation in Hindi (Devanagari) or 11 other Indian languages, and you can type in English and convert names to the script.'],
    ['How do I send an invitation on WhatsApp?', 'Send the image card or the video with a short personal message, then send the website link separately so it shows its own preview with the venue and RSVP.'],
  ],
};
