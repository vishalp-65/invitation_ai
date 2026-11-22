import { EVENT_TYPES, formatINR, type PricedProduct } from '@cardai/shared';

export type QA = [string, string];
export interface FaqSection {
  id: string;
  title: string;
  items: QA[];
}

/**
 * Site-wide questions for /faq; the homepage shows a short selection (`homeFaq`). Prices and the
 * occasion list are built from live offers and EVENT_TYPES so they never drift from the product.
 * Every answer must hold in the product today.
 */
export function faqSections(plans: { card: PricedProduct; video: PricedProduct; combo: PricedProduct; website: PricedProduct }): FaqSection[] {
  const { card, video, combo, website } = plans;
  const occasions = EVENT_TYPES.filter((e) => e.id !== 'other').map((e) => e.label);
  return [
    {
      id: 'basics',
      title: 'Getting started',
      items: [
        ['What is Noyta?', 'Noyta is an online invitation maker for Indian families. Fill in the names, dates and functions once and get a matching invitation card, a WhatsApp video invite and an RSVP website, in Hindi or 11 more Indian languages.'],
        ['Is it really free to try?', 'Yes. Make your invitation, preview every design and share a watermarked card and website for free. Pay only for HD files, the video or RSVP.'],
        ['Which occasions can I make invitations for?', `${occasions.slice(0, -1).join(', ')} and ${occasions.at(-1)}. Each occasion comes with its own functions, wording and designs.`],
        ['How long does it take?', 'Most people finish in about two minutes: pick an occasion, type or speak the details, choose a design and share.'],
        ['Do I need to install an app?', 'No. Noyta works in the browser on any phone or computer. Your guests don’t need an app either; they open a link.'],
      ],
    },
    {
      id: 'pricing',
      title: 'Pricing and payment',
      items: [
        [
          'How much does an invitation cost?',
          `Making and sharing is free. Pay once per event: ${card.name} ${formatINR(card.pricePaise)}, ${video.name} ${formatINR(video.pricePaise)}, ${website.name} ${formatINR(website.pricePaise)}, or all three in the ${combo.name} for ${formatINR(combo.pricePaise)}. No subscription. UPI, cards and wallets accepted.`,
        ],
        ['Is it a subscription?', 'No. You pay once for one event, and edits stay free until the event.'],
        ['Can I change the design after paying?', 'Yes. Switch designs, edit words and remake files as often as you like.'],
        ['I live abroad. Can I pay?', 'Yes, international cards work. Your guests in India get the same WhatsApp-friendly files.'],
      ],
    },
    {
      id: 'languages',
      title: 'Designs and languages',
      items: [
        ['Can I write in Hindi, Marathi or Tamil?', 'Yes, in 12 Indian languages with correct script. Type in English and convert names to your script, or speak and let AI write the wording.'],
        ['Will the card have the right blessing for my family?', 'The blessing at the top follows your event’s tradition, not the design: a Ganesha blessing for Hindu weddings, and the family’s own line for Jain, Sikh, Christian and Muslim events. You can edit it.'],
        ['Can I add every function, like Haldi, Mehendi and Sangeet?', 'Yes. Add each function with its own date, time and venue. The card lists them, the website shows the schedule with maps, and guests reply to each function separately.'],
      ],
    },
    {
      id: 'sharing',
      title: 'Sharing on WhatsApp',
      items: [
        ['Will the video play properly on WhatsApp?', 'Every video is encoded to stay under 16 MB, so WhatsApp forwards it without blurring.'],
        ['How do guests open the invitation website?', 'They tap a short link on WhatsApp or SMS. It opens in the phone’s browser with the schedule, venue map and RSVP; no app or sign-in needed.'],
        ['Can I print the same design?', 'Yes. Get a print-ready 5×7 inch PDF with bleed and crop marks, or order printed cards from a partner press.'],
      ],
    },
    {
      id: 'rsvp',
      title: 'RSVP and guests',
      items: [
        ['Can guests reply for each function separately?', 'Yes. Guests choose Haldi, Sangeet, Wedding and so on individually, with headcount and meal preference. You get a live list for the caterer.'],
        ['Can family members help manage the guest list?', 'Yes. Invite co-hosts by email and choose what each can do: edit the invitation, manage guests, or only view.'],
      ],
    },
    {
      id: 'privacy',
      title: 'Privacy and account',
      items: [
        ['Who can see my invitation?', 'Only the people you send the link to. Invitation pages are kept out of search engines, and guests see your invitation and nothing else.'],
        ['Do you sell my guests’ phone numbers?', 'No. Phone numbers, addresses and replies belong to you. We don’t sell them, and we message your guests only when you ask us to.'],
        ['How do I sign in?', 'No passwords. Sign in with a one-time code by email or WhatsApp, or with Google.'],
        ['Can I delete my invitation?', 'Yes. Remove an invitation and its guest list whenever you like.'],
      ],
    },
  ];
}

/** The homepage's short FAQ: the most-asked questions, in the order the homepage has always shown them. */
export function homeFaq(plans: Parameters<typeof faqSections>[0]): QA[] {
  const all = new Map(faqSections(plans).flatMap((s) => s.items));
  const pick = (q: string): QA => [q, all.get(q)!];
  return [
    pick('Is it really free to try?'),
    pick('How much does an invitation cost?'),
    pick('Which occasions can I make invitations for?'),
    pick('Can I write in Hindi, Marathi or Tamil?'),
    pick('Will the video play properly on WhatsApp?'),
    pick('Can guests reply for each function separately?'),
    pick('Can I print the same design?'),
  ];
}
