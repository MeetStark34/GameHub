import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ACHIEVEMENTS_BY_ID } from '@/config/achievements';
import { REPAIR_CARDS } from '@/config/economy';
import { DEVELOPER } from '@/config/site';
import { maybeOne, one, type Db, type Queryable } from '@/lib/db';
import { adjustStreak, repairStreak, viewStreak } from '@/lib/progression/streaks';
import { createRng } from '@/lib/rng';
import { addDays, toUtcDate } from '@/lib/time';
import { ENGINES } from '@/games/registry';
import { DIFFICULTIES, GAME_IDS } from '@/games/types';
import { actOnSession, PlayError, startSession } from './play';
import { awardXp, ensureStats, evaluateAchievements, loadStreak, notify, saveStreak } from './progress';
import { winningActionsFor } from './solutions';
import { applyDeveloperShowcase } from './developer';
import { purgeUser } from './account';

/** Largest single manual XP or streak change; keeps typos (an extra zero or three) from doing real damage. */
export const ADMIN_LIMITS = { xpPerAdjustment: 1_000_000, streakPerAdjustment: 3_650, maxTotalXp: 2_000_000_000 } as const;

export const BADGES = ['developer', 'moderator', 'tester', 'founder', 'contributor'] as const;
export const ROLES = ['admin', 'moderator'] as const;

export async function audit(db: Queryable, actorId: string, action: string, targetUserId: string | null, details: unknown) {
  await db.query('insert into admin_audit_log (actor_id, action, target_user_id, details) values ($1, $2, $3, $4::jsonb)', [
    actorId,
    action,
    targetUserId,
    JSON.stringify(details ?? {}),
  ]);
}

const uuid = z.string().uuid();
const kind = z.enum(['normal', 'true_player']);
const reason = z.string().trim().max(200).optional();
/** Whole, non-zero, bounded. JSON cannot carry NaN or Infinity, and `int` rejects decimals and strings. */
const delta = (max: number) =>
  z
    .number()
    .int()
    .min(-max)
    .max(max)
    .refine((n) => n !== 0, 'Amount must not be 0.');

export const adminActionSchema = z.discriminatedUnion('action', [
  // requestId (client UUID) makes a double-click or retry apply once.
  z.object({ action: z.literal('adjust-xp'), userId: uuid, amount: delta(ADMIN_LIMITS.xpPerAdjustment), reason, requestId: uuid.optional() }),
  z.object({ action: z.literal('adjust-streak'), userId: uuid, kind, amount: delta(ADMIN_LIMITS.streakPerAdjustment), reason }),
  z.object({ action: z.literal('set-xp-frozen'), userId: uuid, on: z.boolean(), reason }),
  z.object({ action: z.literal('delete-account'), userId: uuid, confirmHandle: z.string().max(40) }),
  z.object({ action: z.literal('unlock-achievement'), userId: uuid, achievementId: z.string().max(64) }),
  z.object({ action: z.literal('complete-daily-set'), userId: uuid }),
  z.object({ action: z.literal('break-streak'), userId: uuid, kind }),
  z.object({ action: z.literal('repair-streak'), userId: uuid, kind }),
  z.object({ action: z.literal('grant-card'), userId: uuid }),
  z.object({ action: z.literal('reset-daily-state'), userId: uuid }),
  z.object({ action: z.literal('set-badge'), userId: uuid, badge: z.enum(BADGES), on: z.boolean() }),
  z.object({ action: z.literal('set-role'), userId: uuid, role: z.enum(ROLES), on: z.boolean() }),
  z.object({ action: z.literal('set-leaderboard-excluded'), userId: uuid, on: z.boolean() }),
  z.object({ action: z.literal('apply-developer-showcase') }),
  z.object({
    action: z.literal('generate-puzzle'),
    game: z.enum(GAME_IDS),
    difficulty: z.enum(DIFFICULTIES),
    seed: z.string().max(100).optional(),
  }),
]);
export type AdminAction = z.infer<typeof adminActionSchema>;

