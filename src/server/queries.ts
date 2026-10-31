import 'server-only';
import { ACHIEVEMENTS } from '@/config/achievements';
import { REPAIR_CARDS } from '@/config/economy';
import { MASTERY_RANKS, PLAYER_RANKS } from '@/config/ranks';
import { maybeOne, type Queryable } from '@/lib/db';
import { achievementProgress } from '@/lib/progression/achievements';
import { rankFromXp, type RankInfo } from '@/lib/progression/ranks';
import { viewStreak, type StreakView } from '@/lib/progression/streaks';
import { addDays, nextUtcMidnight, toUtcDate, utcWeekStart } from '@/lib/time';
import { GAME_IDS, type Difficulty, type GameId, type GameMode } from '@/games/types';
import { dailyDifficultyFor } from './play';
import { loadAchievementStats, loadStreak, type StatsRow } from './progress';

export interface MasteryEntry {
  game: GameId;
  xp: number;
  completions: number;
  bestScore: number;
  bestTimeMs: number | null;
  rank: RankInfo;
}

export interface DailyGameStatus {
  game: GameId;
  status: 'not-started' | 'in-progress' | 'completed';
  score: number | null;
  durationMs: number | null;
}

export interface PlayerSummary {
  user: { id: string; handle: string; displayName: string; isGuest: boolean; title: string | null };
  xp: number;
  rank: RankInfo;
  streaks: { normal: StreakView; truePlayer: StreakView };
  cards: { held: number; max: number; punchProgress: number; punchesPerCard: number; punchesEarned: number; converted: number };
  today: { date: string; difficulty: Difficulty; games: DailyGameStatus[]; completed: number; gamesPlayedToday: number; volumeTarget: number };
  mastery: MasteryEntry[];
  overallMastery: RankInfo;
  gamesCompleted: number;
  truePlayerDays: number;
  achievements: { unlocked: number; total: number };
  recent: { game: GameId; mode: GameMode; difficulty: Difficulty; score: number; durationMs: number; xp: number; completedAt: string }[];
  unread: number;
  badges: string[];
}

const emptyStats = (userId: string): StatsRow => ({
  user_id: userId,
  total_xp: 0,
  games_completed: 0,
  daily_games_completed: 0,
  unlimited_games_completed: 0,
  easy_completed: 0,
  normal_completed: 0,
  hard_completed: 0,
  expert_completed: 0,
  perfect_completed: 0,
  true_player_days: 0,
  same_game_run: 0,
  last_game: null,
  punch_progress: 0,
  punches_earned: 0,
  cards_held: 0,
  cards_earned: 0,
  cards_converted: 0,
  cards_used: 0,
});

export async function loadMastery(db: Queryable, userId: string): Promise<{ entries: MasteryEntry[]; overall: RankInfo }> {
  const rows = await db.query<{ game: GameId; xp: number; completions: number; best_score: number; best_time_ms: number | null }>(
    'select game, xp, completions, best_score, best_time_ms from mastery where user_id = $1',
    [userId],
  );
  const byGame = new Map(rows.map((r) => [r.game, r]));
  const entries = GAME_IDS.map((game) => {
    const r = byGame.get(game);
    return {
      game,
      xp: r?.xp ?? 0,
      completions: r?.completions ?? 0,
      bestScore: r?.best_score ?? 0,
      bestTimeMs: r?.best_time_ms ?? null,
      rank: rankFromXp(r?.xp ?? 0, MASTERY_RANKS),
    };
  });
  // Overall mastery: the rank of the average mastery XP across all eight games.
  const avg = entries.reduce((s, e) => s + e.xp, 0) / GAME_IDS.length;
  return { entries, overall: rankFromXp(avg, MASTERY_RANKS) };
}

