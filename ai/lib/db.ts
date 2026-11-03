import fs from 'node:fs';
import { createPgliteDb, postgresClientOptions, wrapPostgres, type Db, type Queryable } from '@/lib/db';
import { readOnlyQueryable } from '../mcp-server/guard';
import { paths } from './config';

/**
 * Read-only database access for the AI layer (security layer 3).
 *
 * - Postgres / Supabase (AI_DATABASE_URL): a separate small pool opened with
 *   default_transaction_read_only = on. Uses the same driver options as the
 *   web app (prepare:false, jsonb handling).
 * - Local demo (PGlite): the demo database written by `npm run ai:seed`,
 *   switched to read-only for the whole connection.
 *
 * Either way `withReadOnly` additionally wraps each call in an explicit
 * READ ONLY transaction (needed behind Supabase's transaction pooler, which
 * does not forward connection settings) and hands the caller a SQL-guarded
 * Queryable (layer 2).
 */
export interface AiDb {
  /** Runs `fn` in a READ ONLY transaction with a SELECT-only Queryable. */
  withReadOnly<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  describe: string;
  close(): Promise<void>;
}

export function aiDbFrom(db: Db, describe: string): AiDb {
  return {
    describe,
    withReadOnly: (fn) =>
      db.tx(async (tx) => {
        await tx.query('set transaction read only');
        return fn(readOnlyQueryable(tx));
      }),
    close: () => db.close(),
  };
}

export async function openAiDb(): Promise<AiDb> {
  const url = process.env.AI_DATABASE_URL;
  if (url) {
    const { default: postgres } = await import('postgres');
    const sql = postgres(url, {
      ...postgresClientOptions,
      max: 3,
      idle_timeout: 20,
      connection: { default_transaction_read_only: true, application_name: 'gamehub-mcp' },
    });
    const db: Db = {
      ...wrapPostgres(sql),
      tx: (fn) => sql.begin((tx) => fn(wrapPostgres(tx))) as Promise<never>,
      exec: async () => {
        throw new Error('exec is not available on the read-only AI connection');
      },
      close: () => sql.end(),
    };
    let host = 'postgres';
    try {
      host = new URL(url).hostname;
    } catch {
      /* keep generic label; never log the URL itself */
    }
    return aiDbFrom(db, `postgres (${host}, read-only)`);
  }
  if (!fs.existsSync(paths.pgliteDir)) throw new Error(`No demo database at ${paths.pgliteDir}. Run "npm run ai:seed" first, or set AI_DATABASE_URL.`);
  const db = await createPgliteDb(paths.pgliteDir);
  const ok = await db.query("select 1 from information_schema.tables where table_name = 'user_stats'");
  if (!ok.length) throw new Error('Demo database has no GameHub schema. Run "npm run ai:seed".');
  await db.exec('set default_transaction_read_only = on');
  return aiDbFrom(db, 'pglite demo database (read-only)');
}
