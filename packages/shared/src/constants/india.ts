/**
 * India-first audience helpers: states, city tiers, acquisition channels (WhatsApp, Instagram, …),
 * in-app browsers and network quality. Pure functions shared by the API (tracking) and the admin
 * console (labels). Geography is coarse on purpose: state + city, never an IP or exact location.
 */

/** ISO 3166-2:IN subdivision codes (as edge networks report them) → state / UT name. */
export const INDIA_STATES: Record<string, string> = {
  AN: 'Andaman & Nicobar',
  AP: 'Andhra Pradesh',
  AR: 'Arunachal Pradesh',
  AS: 'Assam',
  BR: 'Bihar',
  CH: 'Chandigarh',
  CT: 'Chhattisgarh',
  CG: 'Chhattisgarh',
  DH: 'Dadra & Nagar Haveli and Daman & Diu',
  DN: 'Dadra & Nagar Haveli and Daman & Diu',
  DD: 'Dadra & Nagar Haveli and Daman & Diu',
  DL: 'Delhi',
  GA: 'Goa',
  GJ: 'Gujarat',
  HR: 'Haryana',
  HP: 'Himachal Pradesh',
  JK: 'Jammu & Kashmir',
  JH: 'Jharkhand',
  KA: 'Karnataka',
  KL: 'Kerala',
  LA: 'Ladakh',
  LD: 'Lakshadweep',
  MP: 'Madhya Pradesh',
  MH: 'Maharashtra',
  MN: 'Manipur',
  ML: 'Meghalaya',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  OR: 'Odisha',
  OD: 'Odisha',
  PY: 'Puducherry',
  PB: 'Punjab',
  RJ: 'Rajasthan',
  SK: 'Sikkim',
  TN: 'Tamil Nadu',
  TG: 'Telangana',
  TS: 'Telangana',
  TR: 'Tripura',
  UP: 'Uttar Pradesh',
  UT: 'Uttarakhand',
  UK: 'Uttarakhand',
  WB: 'West Bengal',
};

const TIER1 = ['delhi', 'new delhi', 'mumbai', 'bengaluru', 'bangalore', 'chennai', 'kolkata', 'hyderabad', 'pune', 'ahmedabad', 'gurugram', 'gurgaon', 'noida', 'navi mumbai', 'thane'];
const TIER2 = [
  'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'bhopal', 'visakhapatnam', 'vijayawada', 'patna', 'vadodara', 'surat', 'rajkot', 'ludhiana', 'agra',
  'nashik', 'faridabad', 'ghaziabad', 'meerut', 'varanasi', 'srinagar', 'aurangabad', 'chhatrapati sambhajinagar', 'dhanbad', 'amritsar', 'allahabad',
  'prayagraj', 'ranchi', 'howrah', 'coimbatore', 'jabalpur', 'gwalior', 'jodhpur', 'madurai', 'raipur', 'kota', 'guwahati', 'chandigarh', 'solapur',
  'mysuru', 'mysore', 'bareilly', 'aligarh', 'moradabad', 'tiruchirappalli', 'bhubaneswar', 'salem', 'thiruvananthapuram', 'kochi', 'kozhikode',
  'dehradun', 'jammu', 'mangaluru', 'mangalore', 'belagavi', 'hubli', 'dharwad', 'udaipur', 'ajmer', 'jalandhar', 'bhilai', 'cuttack', 'warangal',
  'guntur', 'nellore', 'jamshedpur', 'siliguri', 'durgapur', 'asansol', 'gorakhpur', 'bikaner', 'kolhapur', 'sangli', 'thrissur', 'tirupati',
];
const TIER1_SET = new Set(TIER1);
const TIER2_SET = new Set(TIER2);

export type CityTier = 'tier1' | 'tier2' | 'tier3' | 'unknown';
export const CITY_TIER_LABEL: Record<CityTier, string> = { tier1: 'Metro (Tier 1)', tier2: 'Tier 2', tier3: 'Tier 3 & rural', unknown: 'Unknown' };

/** Metro / tier-2 / everything else. Only for Indian visitors; abroad is `unknown`. */
export function cityTier(country: string | null | undefined, city: string | null | undefined): CityTier {
  if (country !== 'IN' || !city) return 'unknown';
  const c = city.trim().toLowerCase();
  if (TIER1_SET.has(c)) return 'tier1';
  if (TIER2_SET.has(c)) return 'tier2';
  return 'tier3';
}

export function stateName(country: string | null | undefined, region: string | null | undefined): string | null {
  if (!region) return null;
  if (country && country !== 'IN') return null;
  return INDIA_STATES[region.toUpperCase()] ?? null;
}

// ---------- Channels ----------

export const CHANNELS = ['whatsapp', 'instagram', 'facebook', 'youtube', 'google', 'search', 'paid', 'email', 'referral', 'guest', 'direct'] as const;
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  google: 'Google search',
  search: 'Other search',
  paid: 'Paid ads',
  email: 'Email',
  referral: 'Other websites',
  guest: 'Guest of an invitation',
  direct: 'Direct / unknown',
};

/** Apps whose built-in browser opens links (very common in India; they often send no referrer). */
export type InAppBrowser = 'whatsapp' | 'instagram' | 'facebook' | 'snapchat' | 'telegram' | 'sharechat' | 'linkedin' | null;

