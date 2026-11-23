'use client';

import { applyDesign, artSrc, BUILTIN_TEMPLATES, defaultSiteDoc, SITE_DESIGNS, SITE_OPENINGS, type PublicSiteDto, type SiteDesignId, type SiteOpening } from '@cardai/shared';
import { useMemo, useState } from 'react';
import { SiteRenderer } from '@/features/site/site-renderer';
import { LookThumb } from '@/features/site/photo-look';
import { Select } from '@/components/ui/select';

const IN = (days: number, h: number) => {
  const d = new Date(Date.now() + days * 86_400_000);
  d.setUTCHours(h - 5, 30, 0, 0); // IST hour
  return d.toISOString();
};

const BRIDE = '00000000-0000-4000-8000-0000000000b1';
const GROOM = '00000000-0000-4000-8000-0000000000b2';

/** `photos`: how many sample couple photos the event has (0 shows the empty frames). */
function sampleData(photos = 2): PublicSiteDto {
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
    features: { rsvp: true, showBranding: false, gifts: true },
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

/** Dev QA: every cinematic design rendered with the same sample wedding. */
export function SiteGallery({ initial, skipOpening = false, opening, photos = 2, live = false, only }: { initial: string; skipOpening?: boolean; opening?: string; photos?: number; live?: boolean; only?: string[] }) {
  const [id, setId] = useState<SiteDesignId>((SITE_DESIGNS.find((d) => d.id === initial)?.id ?? 'rose-seal') as SiteDesignId);
  // `?open=0` skips the opening (used to capture landing-page screenshots).
  const [replay, setReplay] = useState(skipOpening ? 0 : 1);
  const data = useMemo(() => sampleData(photos), [photos]);
  const [kind, setKind] = useState<SiteOpening | ''>((SITE_OPENINGS as readonly string[]).includes(opening ?? '') ? (opening as SiteOpening) : '');
  const doc = useMemo(() => {
    const d0 = applyDesign(data.site, id);
    // `?s=familytree,gifts` shows only those sections (QA screenshots).
    const d = only?.length ? { ...d0, sections: d0.sections.filter((s) => only.includes(s.type)) } : d0;
    return kind ? { ...d, opening: { ...d.opening, kind } } : d;
  }, [data, id, kind, only]);
  return (
    <>
      <div hidden={skipOpening} className="fixed left-2 top-2 z-[80] flex gap-1 rounded-lg bg-black/70 p-1 text-xs text-white">
        <Select
          variant="bare"
          aria-label="Design"
          value={id}
          onChange={(e) => {
            setId(e.target.value as SiteDesignId);
            setReplay((r) => r + 1);
          }}
          className="rounded px-2"
        >
          {SITE_DESIGNS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Select
          variant="bare"
          aria-label="Opening"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as SiteOpening | '');
            setReplay((r) => r + 1);
          }}
          className="rounded px-2"
        >
          <option value="">Design opening</option>
          {SITE_OPENINGS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
        <button type="button" onClick={() => setReplay((r) => r + 1)} className="rounded px-2 hover:bg-white/20">
          Replay
        </button>
      </div>
      <SiteRenderer key={`${id}-${kind}`} data={data} doc={doc} preview replayKey={replay} liveNow={live ? Date.parse(data.functions[3]!.startsAt) + 20 * 60_000 : undefined} />
    </>
  );
}

/** Dev QA (`?thumbs=1`): the design-picker thumbnails of every painted photo design. */
export function LookThumbs() {
  return (
    <div className="grid grid-cols-3 gap-2 bg-white p-3 sm:grid-cols-5">
      {SITE_DESIGNS.filter((d) => d.look).map((d) => (
        <div key={d.id} className="relative aspect-[3/4] overflow-hidden rounded-[12px] border border-black/10">
          <LookThumb lookId={d.look!} />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-6 text-sm text-white">{d.name}</span>
        </div>
      ))}
    </div>
  );
}
