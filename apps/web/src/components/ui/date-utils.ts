/** Plain date helpers for the pickers (no React): `YYYY-MM-DD` strings, local midnight, no time-zone drift. */

/** `YYYY-MM-DD` ⇄ a local date (no time-zone drift: always local midnight). */
export const parseYmd = (s?: string | null): Date | null => {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
export const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** Today as `YYYY-MM-DD` (for `min`). */
export const todayYmd = () => toYmd(new Date());
export const sameDay = (a: Date | null, b: Date | null) => Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const addMonths = (d: Date, n: number) => {
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  return new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()));
};

/** `HH:mm` (24 h) ⇄ parts. */
export const splitTime = (v?: string) => {
  const m = v?.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  return { h12: h % 12 || 12, min: Number(m[2]), pm: h >= 12 };
};
export const joinTime = (h12: number, min: number, pm: boolean) => `${String((h12 % 12) + (pm ? 12 : 0)).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
