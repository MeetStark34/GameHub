'use client';

import { Check, Languages } from 'lucide-react';
import { LOCALES } from '@/i18n/config';
import { useI18n } from '@/i18n/client';
import { cn } from '@/components/ui';
import { Popover } from './popover';

/** Global language selector (EN / FR / HI / RU). Choice persists via cookie and account. */
export function LanguageMenu({ align = 'right' }: { align?: 'right' | 'left' }) {
  const { locale, setLocale, t } = useI18n();
  const current = LOCALES.find((l) => l.code === locale)!;
  return (
    <Popover
      align={align}
      label={`${t('common.language')}: ${current.label}`}
      trigger={
        <>
          <Languages className="size-4 text-accent" aria-hidden />
          <span className="uppercase">{current.code}</span>
        </>
      }
    >
      {(close) => (
        <ul role="radiogroup" aria-label={t('common.language')} className="grid w-44 gap-0.5">
          {LOCALES.map((l) => (
            <li key={l.code}>
              <button
                role="radio"
                aria-checked={l.code === locale}
                lang={l.htmlLang}
                onClick={() => {
                  close();
                  if (l.code !== locale) setLocale(l.code);
                }}
                className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-subtle', l.code === locale && 'bg-subtle font-semibold')}
              >
                <span aria-hidden>{l.flag}</span>
                <span className="w-7 font-mono text-xs uppercase text-muted">{l.code}</span>
                <span className="flex-1">{l.label}</span>
                {l.code === locale && <Check className="size-4 text-accent" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  );
}
