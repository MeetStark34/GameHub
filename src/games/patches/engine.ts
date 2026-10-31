import { z } from 'zod';
import type { GameEngine, SubmitState } from '../types';
import { initialSubmitState, submitAct, submitPenalty } from '../shared';
import { PATCHES_CONFIG } from './config';
import { generatePatches } from './generator';
import { checkPatches } from './logic';
import type { PatchesPuzzle, PatchesSolution } from './types';

const int = z.number().int().min(0).max(32);
const rectSchema = z.object({ r: int, c: int, h: int, w: int });

export const patchesEngine: GameEngine<PatchesPuzzle, PatchesSolution, SubmitState, PatchesPuzzle> = {
  id: 'patches',
  generatorVersion: 1,
  generate: (rng, difficulty) => generatePatches(rng, PATCHES_CONFIG[difficulty]),
  initialState: initialSubmitState,
  toClient: (puzzle) => puzzle,
  act: submitAct(z.array(rectSchema).max(64), checkPatches),
  penalty: (_p, state) => submitPenalty(state),
};
