'use client';

import { applyDesign, BUILTIN_TEMPLATES, defaultSiteDoc, SITE_DESIGNS, type PublicSiteDto, type SiteDesignId } from '@cardai/shared';
import { useMemo, useState } from 'react';
import { SiteRenderer } from '@/features/site/site-renderer';

const IN = (days: number, h: number) => {
  const d = new Date(Date.now() + days * 86_400_000);
  d.setUTCHours(h - 5, 30, 0, 0); // IST hour
  return d.toISOString();
};

function sampleData(): PublicSiteDto {
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
      settings: { timezone: 'Asia/Kolkata', showCountdown: true, rsvpEnabled: true, askMealPreference: false, askAccommodation: false },
    },
    template: { id: template.id, layout: template.layout, theme: template.theme },
    functions: [
      { id: '00000000-0000-4000-8000-0000000000a1', sortOrder: 0, name: 'Mehendi', startsAt: IN(40, 16), venueName: 'Rambagh Gardens', venueAddress: 'Bhawani Singh Rd, Jaipur', dressCode: 'Shades of green' },
      { id: '00000000-0000-4000-8000-0000000000a2', sortOrder: 1, name: 'Haldi', startsAt: IN(41, 11), venueName: 'Rambagh Gardens', venueAddress: 'Jaipur' },
      { id: '00000000-0000-4000-8000-0000000000a3', sortOrder: 2, name: 'Sangeet', startsAt: IN(41, 19), venueName: 'Rambagh Palace', venueAddress: 'Jaipur' },
      { id: '00000000-0000-4000-8000-0000000000a4', sortOrder: 3, name: 'Wedding', startsAt: IN(42, 18), venueName: 'Rambagh Palace', venueAddress: 'Bhawani Singh Rd, Rambagh, Jaipur, Rajasthan 302005' },
    ],
    media: { photos: [], gallery: [], backgroundUrl: null, musicUrl: null, musicLibrary: {}, coverUrl: null, videoUrl: null, assets: {} },
    guest: null,
    features: { rsvp: true, showBranding: false },
    site: {
      ...doc,
      sections: doc.sections.map((s) =>
        s.type === 'things'
          ? {
              ...s,
              items: [
                { icon: 'hashtag' as const, title: 'Hashtag', text: 'Share your photos with #AbhiWedsKanika' },
                { icon: 'weather' as const, title: 'Weather', text: 'Warm days and cool evenings, around 24°C.' },
                { icon: 'parking' as const, title: 'Parking', text: 'Valet parking at the main gate.' },
                { icon: 'stay' as const, title: 'Stay', text: 'Rooms are held at Rambagh Palace for outstation guests.' },
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
    expiresAt: null,
  };
}

/** Dev QA: every cinematic design rendered with the same sample wedding. */
export function SiteGallery({ initial, skipOpening = false }: { initial: string; skipOpening?: boolean }) {
  const [id, setId] = useState<SiteDesignId>((SITE_DESIGNS.find((d) => d.id === initial)?.id ?? 'rose-seal') as SiteDesignId);
  // `?open=0` skips the opening (used to capture landing-page screenshots).
  const [replay, setReplay] = useState(skipOpening ? 0 : 1);
  const data = useMemo(sampleData, []);
  const doc = useMemo(() => applyDesign(data.site, id), [data, id]);
  return (
    <>
      <div hidden={skipOpening} className="fixed left-2 top-2 z-[80] flex gap-1 rounded-lg bg-black/70 p-1 text-xs text-white">
        <select
          aria-label="Design"
          value={id}
          onChange={(e) => {
            setId(e.target.value as SiteDesignId);
            setReplay((r) => r + 1);
          }}
          className="rounded bg-transparent"
        >
          {SITE_DESIGNS.map((d) => (
            <option key={d.id} value={d.id} className="text-black">
              {d.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setReplay((r) => r + 1)} className="rounded px-2 hover:bg-white/20">
          Replay
        </button>
      </div>
      <SiteRenderer key={id} data={data} doc={doc} preview replayKey={replay} />
    </>
  );
}
