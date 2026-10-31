'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { LOCALE_COOKIE, type Locale } from './config';
import { createTranslator, type Translation, type Translator } from './translate';

interface I18nContext extends Translator {
  setLocale: (l: Locale) => void;
}

const Ctx = createContext<I18nContext | null>(null);

/** Receives only the active language's dictionary; English is bundled as the fallback. */
export function I18nProvider({ locale, messages, signedIn, children }: { locale: Locale; messages: Translation; signedIn: boolean; children: ReactNode }) {
  const router = useRouter();
  const tr = useMemo(() => createTranslator(locale, messages), [locale, messages]);
  const setLocale = useCallback(
    (l: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = l;
      const save = signedIn
        ? fetch('/api/me/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: l }) }).catch(() => {})
        : Promise.resolve();
      void save.finally(() => router.refresh());
    },
    [router, signedIn],
  );
  const value = useMemo(() => ({ ...tr, setLocale }), [tr, setLocale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n outside I18nProvider');
  return ctx;
}
