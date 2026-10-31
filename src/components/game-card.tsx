'use client';

import Link from 'next/link';
import { CheckCircle2, CircleDashed, PlayCircle } from 'lucide-react';
import { GAMES } from '@/config/games';
import { formatDuration } from '@/lib/time';
import type { GameId } from '@/games/types';
import { useI18n } from '@/i18n/client';
import { GameGlyph } from './brand';
import { cn } from './ui';

export function GameTile({ game, className }: { game: GameId; className?: string }) {
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-xl text-white', className ?? 'size-10')} style={{ background: `var(${GAMES[game].accentVar})` }}>
      <GameGlyph game={game} className="size-[55%]" />
    </span>
  );
}

type Status = 'not-started' | 'in-progress' | 'completed';
const STATUS_KEY: Record<Status, string> = { 'not-started': 'daily.notStarted', 'in-progress': 'daily.inProgress', completed: 'daily.completed' };

export function DailyGameCard({ game, status, score, durationMs }: { game: GameId; status: Status; score: number | null; durationMs: number | null }) {
  const { t } = useI18n();
  const meta = GAMES[game];
  const done = status === 'completed';
  return (
    <Link
      href={`/play/${game}?mode=daily`}
      className={cn('group flex items-center gap-3 rounded-2xl border bg-card p-3 transition hover:-translate-y-0.5 hover:shadow-md', done ? 'border-success/40' : 'border-border')}
    >
      <GameTile game={game} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{meta.name}</span>
        <span className="block truncate text-xs text-muted">
          {done
            ? t('daily.completedMeta', { time: formatDuration(durationMs ?? 0), score: score ?? 0 })
            : status === 'in-progress'
              ? t('daily.inProgress')
              : t(`games.${game}.tagline`)}
        </span>
      </span>
      {done ? (
        <CheckCircle2 className="size-5 shrink-0 text-success" aria-label={t(STATUS_KEY[status])} />
      ) : status === 'in-progress' ? (
        <CircleDashed className="size-5 shrink-0 text-warning" aria-label={t(STATUS_KEY[status])} />
      ) : (
        <PlayCircle className="size-5 shrink-0 text-muted transition group-hover:text-accent" aria-label={t(STATUS_KEY[status])} />
      )}
    </Link>
  );
}

/** Eight small tiles showing Daily Set progress at a glance. */
export function DailyStrip({ games }: { games: { game: GameId; status: Status }[] }) {
  const { t } = useI18n();
  return (
    <ol className="flex gap-1.5" aria-label={t('daily.progress')}>
      {games.map((g) => (
        <li
          key={g.game}
          title={`${GAMES[g.game].name}: ${t(STATUS_KEY[g.status])}`}
          className={cn('h-2.5 flex-1 rounded-full', g.status === 'completed' ? 'bg-success' : g.status === 'in-progress' ? 'bg-warning' : 'bg-subtle')}
        >
          <span className="sr-only">
            {GAMES[g.game].name}: {t(STATUS_KEY[g.status])}
          </span>
        </li>
      ))}
    </ol>
  );
}
