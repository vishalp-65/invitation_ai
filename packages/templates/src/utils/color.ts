function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isDark(hex: string): boolean {
  return luminance(hex) < 0.35;
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Pick a readable ink for text placed on `bg`, preferring the palette's own colours. */
export function inkOn(bg: string, preferred: string[], fallbackDark = '#2B1A12', fallbackLight = '#FFF8EC'): string {
  const bgL = luminance(bg);
  for (const c of preferred) {
    const l = luminance(c);
    const ratio = (Math.max(bgL, l) + 0.05) / (Math.min(bgL, l) + 0.05);
    if (ratio >= 4.5) return c;
  }
  return isDark(bg) ? fallbackLight : fallbackDark;
}
