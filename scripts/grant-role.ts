// Grants or revokes an authorization role for an existing member account.
//   DATABASE_URL=... npm run admin:grant -- someone@example.com admin
//   DATABASE_URL=... npm run admin:grant -- someone@example.com admin --revoke
// Without DATABASE_URL it targets the local PGlite database (stop `npm run dev` first).
import path from 'node:path';

const [email, role = 'admin', flag] = process.argv.slice(2);
if (!email || !['admin', 'moderator'].includes(role)) {
  console.error('Usage: npm run admin:grant -- <email> [admin|moderator] [--revoke]');
  process.exit(1);
}
const revoke = flag === '--revoke';

let query: (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;
let close: () => Promise<void>;
if (process.env.DATABASE_URL) {
  const { default: postgres } = await import('postgres');
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  query = async (q, p) => (await sql.unsafe(q, p as never[])) as unknown as Record<string, unknown>[];
  close = () => sql.end();
} else {
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = new PGlite(process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), '.data', 'pglite'));
  query = async (q, p) => (await pg.query(q, p)).rows as Record<string, unknown>[];
  close = () => pg.close();
}

const [user] = await query('select id, handle from users where lower(email) = lower($1) and not is_guest', [email]);
if (!user) {
  console.error(`No member account with email ${email}.`);
  process.exit(1);
}
if (revoke) await query('delete from user_roles where user_id = $1 and role = $2', [user.id, role]);
else await query('insert into user_roles (user_id, role) values ($1, $2) on conflict do nothing', [user.id, role]);
await query(`insert into admin_audit_log (actor_id, action, target_user_id, details) values (null, $1, $2, $3::jsonb)`, [
  revoke ? 'cli-revoke-role' : 'cli-grant-role',
  user.id,
  JSON.stringify({ role, via: 'scripts/grant-role.ts' }),
]);
console.log(`${revoke ? 'Revoked' : 'Granted'} ${role} for @${user.handle}.`);
await close();
