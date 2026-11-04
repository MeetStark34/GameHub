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
import type { RewardEvent, UnlockedAchievement } from '@/lib/contracts';
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
  xp_frozen: boolean;
}

export type { RewardEvent } from '@/lib/contracts';

export async function ensureStats(tx: Queryable, userId: string): Promise<StatsRow> {
  await tx.query('insert into user_stats (user_id) values ($1) on conflict do nothing', [userId]);
  return one<StatsRow>(tx, 'select * from user_stats where user_id = $1 for update', [userId]);
}

export async function isXpFrozen(tx: Queryable, userId: string): Promise<boolean> {
  return !!(await maybeOne(tx, 'select 1 from user_stats where user_id = $1 and xp_frozen', [userId]));
}

/**
 * The account's XP-freeze flag, when the caller already read it from the
 * user_stats row it holds locked in this transaction (it cannot change until
 * commit). Passing it saves one query per award and notification; when it is
 * omitted, the flag is read from the database as before.
 */
export type KnownFrozen = boolean | undefined;

/**
 * Idempotent XP award: the single gate every XP change goes through.
 * Returns true if XP was newly applied. While the account's XP is frozen,
 * gameplay awards are recorded in the ledger as 0 under `frozen:<reason>`
 * (so the key is spent and never paid later) and return false. Manual
 * admin adjustments pass `bypassFreeze`.
 */
export async function awardXp(
  tx: Queryable,
  userId: string,
  amount: number,
  reason: string,
  key: string,
  opts: { bypassFreeze?: boolean; frozen?: KnownFrozen } = {},
): Promise<boolean> {
  if (!amount) return false;
  const frozen = !opts.bypassFreeze && (opts.frozen ?? (await isXpFrozen(tx, userId)));
  const rows = await tx.query(
    `insert into xp_ledger (user_id, amount, reason, idempotency_key) values ($1, $2, $3, $4)
     on conflict (user_id, idempotency_key) do nothing returning id`,
    [userId, frozen ? 0 : Math.round(amount), frozen ? `frozen:${reason}` : reason, key],
  );
  if (!rows.length || frozen) return false;
  await tx.query('update user_stats set total_xp = greatest(0, total_xp + $2), xp_updated_at = now() where user_id = $1', [
    userId,
    Math.round(amount),
  ]);
  return true;
}

