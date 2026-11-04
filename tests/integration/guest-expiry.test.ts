import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '@/lib/db';
import { startSession } from '@/server/play';
import { GUEST_TTL_HOURS, createGuest, createSession, signUp, userForToken } from '@/server/users';
import { plus, solveSession, testDb } from '../helpers';

const HOUR = 3_600_000;
let db: Db;
beforeAll(async () => {
  db = await testDb();
});
afterAll(async () => {
  await db.close();
});

const purge = async () => (await db.query<{ deleted_guests: number; deleted_puzzles: number }>(`select * from purge_expired_guests('test')`))[0];
const exists = async (id: string) => (await db.query('select 1 from users where id = $1', [id])).length === 1;
const count = async (table: string, userId: string) => Number((await db.query<{ n: number }>(`select count(*)::int n from ${table} where user_id = $1`, [userId]))[0].n);
const member = (handle: string) =>
  signUp(db, { email: `${handle}@example.com`, password: 'long-enough-password', handle, displayName: handle }, null);

/** A guest created `hoursAgo` hours before the real clock, with one finished Unlimited game. */
async function playedGuest(hoursAgo: number) {
  const created = new Date(Date.now() - hoursAgo * HOUR);
  const g = await createGuest(db, created);
  const v = await startSession(db, { userId: g.id, game: 'queens', mode: 'unlimited', difficulty: 'easy', fresh: true, now: plus(created, 60) });
  await solveSession(db, g.id, v.id, plus(created, 120));
  return { guest: g, sessionId: v.id, created };
}

