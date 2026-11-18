import { SCAN_FIELDS, type EventTypeId, type LanguageCode, type ScannedCard } from '@cardai/shared';

/**
 * Last-resort reader: turns raw OCR text into card details with plain rules (no AI). It gets the
 * easy, well-formatted parts right (dates, times, phone numbers, "X weds Y", venue lines) and marks
 * everything as "check this" so the user reviews it.
 */

const DIGIT_BASES = [0x0966, 0x0ae6, 0x09e6, 0x0a66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x0b66, 0x06f0, 0x0660];
function asciiDigits(s: string) {
  return s.replace(/[٠-٩۰-۹०-९০-৯੦-੯૦-૯୦-୯௦-௯౦-౯೦-೯൦-൯]/g, (c) => {
    const code = c.charCodeAt(0);
    const base = DIGIT_BASES.find((b) => code >= b && code <= b + 9)!;
    return String(code - base);
  });
}

const SCRIPTS: Array<[RegExp, LanguageCode]> = [
  [/[ऀ-ॿ]/g, 'hi'],
  [/[઀-૿]/g, 'gu'],
  [/[ঀ-৿]/g, 'bn'],
  [/[਀-੿]/g, 'pa'],
  [/[஀-௿]/g, 'ta'],
  [/[ఀ-౿]/g, 'te'],
  [/[ಀ-೿]/g, 'kn'],
  [/[ഀ-ൿ]/g, 'ml'],
  [/[଀-୿]/g, 'or'],
  [/[؀-ۿ]/g, 'ur'],
];

function detectLanguage(text: string): LanguageCode {
  let best: LanguageCode = 'en';
  let max = (text.match(/[a-z]/gi)?.length ?? 0) * 0.6; // Latin text is usually the bilingual extra
  for (const [re, code] of SCRIPTS) {
    const n = text.match(re)?.length ?? 0;
    if (n > max) {
      max = n;
      best = code;
    }
  }
  if (best === 'hi' && /आणि|यांच|सोहळा|लग्नसोहळ|चि\.सौ\.कां/.test(text)) return 'mr';
  return best;
}

const EVENT_WORDS: Array<[RegExp, EventTypeId]> = [
  [/nikah|निकाह|نکاح|walima/i, 'nikah'],
  [/anand\s*karaj|ਅਨੰਦ\s*ਕਾਰਜ|आनंद\s*कारज/i, 'anand-karaj'],
  [/holy\s*matrimony|church/i, 'christian-wedding'],
  [/engagement|ring\s*ceremony|sagai|सगाई|roka|रोका|सगपण|સગાઈ/i, 'engagement'],
  [/griha\s*pravesh|house\s*warming|housewarming|गृह\s*प्रवेश|वास्तु|વાસ્તુ/i, 'griha-pravesh'],
  [/naam?karan|naming\s*ceremony|नामकरण/i, 'naming-ceremony'],
  [/mundan|मुंडन/i, 'mundan'],
  [/annaprash?an|अन्नप्राशन/i, 'annaprashan'],
  [/upanay|janeu|जनेऊ|यज्ञोपवीत|उपनयन/i, 'upanayana'],
  [/godh\s*bharai|baby\s*shower|गोद\s*भराई|सीमंत|શ્રીમંત/i, 'baby-shower'],
  [/birthday|जन्मदिन|janamdin/i, 'birthday'],
  [/anniversary|वर्षगाँठ|सालगिरह/i, 'anniversary'],
  [/jagran|जागरण|चौकी/i, 'jagran'],
  [/bhandara|भंडारा/i, 'bhandara'],
  [/katha|कथा|puja|pooja|पूजा|पाठ/i, 'puja'],
  [/retirement|सेवानिवृत्ति/i, 'retirement'],
  [/inaugurat|grand\s*opening|शुभारंभ|उद्घाटन|ઉદ્ઘાટન/i, 'shop-opening'],
  [/wedding|marriage|vivah|विवाह|शादी|लग्न|परिणय|पाणिग्रहण|લગ્ન|বিবাহ|ਵਿਆਹ|திருமண|వివాహ|ಮದುವೆ|വിവാഹ/i, 'wedding'],
  [/reception|स्वागत\s*समारोह|प्रीतिभोज/i, 'reception'],
];

const MONTHS: Array<[RegExp, number]> = [
  [/jan(uary)?|जनवरी/i, 1],
  [/feb(ruary)?|फ़?फरवरी|फ़रवरी/i, 2],
  [/mar(ch)?|मार्च/i, 3],
  [/apr(il)?|अप्रैल/i, 4],
  [/may|मई/i, 5],
  [/june?|जून/i, 6],
  [/july?|जुलाई/i, 7],
  [/aug(ust)?|अगस्त/i, 8],
  [/sep(t(ember)?)?|सितंबर|सितम्बर/i, 9],
  [/oct(ober)?|अक्टूबर|अक्तूबर/i, 10],
  [/nov(ember)?|नवंबर|नवम्बर/i, 11],
  [/dec(ember)?|दिसंबर|दिसम्बर/i, 12],
];
const MONTH_ALT = '(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec|जनवरी|फरवरी|फ़रवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|अक्तूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर)(?![a-z])';

