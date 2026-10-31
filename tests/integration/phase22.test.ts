import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEVELOPER } from '@/config/site';
import { PLAYER_RANKS } from '@/config/ranks';
import type { Db } from '@/lib/db';
import { rankFromXp } from '@/lib/progression/ranks';
import { getPreferences, updateSettings } from '@/server/account';
import { adminDashboard } from '@/server/admin-dashboard';
import { runAdminAction } from '@/server/admin';
import { applyDeveloperShowcase } from '@/server/developer';
import { BOARD_IDS, getLeaderboard, getPublicProfile } from '@/server/queries';
import { signUp } from '@/server/users';
import { startSession } from '@/server/play';
import { plus, solveSession, testDb } from '../helpers';

let db: Db;
beforeAll(async () => {
  db = await testDb();
});
afterAll(async () => {
  await db.close();
});

const member = (handle: string) => signUp(db, { email: `${handle}@example.com`, password: 'long-enough-password', handle, displayName: handle }, null);

async function playOne(userId: string, game: 'queens' | 'zip', at: Date) {
  const v = await startSession(db, { userId, game, mode: 'daily', now: at });
  return solveSession(db, userId, v.id, plus(at, 120));
}

describe('developer showcase and leaderboard exclusion', () => {
  it('applies only to the configured developer account; others are untouched', async () => {
    await expect(applyDeveloperShowcase(db, new Date())).rejects.toThrow(/Create the/);
    const dev = await member(DEVELOPER.handle);
    const normal = await member('regular-joe');
    const now = new Date('2026-10-20T12:00:00Z');
    await playOne(normal.id, 'queens', now);
    await playOne(dev.id, 'zip', now);

    const res = await applyDeveloperShowcase(db, now);
    expect(res.totalXp).toBe(DEVELOPER.showcase.targetXp);
    // Re-running tops up, never doubles.
    expect((await applyDeveloperShowcase(db, now)).totalXp).toBe(DEVELOPER.showcase.targetXp);

    const profile = (await getPublicProfile(db, DEVELOPER.handle, null, now))!;
    expect(profile.displayName).toBe(DEVELOPER.displayName);
    expect(profile.badges).toContain('developer');
    expect(profile.rank.name).toBe('Legend');
    expect(profile.rank).toEqual(rankFromXp(DEVELOPER.showcase.targetXp, PLAYER_RANKS)); // rank still derived from XP
    expect(profile.normalStreak.current).toBe(DEVELOPER.showcase.normalStreak);
    expect(profile.truePlayerStreak.current).toBe(DEVELOPER.showcase.truePlayerStreak);
    expect(profile.truePlayerDays).toBe(DEVELOPER.showcase.truePlayerDays);
    expect(profile.mastery.every((m) => m.xp >= DEVELOPER.showcase.masteryXpPerGame)).toBe(true);
    expect(profile.achievements.length).toBe(profile.achievementsTotal);
    expect(profile.leaderboardExcluded).toBe(true);

    const other = (await getPublicProfile(db, 'regular-joe', null, now))!;
    expect(other.rank.name).toBe('Rookie');
    expect(other.badges).toEqual([]);
    expect(other.leaderboardExcluded).toBe(false);

    // Excluded from every public board, at the query level; stats kept.
    for (const board of BOARD_IDS) {
      for (const game of ['queens', 'zip'] as const) {
        const lb = await getLeaderboard(db, board, { game, difficulty: 'normal', now, viewerId: null });
        expect(lb.rows.some((r) => r.handle === DEVELOPER.handle), `${board}/${game}`).toBe(false);
      }
    }
    const xpBoard = await getLeaderboard(db, 'xp', { now });
    expect(xpBoard.rows.some((r) => r.handle === 'regular-joe')).toBe(true);
    const stats = await db.query<{ total_xp: number }>('select total_xp from user_stats where user_id = $1', [dev.id]);
    expect(stats[0].total_xp).toBe(DEVELOPER.showcase.targetXp);

    // The Developer badge grants no permissions.
    const roles = await db.query('select * from user_roles where user_id = $1', [dev.id]);
    expect(roles).toHaveLength(0);

    // Admins can include them again.
    const admin = await member('the-admin');
    await db.query(`insert into user_roles (user_id, role) values ($1, 'admin')`, [admin.id]);
    await runAdminAction(db, admin.id, { action: 'set-leaderboard-excluded', userId: dev.id, on: false }, now);
    expect((await getLeaderboard(db, 'xp', { now })).rows[0].handle).toBe(DEVELOPER.handle);
  });
});

describe('admin dashboard data', () => {
  it('aggregates players, games, daily history and suspicious activity', async () => {
    const d = await adminDashboard(db, new Date('2026-10-20T13:00:00Z'));
    expect(d.users.members).toBeGreaterThanOrEqual(3);
    expect(d.games.total).toBeGreaterThanOrEqual(2);
    expect(d.currentSet).toHaveLength(8);
    expect(d.currentSet.every((r) => r.fingerprint)).toBe(true);
    expect(d.xpDistribution).toHaveLength(10);
    expect(d.xpDistribution.reduce((s, x) => s + x.count, 0)).toBeGreaterThan(0);
    expect(d.dailyPools.find((p) => p.game === 'pinpoint')?.pool).toBeGreaterThan(150);
    expect(d.system.migrations).toEqual(['0001_init', '0002_phase22']);
    expect(Array.isArray(d.suspicious.nearFloor)).toBe(true);
  });
});

describe('language preference', () => {
  it('persists per account', async () => {
    const u = await member('polyglot');
    await updateSettings(db, u.id, { language: 'hi' });
    expect((await getPreferences(db, u.id))?.language).toBe('hi');
    await updateSettings(db, u.id, { theme: 'nord' });
    expect(await getPreferences(db, u.id)).toMatchObject({ language: 'hi', theme: 'nord' });
  });
});