/** Executes an admin/developer action. Caller must already have verified the admin role. */
export async function runAdminAction(db: Db, actorId: string, input: AdminAction, now: Date): Promise<unknown> {
  const today = toUtcDate(now);
  const target = 'userId' in input ? input.userId : null;
  if (target && !(await maybeOne(db, 'select 1 from users where id = $1', [target]))) throw new PlayError('User not found.', 404);
  if (input.action === 'set-role' && input.userId === actorId && !input.on)
    throw new PlayError('You cannot remove your own admin role here.', 409);

  let result: unknown = { ok: true };
  // Actions that write their own, richer audit row inside their transaction.
  let audited = false;
  switch (input.action) {
    case 'adjust-xp':
      audited = true;
      result = await db.tx(async (tx) => {
        const stats = await ensureStats(tx, input.userId); // row-locked
        const before = stats.total_xp;
        const after = before + input.amount;
        if (after < 0) throw new PlayError(`Cannot remove ${(-input.amount).toLocaleString('en-US')} XP: the player has ${before.toLocaleString('en-US')}.`, 409);
        if (after > ADMIN_LIMITS.maxTotalXp) throw new PlayError('That would exceed the maximum total XP.', 409);
        // Manual adjustments go through the ledger like every award, and ignore an XP freeze.
        const applied = await awardXp(tx, input.userId, input.amount, 'admin', `admin-xp:${input.requestId ?? randomUUID()}`, { bypassFreeze: true });
        if (!applied) return { repeated: true, totalXp: before };
        await audit(tx, actorId, input.amount > 0 ? 'xp-add' : 'xp-remove', input.userId, {
          amount: input.amount,
          before,
          after,
          xpFrozen: stats.xp_frozen,
          reason: input.reason || null,
        });
        // Additions can satisfy XP achievements; achievements are never revoked.
        if (input.amount > 0) await evaluateAchievements(tx, input.userId, today, null, []);
        return { repeated: false, totalXp: (await one<{ total_xp: number }>(tx, 'select total_xp from user_stats where user_id = $1', [input.userId])).total_xp };
      });
      break;
    case 'adjust-streak':
      audited = true;
      result = await db.tx(async (tx) => {
        const s = await loadStreak(tx, input.userId, input.kind, true);
        const before = viewStreak(s, today).current;
        const next = adjustStreak(s, input.amount, today);
        if (!next) throw new PlayError(`Cannot remove ${-input.amount} days: the streak is ${before}.`, 409);
        await saveStreak(tx, input.userId, input.kind, next);
        const after = viewStreak(next, today).current;
        await audit(tx, actorId, 'streak-adjust', input.userId, { kind: input.kind, amount: input.amount, before, after, reason: input.reason || null });
        await evaluateAchievements(tx, input.userId, today, null, []);
        return { before, after };
      });
      break;
    case 'set-xp-frozen':
      audited = true;
      result = await db.tx(async (tx) => {
        const stats = await ensureStats(tx, input.userId);
        if (stats.xp_frozen === input.on) return { xpFrozen: input.on, changed: false };
        await tx.query('update user_stats set xp_frozen = $2, xp_freeze_changed_at = now(), xp_freeze_changed_by = $3 where user_id = $1', [
          input.userId,
          input.on,
          actorId,
        ]);
        await audit(tx, actorId, input.on ? 'xp-freeze' : 'xp-unfreeze', input.userId, { totalXp: stats.total_xp, reason: input.reason || null });
        return { xpFrozen: input.on, changed: true };
      });
      break;
    case 'delete-account':
      audited = true;
      result = await deleteAccountAsAdmin(db, actorId, input.userId, input.confirmHandle);
      break;
    case 'unlock-achievement': {
      const def = ACHIEVEMENTS_BY_ID.get(input.achievementId);
      if (!def) throw new PlayError('Unknown achievement.', 404);
      await db.tx(async (tx) => {
        await ensureStats(tx, input.userId);
        const ins = await tx.query('insert into achievement_unlocks (user_id, achievement_id, xp) values ($1, $2, $3) on conflict do nothing returning 1', [
          input.userId,
          def.id,
          def.xp,
        ]);
        if (ins.length) {
          await awardXp(tx, input.userId, def.xp, 'achievement', `achievement:${def.id}`);
          await notify(tx, input.userId, { kind: 'achievement', title: def.name, body: def.description, xp: def.xp, data: { achievementId: def.id, icon: def.icon } });
        }
      });
      break;
    }
    case 'complete-daily-set': {
      let completed = 0;
      for (const game of GAME_IDS) {
        const view = await startSession(db, { userId: input.userId, game, mode: 'daily', now });
        if (view.status === 'completed') continue;
        // Back-date the start so the plausibility floor does not block the tool.
        await db.query(`update game_sessions set started_at = $2::timestamptz where id = $1`, [view.id, new Date(now.getTime() - 5 * 60_000).toISOString()]);
        const { solution, data } = await one<{ solution: unknown; data: unknown }>(
          db,
          'select p.solution, p.data from game_sessions s join puzzles p on p.id = s.puzzle_id where s.id = $1',
          [view.id],
        );
        let solved = false;
        for (const action of winningActionsFor(game, solution, data)) solved = (await actOnSession(db, input.userId, view.id, action, now)).solved;
        if (solved) completed++;
      }
      result = { completed };
      break;
    }
    case 'break-streak':
      await db.tx(async (tx) => {
        const s = await loadStreak(tx, input.userId, input.kind, true);
        if (!s.lastDate || s.current === 0) throw new PlayError('That streak is not active.', 409);
        // Leave the streak lapsed (last played 3 days ago) so it is repairable.
        await saveStreak(tx, input.userId, input.kind, { ...s, lastDate: addDays(today, -3) });
      });
      break;
    case 'repair-streak':
      await db.tx(async (tx) => {
        const s = await loadStreak(tx, input.userId, input.kind, true);
        const fixed = repairStreak(s, today);
        if (!fixed) throw new PlayError('Nothing to repair.', 409);
        await saveStreak(tx, input.userId, input.kind, fixed);
      });
      break;
    case 'grant-card':
      await db.tx(async (tx) => {
        const s = await ensureStats(tx, input.userId);
        if (s.cards_held >= REPAIR_CARDS.maxCards) throw new PlayError('Pocket already full.', 409);
        await tx.query('update user_stats set cards_held = cards_held + 1 where user_id = $1', [input.userId]);
        await tx.query(`insert into card_events (user_id, kind, source, idempotency_key) values ($1, 'admin_adjust', 'admin', $2)`, [
          input.userId,
          `admin:${randomUUID()}`,
        ]);
      });
      break;
    case 'reset-daily-state':
      // Testing tool: removes today's Daily sessions/completions so the set can be replayed.
      // XP already awarded stays in the ledger; once-per-day bonuses will not repeat.
      await db.tx(async (tx) => {
        await tx.query(`delete from game_sessions where user_id = $1 and mode = 'daily' and daily_date = $2`, [input.userId, today]);
        await tx.query(`update daily_activity set daily_completed = 0, daily_order = '{}' where user_id = $1 and utc_date = $2`, [input.userId, today]);
      });
      break;
    case 'set-badge':
      if (input.on) await db.query('insert into user_badges (user_id, badge) values ($1, $2) on conflict do nothing', [input.userId, input.badge]);
      else await db.query('delete from user_badges where user_id = $1 and badge = $2', [input.userId, input.badge]);
      break;
    case 'set-role':
      if (input.on)
        await db.query('insert into user_roles (user_id, role, granted_by) values ($1, $2, $3) on conflict do nothing', [input.userId, input.role, actorId]);
      else await db.query('delete from user_roles where user_id = $1 and role = $2', [input.userId, input.role]);
      break;
    case 'set-leaderboard-excluded':
      await db.query('update users set leaderboard_excluded = $2 where id = $1', [input.userId, input.on]);
      break;
    case 'apply-developer-showcase':
      result = await applyDeveloperShowcase(db, now);
      break;
    case 'generate-puzzle': {
      const seed = input.seed || `admin-preview:${randomUUID()}`;
      const { puzzle, solution } = ENGINES[input.game].generate(createRng(seed), input.difficulty);
      result = { seed, puzzle, solution };
      break;
    }
  }
  if (!audited) await audit(db, actorId, input.action, target, input);
  return result;
}

