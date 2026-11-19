import { BRAND } from '@cardai/shared';

/**
 * Tiny email builder. Every block renders to both HTML (table layout + inline styles, which is what
 * Gmail / Outlook / Apple Mail reliably support) and plain text, so each template is written once.
 *
 * Look follows the website: near-black header with the uppercase wordmark, warm off-white body,
 * mono uppercase kickers, 4px radius, rose accent for links. Clients that honour
 * `prefers-color-scheme` (Apple Mail, iOS, Outlook.com) get a dark variant via the `m-*` classes.
 *
 * `kit(locale)` returns the builders for one language. Hindi drops letter-spacing, uppercase and
 * the mono face from labels, because tracking breaks Devanagari conjuncts.
 */

export type MailLocale = 'en' | 'hi';

export interface Block {
  html: string;
  text: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const T = {
  page: '#eceae4',
  card: '#fbfaf7',
  ink: '#141416',
  muted: '#5d5b57',
  faint: '#8d8a84',
  line: '#e2dfd8',
  soft: '#f2f0ea',
  head: '#0c0c0e',
  headInk: '#f4f2ec',
  accent: '#b34f92',
} as const;

const SANS = `'Instrument Sans','Noto Sans Devanagari',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Nirmala UI','Mangal',sans-serif`;
const MONO = `'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
const GRADIENT = 'linear-gradient(90deg,#eca8d6,#a78bfa,#67e8f9,#fbbf24)';

/** HTML-escape anything that is not a constant. Every builder escapes its inputs. */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only http(s) and mailto links survive; anything else becomes "#" (no javascript: URLs). */
function safeUrl(url: string): string {
  return /^(https?:|mailto:)/i.test(url) ? esc(url) : '#';
}

const row = (inner: string, pad = '0 0 18px') => `<tr><td style="padding:${pad}">${inner}</td></tr>`;

const FOOTER = {
  en: {
    reason: `You are receiving this service email about your ${BRAND.name} account.`,
    unsubscribe: 'Unsubscribe',
    fromOffers: 'from offer emails.',
    unsubText: 'Unsubscribe from offer emails',
  },
  hi: {
    reason: `यह ईमेल आपके ${BRAND.name} खाते से जुड़ी सेवा सूचना है।`,
    unsubscribe: 'ऑफ़र ईमेल बंद करें',
    fromOffers: '',
    unsubText: 'ऑफ़र ईमेल बंद करें',
  },
} as const;

export interface LayoutOptions {
  subject: string;
  /** Inbox preview line (hidden in the body). */
  preheader: string;
  blocks: Block[];
  appUrl: string;
  /** Marketing mail only: shown in the footer and as the List-Unsubscribe target. */
  unsubscribeUrl?: string;
  /** Why the recipient got this, shown in the footer. */
  reason?: string;
}

export function kit(locale: MailLocale = 'en') {
  const hi = locale === 'hi';
  /** Small label style: mono + tracked caps in English, plain sans in Hindi. */
  const label = (size: number, track: string) =>
    hi ? `font-family:${SANS};font-size:${size + 1}px` : `font-family:${MONO};font-size:${size}px;letter-spacing:${track};text-transform:uppercase`;

  const kicker = (text: string): Block => ({
    html: row(`<div class="m-faint" style="${label(11, '.14em')};color:${T.faint}">${esc(text)}</div>`, '0 0 10px'),
    text: `${hi ? text : text.toUpperCase()}\n`,
  });

  const heading = (text: string): Block => ({
    html: row(
      `<h1 class="m-ink" style="margin:0;font-family:${SANS};font-size:28px;line-height:${hi ? 1.35 : 1.15};font-weight:400;letter-spacing:${hi ? '0' : '-.025em'};color:${T.ink}">${esc(text)}</h1>`,
      '0 0 18px',
    ),
    text: `${text}\n${'='.repeat(Math.min(text.length, 60))}\n`,
  });

  const para = (text: string, opts: { muted?: boolean; small?: boolean } = {}): Block => ({
    html: row(
      `<p class="${opts.muted ? 'm-muted' : 'm-ink'}" style="margin:0;font-family:${SANS};font-size:${opts.small ? 13 : 15}px;line-height:${hi ? 1.75 : 1.6};color:${opts.muted ? T.muted : T.ink}">${esc(text).replace(/\n/g, '<br>')}</p>`,
    ),
    text: `${text}\n`,
  });

  const greeting = (name?: string | null): Block => {
    const first = name?.trim().split(/\s+/)[0];
    return para(hi ? (first ? `नमस्ते ${first},` : 'नमस्ते,') : first ? `Hi ${first},` : 'Hi there,');
  };

  const list = (items: string[]): Block => ({
    html: row(
      `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${items
        .map(
          (i) =>
            `<tr><td valign="top" class="m-accent" style="width:18px;font-family:${MONO};font-size:13px;line-height:1.6;color:${T.accent}">&#8212;</td><td class="m-ink" style="font-family:${SANS};font-size:15px;line-height:1.6;color:${T.ink};padding-bottom:6px">${esc(i)}</td></tr>`,
        )
        .join('')}</table>`,
    ),
    text: items.map((i) => `- ${i}`).join('\n') + '\n',
  });

  const button = (text: string, url: string): Block => ({
    html: row(
      `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td class="m-btn" style="background:${T.ink};border-radius:4px">
<a href="${safeUrl(url)}" class="m-btn-ink" style="display:inline-block;padding:13px 22px;font-family:${SANS};font-size:14px;font-weight:600;letter-spacing:.01em;color:${T.headInk};text-decoration:none">${esc(text)} &rarr;</a>
</td></tr></table>`,
      '6px 0 24px',
    ),
    text: `${text}: ${url}\n`,
  });

  /** Large mono code (OTP or coupon). `caption` sits above it in the kicker style. */
  const codeBox = (code: string, caption?: string): Block => ({
    html: row(
      `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" class="m-soft" style="background:${T.soft};border:1px solid ${T.line};border-radius:4px;padding:22px 12px">
${caption ? `<div class="m-faint" style="${label(11, '.14em')};color:${T.faint};padding-bottom:10px">${esc(caption)}</div>` : ''}
<div class="m-ink" style="font-family:${MONO};font-size:34px;line-height:1;letter-spacing:.3em;font-weight:600;color:${T.ink};padding-left:.3em">${esc(code)}</div>
</td></tr></table>`,
      '4px 0 22px',
    ),
    text: `${caption ? `${caption}: ` : ''}${code}\n`,
  });

  /** Label / value table, e.g. a receipt. `strong` rows are drawn as the total. */
  const details = (rows: Array<{ label: string; value: string; strong?: boolean }>): Block => ({
    html: row(
      `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid ${T.line}" class="m-line">${rows
        .map(
          (r) =>
            `<tr><td class="m-muted m-line" style="padding:11px 0;border-bottom:1px solid ${T.line};${label(11, '.1em')};color:${T.muted}">${esc(r.label)}</td><td align="right" class="m-ink m-line" style="padding:11px 0;border-bottom:1px solid ${T.line};font-family:${SANS};font-size:${r.strong ? 17 : 14}px;font-weight:${r.strong ? 600 : 400};color:${T.ink}">${esc(r.value)}</td></tr>`,
        )
        .join('')}</table>`,
      '4px 0 22px',
    ),
    text: rows.map((r) => `${r.label}: ${r.value}`).join('\n') + '\n',
  });

  /** Bordered aside, for security warnings and review notes. */
  const notice = (text: string, title?: string): Block => ({
    html: row(
      `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td class="m-line" style="border-left:2px solid ${T.accent};padding:4px 0 4px 14px">
