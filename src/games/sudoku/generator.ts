import type { Rng } from '@/lib/rng';
import type { SudokuDifficulty } from './config';
import { solveSudoku } from './logic';
import type { SudokuPuzzle, SudokuSolution } from './types';

export function generateSudoku(rng: Rng, cfg: SudokuDifficulty): { puzzle: SudokuPuzzle; solution: SudokuSolution } {
  const { size: n, boxRows, boxCols } = cfg;
  const shape = { size: n, boxRows, boxCols };
  const empty = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const full = solveSudoku(shape, empty, 1, (c) => rng.shuffle(c)).solution;
  if (!full) throw new Error('Sudoku: could not build a full grid');

  // Dig holes in random order while the solution stays unique -> minimal puzzle.
  const givens = full.map((row) => row.slice());
  const removed: [number, number][] = [];
  for (const i of rng.shuffle([...Array(n * n).keys()])) {
    const r = Math.floor(i / n);
    const c = i % n;
    const keep = givens[r][c];
    givens[r][c] = 0;
    if (solveSudoku(shape, givens, 2).count !== 1) givens[r][c] = keep;
    else removed.push([r, c]);
  }
  // Easier difficulties put some of the dug cells back.
  for (const [r, c] of rng.shuffle(removed).slice(0, cfg.extraGivens)) givens[r][c] = full[r][c];

  return { puzzle: { size: n, boxRows, boxCols, givens }, solution: full };
}
