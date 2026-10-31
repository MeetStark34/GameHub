import { createPgliteDb, migrate, type Db } from '@/lib/db';
import type { GameId } from '@/games/types';
import { winningActionFor } from '@/server/solutions';

export async function testDb(): Promise<Db> {
  const db = await createPgliteDb();
  await migrate(db);
  return db;
}

export const winningAction = winningActionFor;

export async function solutionFor(db: Db, sessionId: string): Promise<{ game: GameId; solution: unknown }> {
  const rows = await db.query<{ game: GameId; solution: unknown }>(
    'select s.game, p.solution from game_sessions s join puzzles p on p.id = s.puzzle_id where s.id = $1',
    [sessionId],
  );
  return rows[0];
}

export const at = (iso: string) => new Date(iso);
export const plus = (d: Date, seconds: number) => new Date(d.getTime() + seconds * 1000);