${title ? `<div class="m-ink" style="font-family:${SANS};font-size:14px;font-weight:600;color:${T.ink};padding-bottom:4px">${esc(title)}</div>` : ''}
<div class="m-muted" style="font-family:${SANS};font-size:14px;line-height:1.6;color:${T.muted}">${esc(text).replace(/\n/g, '<br>')}</div>
</td></tr></table>`,
    ),
    text: `${title ? `${title}\n` : ''}${text}\n`,
  });

  const divider = (): Block => ({
    html: row(`<div class="m-line" style="height:1px;line-height:1px;font-size:0;background:${T.line}">&nbsp;</div>`, '6px 0 22px'),
    text: '---\n',
  });

  /** Admin-written copy: blank lines split paragraphs, `- ` lines become a list. All escaped. */
  const richText = (body: string): Block[] =>
    body
      .replace(/\r\n/g, '\n')
      .split(/\n\s*\n/)
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const lines = chunk.split('\n');
        return lines.every((l) => /^\s*[-*•]\s+/.test(l)) ? list(lines.map((l) => l.replace(/^\s*[-*•]\s+/, ''))) : para(chunk);
      });

  const layout = (o: LayoutOptions): RenderedEmail => {
    const f = FOOTER[locale];
    const body = o.blocks.map((b) => b.html).join('\n');
    const year = new Date().getFullYear();
    const reason = o.reason ?? f.reason;
    const unsub = o.unsubscribeUrl
      ? ` <a href="${safeUrl(o.unsubscribeUrl)}" class="m-faint" style="color:${T.faint};text-decoration:underline">${f.unsubscribe}</a> ${f.fromOffers}`
      : '';
    // Pads the preheader so clients don't pull body text into the inbox preview.
    const spacer = '&#847;&zwnj;&nbsp;'.repeat(60);

    const html = `<!doctype html>
