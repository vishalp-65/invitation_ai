import { OCCASION_SLUGS, type OccasionWithPage } from './routes';

/** English and Hindi copy (the UI locale is cookie-based, so both live at one URL). */
export interface L {
  en: string;
  hi: string;
}

export interface OccasionPage {
  type: OccasionWithPage;
  slug: string;
  /** Short occasion name for labels and generated sentences. */
  name: L;
  /** <title> before the " · Noyta" suffix: main search term first, at most ~52 characters. */
  title: string;
  /** Meta description, 140–160 characters. */
  description: string;
  h1: L;
  intro: L;
  /** Occasion-specific questions; the page adds the shared ones (price, languages, WhatsApp, print). */
  faq: Array<{ q: L; a: L }>;
  /** Other occasion pages linked at the bottom. */
  related: OccasionWithPage[];
}

const page = (type: OccasionWithPage, p: Omit<OccasionPage, 'type' | 'slug'>): OccasionPage => ({ type, slug: OCCASION_SLUGS[type], ...p });

/**
 * Landing page copy. Every claim here must hold in the product: functions come from EVENT_TYPES,
 * blessings follow the event's faith (constants/faith.ts), prices are read live on the page.
 */
export const OCCASION_PAGES: OccasionPage[] = [
  page('wedding', {
    name: { en: 'Wedding', hi: 'शादी' },
    title: 'Wedding Invitation Card Maker: Card, Video & Website',
    description:
      'Make a wedding invitation card, WhatsApp video and RSVP website in Hindi or 11 more languages. Haldi, Mehendi, Sangeet and reception on one invite. Free to try.',
    h1: { en: 'Wedding invitation cards, videos and websites', hi: 'शादी के निमंत्रण कार्ड, वीडियो और वेबसाइट' },
    intro: {
      en: 'Write the names, dates and functions once — Haldi, Mehendi, Sangeet, the wedding and the reception — and get a print-quality card, a WhatsApp-ready video and an RSVP website that all match.',
      hi: 'नाम, तारीख़ और सारे कार्यक्रम एक बार लिखिए — हल्दी, मेहंदी, संगीत, शादी और रिसेप्शन — और पाइए छपाई जैसा कार्ड, WhatsApp वीडियो और RSVP वेबसाइट, सब एक जैसे डिज़ाइन में।',
    },
    faq: [
      {
        q: { en: 'Can one invitation cover Haldi, Mehendi, Sangeet and the wedding?', hi: 'क्या एक ही निमंत्रण में हल्दी, मेहंदी, संगीत और शादी आ सकते हैं?' },
        a: {
          en: 'Yes. Add each function with its own date, time and venue. The card lists them, the website shows the schedule with maps, and guests reply to each function separately.',
          hi: 'हाँ। हर कार्यक्रम अपनी तारीख़, समय और जगह के साथ जोड़िए। कार्ड में सब दिखेंगे, वेबसाइट पर नक्शे के साथ पूरा कार्यक्रम, और मेहमान हर कार्यक्रम के लिए अलग से जवाब देंगे।',
        },
      },
      {
        q: { en: 'Will the card start with a Ganesha blessing?', hi: 'क्या कार्ड गणेश वंदना से शुरू होगा?' },
        a: {
          en: 'A Hindu wedding card opens with a Ganesha blessing such as “Shri Ganeshay Namah” by default. Jain, Sikh, Christian and Muslim families get their own blessing instead, whichever design you pick, and you can edit the line.',
          hi: 'हिन्दू शादी का कार्ड अपने आप “श्री गणेशाय नमः” जैसी गणेश वंदना से शुरू होता है। जैन, सिख, ईसाई और मुस्लिम परिवारों को कोई भी डिज़ाइन चुनें, उनकी अपनी पंक्ति मिलती है, और आप इसे बदल भी सकते हैं।',
        },
      },
    ],
    related: ['engagement', 'nikah', 'anniversary', 'griha-pravesh'],
  }),

  page('engagement', {
    name: { en: 'Engagement', hi: 'सगाई' },
    title: 'Engagement Invitation Card & Video Maker (Sagai)',
    description:
      'Make a sagai or ring ceremony invitation card, WhatsApp video and RSVP website in Hindi, English or 10 more Indian languages. Preview every design free.',
    h1: { en: 'Engagement and sagai invitations', hi: 'सगाई के निमंत्रण' },
    intro: {
      en: 'Invite family to the ring ceremony with a card, a short video for WhatsApp and a website where guests say who is coming — all in the same design, in your language.',
      hi: 'रिंग सेरेमनी के लिए परिवार को बुलाइए — कार्ड, WhatsApp के लिए छोटा वीडियो और एक वेबसाइट जहाँ मेहमान बताएँ कि कौन आ रहा है। एक ही डिज़ाइन में, आपकी भाषा में।',
    },
    faq: [
      {
        q: { en: 'What should an engagement invitation include?', hi: 'सगाई के निमंत्रण में क्या लिखें?' },
        a: {
          en: 'The couple’s names, the families or parents who are inviting, the date, time and venue of the ring ceremony, and a contact for RSVP. AI wording fills these into a polite invitation you can edit.',
          hi: 'लड़का-लड़की के नाम, आमंत्रित करने वाले परिवार या माता-पिता, रिंग सेरेमनी की तारीख़, समय और जगह, और जवाब के लिए एक संपर्क। AI ये सब एक सुंदर निमंत्रण में लिख देता है, जिसे आप बदल सकते हैं।',
        },
      },
      {
        q: { en: 'Can guests tell me how many people are coming?', hi: 'क्या मेहमान बता सकते हैं कि कितने लोग आएँगे?' },
        a: {
          en: 'Yes. On the invitation website guests reply with their headcount and meal preference, and you see a live guest list.',
          hi: 'हाँ। निमंत्रण वेबसाइट पर मेहमान कितने लोग आएँगे और खाने की पसंद बताते हैं, और आपको तुरंत पूरी सूची दिखती है।',
        },
      },
    ],
    related: ['wedding', 'anniversary', 'nikah', 'birthday'],
  }),

  page('griha-pravesh', {
    name: { en: 'Griha Pravesh', hi: 'गृह प्रवेश' },
    title: 'Griha Pravesh Invitation Card & Video Maker',
    description:
      'Make a griha pravesh (housewarming) invitation card, WhatsApp video and RSVP website in Hindi, Marathi, Gujarati and more. Puja and bhoj timings on one invite.',
    h1: { en: 'Griha pravesh and housewarming invitations', hi: 'गृह प्रवेश के निमंत्रण' },
    intro: {
      en: 'Share the puja muhurat and the bhoj with everyone at once: a card with sacred kalash or Ganesha art, a short video for WhatsApp and a website with the address on a map.',
      hi: 'पूजा का मुहूर्त और भोज सबको एक साथ बताइए: कलश या गणेश वाला कार्ड, WhatsApp के लिए छोटा वीडियो और नक्शे पर पता दिखाने वाली वेबसाइट।',
    },
    faq: [
      {
        q: { en: 'What should a griha pravesh invitation say?', hi: 'गृह प्रवेश के निमंत्रण में क्या लिखें?' },
        a: {
          en: 'A short blessing, the family’s names, the new home’s address, and the puja and bhoj timings. For example: “By the grace of God, we invite you and your family to the griha pravesh puja of our new home.”',
          hi: 'एक छोटी वंदना, परिवार के नाम, नए घर का पता, और पूजा व भोज का समय। जैसे: “प्रभु कृपा से हमारे नए घर में गृह प्रवेश पूजा है। आप सपरिवार पधारें।”',
        },
      },
      {
        q: { en: 'Can I give separate times for the puja and the bhoj?', hi: 'क्या पूजा और भोज का समय अलग-अलग दे सकते हैं?' },
        a: {
          en: 'Yes. Puja and bhoj come pre-filled as two functions with their own times, and guests can reply to each.',
          hi: 'हाँ। पूजा और भोज पहले से दो अलग कार्यक्रम के रूप में आते हैं, दोनों का अपना समय, और मेहमान दोनों के लिए जवाब दे सकते हैं।',
        },
      },
    ],
    related: ['puja', 'naming-ceremony', 'mundan', 'wedding'],
  }),

  page('birthday', {
    name: { en: 'Birthday', hi: 'जन्मदिन' },
    title: 'Birthday Invitation Maker: Card, Video & Website',
    description:
      'Make a birthday invitation card, WhatsApp video and RSVP website for a first birthday, kids’ party or milestone birthday. In 12 languages, free to try.',
    h1: { en: 'Birthday invitation cards and videos', hi: 'जन्मदिन के निमंत्रण कार्ड और वीडियो' },
    intro: {
      en: 'From a first birthday to a 60th, make a bright card, a short video that plays well on WhatsApp and a party page where guests say they are coming.',
      hi: 'पहले जन्मदिन से 60वें तक, बनाइए रंगीन कार्ड, WhatsApp पर अच्छा चलने वाला छोटा वीडियो और पार्टी पेज जहाँ मेहमान बताएँ कि वे आ रहे हैं।',
    },
    faq: [
      {
        q: { en: 'Can I make a first birthday invitation?', hi: 'क्या पहले जन्मदिन का निमंत्रण बना सकते हैं?' },
        a: {
          en: 'Yes. Add the child’s name, age, date and venue, and pick from playful designs made for kids’ parties. AI can write the wording in English, Hindi or any of 12 languages.',
          hi: 'हाँ। बच्चे का नाम, उम्र, तारीख़ और जगह डालिए, और बच्चों की पार्टी के लिए बने डिज़ाइन चुनिए। AI अंग्रेज़ी, हिन्दी या 12 में से किसी भी भाषा में शब्द लिख देता है।',
        },
      },
      {
        q: { en: 'Will a birthday card have religious symbols?', hi: 'क्या जन्मदिन के कार्ड पर धार्मिक चिह्न होंगे?' },
        a: {
          en: 'No. Birthday invitations carry no blessing line or sacred art by default.',
          hi: 'नहीं। जन्मदिन के निमंत्रण पर अपने आप कोई वंदना या धार्मिक चिह्न नहीं आता।',
        },
      },
    ],
    related: ['anniversary', 'naming-ceremony', 'baby-shower', 'engagement'],
  }),

  page('nikah', {
    name: { en: 'Nikah', hi: 'निकाह' },
    title: 'Nikah Invitation Card & Video Maker (Walima)',
    description:
      'Make a nikah invitation card, WhatsApp video and RSVP website in Urdu, Hindi or English. Opens with Bismillah. Mehndi, nikah and walima on one invite.',
    h1: { en: 'Nikah and walima invitations', hi: 'निकाह और वलीमा के निमंत्रण' },
    intro: {
      en: 'Invite family to the mehndi, the nikah and the walima with one design: a card that opens with Bismillah, a video for WhatsApp and a website for RSVPs.',
      hi: 'मेहंदी, निकाह और वलीमा के लिए एक ही डिज़ाइन: बिस्मिल्लाह से शुरू होने वाला कार्ड, WhatsApp के लिए वीडियो और जवाब के लिए वेबसाइट।',
    },
    faq: [
      {
        q: { en: 'Will my nikah card start with Bismillah?', hi: 'क्या निकाह का कार्ड बिस्मिल्लाह से शुरू होगा?' },
        a: {
          en: 'Yes. Nikah invitations open with Bismillah-ir-Rahman-ir-Rahim and never carry Hindu symbols such as Ganesha, whichever design you choose.',
          hi: 'हाँ। निकाह के निमंत्रण बिस्मिल्लाह-इर-रहमान-इर-रहीम से शुरू होते हैं, और कोई भी डिज़ाइन चुनें, उन पर गणेश जैसे हिन्दू चिह्न कभी नहीं आते।',
        },
      },
      {
        q: { en: 'Can I write the invitation in Urdu?', hi: 'क्या निमंत्रण उर्दू में लिख सकते हैं?' },
        a: {
          en: 'Yes. Urdu is one of the 12 languages, with proper Nastaliq lettering. You can also write in Hindi or English.',
          hi: 'हाँ। उर्दू 12 भाषाओं में से एक है, सही नस्तालीक़ लिखावट के साथ। आप हिन्दी या अंग्रेज़ी में भी लिख सकते हैं।',
        },
      },
    ],
    related: ['wedding', 'engagement', 'anniversary', 'birthday'],
  }),

  page('puja', {
    name: { en: 'Puja', hi: 'पूजा' },
    title: 'Puja & Katha Invitation Card and Video Maker',
    description:
      'Make a puja, katha or path invitation card, WhatsApp video and RSVP website in Hindi or 11 more languages. Add puja and prasad timings. Free to make and share.',
    h1: { en: 'Puja and katha invitations', hi: 'पूजा और कथा के निमंत्रण' },
    intro: {
      en: 'For a Satyanarayan katha, a path or a family puja: a card with sacred art, a short video for the family WhatsApp group and a page where guests confirm.',
      hi: 'सत्यनारायण कथा, पाठ या घर की पूजा के लिए: पवित्र चित्रों वाला कार्ड, परिवार के WhatsApp ग्रुप के लिए छोटा वीडियो और एक पेज जहाँ मेहमान आने की पुष्टि करें।',
    },
    faq: [
      {
        q: { en: 'What should a puja invitation say?', hi: 'पूजा के निमंत्रण में क्या लिखें?' },
        a: {
          en: 'A blessing line, the name of the puja or katha, the family’s names, the date, time and address, and the prasad timing. AI writes this in the language you choose.',
          hi: 'एक वंदना, पूजा या कथा का नाम, परिवार के नाम, तारीख़, समय और पता, और प्रसाद का समय। AI यह आपकी चुनी भाषा में लिख देता है।',
        },
      },
      {
        q: { en: 'Can guests tell me if they’re staying for prasad?', hi: 'क्या मेहमान बता सकते हैं कि वे प्रसाद के लिए रुकेंगे?' },
        a: {
          en: 'Yes. Puja and prasad are separate functions, so guests reply to each with their headcount.',
          hi: 'हाँ। पूजा और प्रसाद अलग-अलग कार्यक्रम हैं, इसलिए मेहमान दोनों के लिए गिनती के साथ जवाब देते हैं।',
        },
      },
    ],
    related: ['griha-pravesh', 'mundan', 'naming-ceremony', 'wedding'],
  }),

  page('naming-ceremony', {
    name: { en: 'Naming ceremony', hi: 'नामकरण' },
    title: 'Naamkaran (Naming Ceremony) Invitation Card Maker',
    description:
      'Make a naamkaran or naming ceremony invitation card, WhatsApp video and RSVP website in Hindi or 11 more languages. Gentle designs for your baby. Free to try.',
    h1: { en: 'Naamkaran and naming ceremony invitations', hi: 'नामकरण संस्कार के निमंत्रण' },
    intro: {
      en: 'Welcome your baby with a soft, joyful card, a short video for WhatsApp and a page where family can reply — written in your language in a couple of minutes.',
      hi: 'अपने बच्चे के स्वागत के लिए कोमल, ख़ुशनुमा कार्ड, WhatsApp के लिए छोटा वीडियो और एक पेज जहाँ परिवार जवाब दे सके — आपकी भाषा में, दो मिनट में।',
    },
    faq: [
      {
        q: { en: 'What should a naamkaran invitation include?', hi: 'नामकरण के निमंत्रण में क्या लिखें?' },
        a: {
          en: 'The parents’ names, the ceremony date, time and venue, and a line inviting family to bless the baby. Many families keep the name a surprise until the day.',
          hi: 'माता-पिता के नाम, संस्कार की तारीख़, समय और जगह, और बच्चे को आशीर्वाद देने का निवेदन। कई परिवार नाम उसी दिन तक सरप्राइज़ रखते हैं।',
        },
      },
      {
        q: { en: 'Can I use the same design for the first birthday later?', hi: 'क्या बाद में पहले जन्मदिन के लिए भी यही डिज़ाइन ले सकते हैं?' },
        a: {
          en: 'Many designs suit both occasions. Pick it again when you make the birthday invitation and your new wording fills in.',
          hi: 'कई डिज़ाइन दोनों अवसरों के लिए हैं। जन्मदिन का निमंत्रण बनाते समय उसे फिर से चुनिए, नए शब्द अपने आप भर जाएँगे।',
        },
      },
    ],
    related: ['baby-shower', 'mundan', 'birthday', 'puja'],
  }),

  page('mundan', {
    name: { en: 'Mundan', hi: 'मुंडन' },
    title: 'Mundan Ceremony Invitation Card & Video Maker',
    description:
      'Make a mundan sanskar invitation card, WhatsApp video and RSVP website in Hindi or 11 more Indian languages. Traditional designs with sacred art. Free to try.',
    h1: { en: 'Mundan ceremony invitations', hi: 'मुंडन संस्कार के निमंत्रण' },
    intro: {
      en: 'Invite family to your child’s mundan sanskar with a traditional card, a short video for WhatsApp and a page with the venue and timings.',
      hi: 'बच्चे के मुंडन संस्कार के लिए परिवार को बुलाइए — पारंपरिक कार्ड, WhatsApp के लिए छोटा वीडियो और जगह व समय वाला पेज।',
    },
    faq: [
      {
        q: { en: 'What should a mundan invitation say?', hi: 'मुंडन के निमंत्रण में क्या लिखें?' },
        a: {
          en: 'A blessing line, the child’s and parents’ names, the date, time and venue (often a temple or home), and any bhoj after the ceremony.',
          hi: 'एक वंदना, बच्चे और माता-पिता के नाम, तारीख़, समय और जगह (अक्सर मंदिर या घर), और संस्कार के बाद भोज हो तो उसका समय।',
        },
      },
      {
        q: { en: 'Can I add a bhoj after the ceremony?', hi: 'क्या संस्कार के बाद भोज जोड़ सकते हैं?' },
        a: {
          en: 'Yes. Add it as a second function with its own time and place, and guests can reply to each.',
          hi: 'हाँ। उसे अपने समय और जगह के साथ दूसरे कार्यक्रम के रूप में जोड़िए, और मेहमान दोनों के लिए जवाब दे सकते हैं।',
        },
      },
    ],
    related: ['naming-ceremony', 'puja', 'griha-pravesh', 'birthday'],
  }),

  page('baby-shower', {
    name: { en: 'Baby shower', hi: 'गोद भराई' },
    title: 'Godh Bharai & Baby Shower Invitation Card Maker',
    description:
      'Make a godh bharai, seemantham or baby shower invitation card, WhatsApp video and RSVP website in Hindi or 11 more Indian languages. Free to make and share.',
    h1: { en: 'Godh bharai and baby shower invitations', hi: 'गोद भराई के निमंत्रण' },
    intro: {
      en: 'Celebrate the mother-to-be with a gentle card, a short video for WhatsApp and a page where the women of the family can say they are coming.',
      hi: 'होने वाली माँ के लिए कोमल कार्ड, WhatsApp के लिए छोटा वीडियो और एक पेज जहाँ परिवार की महिलाएँ बता सकें कि वे आ रही हैं।',
    },
    faq: [
      {
        q: { en: 'What should a godh bharai invitation include?', hi: 'गोद भराई के निमंत्रण में क्या लिखें?' },
        a: {
          en: 'The mother-to-be’s name, the hosting family, the date, time and venue, and a warm line asking guests to come and bless her.',
          hi: 'होने वाली माँ का नाम, आमंत्रित करने वाला परिवार, तारीख़, समय और जगह, और आशीर्वाद देने आने का प्यार भरा निवेदन।',
        },
      },
      {
        q: { en: 'Can I write it in Tamil or Telugu for a seemantham or valaikaapu?', hi: 'क्या सीमंतम या वलैकाप्पु के लिए तमिल या तेलुगु में लिख सकते हैं?' },
        a: {
          en: 'Yes. Tamil, Telugu, Kannada and Malayalam are all supported with correct script, and you can rename the function to match your tradition.',
          hi: 'हाँ। तमिल, तेलुगु, कन्नड़ और मलयालम सब सही लिपि में हैं, और आप कार्यक्रम का नाम अपनी परंपरा के अनुसार बदल सकते हैं।',
        },
      },
    ],
    related: ['naming-ceremony', 'birthday', 'mundan', 'puja'],
  }),

  page('anniversary', {
    name: { en: 'Anniversary', hi: 'सालगिरह' },
    title: 'Anniversary Invitation Card & Video Maker',
    description:
      'Make a wedding anniversary invitation card, WhatsApp video and RSVP website for a 25th, 50th or any year. In Hindi, English or 10 more languages. Free to try.',
    h1: { en: 'Anniversary invitation cards and videos', hi: 'शादी की सालगिरह के निमंत्रण' },
    intro: {
      en: 'For a silver jubilee, a golden anniversary or a family dinner: an elegant card, a short video for WhatsApp and a page where guests reply.',
      hi: 'सिल्वर जुबली, गोल्डन एनिवर्सरी या परिवार के साथ डिनर के लिए: सुंदर कार्ड, WhatsApp के लिए छोटा वीडियो और एक पेज जहाँ मेहमान जवाब दें।',
    },
    faq: [
      {
        q: { en: 'Can children host the invitation for their parents’ anniversary?', hi: 'क्या बच्चे माता-पिता की सालगिरह का निमंत्रण भेज सकते हैं?' },
        a: {
          en: 'Yes. Write the children or grandchildren as the hosts and the couple as the guests of honour. Every line of the wording can be edited.',
          hi: 'हाँ। बच्चों या पोते-पोतियों को आमंत्रित करने वाला और दंपति को सम्मानित अतिथि लिखिए। निमंत्रण की हर पंक्ति बदली जा सकती है।',
        },
      },
      {
        q: { en: 'Can I add old photos?', hi: 'क्या पुरानी तस्वीरें जोड़ सकते हैं?' },
        a: {
          en: 'Yes. Cards have a photo page, and the Premium invitation website adds a gallery for wedding-day and family photos.',
          hi: 'हाँ। कार्ड में फ़ोटो पेज है, और प्रीमियम निमंत्रण वेबसाइट में शादी के दिन और परिवार की तस्वीरों के लिए गैलरी भी है।',
        },
      },
    ],
    related: ['wedding', 'birthday', 'engagement', 'griha-pravesh'],
  }),
];

export const occasionBySlug = (slug: string) => OCCASION_PAGES.find((o) => o.slug === slug);
