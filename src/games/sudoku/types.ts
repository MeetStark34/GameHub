export interface SudokuPuzzle {
  size: number;
  boxRows: number;
  boxCols: number;
  /** givens[r][c] = 1..size, or 0 for an empty cell. */
  givens: number[][];
}
export type SudokuSolution = number[][];
