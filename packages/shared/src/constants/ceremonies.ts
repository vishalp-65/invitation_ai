import type { Community } from './event-types.js';
import type { LanguageCode } from './languages.js';

/**
 * Regional ceremony packs: the functions a family of each tradition usually holds, with their
 * names in the family's languages, a one-line "what happens" for guests, a dress suggestion
 * and a typical day / time relative to the wedding day. Hosts add a pack's ceremonies to their
 * schedule in one tap; the website explains each ceremony to guests from other regions.
 *
 * Zod-free (the website and the editor import it).
 */

type L = Partial<Record<LanguageCode, string>> & { en: string };

export type CeremonyIcon = 'haldi' | 'mehendi' | 'sangeet' | 'baraat' | 'wedding' | 'pheras' | 'reception' | 'rings' | 'puja' | 'nikah' | 'cake' | 'dinner' | 'flower';

export interface Ceremony {
  id: string;
  name: L;
  /** What happens, for guests who don't know the ritual. */
  about: L;
  dress: L;
  icon: CeremonyIcon;
  /** Days from the wedding day (−2 = two days before) and the usual start time (IST, 24 h). */
  day: number;
  time: string;
  /** Other names people type for it (matched case-insensitively). */
  aliases?: string[];
}

export const CEREMONIES: readonly Ceremony[] = [
  {
    id: 'ganesh-puja',
    name: { en: 'Ganesh Puja', hi: 'गणेश पूजन', mr: 'गणपती पूजन', gu: 'ગણેશ સ્થાપન' },
    about: { en: 'The family prays to Lord Ganesha so the celebrations begin without obstacles.', hi: 'शुभ कार्य निर्विघ्न संपन्न हों, इसलिए परिवार भगवान गणेश की पूजा करता है।' },
    dress: { en: 'Traditional, soft colours', hi: 'पारंपरिक, हल्के रंग' },
    icon: 'puja',
    day: -2,
    time: '10:00',
    aliases: ['ganpati', 'ganesh sthapana', 'vinayak'],
  },
  {
    id: 'tilak',
    name: { en: 'Tilak', hi: 'तिलक' },
    about: { en: "The bride's family visits the groom's home and applies tilak, formally accepting him.", hi: 'वधू पक्ष वर के घर जाकर तिलक करता है और रिश्ते को पक्का करता है।' },
    dress: { en: 'Festive Indian wear', hi: 'उत्सव के परिधान' },
    icon: 'rings',
    day: -3,
    time: '17:00',
  },
  {
    id: 'sakharpuda',
    name: { en: 'Sakharpuda', hi: 'साखरपुडा', mr: 'साखरपुडा' },
    about: { en: 'The Maharashtrian engagement: the families exchange sugar, sarees and rings.', hi: 'महाराष्ट्रीय सगाई: दोनों परिवार शक्कर, साड़ी और अंगूठियों का आदान-प्रदान करते हैं।' },
    dress: { en: 'Paithani, nauvari or festive wear', hi: 'पैठणी, नऊवारी या उत्सव परिधान' },
    icon: 'rings',
    day: -2,
    time: '11:00',
  },
  {
    id: 'mameru',
    name: { en: 'Mameru', hi: 'मामेरु', gu: 'મામેરું' },
    about: { en: "The bride's maternal uncle brings gifts: a panetar saree, jewellery and sweets.", hi: 'वधू के मामा पानेतर साड़ी, गहने और मिठाई का उपहार लाते हैं।' },
    dress: { en: 'Bright traditional colours', hi: 'चटक पारंपरिक रंग' },
    icon: 'flower',
    day: -1,
    time: '11:00',
  },
  {
    id: 'mayra',
    name: { en: 'Mayra (Bhaat)', hi: 'मायरा (भात)' },
    about: { en: "The mother's brothers arrive with gifts for the family, a much-loved Rajasthani custom.", hi: 'माँ के भाई परिवार के लिए उपहार लेकर आते हैं, राजस्थान की प्रिय रस्म।' },
    dress: { en: 'Bandhej, leheriya or bright colours', hi: 'बंधेज, लहरिया या चटक रंग' },
    icon: 'flower',
    day: -1,
    time: '12:00',
    aliases: ['bhaat', 'bhat', 'mahira'],
  },
  {
    id: 'aiburobhat',
    name: { en: 'Aiburobhat', hi: 'आइबुड़ो भात', bn: 'আইবুড়োভাত' },
    about: { en: 'A grand family meal for the bride or groom, their last as an unmarried person.', hi: 'विवाह से पहले वर या वधू के लिए परिवार का विशेष भोज।' },
    dress: { en: 'Bengali traditional wear', hi: 'बंगाली पारंपरिक परिधान' },
    icon: 'dinner',
    day: -1,
    time: '13:00',
  },
  {
    id: 'nalangu',
    name: { en: 'Nalangu', hi: 'नलंगु', ta: 'நலங்கு' },
    about: { en: 'Playful games between the bride and groom, with turmeric, songs and laughter.', hi: 'वर-वधू के बीच हल्दी, गीतों और हँसी-मज़ाक से भरे खेल।' },
    dress: { en: 'Silk sarees and veshtis', hi: 'रेशमी साड़ी और वेष्टि' },
    icon: 'sangeet',
    day: -1,
    time: '17:00',
  },
  {
    id: 'manjha',
    name: { en: 'Manjha', hi: 'मांझा', ur: 'مانجھا' },
    about: { en: 'Turmeric is applied to the bride and groom for glow and blessings before the Nikah.', hi: 'निकाह से पहले दूल्हा-दुल्हन को उबटन और हल्दी लगाई जाती है।' },
    dress: { en: 'Yellow and green', hi: 'पीला और हरा' },
    icon: 'haldi',
    day: -2,
    time: '16:00',
    aliases: ['manja', 'ubtan'],
  },
  {
    id: 'roce',
    name: { en: 'Roce', hi: 'रोस' },
    about: { en: 'The Goan Catholic blessing with coconut milk and oil, the night before the wedding.', hi: 'गोवा की कैथोलिक रस्म: शादी से पहले नारियल के दूध और तेल से आशीर्वाद।' },
    dress: { en: 'White or light colours you don’t mind getting wet', hi: 'सफ़ेद या हल्के रंग' },
    icon: 'haldi',
    day: -1,
    time: '16:00',
    aliases: ['ros'],
  },
  {
    id: 'mehendi',
    name: { en: 'Mehendi', hi: 'मेहंदी', mr: 'मेहंदी', gu: 'મહેંદી', pa: 'ਮਹਿੰਦੀ', bn: 'মেহেন্দি', ta: 'மெஹந்தி', te: 'మెహందీ', ur: 'مہندی' },
    about: { en: 'Henna is applied on the bride’s hands with music, dancing and snacks. Ladies, get yours too!', hi: 'गीत-संगीत के बीच दुल्हन के हाथों में मेहंदी लगती है। आप भी लगवाइए!' },
    dress: { en: 'Greens and pastels', hi: 'हरे और हल्के रंग' },
    icon: 'mehendi',
    day: -2,
    time: '16:00',
    aliases: ['mehndi', 'mehandi', 'maruthani'],
  },
  {
    id: 'haldi',
    name: { en: 'Haldi', hi: 'हल्दी', mr: 'हळद', gu: 'પીઠી', pa: 'ਮਾਈਆਂ', bn: 'গায়ে হলুদ', ta: 'மஞ்சள் நீராட்டு', te: 'పసుపు', kn: 'ಅರಿಶಿನ ಶಾಸ್ತ್ರ' },
    about: { en: 'Turmeric paste is applied to the bride and groom for blessings and glow. Expect to get a little yellow!', hi: 'वर-वधू को आशीर्वाद के साथ हल्दी लगाई जाती है। थोड़ा पीला होने को तैयार रहिए!' },
    dress: { en: 'Yellow, and clothes that can get stained', hi: 'पीले रंग के कपड़े' },
    icon: 'haldi',
    day: -1,
    time: '10:00',
    aliases: ['pithi', 'halad', 'maiyan', 'gaye holud', 'ubtan', 'mangala snanam'],
  },
  {
    id: 'garba',
    name: { en: 'Garba & Dandiya', hi: 'गरबा और डांडिया', gu: 'ગરબા અને દાંડિયા' },
    about: { en: 'A night of Garba and Dandiya Raas. Sticks are provided; just bring your energy.', hi: 'गरबा और डांडिया रास की रात। डांडिया हम देंगे, आप बस उत्साह लाइए।' },
    dress: { en: 'Chaniya choli and kediyu', hi: 'चनिया चोली और केडियू' },
    icon: 'sangeet',
    day: -1,
    time: '20:00',
    aliases: ['dandiya', 'raas'],
  },
  {
    id: 'jaggo',
    name: { en: 'Jaggo', hi: 'जागो', pa: 'ਜਾਗੋ' },
    about: { en: 'A lively Punjabi night procession with a lit pot, boliyan and bhangra through the neighbourhood.', hi: 'पंजाबी रात की रौनक: दीयों वाली गागर, बोलियाँ और भांगड़ा।' },
    dress: { en: 'Bright Punjabi suits and kurtas', hi: 'चटक पंजाबी सूट और कुर्ते' },
    icon: 'sangeet',
    day: -1,
    time: '21:00',
  },
  {
    id: 'sangeet',
    name: { en: 'Sangeet', hi: 'संगीत', mr: 'संगीत', gu: 'સંગીત', pa: 'ਸੰਗੀਤ', bn: 'সঙ্গীত' },
    about: { en: 'An evening of song, dance performances and celebration by both families.', hi: 'दोनों परिवारों के नृत्य, गीत और मस्ती की शाम।' },
    dress: { en: 'Indo-western or sparkly festive wear', hi: 'इंडो-वेस्टर्न या चमकदार परिधान' },
    icon: 'sangeet',
    day: -1,
    time: '19:00',
    aliases: ['ladies sangeet', 'cocktail'],
  },
  {
    id: 'chooda',
    name: { en: 'Chooda', hi: 'चूड़ा', pa: 'ਚੂੜਾ' },
    about: { en: "The bride's maternal uncle gives her the red-and-white chooda bangles and kaleere.", hi: 'मामा दुल्हन को लाल-सफ़ेद चूड़ा और कलीरे पहनाते हैं।' },
    dress: { en: 'Punjabi festive wear', hi: 'पंजाबी उत्सव परिधान' },
    icon: 'flower',
    day: 0,
    time: '07:00',
    aliases: ['choora', 'kaleere'],
  },
  {
    id: 'kashi-yatra',
    name: { en: 'Kashi Yatra', hi: 'काशी यात्रा', ta: 'காசி யாத்திரை', te: 'కాశీ యాత్ర' },
    about: { en: "The groom 'leaves for Kashi' to become an ascetic until the bride's father persuades him to marry.", hi: 'वर संन्यास के लिए काशी जाने का नाटक करता है, वधू के पिता उन्हें विवाह के लिए मनाते हैं।' },
    dress: { en: 'Silk and traditional South Indian wear', hi: 'रेशमी दक्षिण भारतीय परिधान' },
    icon: 'baraat',
    day: 0,
    time: '07:00',
  },
  {
    id: 'milni',
    name: { en: 'Milni', hi: 'मिलनी', pa: 'ਮਿਲਣੀ' },
    about: { en: 'Elders of both families meet and embrace, exchanging shagun and blessings.', hi: 'दोनों परिवारों के बुज़ुर्ग गले मिलते हैं और शगुन का आदान-प्रदान करते हैं।' },
    dress: { en: 'Formal Punjabi wear', hi: 'औपचारिक पंजाबी परिधान' },
    icon: 'rings',
    day: 0,
    time: '09:00',
  },
  {
    id: 'baraat',
    name: { en: 'Baraat', hi: 'बारात', gu: 'જાન', pa: 'ਬਰਾਤ', mr: 'वरात' },
    about: { en: 'The groom arrives with music, dhol and dancing family. Join the procession!', hi: 'ढोल-बाजे और नाचते परिजनों के साथ दूल्हे की बारात आती है। साथ नाचिए!' },
    dress: { en: 'Sherwanis, safas and festive wear', hi: 'शेरवानी, साफ़ा और उत्सव परिधान' },
    icon: 'baraat',
    day: 0,
    time: '18:00',
    aliases: ['jaan', 'varat', 'ghudchadi'],
  },
  {
    id: 'pheras',
    name: { en: 'Pheras', hi: 'फेरे', mr: 'लग्न', gu: 'હસ્તમેળાપ', bn: 'বিয়ে' },
    about: { en: 'The couple take seven rounds of the sacred fire and seven vows: the wedding itself.', hi: 'अग्नि के सात फेरे और सात वचन: यही विवाह का मुख्य संस्कार है।' },
    dress: { en: 'Traditional Indian wear', hi: 'पारंपरिक भारतीय परिधान' },
    icon: 'pheras',
    day: 0,
    time: '21:00',
    aliases: ['saptapadi', 'vivah', 'lagna', 'hasta milap', 'biye', 'shubho drishti'],
  },
  {
    id: 'muhurtham',
    name: { en: 'Muhurtham', hi: 'मुहूर्तम', ta: 'முகூர்த்தம்', te: 'ముహూర్తం', kn: 'ಮುಹೂರ್ತ', ml: 'മുഹൂർത്തം' },
    about: { en: 'The auspicious moment when the groom ties the mangalsutra (thaali): the wedding itself.', hi: 'शुभ मुहूर्त में वर मंगलसूत्र (थाली) बाँधता है: यही विवाह है।' },
    dress: { en: 'Kanjeevaram silks and veshtis', hi: 'कांजीवरम रेशम और वेष्टि' },
    icon: 'wedding',
    day: 0,
    time: '09:00',
    aliases: ['muhurtam', 'thali', 'thaali', 'kalyanam'],
  },
  {
    id: 'anand-karaj',
    name: { en: 'Anand Karaj', hi: 'आनंद कारज', pa: 'ਅਨੰਦ ਕਾਰਜ' },
    about: { en: 'The Sikh wedding at the Gurdwara: four laavan around Guru Granth Sahib Ji. Please cover your head.', hi: 'गुरुद्वारे में सिख विवाह: गुरु ग्रंथ साहिब जी की चार लावां। कृपया सिर ढककर आएँ।' },
    dress: { en: 'Modest traditional wear; head covered', hi: 'सादे पारंपरिक कपड़े, सिर ढका हुआ' },
    icon: 'wedding',
    day: 0,
    time: '10:00',
    aliases: ['laavan', 'lavan'],
  },
  {
    id: 'nikah',
    name: { en: 'Nikah', hi: 'निकाह', ur: 'نکاح' },
    about: { en: 'The Islamic marriage contract, read by the Qazi with the families as witnesses.', hi: 'क़ाज़ी साहब परिवारों की मौजूदगी में निकाह पढ़ाते हैं।' },
    dress: { en: 'Formal and modest', hi: 'औपचारिक और शालीन' },
    icon: 'nikah',
    day: 0,
    time: '18:00',
  },
  {
    id: 'church-wedding',
    name: { en: 'Holy Matrimony', hi: 'पवित्र विवाह' },
    about: { en: 'The church wedding service, followed by greetings and photographs with the couple.', hi: 'चर्च में विवाह की प्रार्थना सभा, उसके बाद दंपत्ति के साथ शुभकामनाएँ और तस्वीरें।' },
    dress: { en: 'Formal; western or Indian', hi: 'औपचारिक परिधान' },
    icon: 'wedding',
    day: 0,
    time: '11:00',
    aliases: ['church', 'nuptial mass', 'matrimony'],
  },
  {
    id: 'walima',
    name: { en: 'Walima', hi: 'वलीमा', ur: 'ولیمہ' },
    about: { en: "The groom's family hosts a feast to celebrate the marriage.", hi: 'निकाह की ख़ुशी में दूल्हे के परिवार की ओर से दावत।' },
    dress: { en: 'Festive formal', hi: 'उत्सव के औपचारिक कपड़े' },
    icon: 'dinner',
    day: 1,
    time: '19:00',
  },
  {
    id: 'bou-bhat',
    name: { en: 'Bou Bhat', hi: 'बौ भात', bn: 'বৌভাত' },
    about: { en: "The bride's first meal at her new home, followed by a grand reception.", hi: 'ससुराल में दुल्हन का पहला भोज और उसके बाद भव्य स्वागत समारोह।' },
    dress: { en: 'Festive Bengali wear', hi: 'उत्सव के बंगाली परिधान' },
    icon: 'dinner',
    day: 2,
    time: '19:00',
    aliases: ['boubhat'],
  },
  {
    id: 'reception',
    name: { en: 'Reception', hi: 'स्वागत समारोह', mr: 'स्वागत समारंभ', gu: 'રિસેપ્શન', pa: 'ਰਿਸੈਪਸ਼ਨ', bn: 'রিসেপশন', ta: 'வரவேற்பு', te: 'రిసెప్షన్', kn: 'ಆರತಕ್ಷತೆ' },
    about: { en: 'Dinner and blessings for the newly married couple.', hi: 'नवविवाहित जोड़े को आशीर्वाद और प्रीतिभोज।' },
    dress: { en: 'Evening formal', hi: 'शाम के औपचारिक परिधान' },
    icon: 'reception',
    day: 1,
    time: '19:30',
    aliases: ['preetibhoj', 'aarathakshate'],
  },
];

