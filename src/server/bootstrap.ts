import 'server-only';
import { DEVELOPER } from '@/config/site';
import type { Db } from '@/lib/db';
import { audit } from './audit';
import { applyDeveloperShowcase } from './developer';

export const bootstrapAdminEmails = () =>
  (process.env.GAMEHUB_BOOTSTRAP_ADMINS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

/**
 * First-admin bootstrap. GAMEHUB_BOOTSTRAP_ADMINS is a comma-separated list
 * of emails set by the operator in server environment variables (never by
 * users or client code). A member account with a listed email gets, on
 * sign-up or sign-in:
 *   - the `admin` role in user_roles (the only source of permissions), and
 *   - the cosmetic `developer` badge.
 * If that account is also the configured developer account
 * (DEVELOPER.handle), the developer showcase (maximum progression,
 * leaderboard exclusion) is applied once, when the role is first granted,
 * so later sign-ins never overwrite real progress.
 */
export async function applyBootstrapAdmin(db: Db, user: { id: string; email: string | null; is_guest: boolean; handle: string }) {
  const list = bootstrapAdminEmails();
  if (!list.length || user.is_guest || !user.email || !list.includes(user.email.toLowerCase())) return { granted: false };
  const rows = await db.query(`insert into user_roles (user_id, role) values ($1, 'admin') on conflict do nothing returning 1`, [user.id]);
  await db.query(`insert into user_badges (user_id, badge) values ($1, 'developer') on conflict do nothing`, [user.id]);
  if (!rows.length) return { granted: false };
  await audit(db, user.id, 'bootstrap-admin', user.id, { via: 'GAMEHUB_BOOTSTRAP_ADMINS' });
  if (user.handle === DEVELOPER.handle) {
    await applyDeveloperShowcase(db, new Date());
    await audit(db, user.id, 'apply-developer-showcase', user.id, { via: 'bootstrap' });
  }
  return { granted: true };
}
