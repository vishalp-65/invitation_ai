import type { BlogPost } from '../types';

export const post: BlogPost = {
  slug: 'anniversary-party-invitation-message',
  title: '25th and 50th Anniversary Invitation Message Samples',
  h1: '25th and 50th wedding anniversary invitation messages (Hindi and English)',
  description:
    'Silver and golden jubilee anniversary invitation wording in English and Hindi, with samples for parents’ anniversaries, a surprise party and a WhatsApp message.',
  excerpt:
    'Samples for a 25th, 50th or any anniversary invitation, written by the children or by the couple, in English and Hindi, with tips for a surprise.',
  published: '2026-11-22',
  updated: '2026-11-22',
  category: 'Wording',
  occasions: ['anniversary', 'birthday'],
  keywords: ['anniversary invitation message', '25th anniversary invitation wording', '50th anniversary invitation message', 'anniversary invitation in hindi', 'parents anniversary party invitation'],
  readMinutes: 4,
  body: [
    {
      t: 'p',
      text: 'Silver and golden jubilee anniversaries are often organised by the children for their parents, and the invitation sets the tone: warm, a little emotional and clear on the details. Here are samples for both kinds of hosts.',
    },
    { t: 'h2', id: 'include', text: 'What to include' },
    {
      t: 'ul',
      items: [
        'The couple’s names and the number of years: “25 years together”.',
        'Who is hosting: the children, the couple, or the family.',
        'Date, time, venue, and whether there is a puja, cake, music or dinner.',
        'A photo of the couple, then and now, if you have one.',
        'If it is a surprise, a line asking guests to keep it secret.',
      ],
    },
    { t: 'h2', id: 'english', text: 'English wording' },
    {
      t: 'sample',
      title: 'Hosted by the children',
      text: 'Twenty-five years of love, laughter and togetherness.\nPlease join us in celebrating the silver anniversary of our parents\n[Name] and [Name]\non [Date] at [Time]\n[Venue, City]\nWith love, [Children’s names]',
    },
    {
      t: 'sample',
      title: 'Hosted by the couple',
      text: 'After 25 years, we are still grateful for every day together. We would be delighted to have you celebrate our anniversary with us on [Date] at [Venue]. Dinner will follow.',
    },
    {
      t: 'sample',
      title: 'Surprise party',
      text: 'Shhh! 🎉 We are planning a surprise for Mummy and Papa’s 25th anniversary on [Date] at [Time], [Venue]. Please arrive 30 minutes early and do not tell them. The invitation is attached.',
    },
    { t: 'h2', id: 'hindi', text: 'Hindi wording' },
    {
      t: 'sample',
      lang: 'hi',
      title: 'बच्चों की ओर से',
      text: 'साथ-साथ बिताए 25 सुनहरे वर्ष 💛\nहमारे माता-पिता\n[नाम] और [नाम]\nकी रजत जयंती (शादी की 25वीं सालगिरह) के अवसर पर\nदिनांक [तारीख], समय [समय], स्थान [स्थान]\nआप सपरिवार पधारें और आशीर्वाद दें।',
    },
    {
      t: 'sample',
      lang: 'hi',
      title: 'WhatsApp संदेश',
      text: 'नमस्कार [नाम] जी 🙏 [तारीख] को मम्मी-पापा की शादी की 25वीं सालगिरह है। आप ज़रूर पधारिए। निमंत्रण साथ भेज रहे हैं।',
    },
    { t: 'cta', text: 'Make an anniversary invitation with your photos, names and venue, in Hindi or 11 other languages.', href: '/create?type=anniversary', label: 'Make your invitation' },
    { t: 'h2', id: 'terms', text: 'Terms to know' },
    {
      t: 'table',
      head: ['Year', 'Name', 'In Hindi'],
      rows: [
        ['25th', 'Silver jubilee', 'रजत जयंती'],
        ['50th', 'Golden jubilee', 'स्वर्ण जयंती'],
        ['60th', 'Diamond jubilee', 'हीरक जयंती'],
      ],
    },
    { t: 'tip', text: 'For a surprise, send the invitation to the guests only and share the RSVP link with the host child. Never use the couple’s own phone for replies.' },
  ],
  faq: [
    ['What do you write on a 25th anniversary invitation?', 'The couple’s names, “25 years” or “silver jubilee”, who is hosting, the date, time and venue, and a line inviting guests to celebrate with the family.'],
    ['Who should host the parents’ anniversary party?', 'Usually the children, who also sign the invitation. The couple may host their own party too.'],
    ['How do I keep an anniversary party a surprise?', 'Send the invitation directly to guests, ask them to arrive early and keep it secret, and collect replies through a link only the host sees.'],
  ],
};
