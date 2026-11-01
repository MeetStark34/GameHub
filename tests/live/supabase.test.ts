/**
 * Live verification against the configured Supabase/Postgres database
 * (DATABASE_URL from the environment or .env.local), through the real
 * postgres.js driver. Everything runs inside ONE transaction that is always
 * rolled back, so no rows are left behind and existing data is untouched.
 * Opt-in: `npm run test:live` (skipped by `npm test`).
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEVELOPER } from '@/config/site';
import { postgresClientOptions, wrapPostgres, type Db } from '@/lib/db';
import { isValidClientPuzzle } from '@/games/client-schemas';
import { DIFFICULTIES, GAME_IDS } from '@/games/types';
import { runAdminAction } from '@/server/admin';
import { applyBootstrapAdmin } from '@/server/bootstrap';
import { applyDeveloperShowcase } from '@/server/developer';
import { actOnSession, startSession } from '@/server/play';
import { BOARD_IDS, getLeaderboard, getPublicProfile } from '@/server/queries';
import { winningActionsFor } from '@/server/solutions';
import { createGuest, signUp } from '@/server/users';

const LIVE = process.env.LIVE_DB === '1';
const url =
  process.env.DATABASE_URL ||
  (fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').match(/^\s*DATABASE_URL=(.+)$/m)?.[1]?.trim() : undefined);

const ROLLBACK = new Error('rollback');

async function inRolledBackTx(fn: (db: Db) => Promise<void>) {
  const { default: postgres } = await import('postgres');
  const sql = postgres(url!, { ...postgresClientOptions, max: 1, connect_timeout: 20 });
  try {
    await sql.begin(async (tx) => {
      const db: Db = {
        ...wrapPostgres(tx),
        tx: (f) => tx.savepoint((sp) => f(wrapPostgres(sp))) as Promise<never>,
        exec: async (s) => {
          await tx.unsafe(s);
        },
        close: async () => {},
      };
      await fn(db);
      throw ROLLBACK;
    });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  } finally {
    await sql.end();
  }
}

async function solve(db: Db, userId: string, sessionId: string, at: Date) {
  const [row] = await db.query<{ game: (typeof GAME_IDS)[number]; solution: unknown; data: unknown }>(
    'select s.game, p.solution, p.data from game_sessions s join puzzles p on p.id = s.puzzle_id where s.id = $1',
    [sessionId],
  );
  let last;
  for (const a of winningActionsFor(row.game, row.solution, row.data)) last = await actOnSession(db, userId, sessionId, a, at);
  return last!;
}

describe.skipIf(!LIVE || !url)('live database (rolled back)', () => {
  it('schema is migrated and every stored json value is a JSON document, not a string', async () => {
    await inRolledBackTx(async (db) => {
      const versions = (await db.query<{ version: string }>('select version from schema_migrations order by 1')).map((r) => r.version);
      expect(versions).toEqual(expect.arrayContaining(['0001_init', '0002_phase22', '0003_repair_json_encoding', '0004_lock_schema_migrations', '0005_xp_freeze']));
      const bad = await db.query<{ t: string; n: number }>(
        `select 'puzzles.data' t, count(*)::int n from puzzles where jsonb_typeof(data) = 'string'
         union all select 'game_sessions.state', count(*)::int from game_sessions where jsonb_typeof(state) = 'string'
         union all select 'completions.result', count(*)::int from completions where jsonb_typeof(result) = 'string'
         union all select 'notifications.data', count(*)::int from notifications where jsonb_typeof(data) = 'string'`,
      );
      expect(bad.filter((r) => r.n > 0)).toEqual([]);
    });
  });

  it('every game plays end to end on Postgres: Daily (all 8) and Unlimited (all difficulties)', async () => {
    await inRolledBackTx(async (db) => {
      const user = await createGuest(db);
      const now = new Date();
      let totalBefore = 0;
      for (const [i, game] of GAME_IDS.entries()) {
        const view = await startSession(db, { userId: user.id, game, mode: 'daily', now });
        expect(isValidClientPuzzle(game, view.puzzle), `daily ${game} client puzzle`).toBe(true);
        // A wrong move is rejected without completing the game.
        const wrong = await actOnSession(db, user.id, view.id, { type: 'submit', solution: [] }, new Date(now.getTime() + 60_000));
        expect(wrong.solved, `daily ${game} wrong move`).toBe(false);
        const done = await solve(db, user.id, view.id, new Date(now.getTime() + 120_000 + i));
        expect(done.solved, `daily ${game} solved`).toBe(true);
        expect(done.completion!.xpGained, `daily ${game} xp`).toBeGreaterThan(0);
        expect(done.completion!.totalXp).toBeGreaterThan(totalBefore);
        totalBefore = done.completion!.totalXp;
        // Duplicate submit: same stored result, no extra XP.
        const again = await solve(db, user.id, view.id, new Date(now.getTime() + 130_000));
        expect(again.completion).toEqual(done.completion);
        if (i === GAME_IDS.length - 1) {
          expect(done.completion!.daily).toMatchObject({ completed: 8, setComplete: true });
          expect(done.completion!.streaks.truePlayer).toBeGreaterThanOrEqual(1);
        }
      }
      const types = await db.query<{ t: string }>(
        `select distinct jsonb_typeof(p.data) t from game_sessions s join puzzles p on p.id = s.puzzle_id where s.user_id = $1`,
        [user.id],
      );
      expect(types).toEqual([{ t: 'object' }]);
      const stats = await db.query<{ total_xp: number }>('select total_xp from user_stats where user_id = $1', [user.id]);
      expect(stats[0].total_xp).toBe(totalBefore);
      const streak = await db.query<{ current: number }>(`select current from streaks where user_id = $1 and kind = 'normal'`, [user.id]);
      expect(streak[0].current).toBeGreaterThanOrEqual(1);

      let k = 0;
      for (const game of GAME_IDS)
        for (const difficulty of DIFFICULTIES) {
          // Space starts 20 s apart: the real anti-spam limit is 30 starts per minute.
          const at = new Date(now.getTime() + ++k * 20_000);
          const view = await startSession(db, { userId: user.id, game, mode: 'unlimited', difficulty, fresh: true, now: at });
          expect(isValidClientPuzzle(game, view.puzzle), `unlimited ${game} ${difficulty}`).toBe(true);
          const done = await solve(db, user.id, view.id, new Date(at.getTime() + 15_000));
          expect(done.solved, `unlimited ${game} ${difficulty}`).toBe(true);
        }
      const after = await db.query<{ current: number }>(`select current from streaks where user_id = $1 and kind = 'normal'`, [user.id]);
      expect(after[0].current).toBe(streak[0].current); // Unlimited never touches streaks
    });
  }, 300_000);

  it('bootstrap admin, developer showcase and leaderboard exclusion work on Postgres', async () => {
    await inRolledBackTx(async (db) => {
      const email = 'live-dev-check@example.invalid';
      const prev = process.env.GAMEHUB_BOOTSTRAP_ADMINS;
      process.env.GAMEHUB_BOOTSTRAP_ADMINS = email;
      try {
        const existingDev = await db.query('select 1 from users where handle = $1', [DEVELOPER.handle]);
        const handle = existingDev.length ? 'live-dev-check' : DEVELOPER.handle;
        const dev = await signUp(db, { email, password: 'a-long-test-password', handle, displayName: 'Live Dev' }, null);
        const normal = await signUp(db, { email: 'live-normal@example.invalid', password: 'a-long-test-password', handle: 'live-normal', displayName: 'Live Normal' }, null);
        expect((await applyBootstrapAdmin(db, dev)).granted).toBe(true);
        expect((await applyBootstrapAdmin(db, normal)).granted).toBe(false);
        const roles = await db.query<{ handle: string }>(
          `select u.handle from user_roles r join users u on u.id = r.user_id where r.role = 'admin' and u.id = any($1::uuid[])`,
          [[dev.id, normal.id]],
        );
        expect(roles.map((r) => r.handle)).toEqual([handle]);
        if (handle === DEVELOPER.handle) {
          const p = (await getPublicProfile(db, handle, null, new Date()))!;
          expect(p.badges).toContain('developer');
          expect(p.rank.name).toBe('Legend');
          expect(p.leaderboardExcluded).toBe(true);
          for (const board of BOARD_IDS) {
            const lb = await getLeaderboard(db, board, { now: new Date(), viewerId: null });
            expect(lb.rows.some((r) => r.handle === handle), board).toBe(false);
          }
        }
      } finally {
        process.env.GAMEHUB_BOOTSTRAP_ADMINS = prev;
      }
    });
  }, 120_000);

  it('admin XP / streak / freeze / delete tools work on Postgres', async () => {
    await inRolledBackTx(async (db) => {
      const now = new Date();
      const pw = 'a-long-test-password';
      const actor = await signUp(db, { email: 'live-admin@example.invalid', password: pw, handle: 'live-admin', displayName: 'Live Admin' }, null);
      const target = await signUp(db, { email: 'live-target@example.invalid', password: pw, handle: 'live-target', displayName: 'Live Target' }, null);
      await db.query(`insert into user_roles (user_id, role) values ($1, 'admin')`, [actor.id]);
      const xp = async () => (await db.query<{ total_xp: number }>('select total_xp from user_stats where user_id = $1', [target.id]))[0].total_xp;

      await runAdminAction(db, actor.id, { action: 'adjust-xp', userId: target.id, amount: 5000, reason: 'live check' }, now);
      const added = await xp();
      expect(added).toBeGreaterThanOrEqual(5000);
      await runAdminAction(db, actor.id, { action: 'adjust-xp', userId: target.id, amount: -1000 }, now);
      expect(await xp()).toBe(added - 1000);
      await expect(runAdminAction(db, actor.id, { action: 'adjust-xp', userId: target.id, amount: -1_000_000 }, now)).rejects.toThrow(/Cannot remove/);

      expect(await runAdminAction(db, actor.id, { action: 'adjust-streak', userId: target.id, kind: 'normal', amount: 5 }, now)).toEqual({ before: 0, after: 5 });
      expect(await runAdminAction(db, actor.id, { action: 'adjust-streak', userId: target.id, kind: 'true_player', amount: 3 }, now)).toEqual({ before: 0, after: 3 });

      // (Reaching a 5-day streak unlocks "On a Roll" and its XP, like any achievement.)
      await runAdminAction(db, actor.id, { action: 'set-xp-frozen', userId: target.id, on: true }, now);
      const frozenAt = await xp();
      const v = await startSession(db, { userId: target.id, game: 'queens', mode: 'daily', now });
      const done = await solve(db, target.id, v.id, new Date(now.getTime() + 120_000));
      expect(done.completion).toMatchObject({ xpGained: 0, xpFrozen: true });
      expect(done.completion!.streaks.normal).toBe(6); // the game still counts for the streak
      expect(await xp()).toBe(frozenAt);

      const audit = await db.query<{ action: string; details: Record<string, unknown> }>(
        `select action, details from admin_audit_log where actor_id = $1 order by created_at`,
        [actor.id],
      );
      expect(audit.map((a) => a.action)).toEqual(['xp-add', 'xp-remove', 'streak-adjust', 'streak-adjust', 'xp-freeze']);
      expect(audit.every((a) => typeof a.details === 'object')).toBe(true); // jsonb document, not a string

      await runAdminAction(db, actor.id, { action: 'delete-account', userId: target.id, confirmHandle: 'live-target' }, now);
      expect(await db.query('select 1 from users where id = $1', [target.id])).toHaveLength(0);
      expect(await db.query('select 1 from xp_ledger where user_id = $1', [target.id])).toHaveLength(0);
      const del = await db.query<{ target_user_id: string | null; details: { handle: string } }>(
        `select target_user_id, details from admin_audit_log where actor_id = $1 and action = 'delete-account'`,
        [actor.id],
      );
      expect(del).toEqual([{ target_user_id: null, details: expect.objectContaining({ handle: 'live-target' }) }]);
    });
  }, 120_000);

  it('the existing developer account keeps its streaks: re-running the showcase changes nothing', async () => {
    await inRolledBackTx(async (db) => {
      const read = () =>
        db.query<{ kind: string; current: number; best: number; last_date: string | null }>(
          'select s.kind, s.current, s.best, s.last_date from streaks s join users u on u.id = s.user_id where u.handle = $1 order by s.kind',
          [DEVELOPER.handle],
        );
      const before = await read();
      if (!before.length) return; // no developer account in this database
      expect(before.find((s) => s.kind === 'normal')!.best).toBeGreaterThanOrEqual(DEVELOPER.showcase.normalStreak);
      expect(before.find((s) => s.kind === 'true_player')!.best).toBeGreaterThanOrEqual(DEVELOPER.showcase.truePlayerStreak);
      await applyDeveloperShowcase(db, new Date());
      expect(await read()).toEqual(before);
      // Still excluded from every public board.
      for (const board of BOARD_IDS) {
        const lb = await getLeaderboard(db, board, { now: new Date(), viewerId: null });
        expect(lb.rows.some((r) => r.handle === DEVELOPER.handle), board).toBe(false);
      }
    });
  }, 120_000);
});
