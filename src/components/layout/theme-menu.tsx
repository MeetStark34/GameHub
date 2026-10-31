'use client';

import { Check, Palette } from 'lucide-react';
import { THEMES } from '@/config/themes';
import { useI18n } from '@/i18n/client';
import { usePrefs } from '@/components/providers';
import { cn } from '@/components/ui';
import { Popover } from './popover';

/** Compact Themes control in the header: all 11 themes, always available. */
export function ThemeMenu() {
  const { theme, setTheme } = usePrefs();
  const { t } = useI18n();
  return (
    <Popover
      label={t('nav.chooseTheme')}
      trigger={
        <>
          <Palette className="size-4 text-accent" aria-hidden />
          <span className="hidden uppercase tracking-wide 2xl:inline">{t('nav.themes')}</span>
        </>
      }
    >
      {(close) => (
        <ul role="radiogroup" aria-label={t('nav.themes')} className="grid w-60 gap-0.5">
          {THEMES.map((th) => (
            <li key={th.id}>
              <button
                role="radio"
                aria-checked={th.id === theme}
                onClick={() => {
                  setTheme(th.id);
                  close();
                }}
                className={cn('flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-subtle', th.id === theme && 'bg-subtle font-semibold')}
              >
                <span className="flex overflow-hidden rounded border border-black/10" aria-hidden>
                  {th.swatch.map((c) => (
                    <span key={c} className="h-4 w-2.5" style={{ background: c }} />
                  ))}
                </span>
                <span className="flex-1">{t(`themes.${th.id}.name`)}</span>
                {th.id === theme && <Check className="size-4 text-accent" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  );
}