/**
 * Administrative hard delete (no target password needed). The account and
 * all of its player data go, through the same purge as self-deletion; the
 * audit row survives with a minimal snapshot (no email, no secrets).
 * Guards: never yourself, never the configured developer account, never
 * the last admin, and the caller must retype the target's handle.
 */
async function deleteAccountAsAdmin(db: Db, actorId: string, userId: string, confirmHandle: string) {
  if (userId === actorId) throw new PlayError('You cannot delete your own account from the admin dashboard.', 409);
  return db.tx(async (tx) => {
    const u = await maybeOne<{ id: string; handle: string; display_name: string; is_guest: boolean; created_at: Date }>(
      tx,
      'select id, handle, display_name, is_guest, created_at from users where id = $1 for update',
      [userId],
    );
    if (!u) throw new PlayError('User not found.', 404);
    if (confirmHandle.trim().toLowerCase().replace(/^@/, '') !== u.handle) throw new PlayError(`Type the handle @${u.handle} to confirm.`, 400);
    if (u.handle === DEVELOPER.handle)
      throw new PlayError(`@${u.handle} is the protected developer account. Change DEVELOPER.handle in src/config/site.ts before deleting it.`, 409);
    const roles = (await tx.query<{ role: string }>('select role from user_roles where user_id = $1', [userId])).map((r) => r.role);
    if (roles.includes('admin')) {
      const admins = await tx.query(`select user_id from user_roles where role = 'admin' for update`);
      if (admins.length <= 1) throw new PlayError('Cannot delete the last administrator.', 409);
    }
    const stats = await maybeOne<{ total_xp: number }>(tx, 'select total_xp from user_stats where user_id = $1', [userId]);
    // Written before the delete; the FK then nulls target_user_id, so the snapshot keeps the record readable.
    await audit(tx, actorId, 'delete-account', userId, {
      deletedUserId: u.id,
      handle: u.handle,
      displayName: u.display_name,
      isGuest: u.is_guest,
      roles,
      totalXp: stats?.total_xp ?? 0,
      createdAt: new Date(u.created_at).toISOString(),
    });
    await purgeUser(tx, userId);
    return { deleted: true, handle: u.handle };
  });
}

