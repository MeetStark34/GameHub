import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEVELOPER } from '@/config/site';
import type { Db } from '@/lib/db';
import { viewStreak } from '@/lib/progression/streaks';
import { addDays } from '@/lib/time';
import { GAME_IDS } from '@/games/types';
import { adminActionSchema, adminSearchUsers, runAdminAction } from '@/server/admin';
import { applyDeveloperShowcase } from '@/server/developer';
import { startSession } from '@/server/play';
import { loadStreak } from '@/server/progress';
import { useRepairCard } from '@/server/streaks';
import { signUp } from '@/server/users';
import { plus, solveSession, testDb } from '../helpers';

let db: Db;
let admin: { id: string };
beforeAll(async () => {
  db = await testDb();
  admin = await member('boss');
  await db.query(`insert into user_roles (user_id, role) values ($1, 'admin')`, [admin.id]);
});
afterAll(async () => {
  await db.close();
});

function member(handle: string) {
  return signUp(db, { email: `${handle}@example.com`, password: 'long-enough-password', handle, displayName: handle }, null);
}
const noon = (date: string) => new Date(`${date}T12:00:00Z`);
async function playDaily(userId: string, game: (typeof GAME_IDS)[number], at: Date) {
  const v = await startSession(db, { userId, game, mode: 'daily', now: at });
  return (await solveSession(db, userId, v.id, plus(at, 120))).completion!;
}
async function playUnlimited(userId: string, at: Date) {
  const v = await startSession(db, { userId, game: 'queens', mode: 'unlimited', difficulty: 'easy', fresh: true, now: at });
  return (await solveSession(db, userId, v.id, plus(at, 60))).completion!;
}
const streakNow = async (userId: string, kind: 'normal' | 'true_player', date: string) => viewStreak(await loadStreak(db, userId, kind), date);
const stats = async (userId: string) => (await db.query<{ total_xp: number; xp_frozen: boolean; games_completed: number }>('select * from user_stats where user_id = $1', [userId]))[0];
const lastAudit = async (action: string) =>
  (await db.query<{ actor_id: string; target_user_id: string | null; details: Record<string, unknown>; created_at: Date }>(
    'select actor_id, target_user_id, details, created_at from admin_audit_log where action = $1 order by created_at desc limit 1',
    [action],
  ))[0];

describe('developer account streaks follow the normal rules', () => {
  const D = '2026-11-01';
  let dev: { id: string };

  it('keeps 365 / 240 from the showcase, then advances, breaks and repairs like any account', async () => {
    dev = await member(DEVELOPER.handle);
    await db.query(`insert into user_roles (user_id, role) values ($1, 'admin')`, [dev.id]);
    await applyDeveloperShowcase(db, noon(D));
    expect((await streakNow(dev.id, 'normal', D)).current).toBe(365);
    expect((await streakNow(dev.id, 'true_player', D)).current).toBe(240);

    // Next day, not yet played: still shown (at risk), no special status.
    const d1 = addDays(D, 1);
    expect(await streakNow(dev.id, 'normal', d1)).toMatchObject({ current: 365, status: 'at-risk' });
    // One Daily game: Normal advances, True Player does not (partial set). Unlimited counts for neither.
    await playUnlimited(dev.id, noon(d1));
    expect((await streakNow(dev.id, 'normal', d1)).status).toBe('at-risk');
    const c = await playDaily(dev.id, 'queens', noon(d1));
    expect(c.streaks).toMatchObject({ normal: 366, normalAdvanced: true, truePlayerAdvanced: false });
    expect((await streakNow(dev.id, 'true_player', d1)).current).toBe(240); // at risk, not yet broken
    expect(await streakNow(dev.id, 'true_player', addDays(d1, 1))).toMatchObject({ current: 0, status: 'broken' });

    // Re-running the showcase never refreshes or protects streaks.
    await applyDeveloperShowcase(db, noon(d1));
    expect((await streakNow(dev.id, 'normal', d1)).current).toBe(366);
    expect((await streakNow(dev.id, 'true_player', addDays(d1, 1))).current).toBe(0);

    // Stops playing: two days later the Normal Streak is broken too, but repairable.
    const d3 = addDays(d1, 2);
    expect(await streakNow(dev.id, 'normal', d3)).toMatchObject({ current: 0, status: 'broken', repairable: { restoresTo: 366 } });
    // Repair works normally (the showcase left 3 Gold Repair Cards).
    const r = await useRepairCard(db, dev.id, 'normal', crypto.randomUUID(), noon(d3));
    expect(r.streak).toMatchObject({ current: 366, status: 'at-risk' });
  });
});

