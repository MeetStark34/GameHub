import { describe, expect, it } from 'vitest';

/**
 * Opt-in check against the real Supabase database (never runs by default):
 *   npm run test:ai:live
 * Only SELECTs and zero-row writes (`where false`) are sent; the writes must be refused.
 */
const url = process.env.DATABASE_URL;
const live = process.env.LIVE_DB === '1' && !!url;

describe.skipIf(!live)('AI connection on Supabase is read-only', () => {
  it('the AI layer reads but every write path is refused', async () => {
    process.env.AI_DATABASE_URL = url;
    const { openAiDb } = await import('../lib/db');
    const db = await openAiDb();
    try {
      const [r] = await db.withReadOnly((q) => q.query<{ n: number }>('select count(*)::int n from user_stats'));
      expect(r.n).toBeGreaterThanOrEqual(0);
      // Layer 2 (guard) refuses before sending.
      await expect(db.withReadOnly((q) => q.query('update user_stats set total_xp = total_xp where false'))).rejects.toThrow(/Only SELECT/);
    } finally {
      await db.close();
    }
    // Layer 3 alone (Postgres READ ONLY transaction), through Supabase's pooler.
    const { default: postgres } = await import('postgres');
    const sql = postgres(url!, { prepare: false, max: 1 });
    try {
      await expect(
        sql.begin(async (tx) => {
          await tx.unsafe('set transaction read only');
          await tx.unsafe('update user_stats set total_xp = total_xp where false');
        }),
      ).rejects.toThrow(/read-only transaction/);
    } finally {
      await sql.end();
    }
  });
});
