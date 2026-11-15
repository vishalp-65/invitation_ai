/**
 * Features unlocked per event by purchasing a product.
 * Free tier: watermarked image + basic website link, no RSVP.
 */
export const FEATURES = [
  'image_hd', // watermark-free, full-resolution image card + PDF
  'video_hd', // watermark-free 1080p video invite
  'website_premium', // Site Premium: all themes, animations, characters, no branding, custom link, gallery, music
  'website_royale', // Site Royale: travel & stay, live updates, guest album, languages, private access, guest-only sections
  'site_extra_year', // keeps the website online one more year per credit
  'rsvp', // RSVP per function + guest management
  'personalized_links', // per-guest links with name + view tracking
  'print_pdf', // print-ready PDF with bleed and crop marks
  'ai_clip', // AI-generated cinematic intro clip (credits)
  'ai_background', // extra AI backgrounds beyond the included allowance (credits)
] as const;
export type Feature = (typeof FEATURES)[number];

export const PRODUCT_CODES = [
  'card',
  'video',
  'website',
  'website_royale',
  'royale_upgrade',
  'combo',
  'ai_clip',
  'print',
  'ai_backgrounds',
  'site_year',
] as const;
export type ProductCode = (typeof PRODUCT_CODES)[number];

export interface Product {
  code: ProductCode;
  name: string;
  description: string;
  pricePaise: number;
  /** Strike-through price for marketing. */
  mrpPaise?: number;
  features: Feature[];
  /** Credits granted for consumable features (e.g. AI clips). */
  credits?: Partial<Record<Feature, number>>;
  highlight?: boolean;
}

export const PRODUCTS: Record<ProductCode, Product> = {
  card: {
    code: 'card',
    name: 'Image Card',
    description: 'HD multi-page card, no watermark, PDF download',
    pricePaise: 7900,
    mrpPaise: 19900,
    features: ['image_hd'],
  },
  video: {
    code: 'video',
    name: 'Video Invite',
    description: 'HD video invite with music, WhatsApp ready, unlimited edits',
    pricePaise: 24900,
    mrpPaise: 99900,
    features: ['video_hd'],
  },
  website: {
    code: 'website',
    name: 'Site Premium',
    description: 'Animated invitation website: every theme, opening and character, RSVP, guest links, gallery, music, your own short link, online 1 year',
    pricePaise: 59900,
    mrpPaise: 149900,
    features: ['website_premium', 'rsvp', 'personalized_links'],
  },
  website_royale: {
    code: 'website_royale',
    name: 'Site Royale',
    description: 'Everything in Premium + travel & stay per guest, live updates, guest photo album, second language, private access, sections for chosen guests, online 2 years',
    pricePaise: 149900,
    mrpPaise: 399900,
    features: ['website_premium', 'website_royale', 'rsvp', 'personalized_links'],
  },
  royale_upgrade: {
    code: 'royale_upgrade',
    name: 'Upgrade to Royale',
    description: 'Already on Site Premium? Add every Royale feature for the difference.',
    pricePaise: 90000,
    features: ['website_royale'],
  },
  combo: {
    code: 'combo',
    name: 'Complete Combo',
    description: 'Card + Video + Site Premium + RSVP + print-ready PDF + 1 AI clip',
    pricePaise: 119900,
    mrpPaise: 349900,
    features: ['image_hd', 'video_hd', 'website_premium', 'rsvp', 'personalized_links', 'print_pdf', 'ai_clip'],
    credits: { ai_clip: 1 },
    highlight: true,
  },
  ai_clip: {
    code: 'ai_clip',
    name: 'AI Cinematic Intro',
    description: '6-second AI-generated cinematic intro for your video',
    pricePaise: 14900,
    features: ['ai_clip'],
    credits: { ai_clip: 1 },
  },
  ai_backgrounds: {
    code: 'ai_backgrounds',
    name: 'AI Background Pack',
    description: '10 more AI-generated backgrounds for this invitation',
    pricePaise: 4900,
    features: ['ai_background'],
    credits: { ai_background: 10 },
  },
  site_year: {
    code: 'site_year',
    name: 'One more year online',
    description: 'Keep your invitation website (and guest album) online for another year',
    pricePaise: 19900,
    features: ['site_extra_year'],
    credits: { site_extra_year: 1 },
  },
  print: {
    code: 'print',
    name: 'Print-ready PDF',
    description: '5x7 inch, 300 DPI, bleed & crop marks for any printer',
    pricePaise: 9900,
    features: ['print_pdf'],
  },
};

/** Share of the order value paid to the template designer (marketplace). */
export const DEFAULT_DESIGNER_REVENUE_SHARE_PCT = 30;

/**
 * AI backgrounds included per invitation: a few free, more once any HD/website product is bought.
 * Beyond that, each one spends an `ai_background` credit (AI Background Pack).
 */
export const AI_BACKGROUNDS_PER_EVENT = { free: 3, paid: 30 } as const;
/** Features that count as an "upgraded" invitation (credit-only add-ons don't). */
export const UPGRADE_FEATURES = ['image_hd', 'video_hd', 'website_premium'] as const;

/** Free-tier daily AI quotas per user (cost guardrails). */
export const FREE_AI_QUOTA_PER_DAY = {
  wording: 15,
  transliteration: 200,
  image: 3,
} as const;