const BY_ID = new Map(CEREMONIES.map((c) => [c.id, c]));

/** The usual ceremonies of each tradition, in order. */
export const CEREMONY_PACKS: Record<Community, readonly string[]> = {
  'hindu-north': ['tilak', 'ganesh-puja', 'mehendi', 'haldi', 'sangeet', 'baraat', 'pheras', 'reception'],
  'hindu-south': ['nalangu', 'haldi', 'kashi-yatra', 'muhurtham', 'reception'],
  marwari: ['ganesh-puja', 'mayra', 'mehendi', 'haldi', 'sangeet', 'baraat', 'pheras', 'reception'],
  gujarati: ['ganesh-puja', 'mameru', 'mehendi', 'haldi', 'garba', 'baraat', 'pheras', 'reception'],
  marathi: ['sakharpuda', 'ganesh-puja', 'haldi', 'mehendi', 'sangeet', 'pheras', 'reception'],
  bengali: ['aiburobhat', 'haldi', 'pheras', 'bou-bhat'],
  punjabi: ['mehendi', 'haldi', 'jaggo', 'sangeet', 'chooda', 'baraat', 'milni', 'pheras', 'reception'],
  sikh: ['mehendi', 'haldi', 'jaggo', 'chooda', 'milni', 'anand-karaj', 'reception'],
  muslim: ['manjha', 'mehendi', 'nikah', 'walima'],
  christian: ['roce', 'church-wedding', 'reception'],
  jain: ['mehendi', 'haldi', 'sangeet', 'pheras', 'reception'],
  buddhist: ['mehendi', 'haldi', 'pheras', 'reception'],
  modern: ['mehendi', 'haldi', 'sangeet', 'pheras', 'reception'],
};

