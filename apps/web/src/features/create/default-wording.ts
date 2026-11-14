import { getEventType, type EventContent, type EventTypeId, type LanguageCode } from '@cardai/shared';

/**
 * Instant, offline wording for the two most used languages so users can preview before
 * signing in. AI wording (any language, any tone) replaces it with one tap.
 */
export function defaultWording(type: EventTypeId, language: LanguageCode, names: string[], hosts: string): EventContent {
  const ev = getEventType(type);
  const n = names.filter(Boolean);
  const hindi = language === 'hi' || language === 'mr';
  const wedding = ev.category === 'wedding';
  const sacred = ev.category === 'religious' || wedding;

  if (hindi) {
    return {
      invocation: sacred ? '॥ श्री गणेशाय नमः ॥' : undefined,
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
    invocation: sacred ? '|| Shree Ganeshaya Namah ||' : undefined,
    headline: wedding ? 'Wedding Invitation' : `${ev.label}`,
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
