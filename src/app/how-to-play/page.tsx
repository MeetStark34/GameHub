import type { Metadata } from 'next';
import Link from 'next/link';
import { GAMES } from '@/config/games';
import { REPAIR_CARDS } from '@/config/economy';
import { DIFFICULTIES, GAME_IDS } from '@/games/types';
import { getTranslator } from '@/i18n/server';
import { GameTile } from '@/components/game-card';
import { Card, PageHeader } from '@/components/ui';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('howTo.title'), description: t('howTo.intro') };
}

export default async function HowToPlay() {
  const { t, list } = await getTranslator();
  return (
    <div className="space-y-6">
      <PageHeader title={t('howTo.title')}>{t('howTo.intro')}</PageHeader>
      <div className="grid gap-3 md:grid-cols-2">
        {GAME_IDS.map((g) => (
          <Card key={g} className="p-4">
            <div className="mb-2 flex items-center gap-3">
              <GameTile game={g} />
              <h2 className="font-display text-lg font-bold">{GAMES[g].name}</h2>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {list(`games.${g}.rules`).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">{DIFFICULTIES.map((d) => `${t(`difficulty.${d}`)}: ${t(`games.${g}.difficulty.${d}`)}`).join(' · ')}</p>
            <Link href={`/play/${g}?mode=unlimited&difficulty=easy`} prefetch={false} className="mt-2 inline-block text-sm font-semibold text-accent">
              {t('howTo.tryIt')}
            </Link>
          </Card>
        ))}
      </div>
      <Card className="space-y-2 p-5 text-sm text-muted">
        <h2 className="font-display text-lg font-bold text-fg">{t('howTo.streaksTitle')}</h2>
        <p>{t('howTo.streaksBody')}</p>
        <p>{t('howTo.punchesBody', { games: REPAIR_CARDS.dailyVolumeGames, sets: REPAIR_CARDS.dailySetsPerPunch, per: REPAIR_CARDS.punchesPerCard, max: REPAIR_CARDS.maxCards })}</p>
        <p>{t('howTo.repairBody', { days: REPAIR_CARDS.repairWindowDays })}</p>
      </Card>
    </div>
  );
}
