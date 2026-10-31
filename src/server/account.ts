import 'server-only';
import { z } from 'zod';
import { THEME_IDS } from '@/config/themes';
import { LOCALES } from '@/i18n/config';
import { maybeOne, type Db, type Queryable } from '@/lib/db';
import { AuthError, verifyPassword } from './users';

export const settingsSchema = z
  .object({
    displayName: z.string().trim().min(1).max(40),
    title: z.string().trim().max(40).nullable(),
    profilePublic: z.boolean(),
    showOnLeaderboards: z.boolean(),
    theme: z.enum(THEME_IDS),
    soundEnabled: z.boolean(),
    language: z.enum(LOCALES.map((l) => l.code) as [string, ...string[]]),
  })
  .partial();

export type SettingsInput = z.infer<typeof settingsSchema>;

export async function updateSettings(db: Db, userId: string, input: SettingsInput): Promise<void> {
  await db.tx(async (tx) => {
    const u: string[] = [];
    const params: unknown[] = [userId];
    const set = (col: string, v: unknown) => {
      params.push(v);
      u.push(`${col} = $${params.length}`);
    };
    if (input.displayName !== undefined) set('display_name', input.displayName);
    if (input.title !== undefined) set('title', input.title || null);
    if (input.profilePublic !== undefined) set('profile_public', input.profilePublic);
    if (input.showOnLeaderboards !== undefined) set('show_on_leaderboards', input.showOnLeaderboards);
    if (u.length) await tx.query(`update users set ${u.join(', ')} where id = $1`, params);
    if (input.theme !== undefined || input.soundEnabled !== undefined || input.language !== undefined) {
      await tx.query(
        `insert into preferences (user_id, theme, sound_enabled, language) values ($1, coalesce($2, 'system'), coalesce($3, true), $4)
         on conflict (user_id) do update set theme = coalesce($2, preferences.theme),
           sound_enabled = coalesce($3, preferences.sound_enabled),
           language = coalesce($4, preferences.language), updated_at = now()`,
        [userId, input.theme ?? null, input.soundEnabled ?? null, input.language ?? null],
      );
    }
  });
}

export async function getPreferences(db: Queryable, userId: string) {
  return maybeOne<{ theme: string; sound_enabled: boolean; language: string | null }>(db, 'select theme, sound_enabled, language from preferences where user_id = $1', [userId]);
}

/** Everything we store about a player, as JSON. Password hashes and session ids are excluded. */
export async function exportUserData(db: Queryable, userId: string) {
  const q = (sql: string) => db.query(sql, [userId]);
  const [profile] = await q(
    'select id, handle, display_name, email, is_guest, title, profile_public, show_on_leaderboards, created_at from users where id = $1',
  );
  return {
    exportedAt: new Date().toISOString(),
    profile,
    preferences: await q('select theme, sound_enabled, language, updated_at from preferences where user_id = $1'),
    stats: await q('select * from user_stats where user_id = $1'),
    streaks: await q('select kind, current, best, last_date, lost_value, lost_last_date from streaks where user_id = $1'),
    mastery: await q('select game, xp, completions, best_score, best_time_ms from mastery where user_id = $1'),
    badges: await q('select badge, granted_at from user_badges where user_id = $1'),
    roles: await q('select role, granted_at from user_roles where user_id = $1'),
    achievements: await q('select achievement_id, xp, unlocked_at from achievement_unlocks where user_id = $1 order by unlocked_at'),
    completions: await q(
      'select game, difficulty, mode, daily_date, utc_date, duration_ms, score, perfect, xp_awarded, completed_at from completions where user_id = $1 order by completed_at',
    ),
    xpLedger: await q('select amount, reason, idempotency_key, created_at from xp_ledger where user_id = $1 order by created_at'),
    cardEvents: await q('select kind, source, streak_kind, created_at from card_events where user_id = $1 order by created_at'),
    dailyActivity: await q('select * from daily_activity where user_id = $1 order by utc_date'),
    notifications: await q('select kind, title, body, created_at, read_at from notifications where user_id = $1 order by created_at'),
  };
}

/**
 * Permanently deletes the account and all personal data (FK cascades).
 * Members must confirm with their password; guests by typing their handle.
 */
export async function deleteAccount(db: Db, userId: string, confirm: { handle: string; password?: string }) {
  const user = await maybeOne<{ handle: string; is_guest: boolean; password_hash: string | null }>(
    db,
    'select handle, is_guest, password_hash from users where id = $1',
    [userId],
  );
  if (!user) throw new AuthError('errors.accountNotFound', 404);
  if (confirm.handle.trim().toLowerCase() !== user.handle) throw new AuthError('errors.confirmHandle');
  if (!user.is_guest && !(confirm.password && user.password_hash && (await verifyPassword(confirm.password, user.password_hash))))
    throw new AuthError('errors.wrongPassword', 403);
  await db.tx(async (tx) => {
    // Puzzles for Unlimited sessions are personal; Daily puzzles are shared and kept.
    const puzzles = await tx.query<{ puzzle_id: string }>(`select puzzle_id from game_sessions where user_id = $1 and mode = 'unlimited'`, [userId]);
    await tx.query('delete from users where id = $1', [userId]);
    if (puzzles.length)
      await tx.query(`delete from puzzles where mode = 'unlimited' and id = any($1::uuid[])`, [puzzles.map((p) => p.puzzle_id)]);
  });
}
