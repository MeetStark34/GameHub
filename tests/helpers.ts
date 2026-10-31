import { createPgliteDb, migrate, type Db } from '@/lib/db';
import type { GameId } from '@/games/types';
import { actOnSession } from '@/server/play';
import { winningActionsFor } from '@/server/solutions';

export async function testDb(): Promise<Db> {
  const db = await createPgliteDb();
  await migrate(db);
  return db;
}

/** Plays every winning action for a session; returns the last act result. */
export async function solveSession(db: Db, userId: string, sessionId: string, at: Date) {
  const { game, solution, data } = await solutionFor(db, sessionId);
  let last;
  for (const action of winningActionsFor(game, solution, data)) last = await actOnSession(db, userId, sessionId, action, at);
  return last!;
}

export function winningAction(game: GameId, solution: unknown, puzzle?: unknown) {
  return winningActionsFor(game, solution, puzzle)[0];
}

export async function solutionFor(db: Db, sessionId: string): Promise<{ game: GameId; solution: unknown; data: unknown }> {
  const rows = await db.query<{ game: GameId; solution: unknown; data: unknown }>(
    'select s.game, p.solution, p.data from game_sessions s join puzzles p on p.id = s.puzzle_id where s.id = $1',
    [sessionId],
  );
  return rows[0];
}

export const at = (iso: string) => new Date(iso);
export const plus = (d: Date, seconds: number) => new Date(d.getTime() + seconds * 1000);
