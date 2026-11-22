import { getLanguage, type Language, type LanguageCode } from '@cardai/shared';

/**
 * Landing pages per card language at /invitation-maker/<slug>. The page's wording samples come from the
 * product's own stock wording (shared/constants/stock-wording), so nothing here is a second translation.
 * What is written here is the part search needs: the local name for the invitation, where the language
 * is spoken, the functions families in that region actually hold, and a few honest questions.
 */
export interface LanguagePage {
  code: Exclude<LanguageCode, 'en'>;
  slug: string;
  /** What the wedding invitation is called, in the language's own script. */
  term: string;
  /** The same, in Latin letters, the way people type it into search. */
  termRoman: string;
  /** Where the language is mainly spoken, for the intro. */
  region: string;
  /** Functions and ceremonies families in that region commonly hold (shown as chips). */
  functions: string[];
  /** One paragraph on how invitations are usually worded and shared in this community. */
  custom: string;
  /** Extra search phrases, in Latin letters. */
  keywords: string[];
  faq: Array<[string, string]>;
}

export const LANGUAGE_PAGES: LanguagePage[] = [
  {
    code: 'hi',
    slug: 'hindi',
    term: 'शादी का कार्ड',
    termRoman: 'shadi card',
    region: 'Uttar Pradesh, Bihar, Madhya Pradesh, Rajasthan, Delhi, Haryana and across north India',
    functions: ['Roka', 'Tilak', 'Haldi', 'Mehndi', 'Sangeet', 'Baraat', 'Pheras', 'Reception', 'Griha pravesh', 'Mundan'],
    custom:
      'A Hindi invitation usually opens with a shloka or “ॐ श्री गणेशाय नमः” and names both families, with the elders’ names above the couple’s. “सादर आमंत्रित” and “दर्शनाभिलाषी” are the traditional closing lines, and many families list the relatives who send their regards.',
    keywords: ['shadi card maker in hindi', 'hindi wedding card maker online', 'shadi ka card banaye', 'hindi invitation card maker', 'हिंदी निमंत्रण कार्ड'],
    faq: [
      ['Can I make a shadi card in Hindi online for free?', 'Yes. Preview any design with your own names in Hindi for free. The card, video and website are made from the same details, and you pay once per event only for the extras you want.'],
      ['Can I type the names in English and get them in Hindi?', 'Yes. Type the names in English and convert them to Devanagari, then correct any spelling before you share.'],
    ],
  },
  {
    code: 'mr',
    slug: 'marathi',
    term: 'लग्नपत्रिका',
    termRoman: 'lagna patrika',
    region: 'Maharashtra, Goa and Marathi families across India',
    functions: ['Sakhar puda', 'Kelvan', 'Haldi', 'Sangeet', 'Lagna', 'Reception', 'Satyanarayan puja', 'Vastushanti'],
    custom:
      'A Marathi lagna patrika often begins with a shloka and “श्री गणेशाय नमः”, followed by “सस्नेह निमंत्रण” and the names of both sets of parents. The mangalashtak is traditionally included, and the invitation lists the muhurat time precisely.',
    keywords: ['marathi lagna patrika maker', 'marathi wedding card maker online', 'lagnapatrika marathi online', 'marathi invitation card maker', 'मराठी निमंत्रण पत्रिका'],
    faq: [
      ['Can I make a lagna patrika in Marathi online?', 'Yes. Write the details once and get a Marathi card, a video and an RSVP website, ready to share on WhatsApp.'],
      ['Does it include the muhurat time and the mangalashtak?', 'You can type the muhurat as the function time, and write the verses into the card wording or ask AI to draft the text in Marathi.'],
    ],
  },
  {
    code: 'gu',
    slug: 'gujarati',
    term: 'લગ્ન કંકોત્રી',
    termRoman: 'lagna kankotri',
    region: 'Gujarat, Mumbai, and Gujarati families in India and abroad',
    functions: ['Mandap muhurat', 'Pithi', 'Mehndi', 'Garba', 'Sangeet', 'Lagna', 'Reception', 'Seemant'],
    custom:
      'The Gujarati kankotri traditionally comes with a first card offered to the family deity, and is worded with “આપને સાદર આમંત્રણ”. Garba and mandap muhurat are listed as their own functions, so guests can choose which to attend.',
    keywords: ['gujarati wedding card maker online', 'kankotri maker online', 'gujarati lagna kankotri', 'gujarati invitation card maker', 'ગુજરાતી કંકોત્રી'],
    faq: [
      ['Can I make a Gujarati kankotri online?', 'Yes. Pick a design, write the details in Gujarati and share the card, video or invitation website on WhatsApp.'],
      ['Can guests reply for garba and the wedding separately?', 'Yes. Each function has its own date, time and venue, and guests reply for each one separately.'],
    ],
  },
  {
    code: 'ta',
    slug: 'tamil',
    term: 'திருமண அழைப்பிதழ்',
    termRoman: 'thirumana azhaippu',
    region: 'Tamil Nadu, Puducherry, and Tamil families in Singapore, Malaysia, Sri Lanka and elsewhere',
    functions: ['Nichayathartham', 'Pandhakkal muhurtham', 'Mehndi', 'Muhurtham', 'Reception', 'Valaikaappu', 'Gruhapravesam', 'Naming ceremony'],
    custom:
      'Tamil invitations often start with an invocation and give the muhurtham time in both the Tamil calendar and the English date. The first invitation goes to the family deity and elders, and the wording is formal and complete.',
    keywords: ['tamil wedding invitation maker online', 'tamil kalyana azhaippithazh', 'tamil invitation card maker', 'tamil wedding card online', 'தமிழ் அழைப்பிதழ்'],
    faq: [
      ['Can I write a wedding invitation in Tamil online?', 'Yes. The card, video and website all show the Tamil text in the right script, and you can add the muhurtham time and venue for each function.'],
      ['Can I make a valaikaappu or gruhapravesam invitation in Tamil?', 'Yes. Choose the baby shower or griha pravesh occasion and write it in Tamil.'],
    ],
  },
  {
    code: 'te',
    slug: 'telugu',
    term: 'పెళ్లి పత్రిక',
    termRoman: 'pelli patrika',
    region: 'Andhra Pradesh, Telangana, and Telugu families across India and overseas',
    functions: ['Pellikoduku', 'Pellikuthuru', 'Mehndi', 'Sangeet', 'Muhurtham', 'Reception', 'Seemantham', 'Gruhapravesam'],
    custom:
      'A Telugu pelli patrika often opens with “శ్రీరస్తు శుభమస్తు” and gives the muhurtham time carefully. The pellikoduku and pellikuthuru ceremonies and the main wedding are written as separate events, and the card names both sets of parents.',
    keywords: ['telugu wedding card maker online', 'pelli patrika maker', 'telugu invitation card maker', 'telugu wedding invitation online', 'తెలుగు పెళ్లి పత్రిక'],
    faq: [
      ['Can I make a pelli patrika in Telugu online?', 'Yes. Write the details in Telugu, or type them in English and convert names, and get a card, a video and an RSVP website.'],
      ['Does it support the muhurtham time?', 'Yes. Add the muhurtham as a function with its exact time and venue, with a map link for guests.'],
    ],
  },
  {
    code: 'kn',
    slug: 'kannada',
    term: 'ಮದುವೆ ಆಮಂತ್ರಣ ಪತ್ರಿಕೆ',
    termRoman: 'maduve amantrana patrike',
    region: 'Karnataka and Kannada families in Bengaluru, Mumbai, Hyderabad and abroad',
    functions: ['Nischayathartha', 'Haldi', 'Mehndi', 'Vara pooje', 'Muhurtha', 'Reception', 'Seemantha', 'Gruhapravesha'],
    custom:
      'Kannada wedding invitations list the muhurtha time and usually include the vara pooje and reception as separate lines. The tone is formal, with “ತಮ್ಮ ಆಗಮನವನ್ನು ಬಯಸುವ” style closing lines from both families.',
    keywords: ['kannada wedding card maker online', 'kannada invitation card maker', 'maduve invitation maker', 'kannada wedding invitation online', 'ಕನ್ನಡ ಮದುವೆ ಆಮಂತ್ರಣ'],
    faq: [
      ['Can I make a Kannada wedding invitation online?', 'Yes. Pick a design, write in Kannada and share the card, video or website on WhatsApp.'],
      ['Can I invite for the reception and the muhurtha separately?', 'Yes. Each function has its own time and venue, and guests reply to each one.'],
    ],
  },
  {
    code: 'ml',
    slug: 'malayalam',
    term: 'വിവാഹ ക്ഷണക്കത്ത്',
    termRoman: 'vivaha kshanakkathu',
    region: 'Kerala, and Malayali families in the Gulf, the US, the UK and across India',
    functions: ['Betrothal', 'Haldi', 'Mehndi', 'Muhurtham', 'Reception', 'Sadya', 'Gruhapravesham', 'Choroonu'],
    custom:
      'A Malayalam wedding invitation (kshanakkathu) gives the muhurtham and the hall clearly and often mentions the sadya. Families overseas usually send the digital invitation first to guests who will travel.',
    keywords: ['malayalam wedding invitation maker', 'malayalam invitation card maker online', 'kshanakkathu online', 'malayalam wedding card online', 'മലയാളം വിവാഹ ക്ഷണക്കത്ത്'],
    faq: [
      ['Can I make a Malayalam wedding invitation online?', 'Yes. Write the details in Malayalam and share the card, a video or the invitation website on WhatsApp.'],
      ['Does it work for Christian and Muslim weddings in Kerala?', 'Yes. Choose the nikah occasion for a Muslim wedding, or write your own wording for a church wedding. The sacred marks follow the occasion you choose, not the design.'],
    ],
  },
  {
    code: 'bn',
    slug: 'bengali',
    term: 'বিয়ের নিমন্ত্রণ পত্র',
    termRoman: 'biyer nimantran patra',
    region: 'West Bengal, Kolkata, Tripura, and Bengali families across India and abroad',
    functions: ['Aiburobhat', 'Gaye holud', 'Bor jatri', 'Subho drishti', 'Bou bhat', 'Reception', 'Annaprashan', 'Griha pravesh'],
    custom:
      'A Bengali biyer nimantran lists the ceremonies by their Bengali names, and traditionally mentions the aiburobhat and gaye holud. The tone is “সবান্ধব আপনার আমন্ত্রণ” style: warm and formal.',
    keywords: ['bengali wedding card maker online', 'bengali invitation card maker', 'biyer card online', 'bengali wedding invitation online', 'বাংলা বিয়ের কার্ড'],
    faq: [
      ['Can I make a Bengali wedding card online?', 'Yes. Write in Bengali and get a card, a video invitation and an RSVP website.'],
      ['Can I invite separately for gaye holud and the wedding?', 'Yes. Add each as its own function with its time and venue.'],
    ],
  },
  {
    code: 'pa',
    slug: 'punjabi',
    term: 'ਵਿਆਹ ਦਾ ਸੱਦਾ ਪੱਤਰ',
    termRoman: 'viah da sadda patar',
    region: 'Punjab, Delhi, Haryana, and Punjabi families in Canada, the UK, Australia and the Gulf',
    functions: ['Roka', 'Chunni chadayi', 'Jaggo', 'Mehndi', 'Ladies sangeet', 'Anand karaj', 'Doli', 'Reception'],
    custom:
      'A Punjabi invitation for a Sikh wedding opens with “ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ” and states the anand karaj at the gurdwara, with the langar or reception after. Jaggo, mehndi and ladies sangeet are the pre-wedding functions families usually list.',
    keywords: ['punjabi wedding card maker online', 'anand karaj invitation maker', 'punjabi invitation card maker', 'punjabi wedding invitation online', 'ਪੰਜਾਬੀ ਵਿਆਹ ਕਾਰਡ'],
    faq: [
      ['Can I make a Punjabi wedding card in Gurmukhi online?', 'Yes. Write the details in Punjabi (Gurmukhi) and share the card, video or website on WhatsApp.'],
      ['Can I make an anand karaj invitation?', 'Yes. Add the anand karaj and the reception as functions with their own times and venues, with the gurdwara address and map.'],
    ],
  },
  {
    code: 'or',
    slug: 'odia',
    term: 'ବିବାହ ନିମନ୍ତ୍ରଣ ପତ୍ର',
    termRoman: 'bibaha nimantran patra',
    region: 'Odisha, and Odia families in Kolkata, Bengaluru, Mumbai and abroad',
    functions: ['Nirbandha', 'Haldi', 'Mehndi', 'Bibaha', 'Chauthi', 'Reception', 'Annaprasana', 'Griha pravesh'],
    custom:
      'An Odia bibaha nimantran is formal, giving the bibaha muhurat and the chauthi function separately. Many families begin with an invocation to Lord Jagannath.',
    keywords: ['odia wedding card maker online', 'odia invitation card maker', 'odia bibaha card online', 'odia wedding invitation online', 'ଓଡ଼ିଆ ବିବାହ ନିମନ୍ତ୍ରଣ'],
    faq: [
      ['Can I make an Odia wedding invitation online?', 'Yes. Write the details in Odia and get a card, video and invitation website.'],
      ['Can I add the muhurat time and the venue map?', 'Yes. Each function has a date, time and venue, and the website shows the venue on a map.'],
    ],
  },
  {
    code: 'ur',
    slug: 'urdu',
    term: 'شادی کارڈ',
    termRoman: 'shadi card',
    region: 'Hyderabad, Lucknow, Delhi, Mumbai, Kolkata and Urdu-speaking families across India',
    functions: ['Mehndi', 'Mayun', 'Nikah', 'Baraat', 'Rukhsati', 'Walima', 'Aqiqah', 'Bismillah'],
    custom:
      'An Urdu nikah or shadi card is read right to left and opens with “بسم اللہ الرحمٰن الرحیم”. Nikah and walima are written as separate events, usually with the dawat details and the names of both families.',
    keywords: ['urdu wedding card maker online', 'nikah card maker urdu', 'urdu invitation card maker', 'walima invitation urdu', 'اردو شادی کارڈ'],
    faq: [
      ['Can I make a nikah card in Urdu online?', 'Yes. The card is set right to left in a Nastaliq style font. Choose the nikah occasion and write the details in Urdu.'],
      ['Can I invite separately for nikah and walima?', 'Yes. Add both as functions with their own time and venue.'],
    ],
  },
];

export const languagePageBySlug = (slug: string) => LANGUAGE_PAGES.find((l) => l.slug === slug);

export const languageHref = (slug: string) => `/invitation-maker/${slug}`;

export const languageOf = (p: LanguagePage): Language => getLanguage(p.code);
