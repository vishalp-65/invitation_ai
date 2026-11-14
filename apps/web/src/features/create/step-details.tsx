'use client';

import { getEventType, getLanguage, WORDING_TONES, type EventContent, type WordingTone } from '@cardai/shared';
import { Mic, MicOff, Sparkles } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Chip, Field, Input, Textarea } from '@/components/ui/field';
import { useRequireLogin } from '@/features/auth/use-require-login';
import { api, ApiError } from '@/lib/api';
import { defaultWording } from './default-wording';
import { useDraft } from './draft-store';
import { useVoiceInput } from './use-voice-input';

const TONE_LABEL: Record<WordingTone, string> = {
  traditional: 'Traditional',
  warm: 'Warm',
  poetic: 'Poetic',
  modern: 'Modern',
  fun: 'Fun',
};

export function StepDetails() {
  const d = useDraft();
  const hi = useLocale() === 'hi';
  const ev = getEventType(d.type);
  const lang = getLanguage(d.language);
  const { ensureLogin, dialog } = useRequireLogin(hi ? 'AI के लिए अपना नंबर सत्यापित करें' : 'Verify your number to use AI writing');
  const [writing, setWriting] = useState(false);
  const [converting, setConverting] = useState(false);
  const voice = useVoiceInput(d.language, (text) => d.set({ notes: `${d.notes} ${text}`.trim() }));
  const latinNames = d.language !== 'en' && d.names.some((n) => /[a-z]/i.test(n));

  async function writeWithAi() {
    if (!(await ensureLogin())) return;
    setWriting(true);
    try {
      const content = await api<EventContent>('/ai/wording', {
        method: 'POST',
        json: {
          eventType: d.type,
          language: d.language,
          tone: d.tone,
          community: d.community,
          facts: {
            primaryNames: d.names.filter(Boolean),
            primaryDetails: d.parentage.filter(Boolean),
            hosts: d.hosts || undefined,
            familyMembers: d.family || undefined,
            extra: d.notes || undefined,
          },
        },
      });
      d.set({ content, contentIsDefault: false });
      toast.success(hi ? 'शब्द तैयार हैं — आप बदल सकते हैं' : 'Wording ready. Edit anything you like.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'AI is unavailable right now. Try again.');
    } finally {
      setWriting(false);
    }
  }

  async function convertNames() {
    if (!(await ensureLogin())) return;
    setConverting(true);
    try {
      const texts = [...d.names, ...d.parentage].map((t) => t || '-');
      const { results } = await api<{ results: string[] }>('/ai/transliterate', { method: 'POST', json: { texts, language: d.language } });
      const clean = (s?: string) => (s && s !== '-' ? s : '');
      d.set({
        names: [clean(results[0]), clean(results[1])],
        parentage: [clean(results[2]), clean(results[3])],
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not convert names.');
    } finally {
      setConverting(false);
    }
  }

  function applySimpleWording() {
    d.set({ content: defaultWording(d.type, d.language, d.names, d.hosts), contentIsDefault: true });
  }

  const people = Math.max(ev.primaryPeople, 0);
  const content = d.content;

  return (
    <div className="flex flex-col gap-6">
      {dialog}
      <h2 className="text-2xl">{hi ? 'कार्यक्रम के बारे में बताइए' : 'Tell us about the function'}</h2>

      {people > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: people }, (_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Field label={people === 2 ? (i === 0 ? (hi ? 'पहला नाम' : 'First name') : hi ? 'दूसरा नाम' : 'Second name') : hi ? 'नाम' : 'Name'}>
                {(id) => (
                  <Input
                    id={id}
                    value={d.names[i]}
                    lang={d.language}
                    onChange={(e) => {
                      const names = [...d.names] as [string, string];
                      names[i] = e.target.value;
                      // Names flow into the card without marking the wording as hand-edited.
                      d.set({ names, content: { ...d.content, primaryNames: names.filter(Boolean) } });
                    }}
                  />
                )}
              </Field>
              <Field label={hi ? 'माता-पिता का नाम (वैकल्पिक)' : 'Parents (optional)'}>
                {(id) => (
                  <Input
                    id={id}
                    placeholder={hi ? 'सुपुत्र श्री …' : 'Son of Mr. …'}
                    value={d.parentage[i]}
                    onChange={(e) => {
                      const parentage = [...d.parentage] as [string, string];
                      parentage[i] = e.target.value;
                      d.set({ parentage });
                    }}
                  />
                )}
              </Field>
            </div>
          ))}
        </div>
      )}

      {latinNames && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-hairline bg-sand p-3">
          <p className="flex-1 text-[0.95rem]">
            {hi ? `नाम ${lang.nativeName} लिपि में बदलें?` : `Write these names in ${lang.name} script?`}
          </p>
          <Button size="sm" variant="outline" onClick={convertNames} loading={converting}>
            {hi ? `${lang.nativeName} में बदलें` : `Convert to ${lang.nativeName}`}
          </Button>
        </div>
      )}

      <Field label={hi ? 'आमंत्रित करने वाले' : 'Who is inviting'} hint={hi ? 'जैसे: श्रीमती सुनीता एवं श्री रमेश शर्मा' : 'e.g. Mrs. Sunita & Mr. Ramesh Sharma'}>
        {(id, desc) => <Input id={id} aria-describedby={desc} value={d.hosts} onChange={(e) => d.set({ hosts: e.target.value })} />}
      </Field>

      <Field label={hi ? 'परिवार के सदस्य (वैकल्पिक)' : 'Family to mention (optional)'} hint={hi ? 'स्वागतोत्सुक / दर्शनाभिलाषी के लिए नाम' : 'Names for the family section, one per line'}>
        {(id, desc) => <Textarea id={id} aria-describedby={desc} value={d.family} onChange={(e) => d.set({ family: e.target.value })} />}
      </Field>

      <Field
        label={hi ? 'कुछ और बताना है?' : 'Anything else to include?'}
        hint={hi ? 'बोलकर भी बता सकते हैं।' : 'You can also speak instead of typing.'}
        action={
          voice.supported ? (
            <button type="button" onClick={voice.toggle} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-sindoor hover:bg-sindoor/10">
              {voice.listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              {voice.listening ? (hi ? 'रोकें' : 'Stop') : hi ? 'बोलें' : 'Speak'}
            </button>
          ) : undefined
        }
      >
        {(id, desc) => <Textarea id={id} aria-describedby={desc} value={d.notes} onChange={(e) => d.set({ notes: e.target.value })} />}
      </Field>

      <section className="rounded-[var(--radius-card)] border-2 border-ink p-5">
        <h3 className="text-xl">{hi ? 'कार्ड के शब्द' : 'Words on the card'}</h3>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Tone">
          {WORDING_TONES.map((tone) => (
            <Chip key={tone} selected={d.tone === tone} onClick={() => d.set({ tone })}>
              {TONE_LABEL[tone]}
            </Chip>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="brand" onClick={writeWithAi} loading={writing}>
            <Sparkles className="size-4" />
            {hi ? `AI से ${lang.nativeName} में लिखें` : `Write with AI in ${lang.name}`}
          </Button>
          <Button variant="quiet" onClick={applySimpleWording}>
            {hi ? 'साधारण शब्द डालें' : 'Use simple wording'}
          </Button>
        </div>

        {content.headline && (
          <div className="mt-6 grid gap-4" lang={d.language}>
            <ContentField label={hi ? 'मंगलाचरण' : 'Blessing line'} value={content.invocation} onChange={(v) => d.setContent({ invocation: v })} />
            <ContentField label={hi ? 'शीर्षक' : 'Title'} value={content.headline} onChange={(v) => d.setContent({ headline: v })} />
            <ContentField label={hi ? 'आमंत्रण पंक्ति' : 'Invitation line'} value={content.hostLine} onChange={(v) => d.setContent({ hostLine: v })} multiline />
            <ContentField label={hi ? 'संदेश' : 'Message'} value={content.message} onChange={(v) => d.setContent({ message: v })} multiline />
            <ContentField label={hi ? 'परिवार शीर्षक' : 'Family heading'} value={content.familyTitle} onChange={(v) => d.setContent({ familyTitle: v })} />
            <ContentField
              label={hi ? 'परिवार (हर पंक्ति अलग)' : 'Family (one per line)'}
              value={content.familyLines.join('\n')}
              onChange={(v) => d.setContent({ familyLines: v.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 16) })}
              multiline
            />
            <ContentField label={hi ? 'समापन' : 'Closing line'} value={content.closing} onChange={(v) => d.setContent({ closing: v })} />
          </div>
        )}
      </section>
    </div>
  );
}

function ContentField({ label, value, onChange, multiline }: { label: string; value?: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <Field label={label}>
      {(id) =>
        multiline ? (
          <Textarea id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={2} />
        ) : (
          <Input id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        )
      }
    </Field>
  );
}