describe('admin XP adjustments', () => {
  it('adds and removes custom amounts through the ledger, audited, never below zero', async () => {
    const p = await member('xp-target');
    const now = noon('2026-11-05');
    const add = (await runAdminAction(db, admin.id, { action: 'adjust-xp', userId: p.id, amount: 25_000, reason: 'event prize' }, now)) as { totalXp: number };
    expect(add.totalXp).toBeGreaterThanOrEqual(25_000); // achievement XP may follow
    const afterAdd = (await stats(p.id)).total_xp;
    const a = await lastAudit('xp-add');
    expect(a).toMatchObject({ actor_id: admin.id, target_user_id: p.id, details: { amount: 25_000, before: 0, after: 25_000, reason: 'event prize' } });
    expect(a.created_at).toBeInstanceOf(Date);

    await runAdminAction(db, admin.id, { action: 'adjust-xp', userId: p.id, amount: -500 }, now);
    expect((await stats(p.id)).total_xp).toBe(afterAdd - 500);
    expect((await lastAudit('xp-remove')).details).toMatchObject({ amount: -500, before: afterAdd, after: afterAdd - 500 });

    await expect(runAdminAction(db, admin.id, { action: 'adjust-xp', userId: p.id, amount: -1_000_000 }, now)).rejects.toThrow(/Cannot remove/);
    expect((await stats(p.id)).total_xp).toBe(afterAdd - 500);

    // Ledger and cached total agree.
    const [{ sum }] = await db.query<{ sum: number }>('select coalesce(sum(amount), 0)::int sum from xp_ledger where user_id = $1', [p.id]);
    expect(sum).toBe(afterAdd - 500);

    // The same request id applies once.
    const requestId = crypto.randomUUID();
    await runAdminAction(db, admin.id, { action: 'adjust-xp', userId: p.id, amount: 1000, requestId }, now);
    const again = (await runAdminAction(db, admin.id, { action: 'adjust-xp', userId: p.id, amount: 1000, requestId }, now)) as { repeated: boolean };
    expect(again.repeated).toBe(true);
    expect((await stats(p.id)).total_xp).toBe(afterAdd + 500);
  });

  it('rejects malformed amounts at the schema', () => {
    const userId = crypto.randomUUID();
    for (const amount of [0, 1.5, -0.5, '100', null, 1_000_001, -1_000_001, Number.NaN, Number.POSITIVE_INFINITY])
      expect(adminActionSchema.safeParse({ action: 'adjust-xp', userId, amount }).success, String(amount)).toBe(false);
    expect(adminActionSchema.safeParse({ action: 'adjust-xp', userId, amount: -1000 }).success).toBe(true);
    expect(adminActionSchema.safeParse({ action: 'grant-xp', userId, amount: 1000 }).success).toBe(false); // fixed +1000 is gone
    expect(adminActionSchema.safeParse({ action: 'adjust-xp', userId: 'not-a-uuid', amount: 5 }).success).toBe(false);
  });
});

