export const EVENT_CATEGORIES = ['wedding', 'family', 'religious', 'celebration', 'business'] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

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
}

export const EVENT_TYPES = [
  { id: 'wedding', label: 'Wedding', labelHi: 'शुभ विवाह', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Haldi', 'Mehendi', 'Sangeet', 'Wedding', 'Reception'], emoji: '💍' },
  { id: 'engagement', label: 'Engagement / Sagai', labelHi: 'सगाई', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Ring Ceremony'], emoji: '💞' },
  { id: 'reception', label: 'Reception', labelHi: 'स्वागत समारोह', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Reception'], emoji: '🥂' },
  { id: 'anniversary', label: 'Anniversary', labelHi: 'वैवाहिक वर्षगाँठ', category: 'celebration', primaryPeople: 2, defaultFunctions: ['Celebration'], emoji: '💐' },
  { id: 'birthday', label: 'Birthday', labelHi: 'जन्मदिन', category: 'celebration', primaryPeople: 1, defaultFunctions: ['Birthday Party'], emoji: '🎂' },
  { id: 'baby-shower', label: 'Baby Shower / Godh Bharai', labelHi: 'गोद भराई', category: 'family', primaryPeople: 1, defaultFunctions: ['Godh Bharai'], emoji: '🍼' },
  { id: 'naming-ceremony', label: 'Naming Ceremony / Naamkaran', labelHi: 'नामकरण संस्कार', category: 'family', primaryPeople: 1, defaultFunctions: ['Naamkaran'], emoji: '👶' },
  { id: 'mundan', label: 'Mundan', labelHi: 'मुंडन संस्कार', category: 'religious', primaryPeople: 1, defaultFunctions: ['Mundan Sanskar'], emoji: '🪔' },
  { id: 'annaprashan', label: 'Annaprashan', labelHi: 'अन्नप्राशन', category: 'religious', primaryPeople: 1, defaultFunctions: ['Annaprashan'], emoji: '🍚' },
  { id: 'griha-pravesh', label: 'Griha Pravesh / Housewarming', labelHi: 'गृह प्रवेश', category: 'religious', primaryPeople: 0, defaultFunctions: ['Puja', 'Bhoj'], emoji: '🏠' },
  { id: 'puja', label: 'Puja / Katha', labelHi: 'पूजा / कथा', category: 'religious', primaryPeople: 0, defaultFunctions: ['Puja', 'Prasad'], emoji: '🙏' },
  { id: 'jagran', label: 'Jagran / Mata ki Chowki', labelHi: 'जागरण', category: 'religious', primaryPeople: 0, defaultFunctions: ['Jagran'], emoji: '🔱' },
  { id: 'bhandara', label: 'Bhandara', labelHi: 'भंडारा', category: 'religious', primaryPeople: 0, defaultFunctions: ['Bhandara'], emoji: '🍛' },
  { id: 'upanayana', label: 'Thread Ceremony / Upanayan', labelHi: 'उपनयन संस्कार', category: 'religious', primaryPeople: 1, defaultFunctions: ['Upanayan'], emoji: '🕉️' },
  { id: 'nikah', label: 'Nikah', labelHi: 'निकाह', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Mehndi', 'Nikah', 'Walima'], emoji: '🌙' },
  { id: 'christian-wedding', label: 'Church Wedding', labelHi: 'विवाह', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Holy Matrimony', 'Reception'], emoji: '⛪' },
  { id: 'anand-karaj', label: 'Anand Karaj', labelHi: 'आनंद कारज', category: 'wedding', primaryPeople: 2, defaultFunctions: ['Anand Karaj', 'Reception'], emoji: '🪯' },
  { id: 'retirement', label: 'Retirement', labelHi: 'सेवानिवृत्ति', category: 'celebration', primaryPeople: 1, defaultFunctions: ['Farewell Party'], emoji: '🎉' },
  { id: 'shop-opening', label: 'Shop / Office Opening', labelHi: 'शुभारंभ', category: 'business', primaryPeople: 0, defaultFunctions: ['Inauguration'], emoji: '🏪' },
  { id: 'corporate', label: 'Corporate Event', labelHi: 'कॉर्पोरेट कार्यक्रम', category: 'business', primaryPeople: 0, defaultFunctions: ['Event'], emoji: '🏢' },
  { id: 'other', label: 'Other', labelHi: 'अन्य', category: 'celebration', primaryPeople: 0, defaultFunctions: ['Event'], emoji: '✨' },
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
