import type { Difficulty } from '../types';

export interface SudokuDifficulty {
  size: number;
  boxRows: number;
  boxCols: number;
  /**
   * Givens kept on top of a minimal (no removable clue) puzzle. 0 = minimal,
   * the hardest version of that grid size.
   */
  extraGivens: number;
}

export const SUDOKU_CONFIG: Record<Difficulty, SudokuDifficulty> = {
  easy: { size: 4, boxRows: 2, boxCols: 2, extraGivens: 2 },
  normal: { size: 6, boxRows: 2, boxCols: 3, extraGivens: 6 },
  hard: { size: 6, boxRows: 2, boxCols: 3, extraGivens: 2 },
  expert: { size: 6, boxRows: 2, boxCols: 3, extraGivens: 0 },
};
