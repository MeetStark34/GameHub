/**
 * Supported interface languages. To add a language: add an entry here,
 * create src/i18n/messages/<code>.ts (typed as Translation; anything missing
 * falls back to English) and register it in src/i18n/messages/index.ts.
 */
export const LOCALES = [
  { code: 'en', label: 'English', flag: '🇺🇸', htmlLang: 'en' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', htmlLang: 'fr' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳', htmlLang: 'hi' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺', htmlLang: 'ru' },
] as const;

export type Locale = (typeof LOCALES)[number]['code'];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'gh-lang';

export const isLocale = (v: unknown): v is Locale => typeof v === 'string' && LOCALES.some((l) => l.code === v);

/** Picks the best supported locale from an Accept-Language header (first-visit fallback only). */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(',')) {
    const code = part.split(';')[0].trim().toLowerCase().slice(0, 2);
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}
