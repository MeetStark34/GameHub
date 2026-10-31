import { z } from 'zod';
import type { GameEngine, SubmitState } from '../types';
import { initialSubmitState, submitAct, submitPenalty } from '../shared';
import { SUDOKU_CONFIG } from './config';
import { generateSudoku } from './generator';
import { checkSudoku } from './logic';
import type { SudokuPuzzle, SudokuSolution } from './types';

const gridSchema = z.array(z.array(z.number().int().min(0).max(9)).max(9)).max(9);

export const sudokuEngine: GameEngine<SudokuPuzzle, SudokuSolution, SubmitState, SudokuPuzzle> = {
  id: 'sudoku',
  generatorVersion: 1,
  generate: (rng, difficulty) => generateSudoku(rng, SUDOKU_CONFIG[difficulty]),
  initialState: initialSubmitState,
  toClient: (puzzle) => puzzle,
  act: submitAct(gridSchema, checkSudoku),
  penalty: (_p, state) => submitPenalty(state),
};
