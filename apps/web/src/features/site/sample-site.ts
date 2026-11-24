import { artSrc, BUILTIN_TEMPLATES, defaultSiteDoc, type PublicSiteDto, type SiteBranding } from '@cardai/shared';

/**
 * A sample wedding (names, functions, family, gifts…) for showing a cinematic design as a full
 * invitation website: the public design gallery and the dev QA page.
 */
const IN = (days: number, h: number) => {
  const d = new Date(Date.now() + days * 86_400_000);
  d.setUTCHours(h - 5, 30, 0, 0); // IST hour
  return d.toISOString();
};

const BRIDE = '00000000-0000-4000-8000-0000000000b1';
const GROOM = '00000000-0000-4000-8000-0000000000b2';

/**
 * `photos`: how many sample couple photos the event has (0 shows the empty frames).
 * `brandingParam`: free bar / Premium footer / Royale none.
 */
export function sampleSiteData(photos = 2, brandingParam: SiteBranding = 'none'): PublicSiteDto {
  const template = BUILTIN_TEMPLATES[0]!;
  const doc = defaultSiteDoc({ eventType: 'wedding', community: 'hindu-north', primaryNames: ['Abhishek', 'Kanika'] });
  return {
    event: {
      id: '00000000-0000-4000-8000-000000000001',
      slug: 'demo',
      type: 'wedding',
      community: 'hindu-north',
      language: 'en',
      title: 'Abhishek & Kanika',
      content: {
        headline: 'Wedding Celebration',
        hostLine: 'With the blessings of our families, we invite you to celebrate our wedding',
        primaryNames: ['Abhishek', 'Kanika'],
        primaryDetails: [],
        connector: 'weds',
        message: 'Two families, one celebration. We would love for you to be there as we begin our new life together.',
        familyTitle: 'With love from',
        familyLines: ['Mrs. Sudha & Mr. Rajiv Kapoor', 'Mrs. Neeta & Mr. Ashok Mehta'],
        closing: 'Hope to see you there!',
        hashtag: '#AbhiWedsKanika',
      },
      settings: { timezone: 'Asia/Kolkata', showCountdown: true, rsvpEnabled: true, askMealPreference: false, askAccommodation: false, saveTheDate: false },
    },
    template: { id: template.id, layout: template.layout, theme: template.theme },
    functions: [
      { id: '00000000-0000-4000-8000-0000000000a1', sortOrder: 0, name: 'Mehendi', startsAt: IN(40, 16), venueName: 'Rambagh Gardens', venueAddress: 'Bhawani Singh Rd, Jaipur', dressCode: 'Shades of green' },
      { id: '00000000-0000-4000-8000-0000000000a2', sortOrder: 1, name: 'Haldi', startsAt: IN(41, 11), venueName: 'Rambagh Gardens', venueAddress: 'Jaipur' },
      { id: '00000000-0000-4000-8000-0000000000a3', sortOrder: 2, name: 'Sangeet', startsAt: IN(41, 19), venueName: 'Rambagh Palace', venueAddress: 'Jaipur' },
      { id: '00000000-0000-4000-8000-0000000000a4', sortOrder: 3, name: 'Wedding', startsAt: IN(42, 18), venueName: 'Rambagh Palace', venueAddress: 'Bhawani Singh Rd, Rambagh, Jaipur, Rajasthan 302005' },
    ],
    media: {
      photos: [artSrc('sample-couple'), artSrc('sample-couple-2'), artSrc('sample-family')].slice(0, photos),
      gallery: [],
      backgroundUrl: null,
      musicUrl: null,
      musicLibrary: {},
      coverUrl: null,
      videoUrl: null,
      assets: photos ? { [BRIDE]: artSrc('sample-bride'), [GROOM]: artSrc('sample-groom') } : {},
    },
    guest: null,
    features: { rsvp: true, branding: brandingParam, gifts: true },
    site: {
      ...doc,
      sections: doc.sections.map((s) =>
        s.type === 'couple'
          ? {
              ...s,
              people: [
                { name: 'Abhishek', role: 'The groom', bio: 'Architect, chai lover and the family DJ.', photoAssetId: photos ? GROOM : undefined },
                { name: 'Kanika', role: 'The bride', bio: 'Doctor, dancer and the planner of this whole celebration.', photoAssetId: photos ? BRIDE : undefined },
              ],
            }
          : s.type === 'things'
          ? {
              ...s,
              items: [
                { icon: 'hashtag' as const, title: 'Hashtag', text: 'Share your photos with #AbhiWedsKanika' },
                { icon: 'weather' as const, title: 'Weather', text: 'Warm days and cool evenings, around 24°C.' },
                { icon: 'parking' as const, title: 'Parking', text: 'Valet parking at the main gate.' },
                { icon: 'stay' as const, title: 'Stay', text: 'Rooms are held at Rambagh Palace for outstation guests.' },
              ],
            }
          : s.type === 'familytree'
            ? {
                ...s,
                sides: [
                  {
                    title: 'The Kapoor family',
                    members: [
                      { name: 'Late Shri Om Prakash Kapoor', relation: 'Dadaji', late: true, photoAssetId: undefined },
                      { name: 'Smt. Kamla Kapoor', relation: 'Dadiji', late: false, photoAssetId: undefined },
                      { name: 'Rajiv & Sudha Kapoor', relation: 'Parents', late: false, photoAssetId: photos ? GROOM : undefined },
                    ],
                  },
                  {
                    title: 'The Mehta family',
                    members: [
                      { name: 'Shri Harish Mehta', relation: 'Nanaji', late: false, photoAssetId: undefined },
                      { name: 'Ashok & Neeta Mehta', relation: 'Parents', late: false, photoAssetId: photos ? BRIDE : undefined },
                    ],
                  },
                ],
              }
            : s.type === 'gifts'
              ? {
                  ...s,
                  note: 'Your blessings are the best gift. If you would like to give something, here are a few ideas.',
                  upiId: 'kapoorfamily@okhdfcbank',
                  wishlist: [
                    { id: 'wsh001', title: 'Silver pooja thali', note: 'Any design', price: '₹3,000–5,000', url: undefined },
                    { id: 'wsh002', title: 'Dinner set for 12', note: '', price: '₹4,000', url: undefined },
                    { id: 'wsh003', title: 'Air fryer', note: 'Philips or similar', price: '₹6,000', url: undefined },
                  ],
                }
          : s.type === 'dresscode'
            ? { ...s, items: [{ label: 'Rose gold, burgundy and ivory', note: 'We kindly ask guests to wear these tones.', colors: ['#7A1F2B', '#C9A27A', '#F3E6D8'] }] }
            : s,
      ),
    },
    tier: 'royale',
    shortUrl: 'https://example.test/demo',
    updates: [],
    wishes: [],
    album: [],
    claimedWishes: ['wsh002'],
    expiresAt: null,
  };
}
