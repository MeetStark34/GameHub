import 'server-only';
import { ACHIEVEMENTS } from '@/config/achievements';
import { DEVELOPER } from '@/config/site';
import { maybeOne, one, type Db } from '@/lib/db';
import { toUtcDate } from '@/lib/time';
import { GAME_IDS } from '@/games/types';
import { PlayError } from './errors';
import { awardXp, ensureStats, saveStreak } from './progress';

/**
 * Puts the configured developer account (DEVELOPER.handle) into the
 * maximum-progression showcase state. Only that account can receive it.
 * Everything is written through the normal tables: XP goes through the
 * ledger, so rank is still computed from XP like every other player. The
 * account is excluded from public leaderboards so its numbers never
 * distort competition. Safe to re-run: values are topped up, not added,
 * and streaks are only seeded on first application (see below).
 */
export async function applyDeveloperShowcase(db: Db, now: Date) {
  const S = DEVELOPER.showcase;
  const today = toUtcDate(now);
  const user = await maybeOne<{ id: string; is_guest: boolean }>(db, 'select id, is_guest from users where handle = $1', [DEVELOPER.handle]);
  if (!user || user.is_guest) throw new PlayError(`Create the @${DEVELOPER.handle} member account first.`, 404);
  await db.tx(async (tx) => {
    const stats = await ensureStats(tx, user.id);
    await tx.query('update users set display_name = $2, leaderboard_excluded = true where id = $1', [user.id, DEVELOPER.displayName]);
    await tx.query(`insert into user_badges (user_id, badge) values ($1, 'developer') on conflict do nothing`, [user.id]);

    const delta = S.targetXp - stats.total_xp;
    if (delta > 0) await awardXp(tx, user.id, delta, 'developer-showcase', `showcase:${now.toISOString()}`, { bypassFreeze: true });

    const games = S.gamesPerGame * GAME_IDS.length;
    const perDiff = Math.floor(games / 4);
    await tx.query(
      `update user_stats set
         games_completed = greatest(games_completed, $2), daily_games_completed = greatest(daily_games_completed, $3),
         unlimited_games_completed = greatest(unlimited_games_completed, $4),
         easy_completed = greatest(easy_completed, $5), normal_completed = greatest(normal_completed, $5),
         hard_completed = greatest(hard_completed, $5), expert_completed = greatest(expert_completed, $5),
         perfect_completed = greatest(perfect_completed, $6), true_player_days = greatest(true_player_days, $7),
         cards_held = 3, cards_earned = greatest(cards_earned, 5)
       where user_id = $1`,
      [user.id, games, S.truePlayerDays * 8, games - S.truePlayerDays * 8, perDiff, Math.floor(games / 3), S.truePlayerDays],
    );
    for (const game of GAME_IDS)
      await tx.query(
        `insert into mastery (user_id, game, xp, completions, best_score, best_time_ms) values ($1, $2, $3, $4, 1000, 30000)
         on conflict (user_id, game) do update set xp = greatest(mastery.xp, excluded.xp),
           completions = greatest(mastery.completions, excluded.completions), best_score = greatest(mastery.best_score, 1000)`,
        [user.id, game, S.masteryXpPerGame, S.gamesPerGame],
      );
    // Streaks are seeded once: only while a streak has never reached the
    // showcase value (its lifetime best is below it). After that they follow
    // the normal rules like any player's, and re-running the showcase never
    // refreshes, repairs or protects them.
    const best = new Map(
      (await tx.query<{ kind: string; best: number }>('select kind, best from streaks where user_id = $1', [user.id])).map((r) => [r.kind, r.best]),
    );
    for (const [kind, target] of [
      ['normal', S.normalStreak],
      ['true_player', S.truePlayerStreak],
    ] as const)
      if ((best.get(kind) ?? 0) < target) await saveStreak(tx, user.id, kind, { current: target, best: target, lastDate: today, lostValue: 0, lostLastDate: null });
    // Showcase unlocks carry xp = 0: the XP total is set directly above.
    for (const a of ACHIEVEMENTS)
      await tx.query('insert into achievement_unlocks (user_id, achievement_id, xp) values ($1, $2, 0) on conflict do nothing', [user.id, a.id]);
  });
  const after = await one<{ total_xp: number }>(db, 'select total_xp from user_stats where user_id = $1', [user.id]);
  return { userId: user.id, totalXp: after.total_xp };
}
