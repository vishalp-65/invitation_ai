/**
 * Messages hosts send guests (WhatsApp / SMS / Cloud API), in the invitation's language.
 * Plain data and string templates only, so the web and API can both use them cheaply.
 * Placeholders: {name} greeting, {title} event title, {url} personal link, {fn} function, {when} date/time, {venue}.
 */
import type { LanguageCode } from '../constants/languages.js';

export const MESSAGE_KINDS = ['invite', 'unopened', 'rsvp', 'dayBefore', 'thanks', 'giftThanks', 'saveTheDate'] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

type Pack = Record<MessageKind, string>;

const PACKS: Record<LanguageCode, Pack> = {
  en: {
    invite: '{name}, you are warmly invited to {title}. Please open your invitation: {url}',
    unopened: '{name}, a gentle reminder: your invitation to {title} is waiting for you: {url}',
    rsvp: '{name}, please let us know if you can join us for {title}. It takes a minute: {url}',
    dayBefore: '{name}, see you tomorrow at {title}! {fn}: {when}, {venue}. Details and map: {url}',
    thanks: '{name}, thank you for being with us at {title}. Your blessings meant the world to us. Photos: {url}',
    giftThanks: '{name}, thank you for your loving gift and blessings for {title}. 🙏',
    saveTheDate: '{name}, save the date! {title}, {when}. The full invitation will follow: {url}',
  },
  hi: {
    invite: '{name}, आपको {title} में सादर आमंत्रित किया जाता है। कृपया अपना निमंत्रण खोलें: {url}',
    unopened: '{name}, विनम्र स्मरण: {title} का आपका निमंत्रण आपकी प्रतीक्षा कर रहा है: {url}',
    rsvp: '{name}, कृपया बताएं कि क्या आप {title} में पधार सकेंगे। बस एक मिनट लगेगा: {url}',
    dayBefore: '{name}, कल {title} में आपकी प्रतीक्षा रहेगी! {fn}: {when}, {venue}। विवरण और नक्शा: {url}',
    thanks: '{name}, {title} में पधारने के लिए हार्दिक धन्यवाद। आपका आशीर्वाद हमारे लिए अनमोल है। तस्वीरें: {url}',
    giftThanks: '{name}, {title} के लिए आपके स्नेह भरे उपहार और आशीर्वाद के लिए हार्दिक धन्यवाद। 🙏',
    saveTheDate: '{name}, तारीख याद रखें! {title}, {when}। पूरा निमंत्रण जल्द आएगा: {url}',
  },
  mr: {
    invite: '{name}, {title} साठी आपणांस सस्नेह आमंत्रण. कृपया आपले निमंत्रण उघडा: {url}',
    unopened: '{name}, नम्र आठवण: {title} चे आपले निमंत्रण आपली वाट पाहत आहे: {url}',
    rsvp: '{name}, आपण {title} ला येऊ शकाल का ते कृपया कळवा. फक्त एक मिनिट: {url}',
    dayBefore: '{name}, उद्या {title} मध्ये भेटूया! {fn}: {when}, {venue}. तपशील आणि नकाशा: {url}',
    thanks: '{name}, {title} ला उपस्थित राहिल्याबद्दल मनःपूर्वक धन्यवाद. आपले आशीर्वाद आमच्यासाठी मोलाचे आहेत. फोटो: {url}',
    giftThanks: '{name}, {title} साठी आपल्या प्रेमळ भेटीबद्दल आणि आशीर्वादाबद्दल मनःपूर्वक धन्यवाद. 🙏',
    saveTheDate: '{name}, ही तारीख लक्षात ठेवा! {title}, {when}. संपूर्ण निमंत्रण लवकरच: {url}',
  },
  gu: {
    invite: '{name}, {title} માં આપને સ્નેહભર્યું આમંત્રણ છે. કૃપા કરી આપનું આમંત્રણ ખોલો: {url}',
    unopened: '{name}, નમ્ર યાદ: {title} નું આપનું આમંત્રણ આપની રાહ જુએ છે: {url}',
    rsvp: '{name}, કૃપા કરી જણાવો કે આપ {title} માં પધારી શકશો કે નહીં. માત્ર એક મિનિટ: {url}',
    dayBefore: '{name}, કાલે {title} માં મળીએ! {fn}: {when}, {venue}. વિગતો અને નકશો: {url}',
    thanks: '{name}, {title} માં પધારવા બદલ હૃદયપૂર્વક આભાર. આપના આશીર્વાદ અમારા માટે અમૂલ્ય છે. ફોટા: {url}',
    giftThanks: '{name}, {title} માટે આપની પ્રેમભરી ભેટ અને આશીર્વાદ બદલ હૃદયપૂર્વક આભાર. 🙏',
    saveTheDate: '{name}, તારીખ યાદ રાખજો! {title}, {when}. સંપૂર્ણ આમંત્રણ ટૂંક સમયમાં: {url}',
  },
  ta: {
    invite: '{name}, {title} நிகழ்வுக்கு உங்களை அன்புடன் அழைக்கிறோம். உங்கள் அழைப்பிதழைத் திறக்கவும்: {url}',
    unopened: '{name}, அன்பான நினைவூட்டல்: {title} அழைப்பிதழ் உங்களுக்காகக் காத்திருக்கிறது: {url}',
    rsvp: '{name}, {title} நிகழ்வில் கலந்துகொள்ள முடியுமா என்று தெரிவிக்கவும். ஒரு நிமிடம் போதும்: {url}',
    dayBefore: '{name}, நாளை {title} நிகழ்வில் சந்திப்போம்! {fn}: {when}, {venue}. விவரங்கள் மற்றும் வரைபடம்: {url}',
    thanks: '{name}, {title} நிகழ்வில் கலந்துகொண்டதற்கு மனமார்ந்த நன்றி. உங்கள் ஆசீர்வாதம் எங்களுக்கு விலைமதிப்பற்றது. புகைப்படங்கள்: {url}',
    giftThanks: '{name}, {title} க்கான உங்கள் அன்பான பரிசுக்கும் ஆசீர்வாதத்திற்கும் மனமார்ந்த நன்றி. 🙏',
    saveTheDate: '{name}, தேதியைக் குறித்துக்கொள்ளுங்கள்! {title}, {when}. முழு அழைப்பிதழ் விரைவில்: {url}',
  },
  te: {
    invite: '{name}, {title} కు మిమ్మల్ని సాదరంగా ఆహ్వానిస్తున్నాము. దయచేసి మీ ఆహ్వానాన్ని తెరవండి: {url}',
    unopened: '{name}, చిన్న గుర్తు: {title} ఆహ్వానం మీ కోసం ఎదురుచూస్తోంది: {url}',
    rsvp: '{name}, మీరు {title} కు రాగలరో లేదో దయచేసి తెలియజేయండి. ఒక్క నిమిషం చాలు: {url}',
    dayBefore: '{name}, రేపు {title} లో కలుద్దాం! {fn}: {when}, {venue}. వివరాలు మరియు మ్యాప్: {url}',
    thanks: '{name}, {title} కు విచ్చేసినందుకు హృదయపూర్వక ధన్యవాదాలు. మీ ఆశీస్సులు మాకు అమూల్యం. ఫోటోలు: {url}',
    giftThanks: '{name}, {title} కోసం మీ ప్రేమపూర్వక కానుక మరియు ఆశీస్సులకు హృదయపూర్వక ధన్యవాదాలు. 🙏',
    saveTheDate: '{name}, ఈ తేదీని గుర్తుంచుకోండి! {title}, {when}. పూర్తి ఆహ్వానం త్వరలో: {url}',
  },
  kn: {
    invite: '{name}, {title} ಗೆ ನಿಮಗೆ ಆದರದ ಆಮಂತ್ರಣ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಆಮಂತ್ರಣ ತೆರೆಯಿರಿ: {url}',
    unopened: '{name}, ವಿನಮ್ರ ನೆನಪು: {title} ಆಮಂತ್ರಣ ನಿಮಗಾಗಿ ಕಾಯುತ್ತಿದೆ: {url}',
    rsvp: '{name}, ನೀವು {title} ಗೆ ಬರಲು ಸಾಧ್ಯವೇ ಎಂದು ದಯವಿಟ್ಟು ತಿಳಿಸಿ. ಒಂದು ನಿಮಿಷ ಸಾಕು: {url}',
    dayBefore: '{name}, ನಾಳೆ {title} ನಲ್ಲಿ ಭೇಟಿಯಾಗೋಣ! {fn}: {when}, {venue}. ವಿವರ ಮತ್ತು ನಕ್ಷೆ: {url}',
    thanks: '{name}, {title} ಗೆ ಆಗಮಿಸಿದ್ದಕ್ಕಾಗಿ ಹೃತ್ಪೂರ್ವಕ ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ಆಶೀರ್ವಾದ ನಮಗೆ ಅಮೂಲ್ಯ. ಫೋಟೋಗಳು: {url}',
    giftThanks: '{name}, {title} ಗಾಗಿ ನಿಮ್ಮ ಪ್ರೀತಿಯ ಉಡುಗೊರೆ ಮತ್ತು ಆಶೀರ್ವಾದಕ್ಕೆ ಹೃತ್ಪೂರ್ವಕ ಧನ್ಯವಾದಗಳು. 🙏',
    saveTheDate: '{name}, ಈ ದಿನಾಂಕ ನೆನಪಿಡಿ! {title}, {when}. ಪೂರ್ಣ ಆಮಂತ್ರಣ ಶೀಘ್ರದಲ್ಲೇ: {url}',
  },
  ml: {
    invite: '{name}, {title} ലേക്ക് നിങ്ങളെ സ്നേഹപൂർവം ക്ഷണിക്കുന്നു. ദയവായി നിങ്ങളുടെ ക്ഷണക്കത്ത് തുറക്കുക: {url}',
    unopened: '{name}, ഒരു ഓർമ്മപ്പെടുത്തൽ: {title} ക്ഷണക്കത്ത് നിങ്ങളെ കാത്തിരിക്കുന്നു: {url}',
    rsvp: '{name}, {title} ൽ പങ്കെടുക്കാൻ കഴിയുമോ എന്ന് ദയവായി അറിയിക്കുക. ഒരു മിനിറ്റ് മതി: {url}',
    dayBefore: '{name}, നാളെ {title} ൽ കാണാം! {fn}: {when}, {venue}. വിവരങ്ങളും മാപ്പും: {url}',
    thanks: '{name}, {title} ൽ പങ്കെടുത്തതിന് ഹൃദയം നിറഞ്ഞ നന്ദി. നിങ്ങളുടെ അനുഗ്രഹം ഞങ്ങൾക്ക് വിലപ്പെട്ടതാണ്. ഫോട്ടോകൾ: {url}',
    giftThanks: '{name}, {title} നായി നിങ്ങൾ നൽകിയ സ്നേഹസമ്മാനത്തിനും അനുഗ്രഹത്തിനും ഹൃദയം നിറഞ്ഞ നന്ദി. 🙏',
    saveTheDate: '{name}, ഈ തീയതി ഓർത്തുവെക്കൂ! {title}, {when}. മുഴുവൻ ക്ഷണക്കത്ത് ഉടൻ: {url}',
  },
  bn: {
    invite: '{name}, {title}-এ আপনাকে সাদর আমন্ত্রণ জানাই। অনুগ্রহ করে আপনার আমন্ত্রণপত্র খুলুন: {url}',
    unopened: '{name}, বিনীত স্মরণ: {title}-এর আমন্ত্রণপত্র আপনার অপেক্ষায়: {url}',
    rsvp: '{name}, অনুগ্রহ করে জানান আপনি {title}-এ আসতে পারবেন কি না। এক মিনিট লাগবে: {url}',
    dayBefore: '{name}, কাল {title}-এ দেখা হচ্ছে! {fn}: {when}, {venue}। বিস্তারিত ও ম্যাপ: {url}',
    thanks: '{name}, {title}-এ উপস্থিত থাকার জন্য আন্তরিক ধন্যবাদ। আপনার আশীর্বাদ আমাদের কাছে অমূল্য। ছবি: {url}',
    giftThanks: '{name}, {title}-এর জন্য আপনার স্নেহের উপহার ও আশীর্বাদের জন্য আন্তরিক ধন্যবাদ। 🙏',
    saveTheDate: '{name}, তারিখটি মনে রাখবেন! {title}, {when}। পূর্ণ আমন্ত্রণপত্র শীঘ্রই: {url}',
  },
  pa: {
    invite: '{name}, ਤੁਹਾਨੂੰ {title} ਵਿੱਚ ਸਤਿਕਾਰ ਸਹਿਤ ਸੱਦਾ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਸੱਦਾ ਖੋਲ੍ਹੋ: {url}',
    unopened: '{name}, ਨਿਮਰ ਯਾਦ: {title} ਦਾ ਤੁਹਾਡਾ ਸੱਦਾ ਤੁਹਾਡੀ ਉਡੀਕ ਕਰ ਰਿਹਾ ਹੈ: {url}',
    rsvp: '{name}, ਕਿਰਪਾ ਕਰਕੇ ਦੱਸੋ ਕਿ ਕੀ ਤੁਸੀਂ {title} ਵਿੱਚ ਆ ਸਕੋਗੇ। ਬੱਸ ਇੱਕ ਮਿੰਟ: {url}',
    dayBefore: '{name}, ਕੱਲ੍ਹ {title} ਵਿੱਚ ਮਿਲਦੇ ਹਾਂ! {fn}: {when}, {venue}। ਵੇਰਵੇ ਅਤੇ ਨਕਸ਼ਾ: {url}',
    thanks: '{name}, {title} ਵਿੱਚ ਸ਼ਾਮਲ ਹੋਣ ਲਈ ਦਿਲੋਂ ਧੰਨਵਾਦ। ਤੁਹਾਡੀਆਂ ਅਸੀਸਾਂ ਸਾਡੇ ਲਈ ਅਨਮੋਲ ਹਨ। ਤਸਵੀਰਾਂ: {url}',
    giftThanks: '{name}, {title} ਲਈ ਤੁਹਾਡੇ ਪਿਆਰ ਭਰੇ ਤੋਹਫ਼ੇ ਅਤੇ ਅਸੀਸਾਂ ਲਈ ਦਿਲੋਂ ਧੰਨਵਾਦ। 🙏',
    saveTheDate: '{name}, ਤਾਰੀਖ਼ ਯਾਦ ਰੱਖੋ! {title}, {when}। ਪੂਰਾ ਸੱਦਾ ਜਲਦੀ ਆਵੇਗਾ: {url}',
  },
  or: {
    invite: '{name}, {title} କୁ ଆପଣଙ୍କୁ ସାଦର ନିମନ୍ତ୍ରଣ। ଦୟାକରି ଆପଣଙ୍କ ନିମନ୍ତ୍ରଣ ଖୋଲନ୍ତୁ: {url}',
    unopened: '{name}, ବିନମ୍ର ସ୍ମରଣ: {title} ର ନିମନ୍ତ୍ରଣ ଆପଣଙ୍କ ଅପେକ୍ଷାରେ ଅଛି: {url}',
    rsvp: '{name}, ଦୟାକରି ଜଣାନ୍ତୁ ଆପଣ {title} କୁ ଆସିପାରିବେ କି ନାହିଁ। ମାତ୍ର ଏକ ମିନିଟ୍: {url}',
    dayBefore: '{name}, କାଲି {title} ରେ ଦେଖା ହେବ! {fn}: {when}, {venue}। ବିବରଣୀ ଓ ମାନଚିତ୍ର: {url}',
    thanks: '{name}, {title} ରେ ଉପସ୍ଥିତ ରହିଥିବାରୁ ହୃଦୟରୁ ଧନ୍ୟବାଦ। ଆପଣଙ୍କ ଆଶୀର୍ବାଦ ଆମ ପାଇଁ ଅମୂଲ୍ୟ। ଫଟୋ: {url}',
    giftThanks: '{name}, {title} ପାଇଁ ଆପଣଙ୍କ ସ୍ନେହର ଉପହାର ଓ ଆଶୀର୍ବାଦ ପାଇଁ ହୃଦୟରୁ ଧନ୍ୟବାଦ। 🙏',
    saveTheDate: '{name}, ତାରିଖଟି ମନେ ରଖନ୍ତୁ! {title}, {when}। ପୂର୍ଣ୍ଣ ନିମନ୍ତ୍ରଣ ଶୀଘ୍ର: {url}',
  },
  ur: {
    invite: '{name}، آپ کو {title} میں دل سے مدعو کیا جاتا ہے۔ براہ کرم اپنا دعوت نامہ کھولیں: {url}',
    unopened: '{name}، ایک یاد دہانی: {title} کا آپ کا دعوت نامہ آپ کا منتظر ہے: {url}',
    rsvp: '{name}، براہ کرم بتائیں کہ کیا آپ {title} میں تشریف لا سکیں گے۔ صرف ایک منٹ: {url}',
    dayBefore: '{name}، کل {title} میں ملاقات ہوگی! {fn}: {when}، {venue}۔ تفصیلات اور نقشہ: {url}',
    thanks: '{name}، {title} میں تشریف لانے کا تہہ دل سے شکریہ۔ آپ کی دعائیں ہمارے لیے انمول ہیں۔ تصاویر: {url}',
    giftThanks: '{name}، {title} کے لیے آپ کے محبت بھرے تحفے اور دعاؤں کا تہہ دل سے شکریہ۔ 🙏',
    saveTheDate: '{name}، تاریخ یاد رکھیں! {title}، {when}۔ مکمل دعوت نامہ جلد: {url}',
  },
};

