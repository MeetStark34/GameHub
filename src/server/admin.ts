import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ACHIEVEMENTS_BY_ID } from '@/config/achievements';
import { REPAIR_CARDS } from '@/config/economy';
import { maybeOne, one, type Db, type Queryable } from '@/lib/db';
import { repairStreak } from '@/lib/progression/streaks';
import { createRng } from '@/lib/rng';
import { addDays, toUtcDate } from '@/lib/time';
import { ENGINES } from '@/games/registry';
import { DIFFICULTIES, GAME_IDS } from '@/games/types';
import { actOnSession, PlayError, startSession } from './play';
import { awardXp, ensureStats, evaluateAchievements, loadStreak, notify, saveStreak } from './progress';
import { winningActionsFor } from './solutions';
import { applyDeveloperShowcase } from './developer';

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

export const adminActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('grant-xp'), userId: uuid, amount: z.number().int().min(-1_000_000).max(1_000_000) }),
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
  switch (input.action) {
    case 'grant-xp':
      await db.tx(async (tx) => {
        await ensureStats(tx, input.userId);
        await awardXp(tx, input.userId, input.amount, 'admin', `admin:${randomUUID()}`);
        await evaluateAchievements(tx, input.userId, today, null, []);
      });
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
  await audit(db, actorId, input.action, target, input);
  return result;
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

export async function adminSearchUsers(db: Queryable, q: string) {
  const term = `%${q.trim().toLowerCase().replace(/[%_]/g, '')}%`;
  return db.query<{ id: string; handle: string; display_name: string; email: string | null; is_guest: boolean; total_xp: number | null; roles: string[]; badges: string[]; leaderboard_excluded: boolean }>(
    `select u.id, u.handle, u.display_name, u.email, u.is_guest, st.total_xp, u.leaderboard_excluded,
       coalesce((select array_agg(role) from user_roles r where r.user_id = u.id), '{}') roles,
       coalesce((select array_agg(badge) from user_badges b where b.user_id = u.id), '{}') badges
     from users u left join user_stats st on st.user_id = u.id
     where $1 = '%%' or u.handle like $1 or lower(coalesce(u.email, '')) like $1 or lower(u.display_name) like $1
     order by u.is_guest, u.created_at desc limit 25`,
    [term],
  );
}

export async function adminAuditLog(db: Queryable, limit = 50) {
  return db.query<{ id: string; action: string; created_at: Date; details: unknown; actor: string | null; target: string | null }>(
    `select a.id, a.action, a.created_at, a.details, au.handle actor, tu.handle target
     from admin_audit_log a left join users au on au.id = a.actor_id left join users tu on tu.id = a.target_user_id
     order by a.created_at desc limit $1`,
    [limit],
  );
}
