// Runs a SQL file against DATABASE_URL as one simple-protocol script and
// prints the result of each statement. For one-off operational SQL (e.g.
// scripts/keep-warm.sql), not schema changes: those go in db/migrations.
//   node --env-file=.env.local scripts/apply-sql.mjs <file.sql>
import fs from 'node:fs';
import postgres from 'postgres';

const file = process.argv[2];
if (!file) throw new Error('usage: node --env-file=.env.local scripts/apply-sql.mjs <file.sql>');
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const sql = postgres(url, { prepare: false, max: 1, max_pipeline: 1, connect_timeout: 20, onnotice: () => {} });
try {
  const results = await sql.unsafe(fs.readFileSync(file, 'utf8')).simple();
  // Several statements give an array of results; a single one gives its result.
  const list = results.length > 0 && Array.isArray(results[0]) ? results : [results];
  for (const r of list) console.log(r.command ?? '', r.count ?? '', JSON.stringify([...r]).slice(0, 200));
} finally {
  await sql.end();
}
