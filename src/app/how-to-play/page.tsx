import type { Metadata } from 'next';
import Link from 'next/link';
import { DIFFICULTY_LABELS, GAMES } from '@/config/games';
import { REPAIR_CARDS } from '@/config/economy';
import { DIFFICULTIES, GAME_IDS } from '@/games/types';
import { GameTile } from '@/components/game-card';
import { Card, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'How to play', description: 'Rules for all eight GameHub games, streaks, True Player days and Gold Repair Cards.' };

export default function HowToPlay() {
  return (
    <div className="space-y-6">
      <PageHeader title="How to play">Rules for every game, plus how streaks and cards work.</PageHeader>
      <div className="grid gap-3 md:grid-cols-2">
        {GAME_IDS.map((g) => (
          <Card key={g} className="p-4">
            <div className="mb-2 flex items-center gap-3">
              <GameTile game={g} />
              <h2 className="font-display text-lg font-bold">{GAMES[g].name}</h2>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {GAMES[g].rules.map((r) => <li key={r}>{r}</li>)}
            </ul>
            <p className="mt-2 text-xs text-muted">{DIFFICULTIES.map((d) => `${DIFFICULTY_LABELS[d]}: ${GAMES[g].difficultyNotes[d]}`).join(' · ')}</p>
            <Link href={`/play/${g}?mode=unlimited&difficulty=easy`} className="mt-2 inline-block text-sm font-semibold text-accent">Try it →</Link>
          </Card>
        ))}
      </div>
      <Card className="space-y-2 p-5 text-sm text-muted">
        <h2 className="font-display text-lg font-bold text-fg">Streaks &amp; cards</h2>
        <p><b className="text-fg">Normal Streak</b>: complete at least one Daily Set game per UTC day. <b className="text-fg">True Player Streak</b>: complete all eight. Unlimited games never affect streaks.</p>
        <p><b className="text-fg">Punches</b>: earn one for {REPAIR_CARDS.dailyVolumeGames} games in a UTC day (any mode), and one for every {REPAIR_CARDS.dailySetsPerPunch} full Daily Sets. {REPAIR_CARDS.punchesPerCard} punches make a <b className="text-fg">Gold Repair Card</b>; hold up to {REPAIR_CARDS.maxCards}. Extra cards convert to XP.</p>
        <p>A card repairs one broken streak of your choice if the break began within the last {REPAIR_CARDS.repairWindowDays} days. Cards are never spent automatically.</p>
      </Card>
    </div>
  );
}
