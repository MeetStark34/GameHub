'use client';

import Link from 'next/link';
import { Crown, Flame } from 'lucide-react';
import { useI18n } from '@/i18n/client';
import type { StreakStatus } from '@/lib/progression/streaks';
import { cn } from '@/components/ui';
import { Popover } from './popover';

export interface HeaderStreak {
  current: number;
  best: number;
  status: StreakStatus;
}

const STATUS_KEY: Record<StreakStatus, string> = { active: 'streak.active', 'at-risk': 'streak.atRisk', broken: 'streak.broken', none: 'streak.none' };

/**
 * Both streaks in one compact header control. The two halves differ by icon
 * (flame vs crown), colour (warm orange vs gold) and, on wide screens, label;
 * the popover spells out what each one means and today's status.
 */
export function StreakMenu({ normal, truePlayer }: { normal: HeaderStreak; truePlayer: HeaderStreak }) {
  const { t, num } = useI18n();
  const rows = [
    { id: 'normal', icon: Flame, tone: 'text-warning bg-warning/15', name: t('streak.normal'), note: t('streak.normalNote'), s: normal },
    { id: 'true-player', icon: Crown, tone: 'text-gold bg-gold/15', name: t('streak.truePlayer'), note: t('streak.trueNote'), s: truePlayer },
  ];
  return (
    <Popover
      align="left"
      sheetOnMobile
      label={t('streak.headerLabel', { normal: normal.current, truePlayer: truePlayer.current })}
      trigger={
        <span className="flex items-center gap-1.5 sm:gap-2" data-testid="header-streaks">
          <span className="flex items-center gap-1" data-streak="normal">
            <Flame className={cn('size-4 text-warning', normal.status !== 'active' && 'opacity-60')} aria-hidden />
            <span className="num font-mono font-bold">{num(normal.current)}</span>
            <span className="hidden font-medium text-muted 2xl:inline">{t('streak.short')}</span>
          </span>
          <span className="h-4 w-px bg-border" aria-hidden />
          <span className="flex items-center gap-1" data-streak="true-player">
            <Crown className={cn('size-4 text-gold', truePlayer.status !== 'active' && 'opacity-60')} aria-hidden />
            <span className="num font-mono font-bold">{num(truePlayer.current)}</span>
            <span className="hidden font-medium text-muted 2xl:inline">{t('streak.trueShort')}</span>
          </span>
        </span>
      }
    >
      {(close) => (
        <div className="p-1.5 sm:w-72">
          <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t('streak.header')}</p>
          <ul className="space-y-1.5">
            {rows.map(({ id, icon: Icon, tone, name, note, s }) => (
              <li key={id} className="flex items-start gap-2.5 rounded-lg bg-subtle/60 p-2" data-streak-row={id}>
                <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', tone)}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">{name}</span>
                    <span className="whitespace-nowrap text-xs text-muted">
                      <span className="num font-mono text-sm font-bold text-fg">{num(s.current)}</span> {t(s.current === 1 ? 'common.dayUnit' : 'common.daysUnit')}
                    </span>
                  </span>
                  <span className="block text-xs text-muted">{note}</span>
                  <span className="mt-0.5 flex justify-between text-[11px]">
                    <span className={cn('font-medium', s.status === 'at-risk' && 'text-warning', s.status === 'broken' && 'text-danger')}>{t(STATUS_KEY[s.status])}</span>
                    <span className="text-muted">{t('streak.best', { count: num(s.best) })}</span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="px-1 pt-2 text-[11px] leading-snug text-muted">{t('streak.utcNote')}</p>
          <Link href="/dashboard" onClick={close} className="mt-1.5 block rounded-lg px-1 py-1 text-xs font-semibold text-accent hover:bg-subtle">
            {t('dashboard.details')} →
          </Link>
        </div>
      )}
    </Popover>
  );
}