describe('admin streak adjustments', () => {
  it('adjusts Normal and True Player streaks, audited, never below zero', async () => {
    const p = await member('streak-target');
    const date = '2026-11-06';
    await playDaily(p.id, 'queens', noon(date));
    const run = (kind: 'normal' | 'true_player', amount: number) => runAdminAction(db, admin.id, { action: 'adjust-streak', userId: p.id, kind, amount, reason: 'support ticket' }, noon(date));

    expect(await run('normal', 5)).toEqual({ before: 1, after: 6 });
    expect(await run('normal', -3)).toEqual({ before: 6, after: 3 });
    expect(await run('true_player', 10)).toEqual({ before: 0, after: 10 });
    expect(await run('true_player', -2)).toEqual({ before: 10, after: 8 });
    await expect(run('normal', -4)).rejects.toThrow(/Cannot remove/);
    expect((await streakNow(p.id, 'normal', date)).current).toBe(3);

    expect((await lastAudit('streak-adjust')).details).toMatchObject({ kind: 'true_player', amount: -2, before: 10, after: 8, reason: 'support ticket' });
    const [{ n }] = await db.query<{ n: number }>(`select count(*)::int n from admin_audit_log where action = 'streak-adjust' and target_user_id = $1`, [p.id]);
    expect(n).toBe(4); // the rejected one wrote nothing

    // Metadata stays consistent: Normal was already done today, so another game today does not add a day,
    // tomorrow's game does; the adjusted True Player streak is due today.
    expect((await playDaily(p.id, 'zip', noon(date))).streaks.normal).toBe(3);
    expect(await streakNow(p.id, 'true_player', date)).toMatchObject({ current: 8, status: 'at-risk' });
    expect((await playDaily(p.id, 'queens', noon(addDays(date, 1)))).streaks.normal).toBe(4);

    for (const amount of [0, 2.5, '3', 3651]) expect(adminActionSchema.safeParse({ action: 'adjust-streak', userId: p.id, kind: 'normal', amount }).success).toBe(false);
    expect(adminActionSchema.safeParse({ action: 'adjust-streak', userId: p.id, kind: 'weekly', amount: 1 }).success).toBe(false);
  });
});

describe('XP freeze', () => {
  it('a frozen player still plays and progresses, earns no XP, and admin adjustments still apply', async () => {
    const p = await member('frozen-player');
    const date = '2026-11-07';
    await playDaily(p.id, 'queens', noon(date));
    const xpBefore = (await stats(p.id)).total_xp;
    expect(xpBefore).toBeGreaterThan(0);

    await runAdminAction(db, admin.id, { action: 'set-xp-frozen', userId: p.id, on: true, reason: 'investigating' }, noon(date));
    expect(await lastAudit('xp-freeze')).toMatchObject({ actor_id: admin.id, target_user_id: p.id, details: { reason: 'investigating' } });
    const [row] = await db.query<{ xp_frozen: boolean; xp_freeze_changed_by: string; xp_freeze_changed_at: Date }>('select * from user_stats where user_id = $1', [p.id]);
    expect(row).toMatchObject({ xp_frozen: true, xp_freeze_changed_by: admin.id });
    expect(row.xp_freeze_changed_at).toBeInstanceOf(Date);

    const c = await playDaily(p.id, 'zip', noon(date));
    expect(c).toMatchObject({ xpGained: 0, xpFrozen: true, breakdown: [] });
    expect(c.events.every((e) => !e.xp)).toBe(true);
    const u = await playUnlimited(p.id, noon(date));
    expect(u.xpGained).toBe(0);
    const s = await stats(p.id);
    expect(s.total_xp).toBe(xpBefore);
    expect(s.games_completed).toBe(3); // completions and stats still count
    expect((await streakNow(p.id, 'normal', date)).current).toBe(1);
    const frozenRows = await db.query<{ amount: number }>(`select amount from xp_ledger where user_id = $1 and reason like 'frozen:%'`, [p.id]);
    expect(frozenRows.length).toBeGreaterThan(0);
    expect(frozenRows.every((r) => r.amount === 0)).toBe(true);
    // Notifications do not claim XP either.
    const notes = await db.query<{ data: { xp: number | null } }>(`select data from notifications where user_id = $1 and created_at >= $2::timestamptz`, [p.id, row.xp_freeze_changed_at]);
    expect(notes.every((n) => !n.data.xp)).toBe(true);

    // Manual adjustment still works while frozen; rank follows the frozen total.
    await runAdminAction(db, admin.id, { action: 'adjust-xp', userId: p.id, amount: 700 }, noon(date));
    expect((await stats(p.id)).total_xp).toBe(xpBefore + 700);
    expect((await lastAudit('xp-add')).details).toMatchObject({ amount: 700, xpFrozen: true });

    // Persisted: a fresh read (as after refresh / sign-in) still shows it frozen.
    const [listed] = (await adminSearchUsers(db, 'frozen-player', noon(date))).filter((x) => x.id === p.id);
    expect(listed.xp_frozen).toBe(true);

    // Setting the same state again is a no-op and writes no audit row.
    expect(await runAdminAction(db, admin.id, { action: 'set-xp-frozen', userId: p.id, on: true }, noon(date))).toEqual({ xpFrozen: true, changed: false });

    await runAdminAction(db, admin.id, { action: 'set-xp-frozen', userId: p.id, on: false }, noon(date));
    expect((await lastAudit('xp-unfreeze')).target_user_id).toBe(p.id);
    const next = await playDaily(p.id, 'tango', noon(date));
    expect(next.xpGained).toBeGreaterThan(0);
    expect(next.xpFrozen).toBeUndefined();
    expect((await stats(p.id)).total_xp).toBe(xpBefore + 700 + next.xpGained);
  });
});

