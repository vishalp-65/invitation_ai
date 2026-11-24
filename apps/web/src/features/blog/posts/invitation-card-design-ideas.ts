import { OCCASION_SLUGS, type OccasionWithPage } from '@/features/occasions/routes';
import type { BlogPost } from '../types';

export const post: BlogPost = {
  slug: 'invitation-card-design-ideas',
  title: 'Invitation Card Design Ideas for Every Occasion',
  h1: 'Invitation card design ideas for weddings, birthdays, pujas and more',
  description:
    'Invitation card design ideas by occasion — wedding, birthday, griha pravesh, puja, baby ceremonies — with colours, motifs and layout tips to make your card look great.',
  excerpt:
    'Every occasion has its own visual language: marigolds for a griha pravesh, balloons for a first birthday, a kalash for a puja. Here are design ideas for each, plus the layout rules that work on every card.',
  published: '2026-11-24',
  updated: '2026-11-24',
  category: 'Guides',
  occasions: Object.keys(OCCASION_SLUGS) as OccasionWithPage[],
  keywords: ['invitation card design', 'invitation card design ideas', 'card invitation making', 'invite card making', 'invitation card design online', 'invitation card template'],
  readMinutes: 5,
  body: [
    {
      t: 'p',
      text: 'Quick answer: choose motifs and colours that belong to the occasion, make the names and date the biggest text, and keep every detail on its own line. A card that is easy to read on a phone screen will also print well.',
    },
    { t: 'h2', id: 'by-occasion', text: 'Design ideas by occasion' },
    {
      t: 'table',
      head: ['Occasion', 'Motifs', 'Colours'],
      rows: [
        ['Wedding', 'Ganesha, arches, florals, the couple', 'Red, gold, maroon, ivory'],
        ['Engagement / Roka', 'Rings, florals, the couple', 'Blush, gold, sage'],
        ['Birthday', 'Balloons, cake, theme characters (drawn, not copied)', 'Bright primaries or pastels'],
        ['Griha pravesh', 'Kalash, toran, marigolds, the new home', 'Marigold, green, red'],
        ['Puja / katha', 'Diya, kalash, lotus', 'Saffron, red, gold'],
        ['Naamkaran / baby shower', 'Cradle, moon and stars, florals', 'Soft pastels'],
        ['Anniversary', 'Florals, the couple’s photo, numbers (25, 50)', 'Silver, gold, ivory'],
        ['Shop opening / corporate', 'Ribbon, logo, building', 'Brand colours, no religious symbols by default'],
      ],
    },
    { t: 'cta', text: 'Designs for 20 occasions, every one free to preview.', href: '/invitation-card-maker', label: 'Invitation card maker' },
    { t: 'h2', id: 'rules', text: 'Layout rules for any invitation card' },
    {
      t: 'ol',
      items: [
        'One focal point: the names or a single illustration, not both competing.',
        'Hierarchy: names, then date, then venue, then everything else.',
        'Contrast: dark text on light, or light on dark — never mid-tone on mid-tone.',
        'Script: use real Unicode text for Hindi, Tamil or any script, so it stays sharp.',
        'Space: generous margins, especially for printing.',
      ],
    },
    { t: 'h2', id: 'photo', text: 'Adding a photo' },
    {
      t: 'p',
      text: 'A photo makes a card personal — the couple, the baby, the new home. Use a well-lit photo with a plain background and let the design frame it. On Noyta, photo designs place your photo and keep the text readable over it.',
    },
    { t: 'tip', text: 'Making a birthday card for a theme party? Use a drawn theme (space, jungle, princess) rather than copyrighted cartoon characters, especially if you will print it.' },
  ],
  faq: [
    ['How do I design an invitation card online?', 'Choose an online invitation maker, pick a design for your occasion, enter the details, and download the card. On Noyta it takes about two minutes.'],
    ['What size should an invitation card be?', '5×7 inches is the most common print size in India. For WhatsApp, a portrait image works best.'],
    ['Can I make an invitation card free?', 'Yes. Noyta lets you make and download watermarked invitation cards for free.'],
  ],
};
