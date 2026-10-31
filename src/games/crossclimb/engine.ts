import { z } from 'zod';
import type { GameEngine } from '../types';
import { submitPenalty } from '../shared';
import { isWord, normalizeWord } from '../words/dictionary';
import { CROSSCLIMB_CONFIG } from './config';
import { generateCrossclimb } from './generator';
import { checkCrossclimb } from './logic';
import type { CrossclimbPuzzle, CrossclimbSolution, CrossclimbState } from './types';

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('submit'), solution: z.array(z.string().max(12)).max(10) }),
  // Free dictionary lookup so players can check a rung before submitting.
  z.object({ type: z.literal('check'), word: z.string().max(12) }),
]);

export const crossclimbEngine: GameEngine<CrossclimbPuzzle, CrossclimbSolution, CrossclimbState, CrossclimbPuzzle> = {
  id: 'crossclimb',
  generatorVersion: 1,
  generate: (rng, difficulty) => generateCrossclimb(rng, CROSSCLIMB_CONFIG[difficulty]),
  initialState: () => ({ wrongSubmits: 0 }),
  toClient: (puzzle) => puzzle,
  act(puzzle, state, action) {
    const parsed = actionSchema.safeParse(action);
    if (!parsed.success) return { state, solved: false, message: 'That move could not be read.' };
    if (parsed.data.type === 'check') {
      const word = normalizeWord(parsed.data.word);
      return { state, solved: false, feedback: { word, valid: word.length === puzzle.length && isWord(word) } };
    }
    const error = checkCrossclimb(puzzle, parsed.data.solution);
    if (error) return { state: { wrongSubmits: state.wrongSubmits + 1 }, solved: false, message: error };
    return { state, solved: true };
  },
  penalty: (_p, state) => submitPenalty(state),
};
