import 'server-only';
import { ACHIEVEMENTS } from '@/config/achievements';
import { REPAIR_CARDS, XP_ECONOMY } from '@/config/economy';
import { MASTERY_RANKS } from '@/config/ranks';
import { maybeOne, one, type Queryable } from '@/lib/db';
import { newlyUnlocked, type AchievementStats, type CompletionEvent } from '@/lib/progression/achievements';
import { addPunch, type PunchOutcome } from '@/lib/progression/cards';
import { rankFromXp } from '@/lib/progression/ranks';
import { emptyStreak, recordQualifyingDay, viewStreak, type StreakState } from '@/lib/progression/streaks';
import { streakMilestoneXp } from '@/lib/progression/xp';
import { GAME_IDS, type Difficulty, type GameId } from '@/games/types';
import type { UtcDate } from '@/lib/time';

/**
 * Transactional building blocks for rewards. Every function takes the
 * transaction handle of the caller so a whole completion either applies
 * fully or not at all, and every award is keyed for idempotency.
 */

export type StreakKind = 'normal' | 'true_player';

export interface StatsRow {
  user_id: string;
  total_xp: number;
  games_completed: number;
  daily_games_completed: number;
  unlimited_games_completed: number;
  easy_completed: number;
  normal_completed: number;
  hard_completed: number;
  expert_completed: number;
  perfect_completed: number;
  true_player_days: number;
  same_game_run: number;
  last_game: string | null;
  punch_progress: number;
  punches_earned: number;
  cards_held: number;
  cards_earned: number;
  cards_converted: number;
  cards_used: number;
}

export interface RewardEvent {
  kind:
    | 'level-up'
    | 'achievement'
    | 'punch'
    | 'card-created'
    | 'pocket-full'
    | 'card-converted'
    | 'daily-set-complete'
    | 'true-player'
    | 'streak-milestone'
    | 'streak-repaired'
    | 'mastery-up';
  title: string;
  body: string;
  xp?: number;
  data?: Record<string, unknown>;
}

export async function ensureStats(tx: Queryable, userId: string): Promise<StatsRow> {
  await tx.query('insert into user_stats (user_id) values ($1) on conflict do nothing', [userId]);
  return one<StatsRow>(tx, 'select * from user_stats where user_id = $1 for update', [userId]);
}

/** Idempotent XP award. Returns true if it was newly applied. */
export async function awardXp(tx: Queryable, userId: string, amount: number, reason: string, key: string): Promise<boolean> {
  if (!amount) return false;
  const rows = await tx.query(
    `insert into xp_ledger (user_id, amount, reason, idempotency_key) values ($1, $2, $3, $4)
     on conflict (user_id, idempotency_key) do nothing returning id`,
    [userId, Math.round(amount), reason, key],
  );
  if (!rows.length) return false;
  await tx.query('update user_stats set total_xp = greatest(0, total_xp + $2), xp_updated_at = now() where user_id = $1', [
    userId,
    Math.round(amount),
  ]);
  return true;
}

export async function notify(tx: Queryable, userId: string, e: RewardEvent): Promise<void> {
  await tx.query('insert into notifications (user_id, kind, title, body, data) values ($1, $2, $3, $4, $5::jsonb)', [
    userId,
    e.kind,
    e.title,
    e.body,
    JSON.stringify({ ...(e.data ?? {}), xp: e.xp ?? null }),
  ]);
}

interface StreakRow {
  current: number;
  best: number;
  last_date: string | null;
  lost_value: number;
  lost_last_date: string | null;
}

const toState = (r: StreakRow | null): StreakState =>
  r ? { current: r.current, best: r.best, lastDate: r.last_date, lostValue: r.lost_value, lostLastDate: r.lost_last_date } : emptyStreak();

export async function loadStreak(tx: Queryable, userId: string, kind: StreakKind, lock = false): Promise<StreakState> {
  const row = await maybeOne<StreakRow>(
    tx,
    `select current, best, last_date, lost_value, lost_last_date from streaks where user_id = $1 and kind = $2${lock ? ' for update' : ''}`,
    [userId, kind],
  );
  return toState(row);
}

export async function saveStreak(tx: Queryable, userId: string, kind: StreakKind, s: StreakState): Promise<void> {
  await tx.query(
    `insert into streaks (user_id, kind, current, best, last_date, lost_value, lost_last_date, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, now())
     on conflict (user_id, kind) do update set current = excluded.current, best = excluded.best,
       last_date = excluded.last_date, lost_value = excluded.lost_value,
       lost_last_date = excluded.lost_last_date, updated_at = now()`,
    [userId, kind, s.current, s.best, s.lastDate, s.lostValue, s.lostLastDate],
  );
}

