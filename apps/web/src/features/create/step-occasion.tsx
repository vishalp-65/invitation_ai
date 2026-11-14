'use client';

import { COMMUNITIES, EVENT_TYPES, LANGUAGES, type Community } from '@cardai/shared';
import { useLocale } from 'next-intl';
import { Chip, Field, Select } from '@/components/ui/field';
import { useDraft } from './draft-store';

const COMMUNITY_LABELS: Record<Community, string> = {
  'hindu-north': 'Hindu (North)',
  'hindu-south': 'Hindu (South)',
  marwari: 'Marwari',
  gujarati: 'Gujarati',
  marathi: 'Marathi',
  bengali: 'Bengali',
  punjabi: 'Punjabi',
  sikh: 'Sikh',
  muslim: 'Muslim',
  christian: 'Christian',
  jain: 'Jain',
  buddhist: 'Buddhist',
  modern: 'Modern / no tradition',
};

export function StepOccasion() {
  const d = useDraft();
  const hi = useLocale() === 'hi';

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-2xl">{hi ? 'कौन-सा अवसर है?' : 'What is the occasion?'}</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {EVENT_TYPES.map((e) => (
            <button
              key={e.id}
              type="button"
              aria-pressed={d.type === e.id}
              onClick={() => d.setType(e.id)}
              className="press flex min-h-16 items-center gap-3 rounded-2xl border border-hairline bg-surface px-3.5 py-2.5 text-left font-medium transition-[border-color,background-color,color] duration-200 hover:border-ink/30 aria-pressed:border-ink aria-pressed:bg-primary aria-pressed:text-on-primary"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sand text-lg" aria-hidden>
                {e.emoji}
              </span>
              <span className="leading-tight">{hi ? e.labelHi : e.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl">{hi ? 'कार्ड किस भाषा में हो?' : 'Which language should the card be in?'}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <Chip
              key={l.code}
              selected={d.language === l.code}
              lang={l.code}
              onClick={() =>
                d.set({ language: l.code, ...(d.contentIsDefault ? { content: { ...d.content, headline: '' } } : {}) })
              }
            >
              {l.nativeName}
            </Chip>
          ))}
        </div>
      </section>

      <Field label={hi ? 'परंपरा (वैकल्पिक)' : 'Tradition (optional)'} hint={hi ? 'इससे डिज़ाइन और शब्द बेहतर चुने जाते हैं।' : 'Helps us suggest the right designs and wording.'}>
        {(id, desc) => (
          <Select
            id={id}
            aria-describedby={desc}
            value={d.community ?? ''}
            onChange={(e) => d.set({ community: (e.target.value || undefined) as Community | undefined })}
          >
            <option value="">{hi ? 'कोई भी' : 'Any'}</option>
            {COMMUNITIES.map((c) => (
              <option key={c} value={c}>
                {COMMUNITY_LABELS[c]}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  );
}