const FUNCTION_WORDS =
  /(haldi|mehe?n?di|sangeet|reception|wedding|baraat|barat|phere|tilak|engagement|ring ceremony|cocktail|walima|nikah|puja|bhoj|lunch|dinner|हल्दी|मेहंदी|मेंहदी|संगीत|बारात|फेरे|पाणिग्रहण|तिलक|सगाई|प्रीतिभोज|स्वागत समारोह|विवाह|लग्न|भोजन|पूजा|गणेश पूजन|मंडप|माता पूजन)/i;
const VENUE_WORDS =
  /(venue|स्थान|स्थल|ठिकाण|palace|hotel|resort|garden|lawns?|banquet|hall|farm|club|mandap|bhawan|bhavan|vatika|marriage|भवन|वाटिका|गार्डन|पैलेस|होटल|रिसॉर्ट|बैंक्वेट|हॉल|लॉन|फार्म|धर्मशाला|निवास|મંડપ|વાડી|હોલ)/i;
const HONORIFICS = /^(chi\.?|chiranjeev|sau\.?\s*ka\.?|sau\.?|kum\.?|ms\.?|mr\.?|mrs\.?|dr\.?|चि\.?|चिरंजीव|सौ\.?\s*का\.?|सौ\.?|कु\.?|आयु\.?|आयुष्मान|आयुष्मती|सुश्री|श्री\.?|ચિ\.?|ચિ\.સૌ\.?)\s*/i;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toIsoDate(day: number, month: number, year: number | null, today: Date): string | null {
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  let y = year ?? today.getFullYear();
  if (y < 100) y += 2000;
  const iso = `${y}-${pad(month)}-${pad(day)}`;
  if (year == null && iso < today.toISOString().slice(0, 10)) return `${y + 1}-${pad(month)}-${pad(day)}`;
  return iso;
}

function findDate(line: string, today: Date): string | null {
  const num = line.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if (num) return toIsoDate(+num[1]!, +num[2]!, +num[3]!, today);
  const dm = line.match(new RegExp(`(\\d{1,2})\\s*(?:st|nd|rd|th|ली|री|वीं)?\\s*(?:of\\s+)?${MONTH_ALT}[,\\s]*(\\d{4})?`, 'i'));
  const md = line.match(new RegExp(`${MONTH_ALT}\\s+(\\d{1,2})(?:st|nd|rd|th)?[,\\s]*(\\d{4})?`, 'i'));
  const hit = dm ? { d: dm[1]!, m: dm[2]!, y: dm[3] } : md ? { d: md[2]!, m: md[1]!, y: md[3] } : null;
  if (!hit) return null;
  const month = MONTHS.find(([re]) => re.test(hit.m))?.[1];
  return month ? toIsoDate(+hit.d, month, hit.y ? +hit.y : null, today) : null;
}

function findTime(line: string): string | null {
  const en = line.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])/i);
  if (en) {
    let h = +en[1]! % 12;
    if (/p/i.test(en[3]!)) h += 12;
    return `${pad(h)}:${en[2] ?? '00'}`;
  }
  const hi = line.match(/(प्रातः|प्रात:|सुबह|दोपहर|अपराह्न|सायं|सायंकाल|शाम|रात्रि|रात)?\s*(\d{1,2})(?:[:.](\d{2}))?\s*बजे/);
  if (hi) {
    let h = +hi[2]!;
    if (hi[1] && /दोपहर|अपराह्न|सायं|शाम|रात/.test(hi[1]) && h < 12) h += 12;
    return `${pad(h % 24)}:${hi[3] ?? '00'}`;
  }
  const h24 = line.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  return h24 ? `${pad(+h24[1]!)}:${h24[2]}` : null;
}

