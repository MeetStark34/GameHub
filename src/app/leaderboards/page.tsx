import type { Metadata } from 'next';
import Link from 'next/link';
import { GAMES } from '@/config/games';
import { getDb } from '@/lib/db';
import { formatDuration } from '@/lib/time';
import { DIFFICULTIES, GAME_IDS, isDifficulty, isGameId } from '@/games/types';
import { getTranslator } from '@/i18n/server';
import { Card, PageHeader, cn } from '@/components/ui';
import { currentUser } from '@/server/auth';
import { BOARD_IDS, GAME_BOARDS, getLeaderboard, type BoardId, type BoardRow } from '@/server/queries';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('leaderboards.title'), description: t('leaderboards.intro') };
}

const GROUPS: { key: 'global' | 'weekly' | 'game'; boards: BoardId[] }[] = [
  { key: 'global', boards: ['xp', 'longest-streak', 'true-player-streak', 'games-played'] },
  { key: 'weekly', boards: ['weekly-xp', 'weekly-games'] },
  { key: 'game', boards: GAME_BOARDS },
];

type Props = { searchParams: Promise<{ board?: string; game?: string; difficulty?: string }> };

export default async function LeaderboardsPage({ searchParams }: Props) {
  const { t, num } = await getTranslator();
  const sp = await searchParams;
  const board: BoardId = BOARD_IDS.includes(sp.board as BoardId) ? (sp.board as BoardId) : 'xp';
  const game = isGameId(sp.game) ? sp.game : 'queens';
  const difficulty = isDifficulty(sp.difficulty) ? sp.difficulty : 'normal';
  const user = await currentUser();
  const isGameBoard = GAME_BOARDS.includes(board);
  const data = await getLeaderboard(await getDb(), board, { game, difficulty, viewerId: user?.id, now: new Date() });
  const label = (b: BoardId) => t(`leaderboards.boards.${b}`);

  const href = (b: BoardId, g = game, d = difficulty) => `/leaderboards?board=${b}${GAME_BOARDS.includes(b) ? `&game=${g}&difficulty=${d}` : ''}`;
  const fmt = (v: number) =>
    data.unit === 'ms' ? formatDuration(v) : data.unit === 'days' ? t(v === 1 ? 'common.day' : 'common.days', { count: v }) : `${num(v)}${data.unit === 'xp' ? ' XP' : ''}`;

  return (
    <div>
      <PageHeader eyebrow={t('leaderboards.eyebrow')} title={t('leaderboards.title')}>
        {t('leaderboards.intro')}
      </PageHeader>

      <nav aria-label={t('leaderboards.type')} className="mb-4 space-y-2">
        {GROUPS.map((g) => (
          <div key={g.key} className="flex flex-wrap items-center gap-1.5">
            <span className="w-16 font-mono text-[11px] uppercase tracking-widest text-muted">{t(`leaderboards.groups.${g.key}`)}</span>
            {g.boards.map((b) => (
              <Link key={b} href={href(b)} aria-current={b === board ? 'page' : undefined} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', b === board ? 'bg-accent text-accent-fg' : 'bg-card text-muted hover:text-fg')}>
                {label(b)}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {isGameBoard && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {GAME_IDS.map((g) => (
            <Link key={g} href={href(board, g)} aria-current={g === game ? 'page' : undefined} className={cn('rounded-lg border px-2.5 py-1 text-xs font-medium', g === game ? 'border-accent text-accent' : 'border-border text-muted')}>
              {GAMES[g].name}
            </Link>
          ))}
          <span className="mx-1 w-px bg-border" />
          {DIFFICULTIES.map((d) => (
            <Link key={d} href={href(board, game, d)} aria-current={d === difficulty ? 'page' : undefined} className={cn('rounded-lg border px-2.5 py-1 text-xs font-medium', d === difficulty ? 'border-accent text-accent' : 'border-border text-muted')}>
              {t(`difficulty.${d}`)}
            </Link>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <caption className="sr-only">{t('leaderboards.caption', { board: label(board) })}</caption>
          <thead className="bg-subtle text-left text-xs text-muted">
            <tr>
              <th scope="col" className="w-16 px-4 py-2 font-medium">
                #
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                {t('leaderboards.player')}
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                {label(board)}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-muted">
                  {t('leaderboards.empty')}
                </td>
              </tr>
            )}
            {data.rows.map((r) => (
              <Row key={r.position} r={r} value={fmt(r.value)} you={t('common.you')} />
            ))}
            {data.viewer && !data.rows.some((r) => r.isViewer) && (
              <>
                <tr aria-hidden>
                  <td colSpan={3} className="px-4 py-1 text-center text-muted">
                    ⋯
                  </td>
                </tr>
                <Row r={data.viewer} value={fmt(data.viewer.value)} you={t('common.you')} />
              </>
            )}
          </tbody>
        </table>
      </Card>
      {user?.is_guest && <p className="mt-3 text-center text-xs text-muted">{t('leaderboards.guestNote')}</p>}
    </div>
  );
}

function Row({ r, value, you }: { r: BoardRow; value: string; you: string }) {
  const medal = r.position <= 3 ? ['text-gold', 'text-muted', 'text-warning'][r.position - 1] : '';
  return (
    <tr className={cn(r.isViewer && 'bg-accent-soft')}>
      <td className={cn('num px-4 py-2.5 font-mono font-bold', medal)}>{r.position}</td>
      <td className="px-4 py-2.5">
        {r.linkable ? (
          <Link href={`/u/${r.handle}`} className="font-semibold hover:underline">
            {r.displayName}
          </Link>
        ) : (
          <span className="font-semibold">{r.displayName}</span>
        )}
        <span className="ml-2 text-xs text-muted">@{r.handle}</span>
        {r.isViewer && <span className="ml-2 text-xs font-semibold text-accent">{you}</span>}
      </td>
      <td className="num px-4 py-2.5 text-right font-mono">{value}</td>
    </tr>
  );
}