export async function getPlayerSummary(db: Queryable, userId: string, now: Date): Promise<PlayerSummary> {
  const today = toUtcDate(now);
  const user = await maybeOne<{ id: string; handle: string; display_name: string; is_guest: boolean; title: string | null }>(
    db,
    'select id, handle, display_name, is_guest, title from users where id = $1',
    [userId],
  );
  if (!user) throw new Error('User not found');
  const stats = (await maybeOne<StatsRow>(db, 'select * from user_stats where user_id = $1', [userId])) ?? emptyStats(userId);
  const normal = viewStreak(await loadStreak(db, userId, 'normal'), today);
  const truePlayer = viewStreak(await loadStreak(db, userId, 'true_player'), today);

  const sessions = await db.query<{ game: GameId; status: string; score: number | null; duration_ms: number | null }>(
    `select s.game, s.status, c.score, c.duration_ms from game_sessions s left join completions c on c.session_id = s.id
     where s.user_id = $1 and s.mode = 'daily' and s.daily_date = $2`,
    [userId, today],
  );
  const byGame = new Map(sessions.map((s) => [s.game, s]));
  const games: DailyGameStatus[] = GAME_IDS.map((game) => {
    const s = byGame.get(game);
    return {
      game,
      status: !s ? 'not-started' : s.status === 'completed' ? 'completed' : 'in-progress',
      score: s?.score ?? null,
      durationMs: s?.duration_ms ?? null,
    };
  });
  const activity = await maybeOne<{ games_completed: number }>(
    db,
    'select games_completed from daily_activity where user_id = $1 and utc_date = $2',
    [userId, today],
  );
  const { entries, overall } = await loadMastery(db, userId);
  const unlocked = await maybeOne<{ n: number }>(db, 'select count(*)::int n from achievement_unlocks where user_id = $1', [userId]);
  const unread = await maybeOne<{ n: number }>(db, 'select count(*)::int n from notifications where user_id = $1 and read_at is null', [userId]);
  const recent = await db.query<{ game: GameId; mode: GameMode; difficulty: Difficulty; score: number; duration_ms: number; xp_awarded: number; completed_at: Date }>(
    `select game, mode, difficulty, score, duration_ms, xp_awarded, completed_at from completions where user_id = $1 order by completed_at desc limit 8`,
    [userId],
  );
  const badges = await db.query<{ badge: string }>('select badge from user_badges where user_id = $1 order by granted_at', [userId]);

  return {
    user: { id: user.id, handle: user.handle, displayName: user.display_name, isGuest: user.is_guest, title: user.title },
    xp: stats.total_xp,
    rank: rankFromXp(stats.total_xp, PLAYER_RANKS),
    streaks: { normal, truePlayer },
    cards: {
      held: stats.cards_held,
      max: REPAIR_CARDS.maxCards,
      punchProgress: stats.punch_progress,
      punchesPerCard: REPAIR_CARDS.punchesPerCard,
      punchesEarned: stats.punches_earned,
      converted: stats.cards_converted,
    },
    today: {
      date: today,
      difficulty: dailyDifficultyFor(today),
      games,
      completed: games.filter((g) => g.status === 'completed').length,
      gamesPlayedToday: activity?.games_completed ?? 0,
      volumeTarget: REPAIR_CARDS.dailyVolumeGames,
    },
    mastery: entries,
    overallMastery: overall,
    gamesCompleted: stats.games_completed,
    truePlayerDays: stats.true_player_days,
    achievements: { unlocked: unlocked?.n ?? 0, total: ACHIEVEMENTS.length },
    recent: recent.map((r) => ({
      game: r.game,
      mode: r.mode,
      difficulty: r.difficulty,
      score: r.score,
      durationMs: r.duration_ms,
      xp: r.xp_awarded,
      completedAt: new Date(r.completed_at).toISOString(),
    })),
    unread: unread?.n ?? 0,
    badges: badges.map((b) => b.badge),
  };
}

export interface AchievementView {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  xp: number;
  hidden: boolean;
  unlockedAt: string | null;
  progress: { value: number; target: number } | null;
}

/** All achievements for a player. Hidden ones stay masked until unlocked. */
export async function getAchievements(db: Queryable, userId: string | null, now: Date): Promise<AchievementView[]> {
  const unlocks = userId
    ? await db.query<{ achievement_id: string; unlocked_at: Date }>('select achievement_id, unlocked_at from achievement_unlocks where user_id = $1', [userId])
    : [];
  const at = new Map(unlocks.map((u) => [u.achievement_id, new Date(u.unlocked_at).toISOString()]));
  const hasStats = userId ? await maybeOne(db, 'select 1 from user_stats where user_id = $1', [userId]) : null;
  const stats = userId && hasStats ? await loadAchievementStats(db, userId, toUtcDate(now)) : null;
  return ACHIEVEMENTS.map((a) => {
    const unlockedAt = at.get(a.id) ?? null;
    const masked = !!a.hidden && !unlockedAt;
    return {
      id: a.id,
      name: masked ? '???' : a.name,
      description: masked ? 'A hidden achievement. Keep playing to discover it.' : a.description,
      category: a.category,
      icon: masked ? 'Lock' : a.icon,
      xp: a.xp,
      hidden: !!a.hidden,
      unlockedAt,
      progress: stats && !masked ? achievementProgress(a, stats) : null,
    };
  });
}

