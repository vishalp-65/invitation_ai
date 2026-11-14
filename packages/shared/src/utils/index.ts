/** URL-safe slug from any (including non-Latin) text; falls back to a random suffix. */
export function slugify(input: string, maxLength = 40): string {
  const base = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
  return base.length >= 3 ? base : `invite-${base}`.replace(/-+$/, '');
}

export function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);
}

export function assertNever(value: never, message = 'Unexpected value'): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}

/** Build a wa.me share link (works without any WhatsApp API). */
export function whatsappShareUrl(text: string, phone?: string | null): string {
  const target = phone ? phone.replace(/[^\d]/g, '') : '';
  return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
}
