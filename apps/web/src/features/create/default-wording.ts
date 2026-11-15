import { faithOf, getEventType, invocationFor, type Community, type Faith, type EventContent, type EventTypeId, type LanguageCode } from '@cardai/shared';

const FAITH_WEDDING: Partial<Record<Faith, EventTypeId>> = { muslim: 'nikah', sikh: 'anand-karaj', christian: 'christian-wedding' };

const EN_HEADLINE: Partial<Record<EventTypeId, string>> = {
  wedding: 'Wedding Invitation',
  nikah: 'Nikah Ceremony',
  'christian-wedding': 'Holy Matrimony',
  'anand-karaj': 'Anand Karaj',
};

/**
 * Instant, offline wording for the two most used languages so users can preview before
 * signing in. AI wording (any language, any tone) replaces it with one tap.
 *
 * The blessing line follows the family's faith (occasion + tradition): Ganesha for Hindu families,
 * Bismillah for a Nikah or a Muslim family, Ik Onkar for Sikh, Namokar for Jain, none for parties.
 */
export function defaultWording(type: EventTypeId, language: LanguageCode, names: string[], hosts: string, community?: Community): EventContent {
  const faith = faithOf(type, community);
  // A "wedding" for a Muslim, Sikh or Christian family is titled as their own ceremony, not "Shubh Vivah".
  const titleType: EventTypeId = type === 'wedding' ? (FAITH_WEDDING[faith] ?? type) : type;
  const ev = getEventType(titleType);
  const n = names.filter(Boolean);
  const hindi = language === 'hi' || language === 'mr';
  const wedding = ev.category === 'wedding';
  const invocation = invocationFor({ eventType: type, faith, language: hindi ? language : 'en', community });

  if (hindi) {
    return {
      invocation,
      headline: ev.labelHi,
      hostLine: hosts ? `${hosts} सादर आमंत्रित करते हैं` : 'आप सपरिवार सादर आमंत्रित हैं',
      primaryNames: n.slice(0, 2),
      primaryDetails: [],
      connector: n.length === 2 ? 'संग' : undefined,
      message: 'आपकी गरिमामयी उपस्थिति हमारे लिए आशीर्वाद होगी।',
      familyTitle: 'स्वागतोत्सुक',
      familyLines: hosts ? [hosts] : [],
      closing: 'आपके आगमन की प्रतीक्षा में',
    };
  }
  return {
    invocation,
    headline: EN_HEADLINE[titleType] ?? ev.label,
    hostLine: hosts ? `${hosts} request the pleasure of your company` : 'You are warmly invited',
    primaryNames: n.slice(0, 2),
    primaryDetails: [],
    connector: n.length === 2 ? (wedding ? 'weds' : '&') : undefined,
    message: 'Your presence will make our celebration complete.',
    familyTitle: 'With best compliments',
    familyLines: hosts ? [hosts] : [],
    closing: 'Looking forward to celebrating with you',
  };
}
