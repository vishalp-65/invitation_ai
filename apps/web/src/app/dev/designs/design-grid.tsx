'use client';

import { BUILTIN_TEMPLATES, buildDesign, designDataFrom, sampleInviteProps } from '@cardai/shared';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { DesignView } from '@/components/design/design-view';

export function DesignGrid() {
  const q = useSearchParams();
  const lang = (q.get('lang') ?? 'en') as 'en' | 'hi';
  const only = q.get('only');
  const page = Number(q.get('page') ?? 0);
  /** e.g. ?pageId=cover | blessing | schedule | family | photo */
  const pageId = q.get('pageId');
  const items = useMemo(() => {
    return BUILTIN_TEMPLATES.filter((t) => (only ? t.id.startsWith(only) : q.get('all') ? true : Boolean(t.design))).map((t) => {
      const sample = sampleInviteProps(t, lang);
      const eventType = sample.eventType;
      const data = designDataFrom({
        content: { ...sample.content, welcomeLines: ['Aarav & Diya', 'Kabir'], rsvpContacts: [{ name: 'Ramesh Sharma', phone: '98290 12345' }], note: 'Your blessings are our gift', hashtag: '#PriyaWedsRahul' },
        functions: sample.functions.map((f, i) => ({ name: f.name, startsAt: `2026-12-${12 + i}T19:00:00+05:30`, venueName: f.venue, venueAddress: f.address ?? undefined, notes: i === 0 ? 'Followed by lunch' : undefined })),
        rsvpDeadline: '2026-12-01T00:00:00+05:30',
        language: lang,
        eventType,
      });
      const doc = buildDesign({ template: t, data, language: lang, eventType });
      return { t, data, doc };
    });
  }, [lang, only, q]);
  return (
    <ul className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4 lg:grid-cols-6">
      {items.map(({ t, data, doc }) => (
        <li key={t.id}>
          <DesignView page={(pageId && doc.pages.find((p) => p.id.startsWith(pageId))) || doc.pages[Math.min(page, doc.pages.length - 1)]!} data={data} language={lang} lazy className="overflow-hidden rounded-xl shadow" />
          <p className="mt-1 truncate text-xs">{t.id}</p>
        </li>
      ))}
    </ul>
  );
}