export function inAppBrowser(ua: string | null | undefined): InAppBrowser {
  if (!ua) return null;
  if (/WhatsApp/i.test(ua)) return 'whatsapp';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return 'facebook';
  if (/Snapchat/i.test(ua)) return 'snapchat';
  if (/Telegram/i.test(ua)) return 'telegram';
  if (/ShareChat|Moj/i.test(ua)) return 'sharechat';
  if (/LinkedInApp/i.test(ua)) return 'linkedin';
  return null;
}

const host = (r: string) => r.toLowerCase().replace(/^www\./, '');

/**
 * Where a visit came from. Order: explicit UTM tags, then click ids (paid), then the referring
 * site, then the in-app browser (WhatsApp/Instagram links usually arrive with no referrer).
 */
export function classifyChannel(input: {
  utmSource?: string | null;
  utmMedium?: string | null;
  referrer?: string | null;
  inApp?: InAppBrowser;
  paidClick?: boolean;
  guest?: boolean;
}): Channel {
  const src = input.utmSource?.toLowerCase() ?? '';
  const med = input.utmMedium?.toLowerCase() ?? '';
  if (/cpc|ppc|paid|ads?$|display|cpm/.test(med) || input.paidClick) return 'paid';
  if (src) {
    if (/whatsapp|wa\b/.test(src)) return 'whatsapp';
    if (/insta|^ig$/.test(src)) return 'instagram';
    if (/facebook|^fb$|meta/.test(src)) return 'facebook';
    if (/youtube|^yt$/.test(src)) return 'youtube';
    if (/google/.test(src)) return 'google';
    if (/mail|newsletter|resend/.test(src) || med === 'email') return 'email';
    return 'referral';
  }
  if (input.guest) return 'guest';
  const r = input.referrer ? host(input.referrer) : '';
  if (r) {
    if (/whatsapp|wa\.me|^l\.wl\.co$/.test(r)) return 'whatsapp';
    if (/instagram/.test(r)) return 'instagram';
    if (/facebook|fb\.com|fb\.me|messenger/.test(r)) return 'facebook';
    if (/youtube|youtu\.be/.test(r)) return 'youtube';
    if (/google\./.test(r)) return 'google';
    if (/bing\.|duckduckgo|yahoo\.|yandex|ecosia|baidu/.test(r)) return 'search';
    if (/mail\.|outlook|gmail/.test(r)) return 'email';
    return 'referral';
  }
  if (input.inApp === 'whatsapp') return 'whatsapp';
  if (input.inApp === 'instagram') return 'instagram';
  if (input.inApp === 'facebook') return 'facebook';
  return 'direct';
}

/** navigator.connection.effectiveType, normalised. */
export const NETWORKS = ['slow-2g', '2g', '3g', '4g'] as const;
export type Network = (typeof NETWORKS)[number] | 'unknown';
export function normaliseNetwork(v: unknown): Network {
  return typeof v === 'string' && (NETWORKS as readonly string[]).includes(v) ? (v as Network) : 'unknown';
}

/**
 * Collapses Gmail aliases (dots, +tags, googlemail) so one person signing up as
 * a.b.c+1@gmail.com and abc+2@gmail.com is seen as one: a common way to reuse first-order coupons.
 */
export function normaliseEmail(email: string): string {
  const [local = '', domain = ''] = email.trim().toLowerCase().split('@');
  if (domain === 'gmail.com' || domain === 'googlemail.com') return `${local.split('+')[0]!.replace(/\./g, '')}@gmail.com`;
  return `${local.split('+')[0]}@${domain}`;
}

/**
 * Words and patterns that suggest an invitation page is being misused for scams (fake KYC, loans,
 * lottery, crypto) rather than a celebration. Matching flags it for a human to review, nothing more.
 */
export const ABUSE_PATTERNS: Array<{ id: string; label: string; re: RegExp }> = [
  { id: 'kyc', label: 'KYC / bank verification', re: /\b(kyc|pan\s*card\s*update|aadhaar\s*update|account\s*(will\s*be\s*)?blocked)\b/i },
  { id: 'upi-pin', label: 'Asks for UPI PIN / OTP', re: /\b(upi\s*pin|share\s*(the\s*)?otp|enter\s*(your\s*)?otp)\b/i },
  { id: 'lottery', label: 'Lottery / prize', re: /\b(lottery|lucky\s*draw|you\s*have\s*won|jackpot|kbc\s*winner)\b/i },
  { id: 'loan', label: 'Instant loan', re: /\b(instant\s*loan|loan\s*approved|pre-?approved\s*loan)\b/i },
  { id: 'crypto', label: 'Crypto / trading tips', re: /\b(crypto|bitcoin|usdt|trading\s*tips|double\s*your\s*money)\b/i },
  { id: 'job', label: 'Work-from-home job', re: /\b(work\s*from\s*home|part[-\s]*time\s*job|earn\s*₹?\s*\d+\s*(per|\/)\s*day)\b/i },
  { id: 'short-link', label: 'Link shortener', re: /\b(bit\.ly|tinyurl\.com|t\.me\/|cutt\.ly|rb\.gy|is\.gd)\b/i },
  { id: 'betting', label: 'Betting / gambling', re: /\b(satta|matka|betting|casino|rummy\s*cash)\b/i },
];

export function abuseSignals(text: string): string[] {
  return ABUSE_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.id);
}