export interface PublicProfile {
  handle: string;
  displayName: string;
  title: string | null;
  badges: string[];
  memberSince: string;
  xp: number;
  rank: RankInfo;
  normalStreak: StreakView;
  truePlayerStreak: StreakView;
  truePlayerDays: number;
  gamesCompleted: number;
  mastery: MasteryEntry[];
  overallMastery: RankInfo;
  achievements: { id: string; name: string; icon: string; unlockedAt: string }[];
  achievementsTotal: number;
  isOwner: boolean;
  /** Excluded from public leaderboards (e.g. the developer showcase account). */
  leaderboardExcluded: boolean;
}

export async function getPublicProfile(db: Queryable, handle: string, viewerId: string | null, now: Date): Promise<PublicProfile | null> {
  const user = await maybeOne<{ id: string; handle: string; display_name: string; title: string | null; profile_public: boolean; is_guest: boolean; created_at: Date; leaderboard_excluded: boolean }>(
    db,
    'select id, handle, display_name, title, profile_public, is_guest, created_at, leaderboard_excluded from users where handle = $1',
    [handle.toLowerCase()],
  );
  if (!user) return null;
  const isOwner = viewerId === user.id;
  if (!isOwner && (!user.profile_public || user.is_guest)) return null;
  const today = toUtcDate(now);
  const stats = (await maybeOne<StatsRow>(db, 'select * from user_stats where user_id = $1', [user.id])) ?? emptyStats(user.id);
  const { entries, overall } = await loadMastery(db, user.id);
  const badges = await db.query<{ badge: string }>('select badge from user_badges where user_id = $1 order by granted_at', [user.id]);
  const unlocks = await db.query<{ achievement_id: string; unlocked_at: Date }>(
    'select achievement_id, unlocked_at from achievement_unlocks where user_id = $1 order by unlocked_at desc',
    [user.id],
  );
  const defs = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
  return {
    handle: user.handle,
    displayName: user.display_name,
    title: user.title,
    badges: badges.map((b) => b.badge),
    memberSince: new Date(user.created_at).toISOString(),
    xp: stats.total_xp,
    rank: rankFromXp(stats.total_xp, PLAYER_RANKS),
    normalStreak: viewStreak(await loadStreak(db, user.id, 'normal'), today),
    truePlayerStreak: viewStreak(await loadStreak(db, user.id, 'true_player'), today),
    truePlayerDays: stats.true_player_days,
    gamesCompleted: stats.games_completed,
    mastery: entries,
    overallMastery: overall,
    achievements: unlocks
      .filter((u) => defs.has(u.achievement_id))
      .map((u) => ({ id: u.achievement_id, name: defs.get(u.achievement_id)!.name, icon: defs.get(u.achievement_id)!.icon, unlockedAt: new Date(u.unlocked_at).toISOString() })),
    achievementsTotal: ACHIEVEMENTS.length,
    isOwner,
    leaderboardExcluded: user.leaderboard_excluded,
  };
}

export type BoardId =
  | 'xp'
  | 'longest-streak'
  | 'true-player-streak'
  | 'games-played'
  | 'weekly-xp'
  | 'weekly-games'
  | 'best-time'
  | 'average-time'
  | 'high-score';

export const BOARD_IDS: BoardId[] = ['xp', 'longest-streak', 'true-player-streak', 'games-played', 'weekly-xp', 'weekly-games', 'best-time', 'average-time', 'high-score'];
export const GAME_BOARDS: BoardId[] = ['best-time', 'average-time', 'high-score'];

export interface BoardRow {
  position: number;
  handle: string;
  displayName: string;
  linkable: boolean;
  value: number;
  isViewer: boolean;
}

/** Minimum completions before a player appears on an average-time board. */
const AVERAGE_MIN_GAMES = 3;

/**
 * Leaderboards over server-recorded values only. Guests and players who
 * opted out are excluded. Ties break deterministically: earlier account
 * first, then id.
 */
