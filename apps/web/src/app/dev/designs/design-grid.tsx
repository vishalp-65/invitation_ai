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
  const items = useMemo(() => {
    return BUILTIN_TEMPLATES.filter((t) => (only ? t.id.startsWith(only) : q.get('all') ? true : Boolean(t.design))).map((t) => {
      const sample = sampleInviteProps(t, lang);
      const eventType = sample.eventType;
      const data = designDataFrom({
        content: sample.content,
        functions: sample.functions.map((f, i) => ({ name: f.name, startsAt: `2026-12-${12 + i}T19:00:00+05:30`, venueName: f.venue, venueAddress: f.address ?? undefined })),
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
          <DesignView page={doc.pages[Math.min(page, doc.pages.length - 1)]!} data={data} language={lang} lazy className="overflow-hidden rounded-xl shadow" />
          <p className="mt-1 truncate text-xs">{t.id}</p>
        </li>
      ))}
    </ul>
  );
}
