import type { Metadata } from 'next';
import Link from 'next/link';
import { GAMES } from '@/config/games';
import { DIFFICULTIES, GAME_IDS } from '@/games/types';
import { getTranslator } from '@/i18n/server';
import { GameTile } from '@/components/game-card';
import { Card, PageHeader, cn } from '@/components/ui';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('unlimited.title'), description: t('unlimited.intro') };
}

export default async function UnlimitedPage() {
  const { t } = await getTranslator();
  return (
    <div>
      <PageHeader eyebrow={t('unlimited.eyebrow')} title={t('unlimited.title')}>
        {t('unlimited.intro')}
      </PageHeader>
      <div className="grid gap-3 md:grid-cols-2">
        {GAME_IDS.map((g) => (
          <Card key={g} className="p-4">
            <div className="mb-3 flex items-center gap-3">
              <GameTile game={g} className="size-11" />
              <div>
                <h2 className="font-display text-lg font-bold">{GAMES[g].name}</h2>
                <p className="text-sm text-muted">{t(`games.${g}.tagline`)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DIFFICULTIES.map((d, i) => (
                <Link
                  key={d}
                  href={`/play/${g}?mode=unlimited&difficulty=${d}`}
                  className={cn('rounded-xl border border-border p-2 text-center transition hover:-translate-y-0.5 hover:border-accent hover:bg-accent-soft')}
                >
                  <span className="block text-sm font-semibold">{t(`difficulty.${d}`)}</span>
                  <span className="block text-[11px] leading-tight text-muted">{t(`games.${g}.difficulty.${d}`)}</span>
                  <span className="mt-1 flex justify-center gap-0.5" aria-hidden>
                    {DIFFICULTIES.map((_, k) => (
                      <span key={k} className={cn('size-1.5 rounded-full', k <= i ? 'bg-accent' : 'bg-subtle')} />
                    ))}
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