/** Records a qualifying day for a streak and pays any milestone. */
export async function advanceStreak(
  tx: Queryable,
  userId: string,
  kind: StreakKind,
  day: UtcDate,
  events: RewardEvent[],
): Promise<{ current: number; advanced: boolean }> {
  const before = await loadStreak(tx, userId, kind, true);
  const { state, advanced } = recordQualifyingDay(before, day);
  if (!advanced) return { current: before.current, advanced };
  await saveStreak(tx, userId, kind, state);
  const xp = streakMilestoneXp(kind === 'normal' ? 'normal' : 'truePlayer', state.current);
  if (xp && (await awardXp(tx, userId, xp, `streak-${kind}-milestone`, `streak:${kind}:${day}`))) {
    const name = kind === 'normal' ? 'Normal Streak' : 'True Player Streak';
    const e: RewardEvent = { kind: 'streak-milestone', title: `${state.current}-day ${name}!`, body: `Milestone bonus earned.`, xp };
    events.push(e);
    await notify(tx, userId, e);
  }
  return { current: state.current, advanced };
}

export const PUNCH_SOURCE_LABEL: Record<string, string> = {
  volume: `${REPAIR_CARDS.dailyVolumeGames} games in one day`,
  'daily-sets': `${REPAIR_CARDS.dailySetsPerPunch} full Daily Sets`,
  admin: 'Granted by an admin',
};

/**
 * Adds one punch (idempotent by key). Ten punches make a Gold Repair Card;
 * a card earned with a full pocket is converted to XP instead.
 */
export async function grantPunch(
  tx: Queryable,
  userId: string,
  source: string,
  key: string,
  events: RewardEvent[],
): Promise<PunchOutcome | null> {
  const inserted = await tx.query(
    `insert into card_events (user_id, kind, source, idempotency_key) values ($1, 'punch', $2, $3)
     on conflict (user_id, idempotency_key) do nothing returning id`,
    [userId, source, key],
  );
  if (!inserted.length) return null;
  const stats = await one<StatsRow>(tx, 'select * from user_stats where user_id = $1 for update', [userId]);
  const { state, outcome } = addPunch({ punchProgress: stats.punch_progress, cardsHeld: stats.cards_held });
  await tx.query(
    `update user_stats set punch_progress = $2, cards_held = $3, punches_earned = punches_earned + 1,
       cards_earned = cards_earned + $4, cards_converted = cards_converted + $5 where user_id = $1`,
    [userId, state.punchProgress, state.cardsHeld, outcome === 'card-created' ? 1 : 0, outcome === 'card-converted' ? 1 : 0],
  );
  await awardXp(tx, userId, XP_ECONOMY.punchEarned, 'punch', `${key}:xp`);
  const punchEvent: RewardEvent = {
    kind: 'punch',
    title: 'Punch earned',
    body: `${PUNCH_SOURCE_LABEL[source] ?? source}. ${outcome === 'punch' ? `${state.punchProgress}/${REPAIR_CARDS.punchesPerCard} on your card.` : 'Card complete!'}`,
    xp: XP_ECONOMY.punchEarned,
  };
  events.push(punchEvent);
  await notify(tx, userId, punchEvent);

  if (outcome === 'card-created') {
    await tx.query(`insert into card_events (user_id, kind, source, idempotency_key) values ($1, 'card_created', $2, $3)`, [
      userId,
      source,
      `${key}:card`,
    ]);
    await awardXp(tx, userId, XP_ECONOMY.cardCreated, 'card-created', `${key}:card:xp`);
    const e: RewardEvent = {
      kind: state.cardsHeld >= REPAIR_CARDS.maxCards ? 'pocket-full' : 'card-created',
      title: state.cardsHeld >= REPAIR_CARDS.maxCards ? 'Gold Repair Card earned. Pocket full!' : 'Gold Repair Card earned',
      body: `You now hold ${state.cardsHeld}/${REPAIR_CARDS.maxCards} cards. Use one to repair a broken streak.`,
      xp: XP_ECONOMY.cardCreated,
    };
    events.push(e);
    await notify(tx, userId, e);
  } else if (outcome === 'card-converted') {
    await tx.query(`insert into card_events (user_id, kind, source, idempotency_key) values ($1, 'card_converted', $2, $3)`, [
      userId,
      source,
      `${key}:convert`,
    ]);
    await awardXp(tx, userId, XP_ECONOMY.cardConverted, 'card-converted', `${key}:convert:xp`);
    const e: RewardEvent = {
      kind: 'card-converted',
      title: 'Pocket full: card converted',
      body: `You already hold ${REPAIR_CARDS.maxCards} cards, so your new card became ${XP_ECONOMY.cardConverted} XP.`,
      xp: XP_ECONOMY.cardConverted,
    };
    events.push(e);
    await notify(tx, userId, e);
  }
  return outcome;
}