const cleanName = (s: string) =>
  s
    .replace(HONORIFICS, '')
    .replace(HONORIFICS, '')
    .replace(/[|॥“”"]/g, '')
    .trim();

const PARENTAGE = /^(s\/o|d\/o|son of|daughter of|grandson|granddaughter|सुपुत्र|सुपुत्री|पुत्र|पुत्री|सुपौत्र|सुपौत्री|मुलगा|मुलगी|સુપુત્ર|સુપુત્રી)/i;

/** The parentage line printed right under a name ("S/o Mr. & Mrs. …"). */
function parentageAfter(lines: string[], name: string): string {
  const i = lines.findIndex((l) => cleanName(l) === name);
  const next = i >= 0 ? lines[i + 1] : undefined;
  return next && PARENTAGE.test(next) ? next : '';
}

function findNames(lines: string[]): string[] {
  const join = /\s+(?:weds|wed|with|&|and|संग|सँग|के साथ|ગ્રહે|ਸੰਗ)\s+/i;
  for (const l of lines) {
    if (l.length > 70) continue;
    const parts = l.split(join);
    if (parts.length === 2 && parts.every((p) => p.trim().length >= 2 && p.trim().length <= 40)) return parts.map(cleanName);
  }
  // Names on their own lines around a lone connector line ("Aarav / weds / Diya").
  const i = lines.findIndex((l) => /^(?:weds|&|संग|सँग|with)$/i.test(l.trim()));
  if (i > 0 && i < lines.length - 1) {
    // Step over parentage lines printed between a name and the connector.
    let a = i - 1;
    while (a > 0 && PARENTAGE.test(lines[a]!)) a--;
    return [cleanName(lines[a]!), cleanName(lines[i + 1]!)];
  }
  // Traditional Hindi cards: "चि. आरव" … "सौ.का. दिया".
  const groom = lines.find((l) => /^(chi\.|चि\.|ચિ\.)/i.test(l.trim()));
  const bride = lines.find((l) => /^(sau\.|सौ\.|आयु\.|कु\.|ચિ\.સૌ)/i.test(l.trim()));
  return [groom, bride].filter(Boolean).map((l) => cleanName(l!.split(/\s{2,}|,|\(|सुपुत्र|सुपुत्री|s\/o|d\/o/i)[0]!));
}

export function parseCardText(raw: string, today = new Date()): ScannedCard {
  const text = asciiDigits(raw);
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 1);
  const eventType = EVENT_WORDS.find(([re]) => re.test(text))?.[1] ?? null;

  // One function per distinct date, each with the time / venue / name found near it.
  const dateAt = lines.map((l) => findDate(l, today));
  const starts = dateAt.flatMap((d, i) => (d && dateAt.indexOf(d) === i ? [i] : [])).slice(0, 6);
  const venueLine = (from: number, to: number) => {
    for (let i = from; i < to; i++) if (VENUE_WORDS.test(lines[i]!) && !findDate(lines[i]!, today)) return i;
    return -1;
  };
  const globalVenue = venueLine(0, lines.length);
  const venueOf = (i: number) => {
    if (i < 0) return { venueName: null, venueAddress: null };
    const name = lines[i]!.replace(/^(venue|स्थान|स्थल|ठिकाण)\s*[:：-]?\s*/i, '').trim();
    const next = lines[i + 1];
    const address = next && !next.startsWith('#') && !findDate(next, today) && !findTime(next) && next.length < 90 ? next : null;
    return { venueName: name || null, venueAddress: address };
  };
  const functions = starts.map((start, k) => {
    const end = starts[k + 1] ?? Math.min(lines.length, start + 6);
    const window = lines.slice(Math.max(0, start - 1), end);
    const time = window.map(findTime).find(Boolean) ?? null;
    const named = window.map((l) => l.match(FUNCTION_WORDS)?.[1]).find(Boolean);
    const v = venueLine(start, end);
    return { name: named ?? '', date: dateAt[start]!, time, ...venueOf(v >= 0 ? v : globalVenue) };
  });

  const phones = lines.flatMap((l) => {
    const m = l.match(/(?:\+?91[\s-]?)?([6-9]\d{4}[\s-]?\d{5})/);
    if (!m) return [];
    const name = l.slice(0, m.index).replace(/[:\-–,]+$/, '').replace(/^(rsvp|contact|संपर्क|सम्पर्क)\s*[:-]?\s*/i, '').trim();
    return [{ name: name.slice(0, 60), phone: m[1]!.replace(/[\s-]/g, '') }];
  });

  const names = findNames(lines).filter(Boolean).slice(0, 2);
  const parentage = names.map((n) => parentageAfter(lines, n));
  return {
    isInvitation: true,
    eventType,
    language: detectLanguage(text),
    community: null,
    primaryNames: names,
    primaryDetails: parentage.some(Boolean) ? parentage : [],
    hosts: null,
    invocation: lines.find((l) => /॥|श्री\s*गणेशाय|ॐ|बिस्मिल्लाह|bismillah|ੴ/i.test(l)) ?? null,
    headline: lines.find((l) => l.length < 40 && /शुभ\s*विवाह|wedding\s*invitation|invitation|निमंत्रण|आमंत्रण|शुभ\s*लग्न|कंकोत्री|kankotri|save the date/i.test(l)) ?? null,
    hostLine: null,
    connector: null,
    message: null,
    familyTitle: null,
    familyLines: [],
    welcomeTitle: null,
    welcomeLines: [],
    complimentsTitle: null,
    complimentsLines: [],
    closing: null,
    note: null,
    hashtag: text.match(/#[\p{L}\p{N}_]{3,39}/u)?.[0] ?? null,
    rsvpContacts: phones.slice(0, 3),
    functions,
    uncertain: [...SCAN_FIELDS],
  };
}
