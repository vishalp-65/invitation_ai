import { BUILTIN_TEMPLATES } from '../templates/catalog.js';
import type { EventContent } from '../schemas/events.js';
import { buildInviteProps, type BuildInvitePropsInput, type InviteProps } from './build-invite-props.js';
import type { TemplateDefinition } from '../templates/types.js';

type Fn = BuildInvitePropsInput['functions'][number];
interface Sample {
  eventType: string;
  content: EventContent;
  functions: Fn[];
}

const T = (hi: boolean, h: string, e: string) => (hi ? h : e);

/** Wedding sample adapted to the tradition the template is designed for. */
function weddingSample(t: TemplateDefinition, hi: boolean): Sample {
  const c = t.communities;
  const attire = t.theme.decor?.attire;
  const is = (x: string) => c.includes(x as never) || attire === x;
  const modern = c.includes('modern');

  let names: [string, string] = [T(hi, 'राहुल', 'Rahul'), T(hi, 'प्रिया', 'Priya')];
  let invocation: string | undefined = modern ? undefined : T(hi, '॥ श्री गणेशाय नमः ॥', '|| Shree Ganeshaya Namah ||');
  let headline = T(hi, 'शुभ विवाह', 'Wedding Invitation');
  let connector = T(hi, 'संग', 'weds');
  let main = T(hi, 'विवाह', 'Wedding');

  if (is('muslim')) {
    names = [T(hi, 'अयान', 'Ayaan'), T(hi, 'ज़ोया', 'Zoya')];
    invocation = T(hi, 'बिस्मिल्लाह-हिर-रहमान-निर-रहीम', 'Bismillah ir-Rahman ir-Rahim');
    headline = T(hi, 'निकाह', 'Nikah Ceremony');
    main = T(hi, 'निकाह', 'Nikah');
    connector = '&';
  } else if (is('sikh')) {
    names = [T(hi, 'हरप्रीत', 'Harpreet'), T(hi, 'सिमरन', 'Simran')];
    invocation = T(hi, '॥ इक ओंकार ॥', '|| Ik Onkar ||');
    headline = T(hi, 'आनंद कारज', 'Anand Karaj');
    main = T(hi, 'आनंद कारज', 'Anand Karaj');
    connector = '&';
  } else if (is('christian')) {
    names = ['Daniel', 'Grace'];
    invocation = undefined;
    headline = 'Holy Matrimony';
    main = 'Wedding Ceremony';
    connector = '&';
    hi = false;
  } else if (is('bengali')) {
    names = [T(hi, 'अर्जुन', 'Arjun'), T(hi, 'अनन्या', 'Ananya')];
    headline = T(hi, 'शुभ विवाह', 'Shubho Bibaho');
  } else if (is('hindu-south') || attire === 'south') {
    names = [T(hi, 'कार्तिक', 'Karthik'), T(hi, 'मीनाक्षी', 'Meenakshi')];
    headline = T(hi, 'शुभ विवाह', 'Kalyanam');
    main = T(hi, 'मुहूर्त', 'Muhurtham');
  } else if (is('marathi')) {
    names = [T(hi, 'आदित्य', 'Aditya'), T(hi, 'गौरी', 'Gauri')];
    headline = T(hi, 'शुभ मंगल सावधान', 'Shubh Mangal Savdhan');
  }

  return {
    eventType: is('muslim') ? 'nikah' : is('sikh') ? 'anand-karaj' : is('christian') ? 'christian-wedding' : 'wedding',
    content: {
      invocation,
      headline,
      hostLine: T(hi, 'श्रीमती सुनीता एवं श्री रमेश शर्मा सादर आमंत्रित करते हैं', 'Mrs. Sunita & Mr. Ramesh Sharma request the pleasure of your company'),
      primaryNames: names,
      primaryDetails: [T(hi, 'सुपुत्र श्री रमेश शर्मा', 'Son of Mr. Ramesh Sharma'), T(hi, 'सुपुत्री श्री सुरेश वर्मा', 'Daughter of Mr. Suresh Verma')],
      connector,
      message: T(hi, 'आपकी गरिमामयी उपस्थिति हमारे परिवार के लिए आशीर्वाद होगी।', 'Your gracious presence will make our celebration complete.'),
      familyTitle: T(hi, 'स्वागतोत्सुक', 'With best compliments'),
      familyLines: T(hi, 'समस्त शर्मा परिवार|समस्त वर्मा परिवार', 'The Sharma Family|The Verma Family').split('|'),
      closing: T(hi, 'आपके आगमन की प्रतीक्षा में', 'Awaiting your blessings'),
    },
    functions: [
      { name: T(hi, 'हल्दी', 'Haldi'), startsAt: '2026-12-10T10:00:00+05:30', venueName: T(hi, 'शर्मा निवास, जयपुर', 'Sharma Niwas, Jaipur') },
      { name: T(hi, 'संगीत', 'Sangeet'), startsAt: '2026-12-10T19:00:00+05:30', venueName: T(hi, 'रामबाग लॉन्स', 'Rambagh Lawns') },
      { name: main, startsAt: '2026-12-11T20:00:00+05:30', venueName: T(hi, 'रामबाग पैलेस, जयपुर', 'Rambagh Palace, Jaipur'), venueAddress: T(hi, 'भवानी सिंह रोड, जयपुर, राजस्थान', 'Bhawani Singh Road, Jaipur, Rajasthan') },
    ],
  };
}