export interface MessageVars {
  name: string;
  title: string;
  url?: string;
  fn?: string;
  when?: string;
  venue?: string;
}

/** Fills a message template in the invitation's language (English when the language is unknown). */
export function guestMessage(kind: MessageKind, language: string, vars: MessageVars): string {
  const pack = PACKS[language as LanguageCode] ?? PACKS.en;
  const values = vars as unknown as Record<string, string | undefined>;
  const text = pack[kind].replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? '');
  // Tidy gaps left by empty optional parts (no venue, no link).
  return text
    .replace(/\s+([,،।.:])/g, '$1')
    .replace(/[,،]\s*([.।۔])/g, '$1')
    .replace(/:\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Short date + time in the invitation's language, e.g. "शनि, 13 दिस., 7:00 pm". */
export function messageWhen(iso: string, locale: string, timeZone = 'Asia/Kolkata'): string {
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone }).format(new Date(iso));
  } catch {
    return new Date(iso).toISOString().slice(0, 16).replace('T', ' ');
  }
}

export interface ComposeInput {
  event: { language: string; title: string; timezone?: string };
  functions: Array<{ id: string; name: string; startsAt: string | Date; venueName: string }>;
  guest: { name: string; salutation?: string | null; functionIds?: string[] | null };
  kind: MessageKind;
  url: string;
  locale: string;
  now?: number;
}

/** One guest's message, naming the next function they are invited to (same on web and server). */
export function composeGuestMessage({ event, functions, guest, kind, url, locale, now = Date.now() }: ComposeInput): string {
  const mine = guest.functionIds?.length ? functions.filter((f) => guest.functionIds!.includes(f.id)) : functions;
  const at = (f: { startsAt: string | Date }) => new Date(f.startsAt).getTime();
  const next = mine.find((f) => at(f) > now - 6 * 3_600_000) ?? mine[0];
  return guestMessage(kind, event.language, {
    name: guest.salutation || guest.name,
    title: event.title,
    url,
    fn: next?.name,
    when: next ? messageWhen(new Date(next.startsAt).toISOString(), locale, event.timezone) : undefined,
    venue: next?.venueName,
  });
}
