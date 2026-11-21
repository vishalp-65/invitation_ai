import type { GuestInput } from '@cardai/shared';

/* Pure parsers for guest imports (no React), so they are easy to test. */

/** Mobile numbers as people type them: spaces, dashes, a leading 0 or 91. Indian 10-digit → +91. */
export function cleanPhone(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = `+${d.slice(2)}`;
  if (!d.startsWith('+')) {
    d = d.replace(/^0+/, '');
    if (/^91[6-9]\d{9}$/.test(d)) d = `+${d}`;
    else if (/^[6-9]\d{9}$/.test(d)) d = `+91${d}`;
  }
  return /^\+[1-9]\d{7,14}$/.test(d) ? d : undefined;
}

/** RFC 4180-ish CSV: quoted cells, doubled quotes, commas / semicolons / tabs. */
export function parseCsv(text: string): string[][] {
  const sep = [',', ';', '\t'].map((s) => [s, (text.split('\n')[0] ?? '').split(s).length] as const).sort((a, b) => b[1] - a[1])[0]![0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell.trim());
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

/** Contacts exported from a phone (Android / iPhone "Share contact" or "Export .vcf"). */
export function parseVcf(text: string): GuestInput[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  return unfolded
    .split(/BEGIN:VCARD/i)
    .slice(1)
    .map((card) => {
      const line = (key: string) => card.split(/\r?\n/).find((l) => new RegExp(`^${key}[;:]`, 'i').test(l));
      const value = (l?: string) => l?.slice(l.indexOf(':') + 1).trim();
      const fn = value(line('FN')) || value(line('N'))?.split(';').filter(Boolean).reverse().join(' ');
      return { name: (fn ?? '').slice(0, 100), phone: cleanPhone(value(line('TEL'))), maxPax: 2 };
    })
    .filter((g) => g.name);
}

