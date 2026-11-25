'use client';

import type { SiteDoc } from '@cardai/shared';
import { KitImg, mapHref, useKit, useLayoutData, useSeen } from './common';

/**
 * Tasting Menu: a fine-dining menu card. The house name, an oval photo, each function a numbered
 * course (date and venue as its description, dress code as the "pairing"), the chef's note
 * signed by the family, and a receipt at the end: the bill is "just your blessings".
 */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function MenuLayout({ doc }: { doc: SiteDoc }) {
  const L = useLayoutData(doc);
  const k = useKit(doc, 'menu');
  const { content: c, t, fmt, fns } = L;
  const [ref, seen] = useSeen<HTMLDivElement>('0px');

  return (
    <section className="inv-mn bg-[var(--inv-bg)] px-4 py-10 text-[var(--inv-text)]" aria-label={L.title}>
      <div ref={ref} className={`inv-mn-card mx-auto max-w-lg px-6 pb-10 pt-8 text-center sm:px-10 ${seen ? 'inv-mn-in' : ''}`}>
        <p className="text-xs uppercase tracking-[0.5em] text-[var(--inv-primary)]">{t('Menu', 'मेन्यू')}</p>
        <h1 className="inv-script mt-3 text-[clamp(2.6rem,12vw,4rem)] leading-[1.05] text-[var(--inv-primary)]">{k.text('mn.house', L.title)}</h1>
        <p className="mt-2 text-lg italic">{k.text('mn.welcome')}</p>

        <div className="mx-auto mt-6 aspect-[4/5] w-48 overflow-hidden rounded-[50%] border-4 border-double border-[var(--inv-accent)]">
          <KitImg photo={k.photo('cover')} eager className="size-full" fallback={<span className="block size-full bg-[var(--inv-bg-alt)]" />} />
        </div>

        {(c.invocation || c.hostLine) && <p className="mx-auto mt-6 max-w-sm text-[1.05rem] leading-relaxed">{c.hostLine || c.invocation}</p>}

        <div className="inv-mn-rule mx-auto my-8 w-40" aria-hidden />
        <h2 className="text-sm uppercase tracking-[0.4em] text-[var(--inv-primary)]">{k.text('mn.courses')}</h2>
        <ol className="mt-6 flex flex-col gap-7">
          {fns.map((f, i) => (
            <li key={f.id}>
              <p className="text-xs uppercase tracking-[0.35em] opacity-60">
                {t('Course', 'व्यंजन')} {ROMAN[i] ?? i + 1}
              </p>
              <p className="inv-script mt-1 text-[2.2rem] leading-none text-[var(--inv-primary)]">{f.name}</p>
              <p className="mt-2 text-[1.05rem]">
                {fmt.date.format(new Date(f.startsAt))} · {fmt.time.format(new Date(f.startsAt))}
              </p>
              <a href={mapHref(f)} target="_blank" rel="noopener" className="text-[1.05rem] italic underline decoration-[var(--inv-accent)] underline-offset-4">
                {f.venueName}
              </a>
              {f.dressCode && (
                <p className="mt-1 text-sm italic opacity-75">
                  {t('Paired with', 'साथ में')}: {f.dressCode}
                </p>
              )}
            </li>
          ))}
        </ol>

        <div className="inv-mn-rule mx-auto my-8 w-40" aria-hidden />
        <p className="text-xs uppercase tracking-[0.4em] text-[var(--inv-primary)]">{t("Chef's note", 'शेफ़ की बात')}</p>
        <p className="mx-auto mt-3 max-w-sm text-lg italic leading-relaxed">{k.text('mn.chef')}</p>
        {c.familyLines.length > 0 && <p className="inv-script mt-3 whitespace-pre-line text-2xl text-[var(--inv-primary)]">{c.familyLines.join('\n')}</p>}

        {/* The bill */}
        <div className="inv-mn-receipt mx-auto mt-10 max-w-xs px-5 py-4 text-left font-mono text-sm">
          <p className="text-center font-bold uppercase tracking-widest">{t('Bill', 'बिल')}</p>
          <p className="mt-2 flex justify-between border-b border-dashed border-current/40 pb-2">
            <span>{fns.length} × {t('courses', 'व्यंजन')}</span>
            <span>₹0</span>
          </p>
          <p className="mt-2">{k.text('mn.bill')}</p>
          <a href="#rsvp" className="mt-3 block border-2 border-current py-2 text-center font-bold uppercase tracking-widest">
            {t('Reserve your table', 'अपनी सीट पक्की करें')}
          </a>
        </div>
      </div>
    </section>
  );
}
