'use client';

import { useEffect } from 'react';
import { useToasts } from '@/components/providers';

/** One "Streak at risk" toast per UTC day, only when a live streak has not been extended today. */
export function StreakNudge({ date, streak }: { date: string; streak: number }) {
  const { push } = useToasts();
  useEffect(() => {
    const key = `gh-nudge-${date}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch {
      return;
    }
    push([
      {
        kind: 'streak-milestone',
        title: 'Streak at risk',
        body: '',
        i18n: { title: { key: 'streak.atRiskTitle' }, body: { key: 'streak.atRiskBody', params: { count: streak } } },
      },
    ]);
  }, [date, streak, push]);
  return null;
}