export async function getLeaderboard(
  db: Queryable,
  board: BoardId,
  opts: { game?: GameId; difficulty?: Difficulty; viewerId?: string | null; now: Date; limit?: number },
): Promise<{ rows: BoardRow[]; viewer: BoardRow | null; unit: 'xp' | 'days' | 'games' | 'ms' | 'score' }> {
  const limit = opts.limit ?? 50;
  const yesterday = addDays(toUtcDate(opts.now), -1);
  const weekStart = utcWeekStart(opts.now).toISOString();
  const game = opts.game ?? 'queens';
  const difficulty = opts.difficulty ?? 'normal';
  let valueSql: string;
  let from: string;
  let order = 'desc';
  let params: unknown[] = [];
  let unit: 'xp' | 'days' | 'games' | 'ms' | 'score' = 'xp';
  switch (board) {
    case 'xp':
      from = 'join user_stats st on st.user_id = u.id where st.total_xp > 0';
      valueSql = 'st.total_xp';
      break;
    case 'games-played':
      from = 'join user_stats st on st.user_id = u.id where st.games_completed > 0';
      valueSql = 'st.games_completed';
      unit = 'games';
      break;
    case 'longest-streak':
      from = `join streaks sk on sk.user_id = u.id and sk.kind = 'normal' where sk.best > 0`;
      valueSql = 'sk.best';
      unit = 'days';
      break;
    case 'true-player-streak':
      from = `join streaks sk on sk.user_id = u.id and sk.kind = 'true_player' where sk.last_date >= $1 and sk.current > 0`;
      valueSql = 'sk.current';
      params = [yesterday];
      unit = 'days';
      break;
    case 'weekly-xp':
      from = `join (select user_id, sum(amount)::int v from xp_ledger where created_at >= $1::timestamptz group by user_id) w on w.user_id = u.id where w.v > 0`;
      valueSql = 'w.v';
      params = [weekStart];
      break;
    case 'weekly-games':
      from = `join (select user_id, count(*)::int v from completions where completed_at >= $1::timestamptz group by user_id) w on w.user_id = u.id where true`;
      valueSql = 'w.v';
      params = [weekStart];
      unit = 'games';
      break;
    case 'best-time':
      from = `join (select user_id, min(duration_ms)::int v from completions where game = $1 and difficulty = $2 group by user_id) w on w.user_id = u.id where true`;
      valueSql = 'w.v';
      params = [game, difficulty];
      order = 'asc';
      unit = 'ms';
      break;
    case 'average-time':
      from = `join (select user_id, round(avg(duration_ms))::int v from completions where game = $1 and difficulty = $2 group by user_id having count(*) >= ${AVERAGE_MIN_GAMES}) w on w.user_id = u.id where true`;
      valueSql = 'w.v';
      params = [game, difficulty];
      order = 'asc';
      unit = 'ms';
      break;
    case 'high-score':
      from = `join (select user_id, max(score)::int v from completions where game = $1 and difficulty = $2 group by user_id) w on w.user_id = u.id where true`;
      valueSql = 'w.v';
      params = [game, difficulty];
      unit = 'score';
      break;
  }
  const viewerParam = params.length + 1;
  const sql = `
    with ranked as (
      select u.id, u.handle, u.display_name, u.profile_public, ${valueSql} as value,
        row_number() over (order by ${valueSql} ${order}, u.created_at asc, u.id asc)::int as position
      from users u ${from} and not u.is_guest and u.show_on_leaderboards and not u.leaderboard_excluded
    )
    select * from ranked where position <= ${limit} or id = $${viewerParam} order by position`;
  const rows = await db.query<{ id: string; handle: string; display_name: string; profile_public: boolean; value: number; position: number }>(sql, [
    ...params,
    opts.viewerId ?? '00000000-0000-0000-0000-000000000000',
  ]);
  const mapped = rows.map((r) => ({
    position: r.position,
    handle: r.handle,
    displayName: r.display_name,
    linkable: r.profile_public,
    value: Number(r.value),
    isViewer: r.id === opts.viewerId,
  }));
  return { rows: mapped.filter((r) => r.position <= limit), viewer: mapped.find((r) => r.isViewer) ?? null, unit };
}

export interface NotificationView {
  id: string;
  kind: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  createdAt: string;
  read: boolean;
}

export async function getNotifications(db: Queryable, userId: string, limit = 50): Promise<NotificationView[]> {
  const rows = await db.query<{ id: string; kind: string; title: string; body: string; data: Record<string, unknown>; created_at: Date; read_at: Date | null }>(
    'select * from notifications where user_id = $1 order by created_at desc limit $2',
    [userId, limit],
  );
  return rows.map((r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, data: r.data, createdAt: new Date(r.created_at).toISOString(), read: !!r.read_at }));
}

export const nextResetIso = (now: Date) => nextUtcMidnight(now).toISOString();
