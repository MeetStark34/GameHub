import { z } from 'zod';
import type { GameEngine, SubmitState } from '../types';
import { initialSubmitState, submitAct, submitPenalty } from '../shared';
import { tangoConfigFor } from './config';
import { generateTango } from './generator';
import { checkTango } from './logic';
import type { TangoPuzzle, TangoSolution } from './types';

const gridSchema = z.array(z.array(z.number().int().min(-1).max(1)).max(12)).max(12);

export const tangoEngine: GameEngine<TangoPuzzle, TangoSolution, SubmitState, TangoPuzzle> = {
  id: 'tango',
  generatorVersion: 1,
  generate: (rng, difficulty, ctx) => generateTango(rng, tangoConfigFor(difficulty, ctx?.mode)),
  initialState: initialSubmitState,
  toClient: (puzzle) => puzzle,
  act: submitAct(gridSchema, checkTango),
  penalty: (_p, state) => submitPenalty(state),
};
