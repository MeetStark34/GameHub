import 'server-only';
import type { CrossclimbPuzzle } from '@/games/crossclimb/types';
import type { PinpointPuzzle } from '@/games/pinpoint/types';
import { solutionToCells } from '@/games/queens/logic';
import type { GameId } from '@/games/types';

/**
 * The action sequence that solves a stored puzzle (admin "complete Daily
 * Set" tool and tests). Never exposed to players.
 */
export function winningActionsFor(game: GameId, solution: unknown, puzzle: unknown): unknown[] {
  switch (game) {
    case 'werd':
      return [{ type: 'guess', word: solution }];
    case 'pinpoint':
      return [{ type: 'guess', text: (puzzle as PinpointPuzzle).label }];
    case 'queens':
      return [{ type: 'submit', solution: solutionToCells(solution as number[]) }];
    case 'crossclimb': {
      const p = puzzle as CrossclimbPuzzle;
      return [
        { type: 'middle', rows: p.middle.map((m) => ({ id: m.id, word: m.word })) },
        { type: 'ends', top: p.top.word, bottom: p.bottom.word },
      ];
    }
    default:
      return [{ type: 'submit', solution }];
  }
}
