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
    title: 'Wedding Invitation Maker: Premium Cards & Videos',
    description:
      'Create a stunning wedding invitation in minutes: premium cards, a WhatsApp video and an RSVP website with venue map. 12 Indian languages. Preview every design free.',
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

  page('reception', {
    name: { en: 'Reception', hi: 'रिसेप्शन' },
    title: 'Wedding Reception Invitation Card & Video Maker',
    description:
      'Make a wedding reception invitation card, WhatsApp video and RSVP website in English, Hindi or 10 more Indian languages. Dinner time, venue map and RSVP.',
    h1: { en: 'Wedding reception invitations', hi: 'शादी के रिसेप्शन के निमंत्रण' },
    intro: {
      en: 'Invite friends, colleagues and family to the reception with an elegant card, a short video for WhatsApp and a page with the venue map where guests say they’re coming.',
      hi: 'दोस्तों, सहकर्मियों और परिवार को रिसेप्शन पर बुलाइए — सुंदर कार्ड, WhatsApp के लिए छोटा वीडियो और नक्शे वाला पेज जहाँ मेहमान बताएँ कि वे आ रहे हैं।',
    },
    faq: [
      {
        q: { en: 'What should a reception invitation say?', hi: 'रिसेप्शन के निमंत्रण में क्या लिखें?' },
        a: {
          en: 'Who is hosting, the couple’s names, the date, the time dinner starts and the venue. For example: “Mr. & Mrs. Gupta request the pleasure of your company at the wedding reception of Ankit & Priya.”',
          hi: 'आमंत्रित करने वाले, वर-वधू के नाम, तारीख़, प्रीतिभोज का समय और जगह। जैसे: “अंकित व प्रिया के विवाह उपलक्ष्य में आयोजित प्रीतिभोज में आप सादर आमंत्रित हैं।”',
        },
      },
      {
        q: { en: 'Can I send a reception-only invitation to colleagues?', hi: 'क्या सहकर्मियों को सिर्फ़ रिसेप्शन का निमंत्रण भेज सकते हैं?' },
        a: {
          en: 'Yes. Make a separate reception invitation with just the reception’s date, time and venue, and send that one to colleagues.',
          hi: 'हाँ। सिर्फ़ रिसेप्शन की तारीख़, समय और जगह के साथ अलग निमंत्रण बनाइए, और वही सहकर्मियों को भेजिए।',
        },
      },
    ],
    related: ['wedding', 'engagement', 'anniversary', 'nikah'],
  }),

  page('anand-karaj', {
    name: { en: 'Anand Karaj', hi: 'आनंद कारज' },
    title: 'Anand Karaj (Sikh Wedding) Invitation Card Maker',
    description:
      'Make an Anand Karaj invitation card, WhatsApp video and RSVP website in Punjabi (Gurmukhi), Hindi or English. Opens with Ik Onkar. Free to make and share.',
    h1: { en: 'Anand Karaj and Sikh wedding invitations', hi: 'आनंद कारज के निमंत्रण' },
    intro: {
      en: 'Invite the sangat to the Anand Karaj and the reception with one design: a card that follows Sikh tradition, a video for WhatsApp and a website with the gurdwara on a map.',
      hi: 'आनंद कारज और रिसेप्शन के लिए एक ही डिज़ाइन: सिख परंपरा वाला कार्ड, WhatsApp के लिए वीडियो और गुरुद्वारे को नक्शे पर दिखाने वाली वेबसाइट।',
    },
    faq: [
      {
        q: { en: 'Will the card carry Hindu symbols?', hi: 'क्या कार्ड पर हिन्दू चिह्न आएँगे?' },
        a: {
          en: 'No. Anand Karaj invitations open with a Sikh blessing such as Ik Onkar and never show Ganesha or other Hindu marks, whichever design you pick.',
          hi: 'नहीं। आनंद कारज के निमंत्रण इक ओंकार जैसी सिख पंक्ति से शुरू होते हैं, और कोई भी डिज़ाइन चुनें, उन पर गणेश या दूसरे हिन्दू चिह्न नहीं आते।',
        },
      },
      {
        q: { en: 'Can I write the invitation in Punjabi?', hi: 'क्या निमंत्रण पंजाबी में लिख सकते हैं?' },
        a: {
          en: 'Yes. Punjabi in Gurmukhi script is one of the 12 languages. You can also write in Hindi or English.',
          hi: 'हाँ। गुरमुखी लिपि में पंजाबी 12 भाषाओं में से एक है। आप हिन्दी या अंग्रेज़ी में भी लिख सकते हैं।',
        },
      },
    ],
    related: ['wedding', 'reception', 'engagement', 'anniversary'],
  }),

  page('christian-wedding', {
    name: { en: 'Church wedding', hi: 'चर्च विवाह' },
    title: 'Christian Wedding Invitation Card & Video Maker',
    description:
      'Make a Christian or church wedding invitation card, WhatsApp video and RSVP website. Holy Matrimony and reception on one invite, in English or 11 Indian languages.',
    h1: { en: 'Christian and church wedding invitations', hi: 'ईसाई और चर्च विवाह के निमंत्रण' },
    intro: {
      en: 'Invite family to the Holy Matrimony and the reception: a card with a scripture line, a short video for WhatsApp and a website with the church and reception venue on a map.',
      hi: 'होली मैट्रिमनी और रिसेप्शन के लिए परिवार को बुलाइए: बाइबल की पंक्ति वाला कार्ड, WhatsApp के लिए छोटा वीडियो और चर्च व रिसेप्शन की जगह नक्शे पर दिखाने वाली वेबसाइट।',
    },
    faq: [
      {
        q: { en: 'Will a church wedding card carry a Bible verse?', hi: 'क्या चर्च विवाह के कार्ड पर बाइबल की पंक्ति होगी?' },
        a: {
          en: 'It opens with a Christian blessing line instead of Hindu symbols, whichever design you pick, and you can replace it with your own verse.',
          hi: 'कोई भी डिज़ाइन चुनें, कार्ड हिन्दू चिह्नों की जगह ईसाई आशीर्वाद की पंक्ति से शुरू होता है, और आप उसे अपनी पसंद की पंक्ति से बदल सकते हैं।',
        },
      },
      {
        q: { en: 'Can I write it in Malayalam or Tamil?', hi: 'क्या मलयालम या तमिल में लिख सकते हैं?' },
        a: {
          en: 'Yes. Malayalam, Tamil and 10 other Indian languages are supported in their own script, alongside English.',
          hi: 'हाँ। अंग्रेज़ी के साथ मलयालम, तमिल और 10 दूसरी भारतीय भाषाएँ अपनी लिपि में उपलब्ध हैं।',
        },
      },
    ],
    related: ['wedding', 'reception', 'engagement', 'anniversary'],
  }),

  page('annaprashan', {
    name: { en: 'Annaprashan', hi: 'अन्नप्राशन' },
    title: 'Annaprashan (Rice Ceremony) Invitation Card Maker',
    description:
      'Make an annaprashan, mukhe bhaat or choroonu invitation card, WhatsApp video and RSVP website in Bengali, Hindi, Malayalam and more. Free to make and share.',
    h1: { en: 'Annaprashan invitations', hi: 'अन्नप्राशन संस्कार के निमंत्रण' },
    intro: {
      en: 'Celebrate your baby’s first rice with a gentle card, a short video for the family WhatsApp group and a page with the venue and the bhoj timing.',
      hi: 'बच्चे के पहले अन्न के उत्सव के लिए कोमल कार्ड, परिवार के WhatsApp ग्रुप के लिए छोटा वीडियो और जगह व भोज के समय वाला पेज।',
    },
    faq: [
      {
        q: { en: 'What should an annaprashan invitation say?', hi: 'अन्नप्राशन के निमंत्रण में क्या लिखें?' },
        a: {
          en: 'The baby’s and parents’ names, the date, time and venue, and a line inviting family to bless the child at the first-rice ceremony and the meal after.',
          hi: 'बच्चे और माता-पिता के नाम, तारीख़, समय और जगह, और अन्नप्राशन व उसके बाद के भोज में बच्चे को आशीर्वाद देने का निवेदन।',
        },
      },
      {
        q: { en: 'Can I write it in Bengali for a mukhe bhaat?', hi: 'क्या मुखे भात के लिए बांग्ला में लिख सकते हैं?' },
        a: {
          en: 'Yes. Bengali is supported in its own script, and you can rename the function to mukhe bhaat, choroonu or whatever your family calls it.',
          hi: 'हाँ। बांग्ला अपनी लिपि में उपलब्ध है, और आप कार्यक्रम का नाम मुखे भात, चोरूणु या जो आपके परिवार में कहते हैं, रख सकते हैं।',
        },
      },
    ],
    related: ['naming-ceremony', 'mundan', 'birthday', 'baby-shower'],
  }),

  page('upanayana', {
    name: { en: 'Thread ceremony', hi: 'उपनयन' },
    title: 'Upanayanam (Thread Ceremony) Invitation Maker',
    description:
      'Make an upanayanam, janeu or munj thread ceremony invitation card, WhatsApp video and RSVP website in Telugu, Kannada, Tamil, Marathi, Hindi and more.',
    h1: { en: 'Thread ceremony and upanayanam invitations', hi: 'उपनयन और जनेऊ संस्कार के निमंत्रण' },
    intro: {
      en: 'Invite family to the upanayanam with a traditional card, a short video for WhatsApp and a page with the muhurat, venue map and bhojan timing.',
      hi: 'उपनयन संस्कार के लिए परिवार को बुलाइए — पारंपरिक कार्ड, WhatsApp के लिए छोटा वीडियो और मुहूर्त, नक्शे और भोजन के समय वाला पेज।',
    },
    faq: [
      {
        q: { en: 'What should a thread ceremony invitation include?', hi: 'उपनयन के निमंत्रण में क्या लिखें?' },
        a: {
          en: 'A blessing line, the boy’s and parents’ names, the muhurat, the venue and any bhojan after the ceremony. Families often add the grandparents as hosts.',
          hi: 'एक वंदना, बटु और माता-पिता के नाम, मुहूर्त, जगह और संस्कार के बाद भोजन हो तो उसका समय। कई परिवार दादा-दादी को भी आमंत्रित करने वालों में लिखते हैं।',
        },
      },
      {
        q: { en: 'Is it available in South Indian languages?', hi: 'क्या यह दक्षिण भारतीय भाषाओं में है?' },
        a: {
          en: 'Yes. Telugu, Kannada, Tamil and Malayalam are supported in their own script, along with Marathi, Hindi and English.',
          hi: 'हाँ। तेलुगु, कन्नड़, तमिल और मलयालम अपनी लिपि में हैं, साथ में मराठी, हिन्दी और अंग्रेज़ी भी।',
        },
      },
    ],
    related: ['mundan', 'puja', 'naming-ceremony', 'griha-pravesh'],
  }),

  page('jagran', {
    name: { en: 'Jagran', hi: 'जागरण' },
    title: 'Jagran & Mata ki Chowki Invitation Card Maker',
    description:
      'Make a jagran or Mata ki Chowki invitation card, WhatsApp video and RSVP website in Hindi or Punjabi. Add the bhajan and bhandara timings. Free to make and share.',
    h1: { en: 'Jagran and Mata ki Chowki invitations', hi: 'जागरण और माता की चौकी के निमंत्रण' },
    intro: {
      en: 'Invite family and neighbours to the jagran with a devotional card, a short video for WhatsApp and a page with the venue and timings.',
      hi: 'जागरण में परिवार और पड़ोसियों को बुलाइए — भक्ति भरा कार्ड, WhatsApp के लिए छोटा वीडियो और जगह व समय वाला पेज।',
    },
    faq: [
      {
        q: { en: 'What should a jagran invitation say?', hi: 'जागरण के निमंत्रण में क्या लिखें?' },
        a: {
          en: 'A devotional opening such as “Jai Mata Di”, the family’s names, the date, the start time, the venue and the bhandara or prasad timing.',
          hi: '“जय माता दी” जैसी शुरुआत, परिवार के नाम, तारीख़, शुरू होने का समय, जगह और भंडारे या प्रसाद का समय।',
        },
      },
      {
        q: { en: 'Can I add a bhandara after the jagran?', hi: 'क्या जागरण के बाद भंडारा जोड़ सकते हैं?' },
        a: {
          en: 'Yes. Add it as another function with its own time, so guests can reply to each.',
          hi: 'हाँ। उसे अपने समय के साथ दूसरे कार्यक्रम के रूप में जोड़िए, ताकि मेहमान दोनों के लिए जवाब दे सकें।',
        },
      },
    ],
    related: ['bhandara', 'puja', 'griha-pravesh', 'mundan'],
  }),

  page('bhandara', {
    name: { en: 'Bhandara', hi: 'भंडारा' },
    title: 'Bhandara Invitation Card & WhatsApp Message Maker',
    description:
      'Make a bhandara invitation card, WhatsApp video and page with the venue map in Hindi or 11 more Indian languages. Add puja and prasad timings. Free to share.',
    h1: { en: 'Bhandara invitations', hi: 'भंडारे के निमंत्रण' },
    intro: {
      en: 'Let the whole mohalla know about the bhandara: a devotional card, a short video for WhatsApp groups and a page with the address on a map.',
      hi: 'पूरे मोहल्ले को भंडारे की ख़बर दीजिए: भक्ति भरा कार्ड, WhatsApp ग्रुप के लिए छोटा वीडियो और नक्शे पर पता दिखाने वाला पेज।',
    },
    faq: [
      {
        q: { en: 'What should a bhandara invitation include?', hi: 'भंडारे के निमंत्रण में क्या लिखें?' },
        a: {
          en: 'The occasion (a puja, a path or a remembrance), the hosting family or committee, the date, the prasad timing and the address with a landmark.',
          hi: 'अवसर (पूजा, पाठ या पुण्यतिथि), आयोजक परिवार या समिति, तारीख़, प्रसाद का समय और किसी पहचान वाली जगह के साथ पता।',
        },
      },
      {
        q: { en: 'Can I share it in many WhatsApp groups at once?', hi: 'क्या इसे कई WhatsApp ग्रुप में एक साथ भेज सकते हैं?' },
        a: {
          en: 'Yes. Share the card or video, or the short link, which opens on any phone without an app.',
          hi: 'हाँ। कार्ड, वीडियो या छोटा लिंक भेजिए, जो बिना किसी ऐप के किसी भी फ़ोन पर खुलता है।',
        },
      },
    ],
    related: ['jagran', 'puja', 'griha-pravesh', 'mundan'],
  }),

  page('retirement', {
    name: { en: 'Retirement', hi: 'सेवानिवृत्ति' },
    title: 'Retirement Party Invitation Card & Video Maker',
    description:
      'Make a retirement or farewell party invitation card, WhatsApp video and RSVP website in English, Hindi or 10 more Indian languages. Free to make and share.',
    h1: { en: 'Retirement and farewell party invitations', hi: 'सेवानिवृत्ति समारोह के निमंत्रण' },
    intro: {
      en: 'Honour years of service with a dignified card, a short video for colleagues on WhatsApp and a page where guests confirm for the farewell.',
      hi: 'वर्षों की सेवा के सम्मान में गरिमापूर्ण कार्ड, सहकर्मियों के लिए WhatsApp वीडियो और एक पेज जहाँ मेहमान विदाई समारोह के लिए पुष्टि करें।',
    },
    faq: [
      {
        q: { en: 'What should a retirement invitation say?', hi: 'सेवानिवृत्ति के निमंत्रण में क्या लिखें?' },
        a: {
          en: 'The retiree’s name and role, years of service, who is hosting (family or office), the date, time and venue. For example: “Join us to celebrate 35 years of service of Shri R. K. Verma.”',
          hi: 'सेवानिवृत्त होने वाले का नाम और पद, सेवा के वर्ष, आयोजक (परिवार या कार्यालय), तारीख़, समय और जगह। जैसे: “श्री आर. के. वर्मा की 35 वर्षों की सेवा के सम्मान में आप आमंत्रित हैं।”',
        },
      },
      {
        q: { en: 'Will it have religious symbols?', hi: 'क्या इस पर धार्मिक चिह्न होंगे?' },
        a: {
          en: 'No. Retirement invitations carry no blessing line or sacred art by default; you can add one if you wish.',
          hi: 'नहीं। सेवानिवृत्ति के निमंत्रण पर अपने आप कोई वंदना या धार्मिक चिह्न नहीं आता; चाहें तो आप जोड़ सकते हैं।',
        },
      },
    ],
    related: ['birthday', 'anniversary', 'corporate', 'griha-pravesh'],
  }),

  page('shop-opening', {
    name: { en: 'Shop opening', hi: 'शुभारंभ' },
    title: 'Shop & Office Opening (Shubharambh) Invitation Maker',
    description:
      'Make a shop, showroom or office opening (shubharambh, udghatan) invitation card, WhatsApp video and page with a map, in Hindi or 11 more languages. Free to try.',
    h1: { en: 'Shop and office opening invitations', hi: 'दुकान और कार्यालय शुभारंभ के निमंत्रण' },
    intro: {
      en: 'Announce your new shop, showroom or office with a festive card, a short video for customers on WhatsApp and a page with the address on a map.',
      hi: 'अपनी नई दुकान, शोरूम या कार्यालय की घोषणा कीजिए — उत्सव वाला कार्ड, ग्राहकों के लिए WhatsApp वीडियो और नक्शे पर पता दिखाने वाला पेज।',
    },
    faq: [
      {
        q: { en: 'What should a shop opening invitation include?', hi: 'दुकान के शुभारंभ के निमंत्रण में क्या लिखें?' },
        a: {
          en: 'The business name, what you sell, the owners’ names, the date and time of the puja or ribbon cutting, the address with a landmark and any opening offer.',
          hi: 'दुकान का नाम, आप क्या बेचते हैं, मालिकों के नाम, पूजा या उद्घाटन की तारीख़ और समय, पहचान वाली जगह के साथ पता और कोई शुभारंभ ऑफ़र।',
        },
      },
      {
        q: { en: 'Can customers find the shop from the invitation?', hi: 'क्या ग्राहक निमंत्रण से दुकान ढूँढ सकते हैं?' },
        a: {
          en: 'Yes. The invitation website shows the address on a map that opens in their phone’s maps app.',
          hi: 'हाँ। निमंत्रण वेबसाइट पर पता नक्शे पर दिखता है, जो उनके फ़ोन के मैप ऐप में खुलता है।',
        },
      },
    ],
    related: ['griha-pravesh', 'puja', 'corporate', 'retirement'],
  }),

  page('corporate', {
    name: { en: 'Corporate event', hi: 'कॉर्पोरेट कार्यक्रम' },
    title: 'Corporate Event Invitation Card & RSVP Page Maker',
    description:
      'Make a corporate event, launch or annual day invitation card, WhatsApp video and RSVP page in English or 11 Indian languages. Track replies live. Free to try.',
    h1: { en: 'Corporate event invitations', hi: 'कॉर्पोरेट कार्यक्रम के निमंत्रण' },
    intro: {
      en: 'For a product launch, annual day or team offsite: a clean card, a short video for WhatsApp and an RSVP page with a live list of who is coming.',
      hi: 'प्रोडक्ट लॉन्च, वार्षिक दिवस या टीम आउटिंग के लिए: साफ़-सुथरा कार्ड, WhatsApp के लिए छोटा वीडियो और RSVP पेज जिसमें आने वालों की लाइव सूची हो।',
    },
    faq: [
      {
        q: { en: 'Can I track RSVPs for a corporate event?', hi: 'क्या कॉर्पोरेट कार्यक्रम के RSVP देख सकते हैं?' },
        a: {
          en: 'Yes. Guests reply on the invitation page and you see a live list with headcounts, which co-organisers can help manage.',
          hi: 'हाँ। मेहमान निमंत्रण पेज पर जवाब देते हैं और आपको गिनती के साथ लाइव सूची दिखती है, जिसे सह-आयोजक भी संभाल सकते हैं।',
        },
      },
      {
        q: { en: 'Can I invite people in their own language?', hi: 'क्या लोगों को उनकी भाषा में बुला सकते हैं?' },
        a: {
          en: 'Yes. Write the invitation in English or any of 11 Indian languages, each in its own script.',
          hi: 'हाँ। निमंत्रण अंग्रेज़ी या 11 भारतीय भाषाओं में से किसी में भी लिखिए, हर एक अपनी लिपि में।',
        },
      },
    ],
    related: ['shop-opening', 'retirement', 'birthday', 'anniversary'],
  }),
];

export const occasionBySlug = (slug: string) => OCCASION_PAGES.find((o) => o.slug === slug);