describe('admin account deletion', () => {
  it('deletes a player and their data without their password; shared data and the audit trail remain', async () => {
    const p = await member('doomed');
    const date = '2026-11-08';
    await playDaily(p.id, 'queens', noon(date));
    await playUnlimited(p.id, noon(date));
    const dailyPuzzles = (await db.query<{ n: number }>('select count(*)::int n from daily_puzzles'))[0].n;

    await expect(runAdminAction(db, admin.id, { action: 'delete-account', userId: p.id, confirmHandle: 'wrong' }, noon(date))).rejects.toThrow(/Type the handle/);
    const res = await runAdminAction(db, admin.id, { action: 'delete-account', userId: p.id, confirmHandle: '@Doomed' }, noon(date));
    expect(res).toEqual({ deleted: true, handle: 'doomed' });

    const tables = ['users', 'auth_sessions', 'user_stats', 'streaks', 'xp_ledger', 'completions', 'game_sessions', 'mastery', 'daily_activity', 'notifications', 'achievement_unlocks', 'card_events', 'preferences', 'user_roles', 'user_badges'];
    for (const t of tables) {
      const col = t === 'users' ? 'id' : 'user_id';
      expect((await db.query<{ n: number }>(`select count(*)::int n from ${t} where ${col} = $1`, [p.id]))[0].n, t).toBe(0);
    }
    expect((await db.query<{ n: number }>('select count(*)::int n from daily_puzzles'))[0].n).toBe(dailyPuzzles);
    const a = await lastAudit('delete-account');
    expect(a).toMatchObject({ actor_id: admin.id, target_user_id: null, details: { deletedUserId: p.id, handle: 'doomed' } });
    expect(JSON.stringify(a.details)).not.toMatch(/@example\.com|password/);
  });

  it('protects yourself, the developer account and the last admin', async () => {
    const now = noon('2026-11-08');
    await expect(runAdminAction(db, admin.id, { action: 'delete-account', userId: admin.id, confirmHandle: 'boss' }, now)).rejects.toThrow(/your own account/);
    const [dev] = await db.query<{ id: string }>('select id from users where handle = $1', [DEVELOPER.handle]);
    await expect(runAdminAction(db, admin.id, { action: 'delete-account', userId: dev.id, confirmHandle: DEVELOPER.handle }, now)).rejects.toThrow(/protected developer account/);

    // Last-admin guard: in a world where the target is the only admin left.
    const soleAdmin = await member('sole-admin');
    const actor = await member('ex-admin');
    await db.query(`delete from user_roles where role = 'admin'`);
    await db.query(`insert into user_roles (user_id, role) values ($1, 'admin')`, [soleAdmin.id]);
    await expect(runAdminAction(db, actor.id, { action: 'delete-account', userId: soleAdmin.id, confirmHandle: 'sole-admin' }, now)).rejects.toThrow(/last administrator/);
    expect((await db.query('select 1 from users where id = $1', [soleAdmin.id])).length).toBe(1);
    // With a second admin it is allowed.
    await db.query(`insert into user_roles (user_id, role) values ($1, 'admin')`, [admin.id]);
    await runAdminAction(db, admin.id, { action: 'delete-account', userId: soleAdmin.id, confirmHandle: 'sole-admin' }, now);
    expect((await db.query('select 1 from users where id = $1', [soleAdmin.id])).length).toBe(0);
  });
});
