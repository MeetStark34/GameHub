import 'server-only';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { requestPreferences } from '@/server/account';
import { currentUser } from '@/server/auth';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, localeFromAcceptLanguage, type Locale } from './config';
import { MESSAGES } from './messages';
import { createTranslator } from './translate';

/**
 * Locale for this request: explicit choice (cookie) > account preference >
 * browser Accept-Language (first visit only) > English.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const jar = await cookies();
  const fromCookie = jar.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const user = await currentUser();
  if (user) {
    const pref = await requestPreferences(user.id);
    if (isLocale(pref?.language)) return pref.language;
  }
  return localeFromAcceptLanguage((await headers()).get('accept-language')) ?? DEFAULT_LOCALE;
});

export const getTranslator = cache(async () => {
  const locale = await getLocale();
  return createTranslator(locale, MESSAGES[locale]);
});
