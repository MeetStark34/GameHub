import 'server-only';
import { maybeOne, type Db } from '@/lib/db';
import { repairStreak, viewStreak } from '@/lib/progression/streaks';
import { toUtcDate } from '@/lib/time';
import { PlayError } from './errors';
import { ensureStats, evaluateAchievements, loadStreak, notify, saveStreak, type RewardEvent, type StreakKind } from './progress';

/**
 * Spends one Gold Repair Card on a broken streak. The player chooses which
 * streak; cards are never consumed automatically. `requestId` (client UUID)
 * makes retries of the same click safe.
 */
export async function useRepairCard(db: Db, userId: string, kind: StreakKind, requestId: string, now: Date) {
  const today = toUtcDate(now);
  return db.tx(async (tx) => {
    const stats = await ensureStats(tx, userId);
    const done = await maybeOne(tx, 'select 1 from card_events where user_id = $1 and idempotency_key = $2', [userId, `repair:${requestId}`]);
    if (done) return { ok: true as const, repeated: true, streak: viewStreak(await loadStreak(tx, userId, kind), today), events: [] };
    if (stats.cards_held < 1) throw new PlayError('errors.noCards', 409);
    const before = await loadStreak(tx, userId, kind, true);
    const repaired = repairStreak(before, today);
    if (!repaired) throw new PlayError('errors.nothingToRepair', 409);
    await saveStreak(tx, userId, kind, repaired);
    await tx.query('update user_stats set cards_held = cards_held - 1, cards_used = cards_used + 1 where user_id = $1', [userId]);
    await tx.query(
      `insert into card_events (user_id, kind, source, streak_kind, idempotency_key) values ($1, 'card_used', 'player', $2, $3)`,
      [userId, kind, `repair:${requestId}`],
    );
    const events: RewardEvent[] = [];
    const label = kind === 'normal' ? 'Normal Streak' : 'True Player Streak';
    const view = viewStreak(repaired, today);
    const e: RewardEvent = {
      kind: 'streak-repaired',
      title: `${label} repaired`,
      body: `Your streak is back at ${view.current} days.`,
      i18n: {
        title: { key: 'events.streakRepaired.title', params: { streak: kind === 'normal' ? '@streak.normal' : '@streak.truePlayer' } },
        body: { key: 'events.streakRepaired.body', params: { count: view.current } },
      },
    };
    await notify(tx, userId, e);
    await evaluateAchievements(tx, userId, today, null, events);
    return { ok: true as const, repeated: false, streak: view, events: [e, ...events] };
  });
}
