import 'server-only';
import { crossclimbEngine } from './crossclimb/engine';
import { patchesEngine } from './patches/engine';
import { pinpointEngine } from './pinpoint/engine';
import { queensEngine } from './queens/engine';
import { sudokuEngine } from './sudoku/engine';
import { tangoEngine } from './tango/engine';
import type { GameEngine, GameId } from './types';
import { werdEngine } from './werd/engine';
import { zipEngine } from './zip/engine';

/** Server-only: engines include answers, dictionaries and solvers. */
export const ENGINES: Record<GameId, GameEngine> = {
  patches: patchesEngine,
  sudoku: sudokuEngine,
  zip: zipEngine,
  werd: werdEngine,
  pinpoint: pinpointEngine,
  crossclimb: crossclimbEngine,
  tango: tangoEngine,
  queens: queensEngine,
};
