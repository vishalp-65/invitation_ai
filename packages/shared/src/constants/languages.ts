/**
 * Content languages an invitation can be written in.
 * `fonts` are Google Font families that render the script correctly (shaping handled by Chrome).
 */
export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', locale: 'en-IN', script: 'Latn', fonts: { display: 'Playfair Display', body: 'Poppins' } },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', locale: 'hi-IN', script: 'Deva', fonts: { display: 'Tiro Devanagari Hindi', body: 'Mukta' } },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', locale: 'mr-IN', script: 'Deva', fonts: { display: 'Tiro Devanagari Marathi', body: 'Mukta' } },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', locale: 'gu-IN', script: 'Gujr', fonts: { display: 'Noto Serif Gujarati', body: 'Hind Vadodara' } },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', locale: 'ta-IN', script: 'Taml', fonts: { display: 'Noto Serif Tamil', body: 'Noto Sans Tamil' } },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', locale: 'te-IN', script: 'Telu', fonts: { display: 'Noto Serif Telugu', body: 'Noto Sans Telugu' } },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', locale: 'kn-IN', script: 'Knda', fonts: { display: 'Noto Serif Kannada', body: 'Noto Sans Kannada' } },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', locale: 'ml-IN', script: 'Mlym', fonts: { display: 'Noto Serif Malayalam', body: 'Noto Sans Malayalam' } },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', locale: 'bn-IN', script: 'Beng', fonts: { display: 'Noto Serif Bengali', body: 'Hind Siliguri' } },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', locale: 'pa-IN', script: 'Guru', fonts: { display: 'Noto Serif Gurmukhi', body: 'Mukta Mahee' } },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', locale: 'or-IN', script: 'Orya', fonts: { display: 'Noto Serif Oriya', body: 'Noto Sans Oriya' } },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', locale: 'ur-IN', script: 'Arab', fonts: { display: 'Noto Nastaliq Urdu', body: 'Noto Naskh Arabic' } },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as [LanguageCode, ...LanguageCode[]];

export const RTL_LANGUAGES: ReadonlySet<LanguageCode> = new Set(['ur']);

export function getLanguage(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/** UI languages for the website chrome (content languages are wider). */
export const UI_LOCALES = ['en', 'hi'] as const;
export type UiLocale = (typeof UI_LOCALES)[number];
