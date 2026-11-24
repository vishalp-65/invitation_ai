import { FREE_PLAN } from '@cardai/shared';
import type { OccasionWithPage } from '@/features/occasions/routes';

/**
 * "Maker" landing pages: one per search intent that is about the format (card, video, website),
 * the price (free) or a regional name for the product (shaadi card, e-invite), rather than one
 * occasion. Occasion pages own "<occasion> invitation"; these own "<format> maker" queries, so
 * the two families never compete for the same phrase.
 *
 * Every claim must hold in the product: free numbers come from FREE_PLAN, formats and limits
 * from the render pipeline (5×7 inch PDF, 9:16 video under 16 MB, 12 languages).
 */
export const MAKER_SLUGS = [
  'invitation-card-maker',
  'video-invitation-maker',
  'invitation-website-maker',
  'free-invitation-maker',
  'shadi-card-maker',
  'e-invitation-card-maker',
] as const;

export type MakerSlug = (typeof MAKER_SLUGS)[number];

export interface MakerPage {
  slug: MakerSlug;
  /** <title> before " · Noyta": main search phrase first, at most ~55 characters. */
  title: string;
  /** Meta description, 140–160 characters. */
  description: string;
  /** Short label for links, breadcrumbs and the kicker. */
  label: string;
  h1: string;
  intro: string;
  /** Search phrases the page targets (schema `keywords`, and the visible "also known as" line). */
  keywords: string[];
  /** Event type whose designs illustrate the page. */
  designType: string;
  cta: { href: string; label: string };
  /** What you get, as [heading, text]. */
  features: Array<[string, string]>;
  /** Ordered steps (featured-snippet friendly), as [heading, text]. */
  steps: Array<[string, string]>;
  /** Long-form sections under the steps: the copy that answers the query in depth. */
  sections: Array<{ id: string; h2: string; paras: string[]; list?: string[] }>;
  faq: Array<[string, string]>;
  /** Occasion pages listed in the "for every occasion" grid. */
  occasions: OccasionWithPage[];
  /** Blog posts linked as further reading (slugs). */
  guides: string[];
}

export const makerHref = (slug: MakerSlug) => `/${slug}`;

const FREE_LINE = `A free account makes ${FREE_PLAN.images} image cards and ${FREE_PLAN.videos} video invitation (with ${FREE_PLAN.videoRedos} free redos), each with a small “Made with Noyta” mark, and a free invitation website that ${FREE_PLAN.siteVisitors} guests can open in full.`;

const ALL_OCCASIONS: OccasionWithPage[] = ['wedding', 'engagement', 'birthday', 'griha-pravesh', 'puja', 'naming-ceremony', 'mundan', 'baby-shower', 'anniversary', 'nikah', 'reception', 'shop-opening'];

const STEPS_GENERIC: Array<[string, string]> = [
  ['Pick the occasion', 'Wedding, engagement, birthday, griha pravesh, puja, naamkaran, anniversary, shop opening or your own.'],
  ['Add the details', 'Type or speak the names, date, time and venue. AI writes the wording in your language and script.'],
  ['Choose a design', 'Preview any design with your own names, free. The card, video and website all match.'],
  ['Download and share', 'Download the HD card or video, or send the website link on WhatsApp.'],
];

