import type { BlogPost } from '../types';

export const post: BlogPost = {
  slug: 'wedding-invitation-video-for-whatsapp',
  title: 'How to Make a Wedding Invitation Video for WhatsApp',
  h1: 'How to make a wedding invitation video for WhatsApp',
  description:
    'Make a wedding invitation video that looks sharp on WhatsApp: the right size, length and format, what to put in each scene, music tips and a free way to make one.',
  excerpt:
    'A step-by-step guide to a wedding video invitation that stays sharp after WhatsApp compresses it: 9:16 format, 30–60 seconds, a small file size, a scene-by-scene plan and music tips.',
  published: '2026-11-22',
  updated: '2026-11-22',
  category: 'Guides',
  occasions: ['wedding', 'engagement'],
  keywords: ['wedding invitation video', 'video invitation for whatsapp', 'wedding invitation video maker', 'digital wedding invitation video', 'save the date video'],
  readMinutes: 6,
  body: [
    {
      t: 'p',
      text: 'A video invitation gets opened more than an image card, because it autoplays in the chat and people watch it to the end. But a lot of wedding videos arrive blurry, cropped or too heavy to download on mobile data. Here is how to make one that looks as good on your aunt’s phone as it did on your laptop.',
    },
    { t: 'h2', id: 'specs', text: 'The right format for WhatsApp' },
    {
      t: 'table',
      head: ['Setting', 'Use this', 'Why'],
      rows: [
        ['Shape', 'Vertical 9:16 (1080 × 1920)', 'Fills the phone screen; works as a WhatsApp Status too'],
        ['Length', '30–60 seconds', 'Long enough for all functions, short enough to watch to the end'],
        ['File size', 'Under about 16 MB', 'Downloads fast on mobile data and avoids heavy recompression'],
        ['Format', 'MP4 (H.264 video, AAC audio)', 'Plays on every phone, old and new'],
        ['Text', 'Large, and away from the top and bottom edges', 'WhatsApp puts its controls and captions there'],
      ],
    },
    { t: 'tip', text: 'WhatsApp shrinks large videos to save data, which is what makes small text blurry. A video that is already small and sharp survives forwarding far better than a heavy 4K export.' },

    { t: 'h2', id: 'scenes', text: 'A scene-by-scene plan' },
    { t: 'p', text: 'Most good invitation videos follow the same arc. Give each scene 4–8 seconds:' },
    {
      t: 'ol',
      items: [
        'Opening: the blessing (“Shri Ganeshay Namah” or your family’s tradition) with a soft animation.',
        'The couple: names, large and centred. Add a photo here if you have one.',
        'The families: who is inviting.',
        'One scene per function: Haldi, Mehendi, Sangeet, the wedding and reception, each with date, time and venue.',
        'The venue: name, city, and a line pointing to the map link.',
        'Closing: “Your presence is our blessing” and the RSVP link or number.',
      ],
    },
    { t: 'cta', text: 'Noyta turns your details into a 9:16 video invite sized for WhatsApp, in your language.', href: '/create?type=wedding', label: 'Make a video invitation' },

    { t: 'h2', id: 'music', text: 'Choosing the music' },
    {
      t: 'ul',
      items: [
        'Pick instrumental shehnai, sitar, flute or soft piano. Lyrics fight with the text on screen.',
        'Match the tempo to the scenes: a slow track for a formal card, an upbeat one for a Sangeet invite.',
        'Avoid copyrighted film songs if you also plan to post the video on Instagram or YouTube, where it may be muted.',
        'Fade the music out over the last two seconds so the video doesn’t end abruptly.',
      ],
    },

    { t: 'h2', id: 'text', text: 'Text that stays readable' },
    {
      t: 'ul',
      items: [
        'Keep one idea per scene. A full card’s worth of text on one frame is unreadable on a phone.',
        'Use a large size for names and dates, and leave space around them.',
        'Give each scene enough time to read twice: about 1 second per 3 words.',
        'Use Unicode fonts for Hindi and regional scripts so matras don’t break.',
        'Use light text on dark backgrounds, or the other way round. Avoid text over busy photos.',
      ],
    },

    { t: 'h2', id: 'sending', text: 'Sending it without losing quality' },
    {
      t: 'ol',
      items: [
        'Send it to yourself first and watch it on a phone, not a laptop.',
        'Write a personal line above the video; forwarded media alone feels impersonal.',
        'Send the video and the RSVP link as separate messages, so the link gets its own preview.',
        'For broadcast lists, remember guests only receive it if they have saved your number.',
      ],
    },

    { t: 'h2', id: 'card-or-video', text: 'Video, card, or both?' },
    {
      t: 'p',
      text: 'Many families send both: the video to create excitement, and an image card or website link that guests can open quickly when they need the venue or time. If you can only send one, the video gets attention while a card or website is easier to check later. A matching set solves both.',
    },
  ],
  faq: [
    ['What is the best size for a WhatsApp invitation video?', 'Vertical 9:16 at 1080 × 1920 pixels, 30–60 seconds long, as an MP4 file kept small (around 16 MB or less) so it downloads quickly and stays sharp.'],
    ['Why does my invitation video look blurry on WhatsApp?', 'WhatsApp compresses large videos. Export a smaller file at 1080p instead of 4K, keep text large, and avoid thin fonts and busy backgrounds behind the text.'],
    ['Can I make a wedding invitation video online for free?', 'On Noyta, making the invitation and previewing every design is free. The video itself is a one-time payment per event, with no subscription.'],
  ],
};
