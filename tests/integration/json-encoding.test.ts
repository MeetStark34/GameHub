import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { serializeJsonParam, splitSql, type Db } from '@/lib/db';
import { isValidClientPuzzle } from '@/games/client-schemas';
import { ENGINES } from '@/games/registry';
import { DIFFICULTIES, GAME_IDS } from '@/games/types';
import { createRng } from '@/lib/rng';
import { getSession, PlayError, startSession } from '@/server/play';
import { createGuest } from '@/server/users';
import { testDb } from '../helpers';

let db: Db;
beforeAll(async () => {
  db = await testDb();
});
afterAll(async () => {
  await db.close();
});

describe('json parameter encoding (the Supabase double-encoding bug)', () => {
  it('pre-serialized JSON text is sent as-is; objects are stringified once', () => {
    const doc = JSON.stringify({ size: 6, waypoints: [{ r: 0, c: 0, n: 1 }] });
    expect(serializeJsonParam(doc)).toBe(doc);
    expect(JSON.parse(serializeJsonParam({ a: 1 }))).toEqual({ a: 1 });
  });
});

describe('client puzzle contract', () => {
  for (const game of GAME_IDS)
    it(`${game}: toClient output matches its schema for every difficulty and mode`, () => {
      for (const difficulty of DIFFICULTIES)
        for (const mode of ['daily', 'unlimited'] as const) {
          const { puzzle } = ENGINES[game].generate(createRng(`contract-${game}-${difficulty}-${mode}`), difficulty, { mode });
          const roundTripped = JSON.parse(JSON.stringify(puzzle));
          const view = ENGINES[game].toClient(roundTripped, ENGINES[game].initialState(roundTripped));
          expect(isValidClientPuzzle(game, view), `${game} ${difficulty} ${mode}`).toBe(true);
        }
    });

  it('a double-encoded (string) puzzle is rejected, not rendered', () => {
    const { puzzle } = ENGINES.zip.generate(createRng('str'), 'easy');
    expect(isValidClientPuzzle('zip', JSON.stringify(puzzle))).toBe(false);
  });
});

describe('repair migration 0003', () => {
  it('a corrupted row fails loudly, and the migration restores it without data loss', async () => {
    const u = await createGuest(db);
    const now = new Date('2026-11-01T10:00:00Z');
    const view = await startSession(db, { userId: u.id, game: 'zip', mode: 'unlimited', difficulty: 'easy', now });
    const before = await db.query<{ data: unknown; state: unknown }>(
      'select p.data, s.state from game_sessions s join puzzles p on p.id = s.puzzle_id where s.id = $1',
      [view.id],
    );
    // Reproduce exactly what postgres.js stored: a JSON string containing the document.
    await db.query(`update puzzles set data = to_jsonb(data::text), solution = to_jsonb(solution::text) where id = (select puzzle_id from game_sessions where id = $1)`, [view.id]);
    await db.query(`update game_sessions set state = to_jsonb(state::text) where id = $1`, [view.id]);
    await expect(getSession(db, u.id, view.id, now)).rejects.toMatchObject({ message: 'errors.puzzleCorrupt', status: 500 });
    await expect(getSession(db, u.id, view.id, now)).rejects.toBeInstanceOf(PlayError);

    const migration = fs.readFileSync(path.join(process.cwd(), 'db/migrations/0003_repair_json_encoding.sql'), 'utf8');
    await db.tx(async (tx) => {
      for (const stmt of splitSql(migration)) await tx.query(stmt);
    });
    const after = await db.query<{ data: unknown; state: unknown }>(
      'select p.data, s.state from game_sessions s join puzzles p on p.id = s.puzzle_id where s.id = $1',
      [view.id],
    );
    expect(after).toEqual(before);
    const fixed = await getSession(db, u.id, view.id, now);
    expect((fixed.puzzle as { waypoints: unknown[] }).waypoints.length).toBeGreaterThanOrEqual(2);
    // Idempotent: running again changes nothing.
    await db.tx(async (tx) => {
      for (const stmt of splitSql(migration)) await tx.query(stmt);
    });
    expect(await db.query('select p.data, s.state from game_sessions s join puzzles p on p.id = s.puzzle_id where s.id = $1', [view.id])).toEqual(before);
  });

  it('leaves legitimately stored JSON strings (e.g. a Werd answer) alone', async () => {
    const [r] = await db.query<{ v: unknown }>(`select ('"crane"')::jsonb v`);
    expect(r.v).toBe('crane');
    await db.query(`create temp table t_json (v jsonb)`);
    await db.query(`insert into t_json values ('"crane"'::jsonb), (to_jsonb('"crane"'::text))`);
    await db.query(`create or replace function pg_temp.unwrap(v jsonb) returns jsonb language plpgsql as $$
      declare s text; begin if jsonb_typeof(v) <> 'string' then return v; end if; s := v #>> '{}';
      if left(s,1) not in ('{','[','"') then return v; end if; return s::jsonb; end $$`);
    const rows = await db.query<{ v: unknown }>(`select pg_temp.unwrap(v) v from t_json`);
    expect(rows.map((x) => x.v)).toEqual(['crane', 'crane']);
  });
});
