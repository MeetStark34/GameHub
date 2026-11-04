import 'server-only';
import type { Queryable } from '@/lib/db';

/**
 * Appends an admin audit row. Its own module so sign-in (bootstrap admin)
 * can audit without loading ./admin, which pulls in every game engine.
 */
export async function audit(db: Queryable, actorId: string, action: string, targetUserId: string | null, details: unknown) {
  await db.query('insert into admin_audit_log (actor_id, action, target_user_id, details) values ($1, $2, $3, $4::jsonb)', [
    actorId,
    action,
    targetUserId,
    JSON.stringify(details ?? {}),
  ]);
}
