import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Minimal database interface over two drivers:
 *  - `postgres` (postgres.js) when DATABASE_URL is set (Supabase in production);
 *  - embedded PGlite (real Postgres compiled to WASM) for local dev and tests.
 * All application SQL is plain Postgres and runs unchanged on both.
 */
export type Row = Record<string, unknown>;

export interface Queryable {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
}

export interface Db extends Queryable {
  /** Runs `fn` in a single transaction; rolls back if it throws. */
  tx<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  /** Executes a multi-statement script without parameters. */
  exec(script: string): Promise<void>;
  close(): Promise<void>;
}

export async function one<T = Row>(q: Queryable, text: string, params?: unknown[]): Promise<T> {
  const rows = await q.query<T>(text, params);
  if (rows.length !== 1) throw new Error(`Expected 1 row, got ${rows.length}`);
  return rows[0];
}

export async function maybeOne<T = Row>(q: Queryable, text: string, params?: unknown[]): Promise<T | null> {
  const rows = await q.query<T>(text, params);
  return rows[0] ?? null;
}

export async function createPgliteDb(dataDir?: string): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite');
  if (dataDir) fs.mkdirSync(/* turbopackIgnore: true */ dataDir, { recursive: true });
  const pg = dataDir ? new PGlite(dataDir) : new PGlite();
  await pg.waitReady;
  const wrap = (q: { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }): Queryable => ({
    query: async <T,>(text: string, params?: unknown[]) => (await q.query(text, params)).rows as T[],
  });
  return {
    ...wrap(pg),
    tx: (fn) => pg.transaction((tx) => fn(wrap(tx))),
    exec: async (script) => {
      await pg.exec(script);
    },
    close: () => pg.close(),
  };
}

export async function createPostgresDb(url: string): Promise<Db> {
  const { default: postgres } = await import('postgres');
  // prepare:false keeps us compatible with Supabase's transaction pooler.
  const sql = postgres(url, { prepare: false, max: Number(process.env.DB_POOL_MAX ?? 5), idle_timeout: 20 });
  type Unsafe = { unsafe: (text: string, params?: never[]) => PromiseLike<unknown> };
  const wrap = (s: Unsafe): Queryable => ({
    query: async <T,>(text: string, params?: unknown[]) => (await s.unsafe(text, (params ?? []) as never[])) as T[],
  });
  return {
    ...wrap(sql),
    tx: (fn) => sql.begin((tx) => fn(wrap(tx))) as Promise<never>,
    exec: async (script) => {
      await sql.unsafe(script);
    },
    close: () => sql.end(),
  };
}

// Included in the server bundle via outputFileTracingIncludes (next.config.ts).
const MIGRATIONS_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), 'db', 'migrations');

export function readMigrations(dir = MIGRATIONS_DIR): { version: string; sql: string }[] {
  return fs
    .readdirSync(/* turbopackIgnore: true */ dir)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort()
    .map((f) => ({ version: f.replace(/\.sql$/, ''), sql: fs.readFileSync(/* turbopackIgnore: true */ path.join(dir, f), 'utf8') }));
}

/** Applies pending migrations in order, each in its own transaction. */
export async function migrate(db: Db, dir = MIGRATIONS_DIR): Promise<string[]> {
  await db.exec(
    'create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())',
  );
  const done = new Set((await db.query<{ version: string }>('select version from schema_migrations')).map((r) => r.version));
  const applied: string[] = [];
  for (const m of readMigrations(dir)) {
    if (done.has(m.version)) continue;
    await db.tx(async (tx) => {
      await tx.query('select pg_advisory_xact_lock(724001)');
      const again = await tx.query('select 1 from schema_migrations where version = $1', [m.version]);
      if (again.length) return;
      for (const stmt of splitSql(m.sql)) await tx.query(stmt);
      await tx.query('insert into schema_migrations (version) values ($1)', [m.version]);
      applied.push(m.version);
    });
  }
  return applied;
}

/**
 * Splits a migration into statements, respecting quotes, comments and
 * dollar-quoted bodies, so each can run inside one transaction on both drivers.
 */
export function splitSql(script: string): string[] {
  const out: string[] = [];
  let cur = '';
  let i = 0;
  while (i < script.length) {
    const ch = script[i];
    const rest = script.slice(i);
    if (rest.startsWith('--')) {
      const end = script.indexOf('\n', i);
      i = end === -1 ? script.length : end + 1;
      cur += '\n';
      continue;
    }
    const dollar = /^\$[a-zA-Z_]*\$/.exec(rest);
    if (dollar) {
      const tag = dollar[0];
      const end = script.indexOf(tag, i + tag.length);
      const stop = end === -1 ? script.length : end + tag.length;
      cur += script.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === "'") {
      let j = i + 1;
      while (j < script.length && !(script[j] === "'" && script[j + 1] !== "'")) j += script[j] === "'" ? 2 : 1;
      cur += script.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === ';') {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

type DbGlobal = typeof globalThis & { __gamehubDb?: Promise<Db> };

/** Process-wide database handle (shared across Next.js module layers). */
export function getDb(): Promise<Db> {
  const g = globalThis as DbGlobal;
  if (!g.__gamehubDb) {
    g.__gamehubDb = (async () => {
      const url = process.env.DATABASE_URL;
      if (url) {
        const db = await createPostgresDb(url);
        if (process.env.DB_AUTO_MIGRATE === '1') await migrate(db);
        return db;
      }
      if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PGLITE_IN_PRODUCTION !== '1') {
        throw new Error('DATABASE_URL is required in production.');
      }
      const db = await createPgliteDb(process.env.PGLITE_DATA_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), '.data', 'pglite'));
      await migrate(db);
      return db;
    })().catch((err) => {
      g.__gamehubDb = undefined;
      throw err;
    });
  }
  return g.__gamehubDb;
}
