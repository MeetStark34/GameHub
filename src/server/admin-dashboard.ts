import 'server-only';
import { ACHIEVEMENTS_BY_ID } from '@/config/achievements';
import { GAMES } from '@/config/games';
import { PLAYER_RANKS, RANK_NAMES } from '@/config/ranks';
import { one, type Queryable } from '@/lib/db';
import { addDays, toUtcDate } from '@/lib/time';
import { GAME_IDS, type GameId } from '@/games/types';
import { PINPOINT_CATEGORIES } from '@/games/pinpoint/categories';
import { CROSSCLIMB_CLUES } from '@/games/crossclimb/clues';

const n = async (db: Queryable, sql: string, params: unknown[] = []) => (await one<{ n: number }>(db, sql, params)).n ?? 0;

/** Everything the admin dashboard shows. Admin-only: callers must check the role first. */
export async function adminDashboard(db: Queryable, now: Date) {
  const today = toUtcDate(now);
  const weekAgo = addDays(today, -6);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();

  const users = {
    total: await n(db, 'select count(*)::int n from users'),
    members: await n(db, 'select count(*)::int n from users where not is_guest'),
    guests: await n(db, 'select count(*)::int n from users where is_guest'),
    dau: await n(db, 'select count(distinct user_id)::int n from completions where utc_date = $1', [today]),
    wau: await n(db, 'select count(distinct user_id)::int n from completions where utc_date >= $1', [weekAgo]),
    newToday: await n(db, `select count(*)::int n from users where created_at >= $1::timestamptz`, [`${today}T00:00:00Z`]),
  };
  const games = {
    total: await n(db, 'select count(*)::int n from completions'),
    today: await n(db, 'select count(*)::int n from completions where utc_date = $1', [today]),
    dailyToday: await n(db, `select count(*)::int n from completions where daily_date = $1`, [today]),
    unlimitedToday: await n(db, `select count(*)::int n from completions where utc_date = $1 and mode = 'unlimited'`, [today]),
    unlimitedTotal: await n(db, `select count(*)::int n from completions where mode = 'unlimited'`),
    activeSessions: await n(db, `select count(*)::int n from game_sessions where status = 'active'`),
  };
  const truePlayer = {
    today: await n(db, 'select count(*)::int n from daily_activity where utc_date = $1 and daily_completed = 8', [today]),
    allTime: await n(db, 'select coalesce(sum(true_player_days), 0)::int n from user_stats'),
    bestStreak: await n(db, `select coalesce(max(best), 0)::int n from streaks where kind = 'true_player'`),
  };
  const yesterday = addDays(today, -1);
  const streaks = {
    activeNormal: await n(db, `select count(*)::int n from streaks where kind = 'normal' and last_date >= $1 and current > 0`, [yesterday]),
    avgNormal: await n(db, `select coalesce(round(avg(current)), 0)::int n from streaks where kind = 'normal' and last_date >= $1 and current > 0`, [yesterday]),
    bestNormal: await n(db, `select coalesce(max(best), 0)::int n from streaks where kind = 'normal'`),
    cardsHeld: await n(db, 'select coalesce(sum(cards_held), 0)::int n from user_stats'),
    cardsUsed: await n(db, 'select coalesce(sum(cards_used), 0)::int n from user_stats'),
  };

  // XP distribution by rank, computed from the configured thresholds.
  const t = PLAYER_RANKS.thresholds;
  const caseSql = t.map((th, i) => `when total_xp >= ${th} then ${i}`).reverse().join(' ');
  const dist = await db.query<{ idx: number; n: number }>(`select (case ${caseSql} else 0 end)::int idx, count(*)::int n from user_stats group by 1`);
  const xpDistribution = RANK_NAMES.map((name, i) => ({ name, count: dist.find((d) => d.idx === i)?.n ?? 0 }));
  const xpTotals = await one<{ total: number; avg: number; max: number }>(
    db,
    'select coalesce(sum(total_xp), 0)::float8 total, coalesce(round(avg(total_xp)), 0)::int avg, coalesce(max(total_xp), 0)::int max from user_stats',
  );

  const achievementTotal = await n(db, 'select count(*)::int n from achievement_unlocks');
  const topAchievements = (
    await db.query<{ id: string; n: number }>('select achievement_id id, count(*)::int n from achievement_unlocks group by 1 order by 2 desc, 1 limit 8')
  ).map((r) => ({ name: ACHIEVEMENTS_BY_ID.get(r.id)?.name ?? r.id, count: r.n }));

  const usage = await db.query<{ game: GameId; total: number; today: number; avg_ms: number; avg_score: number }>(
    `select game, count(*)::int total, count(*) filter (where utc_date = $1)::int today,
       coalesce(round(avg(duration_ms)), 0)::int avg_ms, coalesce(round(avg(score)), 0)::int avg_score
     from completions group by game`,
    [today],
  );
  const gameUsage = GAME_IDS.map((g) => {
    const u = usage.find((x) => x.game === g);
    return { game: g, name: GAMES[g].name, total: u?.total ?? 0, today: u?.today ?? 0, avgMs: u?.avg_ms ?? 0, avgScore: u?.avg_score ?? 0 };
  });

  const leaderboard = {
    optedOut: await n(db, 'select count(*)::int n from users where not is_guest and not show_on_leaderboards'),
    excluded: (await db.query<{ handle: string }>('select handle from users where leaderboard_excluded order by handle')).map((r) => r.handle),
    ranked: await n(db, 'select count(*)::int n from users u join user_stats s on s.user_id = u.id where not u.is_guest and u.show_on_leaderboards and not u.leaderboard_excluded and s.total_xp > 0'),
  };

  const currentSet = await db.query<{ game: GameId; fingerprint: string | null; attempt: number; reused: boolean; difficulty: string; completions: number }>(
    `select dp.game, dp.fingerprint, dp.attempt, dp.reused, ds.difficulty,
       (select count(*)::int from completions c where c.daily_date = dp.utc_date and c.game = dp.game) completions
     from daily_puzzles dp join daily_sets ds using (utc_date) where dp.utc_date = $1 order by dp.game`,
    [today],
  );
  const history = await db.query<{ game: string; utc_date: string; fingerprint: string; reused: boolean }>(
    'select game, utc_date, fingerprint, reused from daily_puzzle_history order by utc_date desc, game limit 48',
  );
  const usedPerGame = await db.query<{ game: GameId; used: number; reused: number }>(
    'select game, count(distinct fingerprint)::int used, count(*) filter (where reused)::int reused from daily_puzzle_history group by game',
  );
  const pools: Partial<Record<GameId, number>> = { pinpoint: PINPOINT_CATEGORIES.length, crossclimb: CROSSCLIMB_CLUES.size };
  const dailyPools = GAME_IDS.map((g) => {
    const u = usedPerGame.find((x) => x.game === g);
    return { game: g, name: GAMES[g].name, used: u?.used ?? 0, reused: u?.reused ?? 0, pool: pools[g] ?? null };
  });

  // Suspicious activity (heuristics, for human review only).
  const fast = await db.query<{ handle: string; game: GameId; difficulty: string; duration_ms: number; completed_at: Date }>(
    `select u.handle, c.game, c.difficulty, c.duration_ms, c.completed_at from completions c join users u on u.id = c.user_id
     where c.completed_at >= $1::timestamptz order by c.completed_at desc limit 500`,
    [sevenDaysAgo],
  );
  const nearFloor = fast
    .filter((c) => c.duration_ms < 2 * GAMES[c.game].minSeconds[c.difficulty as 'easy'] * 1000)
    .slice(0, 20)
    .map((c) => ({ ...c, completed_at: new Date(c.completed_at).toISOString() }));
  const heavyDays = await db.query<{ handle: string; utc_date: string; games_completed: number }>(
    `select u.handle, a.utc_date, a.games_completed from daily_activity a join users u on u.id = a.user_id
     where a.games_completed >= 100 order by a.utc_date desc, a.games_completed desc limit 20`,
  );
  const startBursts = await db.query<{ handle: string; n: number }>(
    `select u.handle, count(*)::int n from game_sessions s join users u on u.id = s.user_id
     where s.started_at >= $1::timestamptz and s.mode = 'unlimited' group by u.handle having count(*) > 150 order by 2 desc limit 20`,
    [`${today}T00:00:00Z`],
  );

  const migrations = (await db.query<{ version: string }>('select version from schema_migrations order by version')).map((r) => r.version);
  const system = {
    driver: process.env.DATABASE_URL ? 'postgres (DATABASE_URL)' : 'PGlite (embedded)',
    migrations,
    node: process.version,
    uptimeMin: Math.round(process.uptime() / 60),
    resend: !!process.env.RESEND_API_KEY,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? '(not set)',
    bootstrapAdmins: !!process.env.GAMEHUB_BOOTSTRAP_ADMINS,
    serverTime: now.toISOString(),
  };

  return { users, games, truePlayer, streaks, xpDistribution, xpTotals, achievementTotal, topAchievements, gameUsage, leaderboard, currentSet, history, dailyPools, suspicious: { nearFloor, heavyDays, startBursts }, system };
}
