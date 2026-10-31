// Applies pending SQL migrations from db/migrations in order.
//   DATABASE_URL=postgres://... npm run db:migrate     (Supabase / any Postgres)
//   npm run db:migrate                                   (local PGlite in .data/pglite)
// Mirrors migrate() in src/lib/db/index.ts. Each file runs in one transaction.
import fs from 'node:fs';
import path from 'node:path';

type Exec = { query: (sql: string, params?: unknown[]) => Promise<unknown[]>; tx: (fn: (q: Exec['query']) => Promise<void>) => Promise<void>; close: () => Promise<void> };

async function connect(): Promise<Exec> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import('postgres');
    const sql = postgres(url, { prepare: false, max: 1 });
    return {
      query: async (q, p = []) => (await sql.unsafe(q, p as never[])) as unknown[],
      tx: async (fn) => {
        await sql.begin(async (t) => fn(async (q, p = []) => (await t.unsafe(q, p as never[])) as unknown[]));
      },
      close: () => sql.end(),
    };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), '.data', 'pglite');
  fs.mkdirSync(dir, { recursive: true });
  const pg = new PGlite(dir);
  return {
    query: async (q, p) => (await pg.query(q, p)).rows,
    tx: async (fn) => {
      await pg.transaction(async (t) => fn(async (q, p) => (await t.query(q, p)).rows));
    },
    close: () => pg.close(),
  };
}

function splitSql(script: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (let i = 0; i < script.length; ) {
    const rest = script.slice(i);
    if (rest.startsWith('--')) {
      const end = script.indexOf('\n', i);
      i = end === -1 ? script.length : end + 1;
      cur += '\n';
      continue;
    }
    const dollar = /^\$[a-zA-Z_]*\$/.exec(rest);
    if (dollar) {
      const end = script.indexOf(dollar[0], i + dollar[0].length);
      const stop = end === -1 ? script.length : end + dollar[0].length;
      cur += script.slice(i, stop);
      i = stop;
      continue;
    }
    if (script[i] === "'") {
      let j = i + 1;
      while (j < script.length && !(script[j] === "'" && script[j + 1] !== "'")) j += script[j] === "'" ? 2 : 1;
      cur += script.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (script[i] === ';') {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
      i++;
      continue;
    }
    cur += script[i++];
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const db = await connect();
const dir = path.join(process.cwd(), 'db', 'migrations');
await db.query('create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())');
const done = new Set(((await db.query('select version from schema_migrations')) as { version: string }[]).map((r) => r.version));
const files = fs.readdirSync(dir).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
let applied = 0;
for (const f of files) {
  const version = f.replace(/\.sql$/, '');
  if (done.has(version)) continue;
  await db.tx(async (q) => {
    await q('select pg_advisory_xact_lock(724001)');
    for (const stmt of splitSql(fs.readFileSync(path.join(dir, f), 'utf8'))) await q(stmt);
    await q('insert into schema_migrations (version) values ($1)', [version]);
  });
  console.log(`applied ${version}`);
  applied++;
}
console.log(applied ? `${applied} migration(s) applied.` : 'Database is up to date.');
await db.close();
