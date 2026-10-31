import type { Metadata } from 'next';
import { CalendarDays, Crown, Flame } from 'lucide-react';
import { DIFFICULTY_LABELS } from '@/config/games';
import { XP_ECONOMY } from '@/config/economy';
import { getDb } from '@/lib/db';
import { toUtcDate } from '@/lib/time';
import { GAME_IDS } from '@/games/types';
import { DailyGameCard, DailyStrip } from '@/components/game-card';
import { Card, PageHeader, Pill } from '@/components/ui';
import { currentUser } from '@/server/auth';
import { dailyDifficultyFor } from '@/server/play';
import { getPlayerSummary } from '@/server/queries';

export const metadata: Metadata = {
  title: 'Daily Set',
  description: "Today's eight GameHub puzzles, shared by every player and reset at 00:00 UTC.",
};

export default async function DailyPage() {
  const now = new Date();
  const today = toUtcDate(now);
  const user = await currentUser();
  const summary = user ? await getPlayerSummary(await getDb(), user.id, now) : null;
  const games = summary?.today.games ?? GAME_IDS.map((game) => ({ game, status: 'not-started' as const, score: null, durationMs: null }));
  const done = games.filter((g) => g.status === 'completed').length;
  const difficulty = dailyDifficultyFor(today);

  return (
    <div>
      <PageHeader eyebrow={`${today} · UTC`} title="Today's Daily Set">
        The same eight puzzles for every player in the world until 00:00 UTC. Each one can be completed once. Retry as often as you need; only the finished solve counts.
      </PageHeader>
      <div className="mb-6 grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Pill>
              <CalendarDays className="size-3.5" aria-hidden /> {DIFFICULTY_LABELS[difficulty]} difficulty
            </Pill>
            <Pill>×{XP_ECONOMY.dailyMultiplier} XP vs Unlimited</Pill>
            <span className="num ml-auto font-mono text-sm font-bold">{done}/8</span>
          </div>
          <DailyStrip games={games} />
        </Card>
        <Card className="grid grid-cols-2 gap-3 p-4 text-sm">
          <div className="flex gap-2">
            <Flame className="size-5 shrink-0 text-warning" aria-hidden />
            <p>
              <span className="font-semibold">Normal Streak</span>
              <br />
              <span className="text-muted">Complete at least 1</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Crown className="size-5 shrink-0 text-gold" aria-hidden />
            <p>
              <span className="font-semibold">True Player</span>
              <br />
              <span className="text-muted">Complete all 8 · +{XP_ECONOMY.dailySetCompleteBonus} XP</span>
            </p>
          </div>
        </Card>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {games.map((g) => (
          <DailyGameCard key={g.game} {...g} />
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted">
        Difficulty rotates through the week (UTC): Monday Easy, Tuesday to Thursday Normal, Friday and Saturday Hard, Sunday Expert. Want a specific difficulty? Use Unlimited.
      </p>
    </div>
  );
}