export async function adminOverview(db: Queryable, now: Date) {
  const today = toUtcDate(now);
  const n = async (sql: string, params: unknown[] = []) => (await one<{ n: number }>(db, sql, params)).n;
  return {
    members: await n('select count(*)::int n from users where not is_guest'),
    guests: await n('select count(*)::int n from users where is_guest'),
    completionsToday: await n('select count(*)::int n from completions where utc_date = $1', [today]),
    dailyCompletionsToday: await n(`select count(*)::int n from completions where daily_date = $1`, [today]),
    truePlayersToday: await n('select count(*)::int n from daily_activity where utc_date = $1 and daily_completed = 8', [today]),
    activeSessions: await n(`select count(*)::int n from game_sessions where status = 'active'`),
    dailySets: await n('select count(*)::int n from daily_sets'),
  };
}

interface StreakCols {
  current: number;
  best: number;
  last_date: string | null;
  lost_value: number;
  lost_last_date: string | null;
}

export async function adminSearchUsers(db: Queryable, q: string, now: Date) {
  const term = `%${q.trim().toLowerCase().replace(/[%_]/g, '')}%`;
  const today = toUtcDate(now);
  const rows = await db.query<{
    id: string;
    handle: string;
    display_name: string;
    email: string | null;
    is_guest: boolean;
    total_xp: number | null;
    cards_held: number | null;
    xp_frozen: boolean | null;
    xp_freeze_changed_at: Date | null;
    roles: string[];
    badges: string[];
    leaderboard_excluded: boolean;
    normal: StreakCols | null;
    true_player: StreakCols | null;
  }>(
    `select u.id, u.handle, u.display_name, u.email, u.is_guest, st.total_xp, st.cards_held, st.xp_frozen, st.xp_freeze_changed_at, u.leaderboard_excluded,
       coalesce((select array_agg(role) from user_roles r where r.user_id = u.id), '{}') roles,
       coalesce((select array_agg(badge) from user_badges b where b.user_id = u.id), '{}') badges,
       (select row_to_json(s) from (select current, best, last_date, lost_value, lost_last_date from streaks where user_id = u.id and kind = 'normal') s) normal,
       (select row_to_json(s) from (select current, best, last_date, lost_value, lost_last_date from streaks where user_id = u.id and kind = 'true_player') s) true_player
     from users u left join user_stats st on st.user_id = u.id
     where $1 = '%%' or u.handle like $1 or lower(coalesce(u.email, '')) like $1 or lower(u.display_name) like $1
     order by u.is_guest, u.created_at desc limit 25`,
    [term],
  );
  const view = (s: StreakCols | null) =>
    viewStreak(s ? { current: s.current, best: s.best, lastDate: s.last_date, lostValue: s.lost_value, lostLastDate: s.lost_last_date } : { current: 0, best: 0, lastDate: null, lostValue: 0, lostLastDate: null }, today);
  return rows.map(({ normal, true_player, ...u }) => ({
    ...u,
    total_xp: u.total_xp ?? 0,
    cards_held: u.cards_held ?? 0,
    xp_frozen: !!u.xp_frozen,
    streaks: { normal: view(normal), truePlayer: view(true_player) },
  }));
}

export async function adminAuditLog(db: Queryable, limit = 50) {
  return db.query<{ id: string; action: string; created_at: Date; details: unknown; actor: string | null; target: string | null }>(
    `select a.id, a.action, a.created_at, a.details, au.handle actor, tu.handle target
     from admin_audit_log a left join users au on au.id = a.actor_id left join users tu on tu.id = a.target_user_id
     order by a.created_at desc limit $1`,
    [limit],
  );
}