export const getCeremony = (id: string) => BY_ID.get(id);

/** Which pack a family gets: their tradition, else the event type's own (Nikah, Anand Karaj…), else North Indian. */
export function ceremonyPack(community: string | null | undefined, eventType?: string): Ceremony[] {
  const key: Community =
    community && community in CEREMONY_PACKS
      ? (community as Community)
      : eventType === 'nikah'
        ? 'muslim'
        : eventType === 'anand-karaj'
          ? 'sikh'
          : eventType === 'christian-wedding'
            ? 'christian'
            : 'hindu-north';
  return CEREMONY_PACKS[key].map((id) => BY_ID.get(id)!).filter(Boolean);
}

export const ceremonyText = (m: L, language: string) => (m as Record<string, string | undefined>)[language] ?? m.en;

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** The ceremony a function is, from its name in any of our languages (or null). */
export function findCeremony(name: string): Ceremony | null {
  const n = norm(name);
  if (!n) return null;
  for (const c of CEREMONIES) {
    const names = [...Object.values(c.name), ...(c.aliases ?? [])].map((x) => norm(x as string));
    // Whole words only ("Roce" must not match "Rose garden").
    if (names.some((x) => x && ` ${n} `.includes(` ${x} `))) return c;
  }
  return null;
}

/** Start time of a pack ceremony as ISO (IST), counted from the wedding day `YYYY-MM-DD`. */
export function ceremonyStart(c: Ceremony, weddingDay: string): string {
  const d = new Date(`${weddingDay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + c.day);
  return `${d.toISOString().slice(0, 10)}T${c.time}:00+05:30`;
}