describe('guest account expiry', () => {
  it('stamps every new guest with an expiry exactly 12 hours after creation', async () => {
    const created = new Date('2026-11-04T08:15:30.123Z');
    const g = await createGuest(db, created);
    expect(GUEST_TTL_HOURS).toBe(12);
    expect(new Date(g.created_at).toISOString()).toBe(created.toISOString());
    expect(new Date(g.guest_expires_at!).toISOString()).toBe('2026-11-04T20:15:30.123Z');
  });

  it('ends the guest session at the expiry instant, even before cleanup runs', async () => {
    const created = new Date('2026-11-04T08:00:00Z');
    const g = await createGuest(db, created);
    const { token, expires } = await createSession(db, g.id, g.guest_expires_at, created);
    expect(expires.toISOString()).toBe('2026-11-04T20:00:00.000Z');
    expect((await userForToken(db, token, new Date('2026-11-04T19:59:59.999Z')))?.id).toBe(g.id);
    expect(await userForToken(db, token, new Date('2026-11-04T20:00:00.000Z'))).toBeNull();
    // A stale session row with a longer lifetime still cannot outlive the account.
    await db.query(`update auth_sessions set expires_at = '2027-01-01T00:00:00Z' where user_id = $1`, [g.id]);
    expect(await userForToken(db, token, new Date('2026-11-04T20:00:01Z'))).toBeNull();
  });

  it('deletes expired guests with all their records, keeps unexpired guests and registered accounts', async () => {
    const old = await playedGuest(GUEST_TTL_HOURS + 0.01);
    const fresh = await playedGuest(GUEST_TTL_HOURS - 0.05);
    const registered = await member('keeper');
    const v = await startSession(db, { userId: registered.id, game: 'queens', mode: 'daily', now: new Date() });
    await solveSession(db, registered.id, v.id, plus(new Date(), 30));
    // Registered accounts never qualify, however old they are.
    await db.query(`update users set created_at = now() - interval '400 days' where id = $1`, [registered.id]);
    const dailyBefore = Number((await db.query<{ n: number }>('select count(*)::int n from daily_puzzles'))[0].n);
    const oldPuzzle = (await db.query<{ puzzle_id: string }>('select puzzle_id from game_sessions where id = $1', [old.sessionId]))[0].puzzle_id;
    expect(await count('xp_ledger', old.guest.id)).toBeGreaterThan(0);

    const result = await purge();
    expect(result.deleted_guests).toBeGreaterThanOrEqual(1);
    expect(await exists(old.guest.id)).toBe(false);
    for (const t of ['game_sessions', 'completions', 'xp_ledger', 'user_stats', 'mastery', 'streaks', 'auth_sessions'])
      expect(await count(t, old.guest.id)).toBe(0);
    expect((await db.query('select 1 from puzzles where id = $1', [oldPuzzle])).length).toBe(0);

    expect(await exists(fresh.guest.id)).toBe(true);
    expect(await count('completions', fresh.guest.id)).toBe(1);
    expect(await exists(registered.id)).toBe(true);
    expect(await count('completions', registered.id)).toBe(1);
    expect(Number((await db.query<{ n: number }>('select count(*)::int n from daily_puzzles'))[0].n)).toBe(dailyBefore);
  });

  it('is idempotent and logs counts only', async () => {
    await playedGuest(GUEST_TTL_HOURS + 1);
    expect((await purge()).deleted_guests).toBe(1);
    expect(await purge()).toMatchObject({ deleted_guests: 0, deleted_puzzles: 0 });
    expect(await purge()).toMatchObject({ deleted_guests: 0, deleted_puzzles: 0 });
    const cols = (await db.query<{ column_name: string }>(`select column_name from information_schema.columns where table_name = 'guest_cleanup_log'`)).map(
      (c) => c.column_name,
    );
    expect(cols.sort()).toEqual(['deleted_guests', 'deleted_puzzles', 'id', 'ran_at', 'source']);
    const last = await db.query<{ deleted_guests: number }>('select deleted_guests from guest_cleanup_log order by id desc limit 3');
    expect(last.map((r) => r.deleted_guests)).toEqual([0, 0, 1]);
  });

  it('never deletes a guest that upgraded to a registered account', async () => {
    const created = new Date(Date.now() - (GUEST_TTL_HOURS - 1) * HOUR);
    const g = await createGuest(db, created);
    const upgraded = await signUp(db, { email: 'up@example.com', password: 'long-enough-password', handle: 'upgraded', displayName: 'Up' }, g.id);
    expect(upgraded).toMatchObject({ id: g.id, is_guest: false, guest_expires_at: null });
    await db.query(`update users set created_at = now() - interval '2 days' where id = $1`, [g.id]);
    await purge();
    expect(await exists(g.id)).toBe(true);
  });

  it('keeps rows consistent even for writers that ignore the column (previous app version)', async () => {
    // Old code inserts a guest without guest_expires_at: the database fills in created_at + 12 h.
    const [g] = await db.query<{ created_at: Date; guest_expires_at: Date }>(
      `insert into users (handle, display_name, is_guest, created_at) values ('guest-oldcode', 'G', true, '2026-11-04T10:00:00Z') returning created_at, guest_expires_at`,
    );
    expect(new Date(g.guest_expires_at).toISOString()).toBe('2026-11-04T22:00:00.000Z');
    // Old sign-up upgrade sets is_guest = false only: the expiry is cleared.
    const [up] = await db.query<{ guest_expires_at: Date | null }>(
      `update users set is_guest = false, email = 'old@example.com', password_hash = 'x' where handle = 'guest-oldcode' returning guest_expires_at`,
    );
    expect(up.guest_expires_at).toBeNull();
    // A member can never be given an expiry.
    const m = await member('nostamp');
    const [after] = await db.query<{ guest_expires_at: Date | null }>(`update users set guest_expires_at = now() where id = $1 returning guest_expires_at`, [m.id]);
    expect(after.guest_expires_at).toBeNull();
  });

  it('skips guest rows that carry an admin role (never deletes administrators)', async () => {
    const { guest } = await playedGuest(GUEST_TTL_HOURS + 2);
    await db.query(`insert into user_roles (user_id, role) values ($1, 'admin')`, [guest.id]);
    await purge();
    expect(await exists(guest.id)).toBe(true);
  });
});
