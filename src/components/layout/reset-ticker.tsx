'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Difficulty } from '@/games/types';
import { useI18n } from '@/i18n/client';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Live news-style strip counting down to the 00:00 UTC Daily Set reset.
 * Uses the server's clock (offset measured at render) so a wrong device
 * clock or time zone never shifts the reset. Shown on the Dashboard only.
 */
export function ResetTicker({ serverNow, difficulty, dailyDone }: { serverNow: string; difficulty: Difficulty; dailyDone: number | null }) {
  const router = useRouter();
  const { t } = useI18n();
  const offset = useRef<number | null>(null);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    offset.current = new Date(serverNow).getTime() - Date.now();
    let refreshed = false;
    const tick = () => {
      const now = Date.now() + (offset.current ?? 0);
      const d = new Date(now);
      const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
      const ms = next - now;
      setLeft(ms);
      if (ms < 1000 && !refreshed) {
        refreshed = true;
        window.setTimeout(() => router.refresh(), 2500);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [serverNow, router]);

  const total = left === null ? null : Math.max(0, Math.floor(left / 1000));
  const clock = total === null ? '--:--:--' : `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
  const hours = total === null ? '' : `${(total / 3600).toFixed(1)}h`;
  const items = [
    t('ticker.resetsAt'),
    t('ticker.difficulty', { difficulty: t(`difficulty.${difficulty}`) }),
    dailyDone === null ? t('ticker.guest') : t('ticker.yourSet', { done: dailyDone }),
    t('ticker.unlimited'),
    t('ticker.truePlayer'),
  ];

  return (
    <div className="border-b border-border bg-fg text-bg" role="region" aria-label={t('ticker.region')}>
      <div className="mx-auto flex h-8 max-w-6xl items-center gap-3 px-4 text-xs sm:px-6">
        <span className="flex shrink-0 items-center gap-2 font-mono font-bold">
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-danger" />
          </span>
          <span className="hidden sm:inline">{t('ticker.resetIn')}</span>
          <span className="num" title={hours}>
            {clock}
          </span>
        </span>
        <span className="h-4 w-px shrink-0 bg-bg/30" aria-hidden />
        <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_4%,black_96%,transparent)]">
          <div className="ticker-track flex w-max gap-8 whitespace-nowrap font-medium opacity-90">
            {[...items, ...items].map((x, i) => (
              <span key={i} aria-hidden={i >= items.length}>
                {x} <span className="opacity-40">◆</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">{t('ticker.sr', { hours })}</span>
    </div>
  );
}
