import type { BlogPost } from '../types';

export const post: BlogPost = {
  slug: 'nikah-walima-invitation-wording',
  title: 'Nikah and Walima Invitation Wording: Urdu, Hindi, English',
  h1: 'Nikah and walima invitation wording in Urdu, Hindi and English',
  description:
    'Nikah and walima invitation wording with samples in English, Urdu and Hindi, plus what to include, respectful phrases and a WhatsApp message you can copy.',
  excerpt:
    'Samples for a nikah or walima invitation in English, Urdu and Hindi, with the phrases families use, what to include and how to send it on WhatsApp.',
  published: '2026-11-22',
  updated: '2026-11-22',
  category: 'Wording',
  occasions: ['nikah', 'wedding'],
  keywords: ['nikah invitation wording', 'walima invitation wording', 'nikah card matter in urdu', 'muslim wedding invitation message', 'nikah invitation message for whatsapp'],
  readMinutes: 5,
  body: [
    {
      t: 'p',
      text: 'A nikah invitation carries a prayer and a few traditional phrases, so the right wording matters to the families. Below are samples you can use as they are or adapt, along with what the card should include.',
    },
    { t: 'h2', id: 'functions', text: 'The functions' },
    {
      t: 'table',
      head: ['Function', 'What it is', 'Invitation tip'],
      rows: [
        ['Mehndi / Mayun', 'Pre-wedding henna and family gathering', 'Add the dress theme and whether it is for women only'],
        ['Nikah', 'The marriage contract and ceremony', 'Give the time precisely, with the venue or masjid'],
        ['Rukhsati', 'The bride’s farewell', 'Often not on the card; shared with close family'],
        ['Walima', 'The groom’s family hosts a feast', 'State the time and the dinner'],
      ],
    },
    { t: 'h2', id: 'english', text: 'English wording' },
    {
      t: 'sample',
      title: 'Nikah',
      text: 'Bismillah ir-Rahman ir-Rahim\nWith the blessings of Almighty Allah, we request the honour of your presence at the nikah of\n[Name] with [Name]\non [Date] at [Time]\n[Venue, City]\nPlease join us and bless the couple with your duas.',
    },
    {
      t: 'sample',
      title: 'Walima',
      text: 'With the grace of Allah, the families of [Name] and [Name] request your presence at the walima reception on [Date] at [Time], [Venue, City]. Dinner will be served.',
    },
    { t: 'h2', id: 'hindi', text: 'Hindi wording' },
    {
      t: 'sample',
      lang: 'hi',
      title: 'निकाह का निमंत्रण',
      text: 'बिस्मिल्लाह हिर्रहमानिर्रहीम\nअल्लाह की रहमत से\n[नाम] और [नाम] का निकाह\nदिनांक [तारीख] को [समय] पर [स्थान] में तय हुआ है।\nआपसे गुज़ारिश है कि तशरीफ़ लाएँ और दुआओं से नवाज़ें।',
    },
    {
      t: 'sample',
      lang: 'hi',
      title: 'वलीमा',
      text: 'अल्लाह के फ़ज़ल से [नाम] और [नाम] के वलीमे की दावत [तारीख] को [समय] पर [स्थान] में रखी गई है। आपकी शिरकत हमारे लिए बाइस-ए-ख़ुशी होगी।',
    },
    { t: 'h2', id: 'whatsapp', text: 'WhatsApp message' },
    {
      t: 'sample',
      title: 'Short message',
      text: 'Assalamu alaikum [Name] ji,\nBy the grace of Allah, the nikah of [Name] and [Name] will be held on [Date] at [Venue]. Please join us with your family and your duas. The invitation is attached. JazakAllah.',
    },
    { t: 'cta', text: 'Make a nikah and walima invitation set in Urdu, Hindi or English, with RSVP for each function.', href: '/create?type=nikah', label: 'Make your invitation' },
    { t: 'h2', id: 'include', text: 'What to include' },
    {
      t: 'ul',
      items: [
        'The opening phrase (Bismillah) and the names of the bride and groom, with parents’ names if you use them.',
        'Date, time, venue and map link for each function.',
        'A separate line for walima: it is often at another venue.',
        'Dress or segregation notes if the venue has arrangements for them.',
        'Contact numbers on both sides.',
      ],
    },
    { t: 'tip', text: 'Choose cards without figures or sacred symbols of other faiths. A plain design with calligraphy or florals suits a nikah card.' },
  ],
  faq: [
    ['What is the difference between nikah and walima?', 'The nikah is the marriage ceremony; the walima is a feast hosted by the groom’s family after it, as a public announcement of the marriage.'],
    ['How do you start a nikah invitation card?', 'Most cards begin with “Bismillah ir-Rahman ir-Rahim” and then invite guests to the nikah with the couple’s names, date, time and venue.'],
    ['Can a nikah invitation be sent on WhatsApp?', 'Yes. Send a card or video with a short message starting with Salam, and a link with venue and RSVP.'],
  ],
};
