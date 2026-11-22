import type { BlogPost } from '../types';

export const post: BlogPost = {
  slug: 'indian-wedding-rsvp-guide',
  title: 'How to Collect RSVPs for an Indian Wedding',
  h1: 'How to collect RSVPs for an Indian wedding (without 200 phone calls)',
  description:
    'A practical guide to RSVPs for Indian weddings: per-function headcounts, meal preferences, follow-ups on WhatsApp and a guest list the caterer can actually use.',
  excerpt:
    'Indian weddings have several functions, large families and guests who reply “haan, aayenge” without saying how many. This guide shows how to get per-function headcounts, meal choices and travel details, and how to follow up politely.',
  published: '2026-11-22',
  updated: '2026-11-22',
  category: 'Planning',
  occasions: ['wedding', 'engagement', 'nikah'],
  keywords: ['wedding rsvp', 'rsvp for indian wedding', 'wedding guest list management', 'online rsvp for wedding', 'rsvp meaning in wedding card'],
  readMinutes: 7,
  body: [
    {
      t: 'p',
      text: 'RSVP stands for “répondez s’il vous plaît”, French for “please reply”. On an Indian wedding card it means: tell us if you are coming, so we can plan. The trouble is that a typical Indian wedding has four or five functions, a guest list in the hundreds and families who answer for twelve people at once. A single yes/no isn’t enough.',
    },
    { t: 'h2', id: 'what-to-ask', text: 'What to ask every guest' },
    {
      t: 'ol',
      items: [
        'Which functions they will attend: Haldi, Mehendi, Sangeet, wedding, reception.',
        'How many people, counting adults and children separately if the caterer charges differently.',
        'Meal preference: veg, non-veg, Jain, or no onion-garlic.',
        'For outstation guests: arrival date, train or flight, and whether they need a room or pickup.',
      ],
    },
    { t: 'tip', text: 'Don’t ask for more than you will use. Every extra question lowers the number of guests who finish the form, and elders on small phones feel it most.' },

    { t: 'h2', id: 'deadline', text: 'When to ask, and the deadline' },
    {
      t: 'table',
      head: ['When', 'What to send'],
      rows: [
        ['8–10 weeks before', 'Save the date for outstation guests'],
        ['5–6 weeks before', 'Invitation with the RSVP link'],
        ['3 weeks before', 'RSVP deadline (tell your caterer the week after)'],
        ['10 days before', 'A gentle follow-up to anyone who hasn’t replied'],
        ['2 days before', 'Reminder with venue map to everyone who said yes'],
      ],
    },

    { t: 'h2', id: 'methods', text: 'Ways to collect RSVPs, compared' },
    {
      t: 'table',
      head: ['Method', 'Good for', 'Problem'],
      rows: [
        ['Phone calls', 'Elders, VIP guests', 'Takes days; nothing is written down'],
        ['WhatsApp replies', 'Everyone', 'Replies get lost in chats; no per-function count'],
        ['Google Form', 'Tech-savvy guests', 'Looks generic; guests must type their name; no reminders'],
        ['Spreadsheet by a cousin', 'Small weddings', 'One person becomes the bottleneck'],
        ['RSVP website with personal links', 'Large, multi-function weddings', 'Needs a little setup'],
      ],
    },
    {
      t: 'p',
      text: 'The method that scales is a personal link per guest or family: they tap it, see only the functions they’re invited to, choose a headcount for each and submit. You see a live list, without retyping WhatsApp messages into a spreadsheet.',
    },
    { t: 'cta', text: 'Noyta invitation websites collect RSVPs for each function, with headcount and meal preference, in a live list.', href: '/create?type=wedding', label: 'Set up wedding RSVP' },

    { t: 'h2', id: 'groups', text: 'Invite different guests to different functions' },
    {
      t: 'p',
      text: 'Not everyone is invited to everything. Close family may come to the Haldi, friends to the Sangeet and colleagues to the reception only. Make guest groups (family, bride’s friends, groom’s office, neighbours) and decide per group which functions they see. It avoids the awkward “why wasn’t I invited to the Mehendi?” conversation, because guests only see what they’re invited to.',
    },

    { t: 'h2', id: 'follow-up', text: 'How to follow up politely' },
    {
      t: 'sample',
      title: 'Follow-up message',
      text: 'Namaste Aunty 🙏 Hope you’re well! We’re finalising arrangements for Priya’s wedding. Could you let us know on this link which functions you’ll join and how many of you are coming? It takes a minute: [link]',
    },
    {
      t: 'sample',
      title: 'Hindi follow-up',
      lang: 'hi',
      text: 'नमस्ते 🙏 प्रिया की शादी की तैयारियाँ चल रही हैं। कृपया इस लिंक पर बता दीजिए कि आप किन कार्यक्रमों में आएँगे और कितने लोग होंगे: [link]',
    },
    {
      t: 'ul',
      items: [
        'Follow up once, around 10 days before, and then call only the people who still haven’t answered.',
        'Ask a family member to follow up with their own side; guests reply faster to someone they know.',
        'Assume about 10% of “maybe” replies will come, and plan the caterer count accordingly.',
      ],
    },

    { t: 'h2', id: 'day-of', text: 'On the wedding day' },
    {
      t: 'p',
      text: 'Share the final list with whoever handles the entrance and the caterer. A check-in list on a phone lets the welcome team mark arrivals, and you can see at a glance whether the Sangeet crowd is bigger than expected before the food runs short.',
    },
  ],
  faq: [
    ['What does RSVP mean on a wedding card?', 'RSVP comes from the French “répondez s’il vous plaît”, meaning “please reply”. It asks guests to tell the hosts whether they will attend, ideally by a given date.'],
    ['How early should guests RSVP for an Indian wedding?', 'Ask for replies about three weeks before the wedding. That leaves a week to follow up and still give the caterer and hotel final numbers on time.'],
    ['How do I collect RSVPs for each function separately?', 'Use an RSVP form that lists every function and asks for a headcount for each, ideally with personal links so you know who replied. Noyta’s invitation websites work this way.'],
  ],
};
