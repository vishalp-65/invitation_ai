'use client';

import type { GuestInput } from '@cardai/shared';
import { FileUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cleanPhone, parseCsv, parseVcf } from './guest-parse';
import { Select } from '@/components/ui/select';

export { cleanPhone } from './guest-parse';

/** Column labels: `import.c_<field>`. */
const FIELDS = ['name', 'phone', 'groupLabel', 'salutation', 'maxPax', 'skip'] as const;
type Target = (typeof FIELDS)[number];

/** Best guess of what a header means (English and Hindi column names). */
function guess(header: string, i: number): Target {
  const h = header.toLowerCase();
  if (/name|naam|नाम/.test(h)) return 'name';
  if (/phone|mobile|number|whatsapp|contact|फ़ोन|फोन|मोबाइल|नंबर/.test(h)) return 'phone';
  if (/group|side|relation|समूह|पक्ष/.test(h)) return 'groupLabel';
  if (/greet|salut|title|सम्बोधन|संबोधन/.test(h)) return 'salutation';
  if (/pax|people|count|members|लोग|सदस्य/.test(h)) return 'maxPax';
  return i === 0 ? 'name' : i === 1 ? 'phone' : 'skip';
}

function toGuests(rows: string[][], map: Target[]): GuestInput[] {
  return rows
    .map((r) => {
      const g: GuestInput = { name: '', maxPax: 2 };
      map.forEach((t, i) => {
        const v = r[i]?.trim();
        if (!v || t === 'skip') return;
        if (t === 'name') g.name = v.slice(0, 100);
        else if (t === 'phone') g.phone = cleanPhone(v);
        else if (t === 'groupLabel') g.groupLabel = v.slice(0, 40);
        else if (t === 'salutation') g.salutation = v.slice(0, 120);
        else if (t === 'maxPax') g.maxPax = Math.min(50, Math.max(1, Number.parseInt(v, 10) || 2));
      });
      return g;
    })
    .filter((g) => g.name);
}

/** Upload a .csv or .vcf; CSV columns are matched (and can be changed) before importing. */
export function GuestFileImport({ onImport, busy }: { onImport: (list: GuestInput[]) => void; busy: boolean }) {
  const t = useTranslations('import');
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<string[][] | null>(null);
  const [hasHeader, setHasHeader] = useState(true);
  const [map, setMap] = useState<Target[]>([]);

  async function read(file: File) {
    if (file.size > 2_000_000) return toast.error(t('tooBig'));
    const text = (await file.text()).replace(/^\uFEFF/, '');
    if (/\.vcf$/i.test(file.name) || /BEGIN:VCARD/i.test(text.slice(0, 200))) {
      const list = parseVcf(text);
      return list.length ? onImport(list) : toast.error(t('noContacts'));
    }
    if (/\.xlsx?$/i.test(file.name)) return toast.error(t('excel'));
    const parsed = parseCsv(text);
    if (!parsed.length) return toast.error(t('empty'));
    const header = parsed[0]!;
    const looksLikeHeader = header.some((h) => /\p{L}/u.test(h)) && !header.some((h) => cleanPhone(h));
    setHasHeader(looksLikeHeader);
    setMap(header.map((h, i) => (looksLikeHeader ? guess(h, i) : i === 0 ? 'name' : i === 1 ? 'phone' : 'skip')));
    setRows(parsed);
  }

  const body = rows ? (hasHeader ? rows.slice(1) : rows) : [];
  const ready = rows ? toGuests(body, map) : [];
  const noPhone = ready.filter((g) => !g.phone).length;

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={input}
        type="file"
        accept=".csv,.vcf,.txt,text/csv,text/vcard,text/x-vcard"
        className="sr-only"
        aria-label={t('uploadAria')}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void read(f);
          e.target.value = '';
        }}
      />
      {!rows && (
        <Button variant="line" onClick={() => input.current?.click()}>
          <FileUp className="size-4" /> {t('upload')}
        </Button>
      )}
      {rows && (
        <div className="flex flex-col gap-3 border border-ink/10 p-3">
          <p className="text-sm">{t('match')}</p>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} /> {t('header')}
          </label>
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr>
                  {map.map((target, i) => (
                    <th key={i} className="p-1 text-left font-normal">
                      <Select
                        aria-label={t('columnN', { n: i + 1 })}
                        className="h-8 w-auto min-w-28 text-sm"
                        value={target}
                        onChange={(e) => setMap(map.map((m, j) => (j === i ? (e.target.value as Target) : m)))}
                      >
                        {FIELDS.map((v) => (
                          <option key={v} value={v}>
                            {t(`c_${v}`)}
                          </option>
                        ))}
                      </Select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-ink-soft">
                {body.slice(0, 4).map((r, i) => (
                  <tr key={i}>
                    {map.map((_, j) => (
                      <td key={j} className="max-w-40 truncate p-1">
                        {r[j]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-ink-soft">
            {noPhone ? t('readyNoPhone', { n: ready.length, bad: noPhone }) : t('ready', { n: ready.length })}
          </p>
          <div className="flex gap-2">
            <Button disabled={!ready.length || !map.includes('name')} loading={busy} onClick={() => onImport(ready)}>
              {t('addN', { n: ready.length })}
            </Button>
            <Button variant="quiet" onClick={() => setRows(null)}>
              {t('cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