function occasionSample(t: TemplateDefinition, hi: boolean): Sample | null {
  const types = t.eventTypes === 'all' ? [] : (t.eventTypes as string[]);
  const first = types[0];
  // Couple occasions (anniversary, engagement, reception) use the wedding sample: names, not a puja.
  if (!first || ['wedding', 'nikah', 'anand-karaj', 'christian-wedding'].some((x) => types.includes(x)) || ['anniversary', 'engagement', 'reception'].includes(first)) return null;
  const base = {
    invocation: t.theme.motif === 'balloons' ? undefined : T(hi, '॥ श्री गणेशाय नमः ॥', '|| Shree Ganeshaya Namah ||'),
    primaryDetails: [],
    familyTitle: T(hi, 'निवेदक', 'Warm regards'),
    familyLines: [T(hi, 'समस्त शर्मा परिवार', 'The Sharma Family')],
    closing: T(hi, 'आपकी प्रतीक्षा में', 'Looking forward to seeing you'),
  };
  if (['birthday', 'naming-ceremony', 'baby-shower', 'mundan', 'annaprashan', 'retirement'].includes(first)) {
    return {
      eventType: first,
      content: { ...base, invocation: undefined, headline: T(hi, 'जन्मदिन समारोह', "You're invited!"), hostLine: T(hi, 'पहले जन्मदिन के उत्सव में', 'to celebrate the first birthday of'), primaryNames: [T(hi, 'आरव', 'Aarav')], message: T(hi, 'आइए, साथ मिलकर खुशियाँ मनाएँ।', 'Join us for cake, games and lots of love.') },
      functions: [{ name: T(hi, 'जन्मदिन पार्टी', 'Birthday Party'), startsAt: '2026-12-20T17:00:00+05:30', venueName: T(hi, 'द ग्रैंड बैंक्वेट, पुणे', 'The Grand Banquet, Pune'), venueAddress: T(hi, 'एफ़सी रोड, शिवाजीनगर', 'FC Road, Shivajinagar') }],
    };
  }
  if (['shop-opening', 'corporate'].includes(first)) {
    return {
      eventType: first,
      content: { ...base, headline: T(hi, 'शुभारंभ', 'Grand Opening'), hostLine: T(hi, 'आप सादर आमंत्रित हैं', 'You are cordially invited to the opening of'), primaryNames: [T(hi, 'शर्मा ज्वेलर्स', 'Sharma Jewellers')], message: T(hi, 'आपका आशीर्वाद हमारी शुभ शुरुआत है।', 'Your blessings make our new beginning auspicious.') },
      functions: [{ name: T(hi, 'उद्घाटन', 'Inauguration'), startsAt: '2026-12-15T11:00:00+05:30', venueName: T(hi, 'एमजी रोड, इंदौर', 'MG Road, Indore'), venueAddress: T(hi, 'दुकान नं. 12, सिटी सेंटर', 'Shop 12, City Centre') }],
    };
  }
  // Puja / griha pravesh / jagran / bhandara
  const label = first === 'griha-pravesh' ? T(hi, 'गृह प्रवेश', 'Griha Pravesh') : first === 'jagran' ? T(hi, 'माता की चौकी', 'Mata ki Chowki') : T(hi, 'श्री सत्यनारायण कथा', 'Satyanarayan Katha');
  return {
    eventType: first,
    content: { ...base, headline: label, hostLine: T(hi, 'आप सपरिवार सादर आमंत्रित हैं', 'You and your family are warmly invited'), primaryNames: [], message: T(hi, 'प्रभु कृपा से हमारे नए घर में पूजा का आयोजन है।', 'Please join us for the puja and prasad at our new home.') },
    functions: [
      { name: T(hi, 'पूजा', 'Puja'), startsAt: '2026-12-18T09:00:00+05:30', venueName: T(hi, 'शर्मा निवास, लखनऊ', 'Sharma Niwas, Lucknow'), venueAddress: T(hi, 'गोमती नगर, लखनऊ', 'Gomti Nagar, Lucknow') },
      { name: T(hi, 'प्रसाद एवं भोज', 'Prasad & Lunch'), startsAt: '2026-12-18T13:00:00+05:30', venueName: T(hi, 'शर्मा निवास, लखनऊ', 'Sharma Niwas, Lucknow') },
    ],
  };
}

/** Demo content for gallery thumbnails, Remotion Studio and visual tests. */
export function sampleInviteProps(template: TemplateDefinition = BUILTIN_TEMPLATES[0]!, language: 'en' | 'hi' = 'en'): InviteProps {
  const hi = language === 'hi';
  const s = occasionSample(template, hi) ?? weddingSample(template, hi);
  const lang = template.communities.includes('christian') || template.theme.decor?.attire === 'christian' ? 'en' : language;
  return buildInviteProps({ template, eventType: s.eventType, language: lang, watermark: false, content: s.content, functions: s.functions });
}
