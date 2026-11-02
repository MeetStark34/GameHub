import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '@/lib/db';
import { GAME_IDS } from '@/games/types';
import { ACHIEVEMENTS } from '@/config/achievements';
import { startSession } from '@/server/play';
import { loadStreak, loadStreaks } from '@/server/progress';
import { getPlayerSummary, getPublicProfile } from '@/server/queries';
import { createGuest, signUp } from '@/server/users';
import { plus, solveSession, testDb } from '../helpers';

let db: Db;
beforeAll(async () => {
  db = await testDb();
});
afterAll(async () => {
  await db.close();
});

const now = new Date('2026-05-04T12:00:00Z');

describe('player summary (concurrent reads)', () => {
  it('reports a new player as empty', async () => {
    const g = await createGuest(db);
    const s = await getPlayerSummary(db, g.id, now);
    expect(s.user).toMatchObject({ id: g.id, handle: g.handle, isGuest: true });
    expect(s.xp).toBe(0);
    expect(s.streaks.normal).toMatchObject({ current: 0, best: 0, status: 'none' });
    expect(s.streaks.truePlayer).toMatchObject({ current: 0, best: 0, status: 'none' });
    expect(s.today.games.map((x) => x.status)).toEqual(GAME_IDS.map(() => 'not-started'));
    expect(s.mastery.map((m) => m.game)).toEqual([...GAME_IDS]);
    expect(s.recent).toEqual([]);
    expect(s.badges).toEqual([]);
    expect(s.achievements.total).toBe(ACHIEVEMENTS.length);
  });

  it('matches the database after Daily and Unlimited play', async () => {
    const u = await signUp(db, { email: 'sum@example.com', password: 'longenough1', handle: 'summer', displayName: 'Sum' }, null);
    const daily = await startSession(db, { userId: u.id, game: 'queens', mode: 'daily', now });
    await solveSession(db, u.id, daily.id, plus(now, 90));
    await startSession(db, { userId: u.id, game: 'zip', mode: 'daily', now });
    const unl = await startSession(db, { userId: u.id, game: 'sudoku', mode: 'unlimited', difficulty: 'easy', now });
    await solveSession(db, u.id, unl.id, plus(now, 120));

    const s = await getPlayerSummary(db, u.id, plus(now, 200));
    const [stats] = await db.query<{ total_xp: number; games_completed: number }>('select total_xp, games_completed from user_stats where user_id = $1', [u.id]);
    const [unread] = await db.query<{ n: number }>('select count(*)::int n from notifications where user_id = $1 and read_at is null', [u.id]);
    const [unlocked] = await db.query<{ n: number }>('select count(*)::int n from achievement_unlocks where user_id = $1', [u.id]);

    expect(s.user).toMatchObject({ id: u.id, handle: 'summer', displayName: 'Sum', isGuest: false });
    expect(s.xp).toBe(stats.total_xp);
    expect(s.gamesCompleted).toBe(2);
    expect(s.today.completed).toBe(1);
    expect(s.today.games.find((g) => g.game === 'queens')).toMatchObject({ status: 'completed' });
    expect(s.today.games.find((g) => g.game === 'queens')!.score).toBeGreaterThan(0);
    expect(s.today.games.find((g) => g.game === 'zip')).toMatchObject({ status: 'in-progress', score: null });
    expect(s.today.gamesPlayedToday).toBe(2);
    expect(s.streaks.normal).toMatchObject({ current: 1, status: 'active' });
    expect(s.unread).toBe(unread.n);
    expect(s.achievements.unlocked).toBe(unlocked.n);
    expect(s.recent.map((r) => r.game)).toEqual(['sudoku', 'queens']);
    expect(s.mastery.find((m) => m.game === 'sudoku')!.completions).toBe(1);

    const p = await getPublicProfile(db, 'summer', u.id, plus(now, 200));
    expect(p).toMatchObject({ xp: s.xp, normalStreak: s.streaks.normal, truePlayerStreak: s.streaks.truePlayer });
  });

  it('loadStreaks returns the same state as loadStreak for each kind', async () => {
    const [{ id }] = await db.query<{ id: string }>(`select id from users where handle = 'summer'`);
    const both = await loadStreaks(db, id);
    expect(both.normal).toEqual(await loadStreak(db, id, 'normal'));
    expect(both.true_player).toEqual(await loadStreak(db, id, 'true_player'));
  });
});
