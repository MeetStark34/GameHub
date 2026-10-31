import 'server-only';
import { solutionToCells } from '@/games/queens/logic';
import type { GameId } from '@/games/types';

/** Builds the winning action from a stored reference solution (admin tools). */
export function winningActionFor(game: GameId, solution: unknown): unknown {
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
