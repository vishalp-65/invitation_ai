export const EVENT_CATEGORIES = ['wedding', 'family', 'religious', 'celebration', 'business', 'festival', 'trip'] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/**
 * How occasions are grouped in the wizard, the gallery filters and the SEO pages. A group can
 * hold occasions of several categories (Mundan is a religious rite in the baby group).
 */
export const OCCASION_GROUPS = [
  { id: 'weddings', label: 'Weddings', labelHi: 'शादी' },
  { id: 'wedding-functions', label: 'Wedding functions', labelHi: 'शादी की रस्में' },
  { id: 'celebrations', label: 'Celebrations', labelHi: 'जश्न' },
  { id: 'baby-family', label: 'Baby & family', labelHi: 'बच्चे और परिवार' },
  { id: 'religious', label: 'Puja & religious', labelHi: 'पूजा और धार्मिक' },
  { id: 'festivals', label: 'Festivals', labelHi: 'त्योहार' },
  { id: 'trips', label: 'Trips & holidays', labelHi: 'यात्रा और छुट्टियाँ' },
  { id: 'business', label: 'Business', labelHi: 'व्यवसाय' },
] as const;
export type OccasionGroup = (typeof OCCASION_GROUPS)[number]['id'];

interface EventTypeDef {
  id: string;
  label: string;
  labelHi: string;
  category: EventCategory;
  /** Names primary people? e.g. couple (2), baby (1), none for puja. */
  primaryPeople: 0 | 1 | 2;
  /** Suggested functions the wizard pre-fills. */
  defaultFunctions: string[];
  emoji: string;
  group: OccasionGroup;
  /**
   * Festivals and holidays can be a greeting card (no RSVP or venue, made to forward) as well as
   * a party invitation: `both` lets the host choose, `only` is always a greeting.
   */
  greeting?: 'both' | 'only';
}