export async function notify(tx: Queryable, userId: string, e: RewardEvent, frozen?: KnownFrozen): Promise<void> {
  // A frozen account earned no XP, so its notifications must not claim any.
  const xp = e.xp && !(frozen ?? (await isXpFrozen(tx, userId))) ? e.xp : null;
  await tx.query('insert into notifications (user_id, kind, title, body, data) values ($1, $2, $3, $4, $5::jsonb)', [
    userId,
    e.kind,
    e.title,
    e.body,
    JSON.stringify({ ...(e.data ?? {}), xp, i18n: e.i18n ?? null }),
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

/** Both streaks in one round trip (read-only views: no row locks). */
export async function loadStreaks(db: Queryable, userId: string): Promise<Record<StreakKind, StreakState>> {
  const rows = await db.query<StreakRow & { kind: StreakKind }>(
    'select kind, current, best, last_date, lost_value, lost_last_date from streaks where user_id = $1',
    [userId],
  );
  const byKind = new Map(rows.map((r) => [r.kind, r]));
  return { normal: toState(byKind.get('normal') ?? null), true_player: toState(byKind.get('true_player') ?? null) };
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
  frozen?: KnownFrozen,
): Promise<{ current: number; advanced: boolean }> {
  const before = await loadStreak(tx, userId, kind, true);
  const { state, advanced } = recordQualifyingDay(before, day);
  if (!advanced) return { current: before.current, advanced };
  await saveStreak(tx, userId, kind, state);
  const xp = streakMilestoneXp(kind === 'normal' ? 'normal' : 'truePlayer', state.current);
  if (xp && (await awardXp(tx, userId, xp, `streak-${kind}-milestone`, `streak:${kind}:${day}`, { frozen }))) {
    const name = kind === 'normal' ? 'Normal Streak' : 'True Player Streak';
    const streakKey = kind === 'normal' ? '@streak.normal' : '@streak.truePlayer';
    const e: RewardEvent = {
      kind: 'streak-milestone',
      title: `${state.current}-day ${name}!`,
      body: `Milestone bonus earned.`,
      i18n: { title: { key: 'events.streakMilestone.title', params: { count: state.current, streak: streakKey } }, body: { key: 'events.streakMilestone.body' } },
      xp,
    };
    events.push(e);
    await notify(tx, userId, e, frozen);
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
  frozen?: KnownFrozen,
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
  await awardXp(tx, userId, XP_ECONOMY.punchEarned, 'punch', `${key}:xp`, { frozen });
  const punchEvent: RewardEvent = {
    kind: 'punch',
    title: 'Punch earned',
    body: `${PUNCH_SOURCE_LABEL[source] ?? source}. ${outcome === 'punch' ? `${state.punchProgress}/${REPAIR_CARDS.punchesPerCard} on your card.` : 'Card complete!'}`,
    i18n: {
      title: { key: 'events.punch.title' },
      body: {
        key: `events.punch.${source === 'volume' ? 'volume' : source === 'daily-sets' ? 'sets' : 'admin'}`,
        params: {
          games: REPAIR_CARDS.dailyVolumeGames,
          sets: REPAIR_CARDS.dailySetsPerPunch,
          count: outcome === 'punch' ? state.punchProgress : REPAIR_CARDS.punchesPerCard,
          total: REPAIR_CARDS.punchesPerCard,
        },
      },
    },
    xp: XP_ECONOMY.punchEarned,
  };
  events.push(punchEvent);
  await notify(tx, userId, punchEvent, frozen);

  if (outcome === 'card-created') {
    await tx.query(`insert into card_events (user_id, kind, source, idempotency_key) values ($1, 'card_created', $2, $3)`, [
      userId,
      source,
      `${key}:card`,
    ]);
    await awardXp(tx, userId, XP_ECONOMY.cardCreated, 'card-created', `${key}:card:xp`, { frozen });
    const e: RewardEvent = {
      kind: state.cardsHeld >= REPAIR_CARDS.maxCards ? 'pocket-full' : 'card-created',
      title: state.cardsHeld >= REPAIR_CARDS.maxCards ? 'Gold Repair Card earned. Pocket full!' : 'Gold Repair Card earned',
      body: `You now hold ${state.cardsHeld}/${REPAIR_CARDS.maxCards} cards. Use one to repair a broken streak.`,
      i18n: {
        title: { key: state.cardsHeld >= REPAIR_CARDS.maxCards ? 'events.pocketFull.title' : 'events.cardCreated.title' },
        body: { key: 'events.cardCreated.body', params: { held: state.cardsHeld, max: REPAIR_CARDS.maxCards } },
      },
      xp: XP_ECONOMY.cardCreated,
    };
    events.push(e);
    await notify(tx, userId, e, frozen);
  } else if (outcome === 'card-converted') {
    await tx.query(`insert into card_events (user_id, kind, source, idempotency_key) values ($1, 'card_converted', $2, $3)`, [
      userId,
      source,
      `${key}:convert`,
    ]);
    await awardXp(tx, userId, XP_ECONOMY.cardConverted, 'card-converted', `${key}:convert:xp`, { frozen });
    const e: RewardEvent = {
      kind: 'card-converted',
      title: 'Pocket full: card converted',
      body: `You already hold ${REPAIR_CARDS.maxCards} cards, so your new card became ${XP_ECONOMY.cardConverted} XP.`,
      i18n: {
        title: { key: 'events.cardConverted.title' },
        body: { key: 'events.cardConverted.body', params: { max: REPAIR_CARDS.maxCards, xp: XP_ECONOMY.cardConverted } },
      },
      xp: XP_ECONOMY.cardConverted,
    };
    events.push(e);
    await notify(tx, userId, e, frozen);
  }
  return outcome;
}

/**
 * Builds the stats snapshot the achievement engine evaluates. The reads are
 * independent and lock nothing, so they are issued together: in a
 * transaction they are pipelined on its connection (one round trip, still
 * executed in order), elsewhere they run in parallel.
 */
export async function loadAchievementStats(tx: Queryable, userId: string, today: UtcDate): Promise<AchievementStats> {
  const [s, mastery, act, normalRow, tpRow] = await Promise.all([
    one<StatsRow>(tx, 'select * from user_stats where user_id = $1', [userId]),
    tx.query<{ game: GameId; xp: number; completions: number }>('select game, xp, completions from mastery where user_id = $1', [userId]),
    maybeOne<{ games_completed: number; hours_mask: number; per_game: Record<string, number> }>(
      tx,
      'select games_completed, hours_mask, per_game from daily_activity where user_id = $1 and utc_date = $2',
      [userId, today],
    ),
    loadStreak(tx, userId, 'normal'),
    loadStreak(tx, userId, 'true_player'),
  ]);
  const normal = viewStreak(normalRow, today);
  const tp = viewStreak(tpRow, today);
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

export type { UnlockedAchievement } from '@/lib/contracts';

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
  frozen?: KnownFrozen,
): Promise<UnlockedAchievement[]> {
  const out: UnlockedAchievement[] = [];
  for (let pass = 0; pass < 2; pass++) {
    // Read-only and independent: one round trip (see loadAchievementStats).
    const [unlocked, stats] = await Promise.all([
      tx.query<{ achievement_id: string }>('select achievement_id from achievement_unlocks where user_id = $1', [userId]),
      loadAchievementStats(tx, userId, today),
    ]);
    const have = new Set(unlocked.map((r) => r.achievement_id));
    const fresh = newlyUnlocked(stats, pass === 0 ? event : null, have, ACHIEVEMENTS);
    if (!fresh.length) break;
    for (const a of fresh) {
      const ins = await tx.query(
        'insert into achievement_unlocks (user_id, achievement_id, xp) values ($1, $2, $3) on conflict do nothing returning achievement_id',
        [userId, a.id, a.xp],
      );
      if (!ins.length) continue;
      await awardXp(tx, userId, a.xp, 'achievement', `achievement:${a.id}`, { frozen });
      const u = { id: a.id, name: a.name, description: a.description, icon: a.icon, xp: a.xp };
      out.push(u);
      const e: RewardEvent = {
        kind: 'achievement',
        title: a.name,
        body: a.description,
        i18n: { title: { key: `achievements.items.${a.id}.name` }, body: { key: `achievements.items.${a.id}.description` } },
        xp: a.xp,
        data: { achievementId: a.id, icon: a.icon },
      };
      events.push(e);
      await notify(tx, userId, e, frozen);
    }
  }
  return out;
}
