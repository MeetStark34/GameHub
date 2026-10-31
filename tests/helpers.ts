import { createPgliteDb, migrate, type Db } from '@/lib/db';
import type { GameId } from '@/games/types';
import { solutionToCells } from '@/games/queens/logic';

export async function testDb(): Promise<Db> {
  const db = await createPgliteDb();
  await migrate(db);
  return db;
}

/** Builds the winning action for a game from its stored reference solution. */
export function winningAction(game: GameId, solution: unknown): unknown {
  switch (game) {
    case 'werd':
      return { type: 'guess', word: solution };
    case 'pinpoint':
      return { type: 'guess', option: solution };
    case 'queens':
      return { type: 'submit', solution: solutionToCells(solution as number[]) };
    default:
      return { type: 'submit', solution };
  }
}

export async function solutionFor(db: Db, sessionId: string): Promise<{ game: GameId; solution: unknown }> {
  const rows = await db.query<{ game: GameId; solution: unknown }>(
    'select s.game, p.solution from game_sessions s join puzzles p on p.id = s.puzzle_id where s.id = $1',
    [sessionId],
  );
  return rows[0];
}

export const at = (iso: string) => new Date(iso);
export const plus = (d: Date, seconds: number) => new Date(d.getTime() + seconds * 1000);
