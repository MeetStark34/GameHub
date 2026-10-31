import type { Metadata } from 'next';
import { CalendarDays, Crown, Flame } from 'lucide-react';
import { XP_ECONOMY } from '@/config/economy';
import { getDb } from '@/lib/db';
import { toUtcDate } from '@/lib/time';
import { GAME_IDS } from '@/games/types';
import { getTranslator } from '@/i18n/server';
import { DailyGameCard, DailyStrip } from '@/components/game-card';
import { Card, PageHeader, Pill } from '@/components/ui';
import { currentUser } from '@/server/auth';
import { dailyDifficultyFor } from '@/server/play';
import { getPlayerSummary } from '@/server/queries';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('nav.daily'), description: t('daily.intro') };
}

export default async function DailyPage() {
  const { t } = await getTranslator();
  const now = new Date();
  const today = toUtcDate(now);
  const user = await currentUser();
  const summary = user ? await getPlayerSummary(await getDb(), user.id, now) : null;
  const games = summary?.today.games ?? GAME_IDS.map((game) => ({ game, status: 'not-started' as const, score: null, durationMs: null }));
  const done = games.filter((g) => g.status === 'completed').length;
  const difficulty = dailyDifficultyFor(today);

  return (
    <div>
      <PageHeader eyebrow={`${today} · ${t('common.utc')}`} title={t('daily.title')}>
        {t('daily.intro')}
      </PageHeader>
      <div className="mb-6 grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Pill>
              <CalendarDays className="size-3.5" aria-hidden /> {t('daily.difficulty', { difficulty: t(`difficulty.${difficulty}`) })}
            </Pill>
            <Pill>{t('daily.xpBonus', { mult: XP_ECONOMY.dailyMultiplier })}</Pill>
            <span className="num ml-auto font-mono text-sm font-bold">{done}/8</span>
          </div>
          <DailyStrip games={games} />
        </Card>
        <Card className="grid grid-cols-2 gap-3 p-4 text-sm">
          <div className="flex gap-2">
            <Flame className="size-5 shrink-0 text-warning" aria-hidden />
            <p>
              <span className="font-semibold">{t('daily.normalTitle')}</span>
              <br />
              <span className="text-muted">{t('daily.normalBody')}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Crown className="size-5 shrink-0 text-gold" aria-hidden />
            <p>
              <span className="font-semibold">{t('daily.trueTitle')}</span>
              <br />
              <span className="text-muted">{t('daily.trueBody', { xp: XP_ECONOMY.dailySetCompleteBonus })}</span>
            </p>
          </div>
        </Card>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {games.map((g) => (
          <DailyGameCard key={g.game} {...g} />
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted">{t('daily.rotation')}</p>
    </div>
  );
}