<html lang="${locale}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(o.subject)}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  a { color:${T.accent}; }
  @media (max-width:600px) { .m-pad { padding:28px 22px !important; } .m-hpad { padding:18px 22px !important; } }
  @media (prefers-color-scheme: dark) {
    .m-page { background:#0b0b0d !important; }
    .m-card { background:#151517 !important; border-color:#26262a !important; }
    .m-ink { color:#efede7 !important; }
    .m-muted { color:#a8a59e !important; }
    .m-faint { color:#7c7a75 !important; }
    .m-soft { background:#1d1d20 !important; border-color:#2c2c30 !important; }
    .m-line { border-color:#2a2a2e !important; }
    .m-accent { color:#eca8d6 !important; }
    .m-btn { background:#efede7 !important; }
    .m-btn-ink { color:#0c0c0e !important; }
  }
</style>
</head>
<body class="m-page" style="margin:0;padding:0;background:${T.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${esc(o.preheader)}${spacer}</div>
<table role="presentation" class="m-page" width="100%" cellpadding="0" cellspacing="0" style="background:${T.page}">
<tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px">
<tr><td class="m-hpad" style="background:${T.head};border-radius:4px 4px 0 0;padding:20px 36px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td><a href="${safeUrl(o.appUrl)}" style="font-family:${SANS};font-size:15px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:${T.headInk};text-decoration:none">${esc(BRAND.name)}</a></td>
    <td align="right" style="font-family:${MONO};font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#8d8a84">${esc(BRAND.domain)}</td>
  </tr></table>
</td></tr>
<tr><td style="height:2px;line-height:2px;font-size:0;background:${T.accent};background-image:${GRADIENT}">&nbsp;</td></tr>
<tr><td class="m-card m-pad" style="background:${T.card};border:1px solid ${T.line};border-top:0;border-radius:0 0 4px 4px;padding:40px 36px 22px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${body}
</table>
</td></tr>
<tr><td style="padding:22px 8px 0">
  <p class="m-faint" style="margin:0 0 6px;font-family:${SANS};font-size:12px;line-height:1.6;color:${T.faint}">${esc(reason)}${unsub}</p>
  <p class="m-faint" style="margin:0;font-family:${MONO};font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${T.faint}">&copy; ${year} ${esc(BRAND.name)} &middot; <a href="mailto:${esc(BRAND.supportEmail)}" class="m-faint" style="color:${T.faint}">${esc(BRAND.supportEmail)}</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    const text = [
      BRAND.name.toUpperCase(),
      '',
      o.blocks.map((b) => b.text).join('\n'),
      '--',
      reason,
      o.unsubscribeUrl ? `${f.unsubText}: ${o.unsubscribeUrl}` : '',
      `${BRAND.name} · ${BRAND.supportEmail}`,
    ]
      .join('\n')
      .trim();

    return { subject: o.subject, html, text };
  };

  return { kicker, heading, para, greeting, list, button, codeBox, details, notice, divider, richText, layout };
}

export type Kit = ReturnType<typeof kit>;
