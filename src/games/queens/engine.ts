import { z } from 'zod';
import type { GameEngine, SubmitState } from '../types';
import { cellSchema, initialSubmitState, submitAct, submitPenalty } from '../shared';
import { QUEENS_CONFIG } from './config';
import { generateQueens } from './generator';
import { checkQueens } from './logic';
import type { QueensPuzzle, QueensSolution } from './types';

export const queensEngine: GameEngine<QueensPuzzle, QueensSolution, SubmitState, QueensPuzzle> = {
  id: 'queens',
  generatorVersion: 1,
  generate: (rng, difficulty) => generateQueens(rng, QUEENS_CONFIG[difficulty].size),
  initialState: initialSubmitState,
  toClient: (puzzle) => puzzle,
  act: submitAct(z.array(cellSchema).max(16), checkQueens),
  penalty: (_p, state) => submitPenalty(state),
};
