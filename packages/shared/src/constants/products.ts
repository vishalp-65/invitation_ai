/**
 * Features unlocked per event by purchasing a product.
 * Free tier: watermarked image + basic website link, no RSVP.
 */
export const FEATURES = [
  'image_hd', // watermark-free, full-resolution image card + PDF
  'video_hd', // watermark-free 1080p video invite
  'website_premium', // no branding on site, custom slug, gallery, music
  'rsvp', // RSVP per function + guest management
  'personalized_links', // per-guest links with name + view tracking
  'print_pdf', // print-ready PDF with bleed and crop marks
  'ai_clip', // AI-generated cinematic intro clip (credits)
] as const;
export type Feature = (typeof FEATURES)[number];

export const PRODUCT_CODES = ['card', 'video', 'website', 'combo', 'ai_clip', 'print'] as const;
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
    name: 'Website + RSVP',
    description: 'Invitation website, RSVP per function, personalized guest links',
    pricePaise: 39900,
    mrpPaise: 99900,
    features: ['website_premium', 'rsvp', 'personalized_links'],
  },
  combo: {
    code: 'combo',
    name: 'Complete Combo',
    description: 'Card + Video + Website + RSVP + print-ready PDF + 1 AI clip',
    pricePaise: 89900,
    mrpPaise: 249900,
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

/** Free-tier daily AI quotas per user (cost guardrails). */
export const FREE_AI_QUOTA_PER_DAY = {
  wording: 15,
  transliteration: 200,
  image: 3,
} as const;
