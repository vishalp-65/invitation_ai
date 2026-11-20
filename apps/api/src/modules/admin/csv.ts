/** RFC 4180 field; also defuses spreadsheet formulas (=, +, -, @) in user-typed text. */
function csvCell(v: unknown): string {
  if (v == null) return '';
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  return [columns.join(','), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(','))].join('\r\n') + '\r\n';
}