/** Builds the stats snapshot the achievement engine evaluates. */
export async function loadAchievementStats(tx: Queryable, userId: string, today: UtcDate): Promise<AchievementStats> {
  const s = await one<StatsRow>(tx, 'select * from user_stats where user_id = $1', [userId]);
  const mastery = await tx.query<{ game: GameId; xp: number; completions: number }>(
    'select game, xp, completions from mastery where user_id = $1',
    [userId],
  );
  const act = await maybeOne<{ games_completed: number; hours_mask: number; per_game: Record<string, number> }>(
    tx,
    'select games_completed, hours_mask, per_game from daily_activity where user_id = $1 and utc_date = $2',
    [userId, today],
  );
  const normal = viewStreak(await loadStreak(tx, userId, 'normal'), today);
  const tp = viewStreak(await loadStreak(tx, userId, 'true_player'), today);
  const byGame = Object.fromEntries(GAME_IDS.map((g) => [g, 0])) as Record<GameId, number>;
  const masteryRankIndex = { ...byGame };
  for (const m of mastery) {
    byGame[m.game] = m.completions;
    masteryRankIndex[m.game] = rankFromXp(m.xp, MASTERY_RANKS).rankIndex;
  }
  let hours = 0;
  for (let mask = act?.hours_mask ?? 0; mask; mask &= mask - 1) hours++;
  const byDifficulty: Record<Difficulty, number> = {
    easy: s.easy_completed,
    normal: s.normal_completed,
    hard: s.hard_completed,
    expert: s.expert_completed,
  };
  return {
    gamesCompleted: s.games_completed,
    dailyGamesCompleted: s.daily_games_completed,
    unlimitedGamesCompleted: s.unlimited_games_completed,
    distinctGames: Object.values(byGame).filter((n) => n > 0).length,
    perfectCompleted: s.perfect_completed,
    totalXp: s.total_xp,
    normalStreak: normal.current,
    truePlayerStreak: tp.current,
    truePlayerDays: s.true_player_days,
    cardsHeld: s.cards_held,
    cardsEarned: s.cards_earned,
    cardsConverted: s.cards_converted,
    cardsUsed: s.cards_used,
    punchesEarned: s.punches_earned,
    sameGameRun: s.same_game_run,
    todayGames: act?.games_completed ?? 0,
    todayMaxSameGame: Math.max(0, ...Object.values(act?.per_game ?? {}).map(Number)),
    todayDistinctHours: hours,
    byDifficulty,
    byGame,
    masteryRankIndex,
  };
}

export interface UnlockedAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
}

/**
 * Unlocks every newly satisfied achievement. Runs a second pass because
 * achievement XP can itself satisfy XP-based achievements.
 */
export async function evaluateAchievements(
  tx: Queryable,
  userId: string,
  today: UtcDate,
  event: CompletionEvent | null,
  events: RewardEvent[],
): Promise<UnlockedAchievement[]> {
  const out: UnlockedAchievement[] = [];
  for (let pass = 0; pass < 2; pass++) {
    const have = new Set(
      (await tx.query<{ achievement_id: string }>('select achievement_id from achievement_unlocks where user_id = $1', [userId])).map(
        (r) => r.achievement_id,
      ),
    );
    const stats = await loadAchievementStats(tx, userId, today);
    const fresh = newlyUnlocked(stats, pass === 0 ? event : null, have, ACHIEVEMENTS);
    if (!fresh.length) break;
    for (const a of fresh) {
      const ins = await tx.query(
        'insert into achievement_unlocks (user_id, achievement_id, xp) values ($1, $2, $3) on conflict do nothing returning achievement_id',
        [userId, a.id, a.xp],
      );
      if (!ins.length) continue;
      await awardXp(tx, userId, a.xp, 'achievement', `achievement:${a.id}`);
      const u = { id: a.id, name: a.name, description: a.description, icon: a.icon, xp: a.xp };
      out.push(u);
      const e: RewardEvent = { kind: 'achievement', title: a.name, body: a.description, xp: a.xp, data: { achievementId: a.id, icon: a.icon } };
      events.push(e);
      await notify(tx, userId, e);
    }
  }
  return out;
}
