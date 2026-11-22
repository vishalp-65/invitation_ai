/**
 * Public "chat with us" WhatsApp link, or null when NEXT_PUBLIC_WHATSAPP_NUMBER is unset.
 * Callers hide their WhatsApp buttons on null so the site never links to a dead number.
 */
const digits = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');

export const WHATSAPP_CHAT_URL: string | null = digits.length >= 10 ? `https://wa.me/${digits}?text=Hi` : null;
