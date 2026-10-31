// Read-only inspection of the configured database. Prints schema and data
// shape facts only, never the connection string or any secret.
//   node scripts/db-inspect.mjs
import fs from 'node:fs';
import postgres from 'postgres';

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/^\s*DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!url) throw new Error('DATABASE_URL not set in .env.local');
const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 20 });

const q = async (label, query) => {
  try {
    const rows = await sql.unsafe(query);
    console.log(`\n## ${label}`);
    console.table(rows);
  } catch (e) {
    console.log(`\n## ${label}: ERROR ${e.code ?? ''} ${e.message}`);
  }
};

await q('migrations', 'select version, applied_at from schema_migrations order by version');
await q('tables', `select table_name from information_schema.tables where table_schema='public' order by 1`);
await q('row counts', `select 'users' t, count(*)::int n from users union all select 'auth_sessions', count(*) from auth_sessions
  union all select 'puzzles', count(*) from puzzles union all select 'game_sessions', count(*) from game_sessions
  union all select 'completions', count(*) from completions union all select 'xp_ledger', count(*) from xp_ledger
  union all select 'daily_sets', count(*) from daily_sets union all select 'daily_puzzle_history', count(*) from daily_puzzle_history
  union all select 'user_roles', count(*) from user_roles union all select 'user_badges', count(*) from user_badges`);
await q('jsonb shapes: puzzles.data', `select game, mode, jsonb_typeof(data) data_type, jsonb_typeof(solution) sol_type, count(*)::int n from puzzles group by 1,2,3,4 order by 1,2`);
await q('jsonb shapes: game_sessions.state', `select game, jsonb_typeof(state) state_type, status, count(*)::int n from game_sessions group by 1,2,3 order by 1`);
await q('jsonb shapes: completions.result', `select jsonb_typeof(result) t, count(*)::int n from completions group by 1`);
await q('jsonb shapes: notifications.data', `select jsonb_typeof(data) t, count(*)::int n from notifications group by 1`);
await q('sample zip data (first 160 chars)', `select left(data::text, 160) sample from puzzles where game='zip' limit 2`);
await q('users (no emails)', `select handle, is_guest, (email is not null) has_email, leaderboard_excluded, created_at from users order by created_at`);
await q('roles', `select u.handle, r.role from user_roles r join users u on u.id=r.user_id`);
await q('daily', `select utc_date, difficulty from daily_sets order by 1`);
await q('columns', `select table_name, column_name, data_type from information_schema.columns where table_schema='public'
  and table_name in ('preferences','users','daily_puzzles','daily_puzzle_history') order by 1, ordinal_position`);
await q('rls', `select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by 1`);
await sql.end();