export const EVENT_TYPES = [
  { id: 'wedding', label: 'Wedding', labelHi: 'शुभ विवाह', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Haldi', 'Mehendi', 'Sangeet', 'Wedding', 'Reception'], emoji: '💍', group: 'weddings' },
  { id: 'engagement', label: 'Engagement / Sagai', labelHi: 'सगाई', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Ring Ceremony'], emoji: '💞', group: 'weddings' },
  { id: 'reception', label: 'Reception', labelHi: 'स्वागत समारोह', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Reception'], emoji: '🥂', group: 'weddings' },
  { id: 'anniversary', label: 'Anniversary', labelHi: 'वैवाहिक वर्षगाँठ', category: 'celebration', primaryPeople: 2, defaultFunctions: ['Celebration'], emoji: '💐', group: 'celebrations' },
  { id: 'birthday', label: 'Birthday', labelHi: 'जन्मदिन', category: 'celebration', primaryPeople: 1, defaultFunctions: ['Birthday Party'], emoji: '🎂', group: 'celebrations' },
  { id: 'baby-shower', label: 'Baby Shower / Godh Bharai', labelHi: 'गोद भराई', category: 'family', primaryPeople: 1, defaultFunctions: ['Godh Bharai'], emoji: '🍼', group: 'baby-family' },
  { id: 'naming-ceremony', label: 'Naming Ceremony / Naamkaran', labelHi: 'नामकरण संस्कार', category: 'family', primaryPeople: 1, defaultFunctions: ['Naamkaran'], emoji: '👶', group: 'baby-family' },
  { id: 'mundan', label: 'Mundan', labelHi: 'मुंडन संस्कार', category: 'religious', primaryPeople: 1, defaultFunctions: ['Mundan Sanskar'], emoji: '🪔', group: 'baby-family' },
  { id: 'annaprashan', label: 'Annaprashan', labelHi: 'अन्नप्राशन', category: 'religious', primaryPeople: 1, defaultFunctions: ['Annaprashan'], emoji: '🍚', group: 'baby-family' },
  { id: 'griha-pravesh', label: 'Griha Pravesh / Housewarming', labelHi: 'गृह प्रवेश', category: 'religious', primaryPeople: 0, defaultFunctions: ['Puja', 'Bhoj'], emoji: '🏠', group: 'religious' },
  { id: 'puja', label: 'Puja / Katha', labelHi: 'पूजा / कथा', category: 'religious', primaryPeople: 0, defaultFunctions: ['Puja', 'Prasad'], emoji: '🙏', group: 'religious' },
  { id: 'jagran', label: 'Jagran / Mata ki Chowki', labelHi: 'जागरण', category: 'religious', primaryPeople: 0, defaultFunctions: ['Jagran'], emoji: '🔱', group: 'religious' },
  { id: 'bhandara', label: 'Bhandara', labelHi: 'भंडारा', category: 'religious', primaryPeople: 0, defaultFunctions: ['Bhandara'], emoji: '🍛', group: 'religious' },
  { id: 'upanayana', label: 'Thread Ceremony / Upanayan', labelHi: 'उपनयन संस्कार', category: 'religious', primaryPeople: 1, defaultFunctions: ['Upanayan'], emoji: '🕉️', group: 'religious' },
  { id: 'nikah', label: 'Nikah', labelHi: 'निकाह', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Mehndi', 'Nikah', 'Walima'], emoji: '🌙', group: 'weddings' },
  { id: 'christian-wedding', label: 'Church Wedding', labelHi: 'विवाह', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Holy Matrimony', 'Reception'], emoji: '⛪', group: 'weddings' },
  { id: 'anand-karaj', label: 'Anand Karaj', labelHi: 'आनंद कारज', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Anand Karaj', 'Reception'], emoji: '🪯', group: 'weddings' },
  { id: 'retirement', label: 'Retirement', labelHi: 'सेवानिवृत्ति', category: 'celebration', primaryPeople: 1, defaultFunctions: ['Farewell Party'], emoji: '🎉', group: 'celebrations' },
  { id: 'shop-opening', label: 'Shop / Office Opening', labelHi: 'शुभारंभ', category: 'business', primaryPeople: 0, defaultFunctions: ['Inauguration'], emoji: '🏪', group: 'business' },
  { id: 'corporate', label: 'Corporate Event', labelHi: 'कॉर्पोरेट कार्यक्रम', category: 'business', primaryPeople: 0, defaultFunctions: ['Event'], emoji: '🏢', group: 'business' },
  // ---------------- Wedding functions (their own invitations) ----------------
  { id: 'haldi', label: 'Haldi', labelHi: 'हल्दी', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Haldi'], emoji: '💛', group: 'wedding-functions' },
  { id: 'mehendi', label: 'Mehendi', labelHi: 'मेहंदी', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Mehendi'], emoji: '🌿', group: 'wedding-functions' },
  { id: 'sangeet', label: 'Sangeet', labelHi: 'संगीत संध्या', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Sangeet'], emoji: '🎶', group: 'wedding-functions' },
  { id: 'ring-ceremony', label: 'Ring Ceremony', labelHi: 'रिंग सेरेमनी', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Ring Ceremony'], emoji: '💍', group: 'wedding-functions' },
  { id: 'tilak', label: 'Tilak', labelHi: 'तिलक', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Tilak'], emoji: '🔴', group: 'wedding-functions' },
  { id: 'roka', label: 'Roka', labelHi: 'रोका', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Roka'], emoji: '🤝', group: 'wedding-functions' },
  { id: 'cocktail', label: 'Cocktail Party', labelHi: 'कॉकटेल पार्टी', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Cocktail Party'], emoji: '🍸', group: 'wedding-functions' },
  { id: 'bachelorette', label: 'Bachelor / Bachelorette', labelHi: 'बैचलर पार्टी', category: 'celebration', primaryPeople: 1, defaultFunctions: ['Bachelorette Party'], emoji: '🥳', group: 'wedding-functions' },
  // ---------------- Celebrations ----------------
  { id: 'first-birthday', label: 'First Birthday', labelHi: 'पहला जन्मदिन', category: 'celebration', primaryPeople: 1, defaultFunctions: ['Birthday Party'], emoji: '🧁', group: 'celebrations' },
  { id: 'milestone-birthday', label: '50th / 60th Birthday', labelHi: 'षष्टिपूर्ति / ख़ास जन्मदिन', category: 'celebration', primaryPeople: 1, defaultFunctions: ['Birthday Party'], emoji: '🎊', group: 'celebrations' },
  { id: 'kitty-party', label: 'Kitty Party', labelHi: 'किटी पार्टी', category: 'celebration', primaryPeople: 0, defaultFunctions: ['Kitty Party'], emoji: '👯', group: 'celebrations' },
  { id: 'graduation', label: 'Graduation', labelHi: 'दीक्षांत समारोह', category: 'celebration', primaryPeople: 1, defaultFunctions: ['Graduation Party'], emoji: '🎓', group: 'celebrations' },
  { id: 'farewell', label: 'Farewell', labelHi: 'विदाई समारोह', category: 'celebration', primaryPeople: 1, defaultFunctions: ['Farewell Party'], emoji: '👋', group: 'celebrations' },
  { id: 'reunion', label: 'Reunion', labelHi: 'पुनर्मिलन', category: 'celebration', primaryPeople: 0, defaultFunctions: ['Reunion'], emoji: '🤗', group: 'celebrations' },
  { id: 'satyanarayan-katha', label: 'Satyanarayan Katha', labelHi: 'सत्यनारायण कथा', category: 'religious', primaryPeople: 0, defaultFunctions: ['Katha', 'Prasad'], emoji: '🪔', group: 'religious' },
  // ---------------- Festivals (greeting or party invite) ----------------
  { id: 'diwali', label: 'Diwali', labelHi: 'दीपावली', category: 'festival', primaryPeople: 0, defaultFunctions: ['Diwali Puja'], emoji: '🪔', group: 'festivals', greeting: 'both' },
  { id: 'holi', label: 'Holi', labelHi: 'होली', category: 'festival', primaryPeople: 0, defaultFunctions: ['Holi Milan'], emoji: '🎨', group: 'festivals', greeting: 'both' },
  { id: 'christmas', label: 'Christmas', labelHi: 'क्रिसमस', category: 'festival', primaryPeople: 0, defaultFunctions: ['Christmas Party'], emoji: '🎄', group: 'festivals', greeting: 'both' },
  { id: 'new-year', label: 'New Year', labelHi: 'नया साल', category: 'festival', primaryPeople: 0, defaultFunctions: ['New Year Party'], emoji: '🎆', group: 'festivals', greeting: 'both' },
  { id: 'raksha-bandhan', label: 'Raksha Bandhan', labelHi: 'रक्षा बंधन', category: 'festival', primaryPeople: 0, defaultFunctions: ['Raksha Bandhan'], emoji: '🧵', group: 'festivals', greeting: 'both' },
  { id: 'bhai-dooj', label: 'Bhai Dooj', labelHi: 'भाई दूज', category: 'festival', primaryPeople: 0, defaultFunctions: ['Bhai Dooj'], emoji: '🌺', group: 'festivals', greeting: 'both' },
  { id: 'eid', label: 'Eid', labelHi: 'ईद', category: 'festival', primaryPeople: 0, defaultFunctions: ['Eid Milan'], emoji: '🌙', group: 'festivals', greeting: 'both' },
  { id: 'navratri', label: 'Navratri / Garba', labelHi: 'नवरात्रि / गरबा', category: 'festival', primaryPeople: 0, defaultFunctions: ['Garba Night'], emoji: '💃', group: 'festivals', greeting: 'both' },
  { id: 'ganesh-chaturthi', label: 'Ganesh Chaturthi', labelHi: 'गणेश चतुर्थी', category: 'festival', primaryPeople: 0, defaultFunctions: ['Ganpati Sthapana', 'Visarjan'], emoji: '🐘', group: 'festivals', greeting: 'both' },
  { id: 'lohri', label: 'Lohri', labelHi: 'लोहड़ी', category: 'festival', primaryPeople: 0, defaultFunctions: ['Lohri Night'], emoji: '🔥', group: 'festivals', greeting: 'both' },
  { id: 'sankranti', label: 'Makar Sankranti / Pongal', labelHi: 'मकर संक्रांति / पोंगल', category: 'festival', primaryPeople: 0, defaultFunctions: ['Sankranti'], emoji: '🪁', group: 'festivals', greeting: 'both' },
  { id: 'onam', label: 'Onam', labelHi: 'ओणम', category: 'festival', primaryPeople: 0, defaultFunctions: ['Onam Sadya'], emoji: '🌼', group: 'festivals', greeting: 'both' },
  { id: 'durga-puja', label: 'Durga Puja', labelHi: 'दुर्गा पूजा', category: 'festival', primaryPeople: 0, defaultFunctions: ['Durga Puja'], emoji: '🔱', group: 'festivals', greeting: 'both' },
  { id: 'karva-chauth', label: 'Karva Chauth', labelHi: 'करवा चौथ', category: 'festival', primaryPeople: 0, defaultFunctions: ['Karva Chauth'], emoji: '🌕', group: 'festivals', greeting: 'both' },
  { id: 'janmashtami', label: 'Janmashtami', labelHi: 'जन्माष्टमी', category: 'festival', primaryPeople: 0, defaultFunctions: ['Janmashtami'], emoji: '🦚', group: 'festivals', greeting: 'both' },
  { id: 'gurpurab', label: 'Gurpurab', labelHi: 'गुरपुरब', category: 'festival', primaryPeople: 0, defaultFunctions: ['Gurpurab'], emoji: '🪯', group: 'festivals', greeting: 'both' },
  // ---------------- Trips & holidays ----------------
  { id: 'group-trip', label: 'Group Trip / Getaway', labelHi: 'ग्रुप ट्रिप', category: 'trip', primaryPeople: 0, defaultFunctions: ['Day 1', 'Day 2', 'Day 3'], emoji: '🏝️', group: 'trips' },
  { id: 'family-trip', label: 'Family Reunion Trip', labelHi: 'फ़ैमिली ट्रिप', category: 'trip', primaryPeople: 0, defaultFunctions: ['Day 1', 'Day 2'], emoji: '🧳', group: 'trips' },
  { id: 'holiday-greeting', label: 'Holiday Greeting', labelHi: 'छुट्टियों की शुभकामना', category: 'trip', primaryPeople: 0, defaultFunctions: ['Holidays'], emoji: '✈️', group: 'trips', greeting: 'only' },
  { id: 'other', label: 'Other', labelHi: 'अन्य', category: 'celebration', primaryPeople: 0, defaultFunctions: ['Event'], emoji: '✨', group: 'celebrations' },
] as const satisfies readonly EventTypeDef[];

export type EventTypeId = (typeof EVENT_TYPES)[number]['id'];
export const EVENT_TYPE_IDS = EVENT_TYPES.map((e) => e.id) as [EventTypeId, ...EventTypeId[]];

export function getEventType(id: string): EventTypeDef {
  return EVENT_TYPES.find((e) => e.id === id) ?? EVENT_TYPES[EVENT_TYPES.length - 1]!;
}

export const COMMUNITIES = [
  'hindu-north',
  'hindu-south',
  'marwari',
  'gujarati',
  'marathi',
  'bengali',
  'punjabi',
  'sikh',
  'muslim',
  'christian',
  'jain',
  'buddhist',
  'modern',
] as const;
export type Community = (typeof COMMUNITIES)[number];