export const MAKER_PAGES: MakerPage[] = [
  {
    slug: 'invitation-card-maker',
    title: 'Invitation Card Maker Online: Free Card Design',
    description:
      'Make an invitation card online in 2 minutes: wedding, birthday, griha pravesh and puja card designs in Hindi and 11 languages. Download HD image or print-ready PDF.',
    label: 'Invitation card maker',
    h1: 'Invitation card maker: design your card online in two minutes',
    intro:
      'Pick a design, type the names, date and venue, and Noyta lays out a finished invitation card in your language: an HD image for WhatsApp and a print-ready PDF for the press. No design skills, no app to install.',
    keywords: ['invitation card maker', 'card invitation making', 'invite card making', 'online invitation card maker', 'invitation card design', 'invitation card banane wala app', 'invitation card maker free'],
    designType: 'wedding',
    cta: { href: '/create', label: 'Make an invitation card' },
    features: [
      ['HD image card', 'Sized for WhatsApp and Instagram, sharp on every phone and quick to forward.'],
      ['Print-ready PDF', 'A 5×7 inch PDF, ready for any printing shop.'],
      ['Wording in your language', 'AI writes the matter in Hindi, Marathi, Gujarati, Tamil, Telugu and 7 more, in the right script.'],
      ['Matching video and website', 'The same design becomes a WhatsApp video and an RSVP website when you want them.'],
    ],
    steps: STEPS_GENERIC,
    sections: [
      {
        id: 'what-is',
        h2: 'What makes a good invitation card',
        paras: [
          'A good invitation card answers four questions at a glance: who is inviting, for what, when, and where. Everything else — the blessing line, the family names, the RSVP contact — sits around those four in a clear order.',
          'Noyta’s designs keep that order for you. You fill in the details once, and the layout, fonts and spacing adjust to long names, extra functions or a second language without anything spilling off the card.',
        ],
        list: [
          'The blessing of your tradition at the top (Shri Ganeshay Namah, Ik Onkar, Bismillah, a Bible verse, or none).',
          'Hosts’ names, then the occasion and whose it is.',
          'Day, date and time, with the weekday written out.',
          'Venue with city, and a QR code that opens the map.',
          'An RSVP contact or link.',
        ],
      },
      {
        id: 'designs',
        h2: 'Invitation card designs for every family',
        paras: [
          'Choose from traditional red-and-gold, royal Rajasthani, South Indian temple, floral watercolour, modern minimal and photo-first designs. Every design supports Hindu, Jain, Sikh, Muslim and Christian blessings, and every one can be printed.',
          'Upload a photo of the couple, the baby or the new home and the design frames it for you. Change colours, fonts and text on any element in the editor if you want more control.',
        ],
      },
      {
        id: 'image-or-print',
        h2: 'Digital card or printed card?',
        paras: [
          'Most families now send a digital card on WhatsApp to everyone and print a small batch for elders and close relatives. With Noyta both come from the same design: download the image to share, and the PDF to print.',
        ],
      },
    ],
    faq: [
      ['Is the invitation card maker free?', `Yes, making and previewing is free. ${FREE_LINE} Pay once per event to remove the mark and unlock premium designs.`],
      ['Can I make an invitation card in Hindi?', 'Yes. Pick Hindi and the whole card — blessing, names, date and venue — is written in Devanagari. You can type in English and convert names to Hindi, or speak the details.'],
      ['Can I print the card?', 'Yes. Download a 5×7 inch print-ready PDF and take it to any printer, or print at home on card stock.'],
      ['Do I need to install an app?', 'No. Noyta works in the phone’s browser. You can also start on WhatsApp.'],
    ],
    occasions: ALL_OCCASIONS,
    guides: ['how-to-make-an-invitation-online', 'shadi-card-matter-in-hindi', 'wedding-invitation-wording', 'invitation-card-design-ideas'],
  },

  {
    slug: 'video-invitation-maker',
    title: 'Video Invitation Maker: Free Invitation Video',
    description:
      'Make a wedding, birthday or griha pravesh invitation video in 2 minutes. 9:16 video with music for WhatsApp and Instagram, in Hindi and 11 languages. Try it free.',
    label: 'Video invitation maker',
    h1: 'Video invitation maker for WhatsApp and Instagram',
    intro:
      'Turn your invitation into a short animated video with music: names, functions, dates and venue, each on its own scene. Noyta keeps every video under 16 MB, so it plays and forwards on WhatsApp without blurring.',
    keywords: ['video invitation maker', 'invitation video free', 'invitation video maker', 'wedding invitation video', 'shaadi video invitation', 'birthday invitation video', 'e invite video'],
    designType: 'wedding',
    cta: { href: '/create', label: 'Make a video invitation' },
    features: [
      ['9:16 vertical video', 'Fills the phone screen on WhatsApp, Status and Instagram Reels.'],
      ['Music that fits', 'Pick an instrumental track from the music library to set the mood.'],
      ['One scene per function', 'Haldi, Mehendi, Sangeet, wedding and reception each get their own moment.'],
      ['Under 16 MB', 'Encoded so WhatsApp does not compress it into a blurry copy.'],
    ],
    steps: STEPS_GENERIC.map(([h, d], k) => (k === 3 ? ['Download the video', 'Download the MP4 and send it on WhatsApp, post it on Status, or share the website link.'] : [h, d])),
    sections: [
      {
        id: 'why-video',
        h2: 'Why send a video invitation',
        paras: [
          'A video autoplays inside a WhatsApp chat, so guests watch it instead of scrolling past. It also carries more than a card can: every function, the couple’s photos, and music that sets the mood.',
          'For weddings and engagements, many families send the video first and follow up with the image card for elders and the website link for RSVPs.',
        ],
      },
      {
        id: 'free-video',
        h2: 'Can I make an invitation video for free?',
        paras: [
          `Yes. Every free account can make ${FREE_PLAN.videos} full video invitation and remake it ${FREE_PLAN.videoRedos} more times after edits. Free videos carry a small “Made with Noyta” mark; pay once for the event to remove it.`,
          'Countdown clips for WhatsApp Status (“5 days to go”) are free on top of that.',
        ],
      },
      {
        id: 'length',
        h2: 'How long should an invitation video be?',
        paras: ['Thirty to sixty seconds works best. Long enough to show every function, short enough that relatives watch to the end and forward it. Noyta paces the scenes to the number of functions you add.'],
      },
    ],
    faq: [
      ['Is the invitation video free?', `You can make ${FREE_PLAN.videos} video invitation free, with ${FREE_PLAN.videoRedos} redos, carrying a small Noyta mark. Paid videos have no mark.`],
      ['Will the video play properly on WhatsApp?', 'Yes. Every video is a 9:16 MP4 kept under 16 MB, so WhatsApp sends it as is.'],
      ['Can I add our photos to the video?', 'Yes. Upload photos and the design places them in the scenes.'],
      ['Which languages can the video be in?', 'Any of 12: English, Hindi, Marathi, Gujarati, Bengali, Punjabi, Tamil, Telugu, Kannada, Malayalam, Odia and Urdu.'],
    ],
    occasions: ['wedding', 'engagement', 'birthday', 'griha-pravesh', 'anniversary', 'reception', 'nikah', 'baby-shower'],
    guides: ['wedding-invitation-video-for-whatsapp', 'marriage-invitation-message-for-whatsapp', 'card-vs-video-vs-website-invitation'],
  },

  {
    slug: 'invitation-website-maker',
    title: 'Wedding Website & Invitation Website Maker',
    description:
      'Make an invitation website with RSVP, venue map, schedule, photo gallery and personal guest links. For weddings and every family event. Free website, ready in 2 minutes.',
    label: 'Invitation website maker',
    h1: 'Invitation website with RSVP, map and schedule',
    intro:
      'One short link holds everything guests need: the schedule of every function, the venue on a map, dress codes, photos, and an RSVP for each function. Send it on WhatsApp and watch the replies come in.',
    keywords: ['invitation website maker', 'wedding website', 'wedding website maker india', 'rsvp website', 'online invitation link', 'digital invitation website'],
    designType: 'wedding',
    cta: { href: '/create', label: 'Make an invitation website' },
    features: [
      ['RSVP per function', 'Guests say who is coming to each function, with headcount and food preference.'],
      ['Venue on a map', 'Every venue opens in Google Maps with one tap. No more “where is it?” calls.'],
      ['Personal guest links', 'Each family gets its own link with their name on the welcome screen.'],
      ['Photo wall and wishes', 'Guests add photos and blessings that you approve before they show.'],
    ],
    steps: STEPS_GENERIC.map(([h, d], k) => (k === 3 ? ['Share the link', 'Send the short link on WhatsApp. See replies live in your dashboard.'] : [h, d])),
    sections: [
      {
        id: 'why-website',
        h2: 'Why a wedding needs a website',
        paras: [
          'An Indian wedding has five or six functions across two or three venues. A card can list them, but only a website can give each one a map, a time, a dress code and its own RSVP — and update them if plans change.',
          'Outstation guests also get travel and stay details, and you get one list of who is coming to what, instead of a hundred WhatsApp replies.',
        ],
      },
      {
        id: 'free-site',
        h2: 'Is the invitation website free?',
        paras: [
          `Yes. A free website opens in full for the first ${FREE_PLAN.siteVisitors} guests, then shows later visitors the essentials — names, date, venue and map — so the link never breaks. Upgrade once for unlimited guests and more sections.`,
        ],
      },
    ],
    faq: [
      ['Do guests need to install anything?', 'No. The website opens in any phone browser from the WhatsApp link.'],
      ['Can I change the details after sending?', 'Yes. Edit the website any time; the same link shows the new details.'],
      ['Can I choose my own link?', 'Yes, premium websites can use a custom name such as noyta.in/rahul-weds-priya.'],
      ['Is it private?', 'Invitation websites are not listed on Google, and you can share personal links only with the families you invite.'],
    ],
    occasions: ['wedding', 'engagement', 'reception', 'birthday', 'anniversary', 'nikah', 'anand-karaj', 'christian-wedding'],
    guides: ['indian-wedding-rsvp-guide', 'wedding-website-guide', 'card-vs-video-vs-website-invitation'],
  },

  {
    slug: 'free-invitation-maker',
    title: 'Free Invitation Maker: Card Image & Video Free',
    description:
      'Make a free invitation card image, video and RSVP website for weddings, birthdays and puja. No subscription, no app. Hindi and 11 more languages. Start free in 2 minutes.',
    label: 'Free invitation maker',
    h1: 'Free invitation maker: card, video and website',
    intro: `Everything you need to invite your guests, free: ${FREE_LINE} No subscription and no card details to start.`,
    keywords: ['free invitation maker', 'invitation card image free', 'free invitation card', 'invitation video free', 'free e invite', 'free wedding invitation card', 'free birthday invitation card'],
    designType: 'birthday',
    cta: { href: '/create', label: 'Start free' },
    features: [
      [`${FREE_PLAN.images} free card images`, 'HD invitation cards in any design, with a small Noyta mark.'],
      [`${FREE_PLAN.videos} free video`, `A full video invitation with music, plus ${FREE_PLAN.videoRedos} free remakes.`],
      ['Free RSVP website', `Opens in full for ${FREE_PLAN.siteVisitors} guests; the essentials stay visible after that.`],
      ['Free AI wording', 'Invitation matter written for you in 12 Indian languages.'],
    ],
    steps: STEPS_GENERIC,
    sections: [
      {
        id: 'whats-free',
        h2: 'What is free, and what is paid',
        paras: [
          'Making, previewing and sharing are free, with every design. Paying is a one-time charge per event — never a subscription — and removes the Noyta mark, unlocks premium designs, more videos and unlimited website guests.',
        ],
        list: [
          'Free: all designs to preview, AI wording, image cards, one video, a website, WhatsApp sharing.',
          'Paid once: no watermark, premium designs, custom link, unlimited guests.',
        ],
      },
      {
        id: 'download',
        h2: 'How to download a free invitation card image',
        paras: ['Make your card, tap Download, and choose Image. The HD JPG saves to your phone’s gallery, ready to send on WhatsApp. Re-downloading the same card never counts again.'],
      },
    ],
    faq: [
      ['Is Noyta really free?', `Yes. ${FREE_LINE} You only pay if you want to remove the mark or unlock extras, once per event.`],
      ['Do I need to enter a card or UPI to start?', 'No. Sign in with your email, WhatsApp or Google and start making.'],
      ['Will my free card have a watermark?', 'A small “Made with Noyta · noyta.in” line sits at the bottom. It disappears when you upgrade the event.'],
    ],
    occasions: ALL_OCCASIONS,
    guides: ['how-to-make-an-invitation-online', 'birthday-invitation-message', 'card-vs-video-vs-website-invitation'],
  },

  {
    slug: 'shadi-card-maker',
    title: 'Shadi Card Maker: Shaadi Card & Video in Hindi',
    description:
      'Make a shaadi card (शादी कार्ड) online: Hindi wedding card with Ganesh vandana, shaadi video invitation and RSVP website. Every design free to preview. Ready in 2 minutes.',
    label: 'Shadi card maker',
    h1: 'Shadi card maker — शादी का कार्ड ऑनलाइन बनाएँ',
    intro:
      'Write the bride’s and groom’s names, the families, and every rasm — tilak, haldi, mehendi, sangeet, shaadi, reception — and get a shaadi card in Hindi with the right Ganesh vandana, a shaadi video for WhatsApp and a website for RSVPs.',
    keywords: ['shadi card maker', 'shaadi card', 'shadi card design', 'shaadi card online', 'शादी कार्ड', 'marriage card maker', 'wedding card maker', 'shadi video invitation', 'vivah patrika'],
    designType: 'wedding',
    cta: { href: '/create?type=wedding', label: 'Make a shaadi card' },
    features: [
      ['Hindi shaadi card', 'Devanagari matter with Shri Ganeshay Namah, family names and the full programme.'],
      ['Shaadi video invite', 'A 9:16 video with music, ready for WhatsApp.'],
      ['Print-ready card', 'A 5×7 inch PDF for the printing press.'],
      ['RSVP website', 'Every rasm with its venue on a map, and replies per function.'],
    ],
    steps: [
      ['Choose “Wedding”', 'Pick shaadi, and the language: Hindi, English or both.'],
      ['Add the families', 'Names of the bride and groom, parents, grandparents, and “darshanabhilashi”.'],
      ['Add every rasm', 'Tilak, haldi, mehendi, sangeet, baraat, phere and reception with date and venue.'],
      ['Download and share', 'Send the shaadi card and video on WhatsApp, and print the PDF.'],
    ],
    sections: [
      {
        id: 'matter',
        h2: 'Shaadi card matter in Hindi',
        paras: [
          'A traditional Hindi shaadi card opens with the Ganesh vandana, invites in the name of the elders, names the bride and groom with their parents, and lists each function with its date and venue. Noyta writes this matter for you and you can edit every line.',
          'Want the exact wording? Our guide has complete Hindi samples you can copy.',
        ],
      },
      {
        id: 'designs',
        h2: 'Shaadi card designs',
        paras: [
          'Red and gold, royal Rajasthani, Banarasi, floral, modern pastel and photo designs. Jain, Sikh and Muslim families get their own blessing line on any design.',
        ],
      },
    ],
    faq: [
      ['Shadi card online kaise banaye?', 'Noyta par “Wedding” chuniye, naam, tareekh aur venue likhiye, design chuniye — shaadi card 2 minute mein taiyar. Image WhatsApp ke liye, PDF chhapai ke liye.'],
      ['Can the shaadi card be in both Hindi and English?', 'Yes. Make one card in Hindi and another in English from the same details — switch the language and the matter is rewritten for you.'],
      ['Is the shaadi card free?', `Making and previewing is free. ${FREE_LINE}`],
    ],
    occasions: ['wedding', 'engagement', 'reception', 'anniversary'],
    guides: ['shadi-card-matter-in-hindi', 'haldi-mehndi-sangeet-invitation-message', 'shaadi-card-design-ideas', 'marriage-invitation-message-for-whatsapp'],
  },

  {
    slug: 'e-invitation-card-maker',
    title: 'E-Invitation Card Maker: Digital E-Invite Online',
    description:
      'Make an e-invitation card (e-invite) for WhatsApp in 2 minutes: digital card, video and RSVP link for weddings, birthdays and griha pravesh. 12 Indian languages. Free.',
    label: 'E-invitation maker',
    h1: 'E-invitation card maker: digital invites for WhatsApp',
    intro:
      'An e-invite reaches every guest in seconds, costs nothing to send and can be updated any time. Make a digital invitation card, an e-invite video and an RSVP link in one go, in your language.',
    keywords: ['e invitation card maker', 'e invite', 'e invitation card', 'digital invitation card', 'online invitation', 'whatsapp invitation card', 'e card for wedding'],
    designType: 'griha-pravesh',
    cta: { href: '/create', label: 'Make an e-invite' },
    features: [
      ['Digital card', 'An HD image that opens instantly in WhatsApp, Telegram or email.'],
      ['E-invite video', 'A short animated invitation with music.'],
      ['RSVP link', 'A website where guests reply, find the venue and see the schedule.'],
      ['Personal links', 'Send each family a link that greets them by name.'],
    ],
    steps: STEPS_GENERIC,
    sections: [
      {
        id: 'etiquette',
        h2: 'Is it okay to send an e-invite?',
        paras: [
          'Yes — e-invites are now the norm for most Indian occasions. For weddings, a common etiquette is to send the e-invite to everyone, then call or visit elders personally and hand them a printed card.',
          'Send a short personal message with the e-invite, not just the image. Our WhatsApp message guide has samples.',
        ],
      },
    ],
    faq: [
      ['What is an e-invitation card?', 'A digital version of an invitation card — an image, video or web link — sent on WhatsApp, email or social media instead of by hand.'],
      ['Can I print my e-invitation later?', 'Yes. The same design downloads as a print-ready 5×7 inch PDF.'],
      ['Is making an e-invite free?', `Yes. ${FREE_LINE}`],
    ],
    occasions: ALL_OCCASIONS,
    guides: ['when-to-send-wedding-invitations', 'marriage-invitation-message-for-whatsapp', 'card-vs-video-vs-website-invitation'],
  },
];

export const makerBySlug = (slug: string) => MAKER_PAGES.find((m) => m.slug === slug);
