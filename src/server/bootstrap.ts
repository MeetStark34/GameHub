import 'server-only';
import type { Queryable } from '@/lib/db';
import { audit } from './admin';

/**
 * First-admin bootstrap. GAMEHUB_BOOTSTRAP_ADMINS is a comma-separated list
 * of emails set by the operator in server environment variables (never by
 * users). A member whose verified-login email is on the list is granted the
 * admin role on sign-up or sign-in. Remove the variable once real admins
 * exist; roles can then be managed from /admin or `npm run admin:grant`.
 */
export async function applyBootstrapAdmin(db: Queryable, user: { id: string; email: string | null; is_guest: boolean }) {
  const list = (process.env.GAMEHUB_BOOTSTRAP_ADMINS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!list.length || user.is_guest || !user.email || !list.includes(user.email.toLowerCase())) return;
  const rows = await db.query(`insert into user_roles (user_id, role) values ($1, 'admin') on conflict do nothing returning 1`, [user.id]);
  if (rows.length) await audit(db, user.id, 'bootstrap-admin', user.id, { email: user.email });
}
