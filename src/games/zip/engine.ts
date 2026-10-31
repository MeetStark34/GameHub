import { z } from 'zod';
import type { GameEngine, SubmitState } from '../types';
import { cellSchema, initialSubmitState, submitAct, submitPenalty } from '../shared';
import { ZIP_CONFIG } from './config';
import { generateZip } from './generator';
import { checkZip } from './logic';
import type { ZipPuzzle, ZipSolution } from './types';

export const zipEngine: GameEngine<ZipPuzzle, ZipSolution, SubmitState, ZipPuzzle> = {
  id: 'zip',
  generatorVersion: 1,
  generate: (rng, difficulty) => generateZip(rng, ZIP_CONFIG[difficulty]),
  initialState: initialSubmitState,
  toClient: (puzzle) => puzzle,
  act: submitAct(z.array(cellSchema).max(144), checkZip),
  penalty: (_p, state) => submitPenalty(state),
};
