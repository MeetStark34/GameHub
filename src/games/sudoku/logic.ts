import type { Msg } from '@/i18n/translate';
import { msg } from '../shared';
import type { SudokuPuzzle } from './types';

const boxOf = (p: Pick<SudokuPuzzle, 'size' | 'boxRows' | 'boxCols'>, r: number, c: number) =>
  Math.floor(r / p.boxRows) * (p.size / p.boxCols) + Math.floor(c / p.boxCols);

/** Every row, column and box contains 1..size exactly once; givens unchanged. */
export function checkSudoku(puzzle: SudokuPuzzle, grid: number[][]): Msg | null {
  const n = puzzle.size;
  if (grid.length !== n || grid.some((row) => row.length !== n)) return msg('sudoku.shape');
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      if (!Number.isInteger(v) || v < 1 || v > n) return msg('sudoku.fill');
      if (puzzle.givens[r][c] && puzzle.givens[r][c] !== v) return msg('sudoku.given');
    }
  }
  for (let i = 0; i < n; i++) {
    const row = new Set<number>();
    const col = new Set<number>();
    for (let j = 0; j < n; j++) {
      row.add(grid[i][j]);
      col.add(grid[j][i]);
    }
    if (row.size !== n) return msg('sudoku.row', { n: i + 1 });
    if (col.size !== n) return msg('sudoku.column', { n: i + 1 });
  }
  const boxes = Array.from({ length: n }, () => new Set<number>());
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) boxes[boxOf(puzzle, r, c)].add(grid[r][c]);
  if (boxes.some((b) => b.size !== n)) return msg('sudoku.box');
  return null;
}

/** Cells whose value repeats in their row, column or box (for live UI hints). */
export function sudokuConflicts(puzzle: SudokuPuzzle, grid: number[][]): Set<string> {
  const n = puzzle.size;
  const bad = new Set<string>();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      if (!v) continue;
      for (let r2 = 0; r2 < n; r2++) {
        for (let c2 = 0; c2 < n; c2++) {
          if ((r2 === r && c2 === c) || grid[r2][c2] !== v) continue;
          if (r2 === r || c2 === c || boxOf(puzzle, r, c) === boxOf(puzzle, r2, c2)) bad.add(`${r},${c}`);
        }
      }
    }
  }
  return bad;
}

/**
 * Counts completions of `grid` up to `limit` using bitmask backtracking with
 * most-constrained-cell ordering. Optionally records the first solution.
 */
export function solveSudoku(
  p: Pick<SudokuPuzzle, 'size' | 'boxRows' | 'boxCols'>,
  grid: number[][],
  limit = 2,
  order?: (candidates: number[]) => number[],
): { count: number; solution: number[][] | null } {
  const n = p.size;
  const g = grid.map((row) => row.slice());
  const rowM = new Array<number>(n).fill(0);
  const colM = new Array<number>(n).fill(0);
  const boxM = new Array<number>(n).fill(0);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = g[r][c];
      if (!v) continue;
      const bit = 1 << v;
      const b = boxOf(p, r, c);
      if (rowM[r] & bit || colM[c] & bit || boxM[b] & bit) return { count: 0, solution: null };
      rowM[r] |= bit;
      colM[c] |= bit;
      boxM[b] |= bit;
    }
  }
  let count = 0;
  let solution: number[][] | null = null;
  const go = () => {
    if (count >= limit) return;
    let best = -1;
    let bestCands: number[] = [];
    for (let i = 0; i < n * n; i++) {
      const r = Math.floor(i / n);
      const c = i % n;
      if (g[r][c]) continue;
      const used = rowM[r] | colM[c] | boxM[boxOf(p, r, c)];
      const cands: number[] = [];
      for (let v = 1; v <= n; v++) if (!(used & (1 << v))) cands.push(v);
      if (best === -1 || cands.length < bestCands.length) {
        best = i;
        bestCands = cands;
        if (cands.length <= 1) break;
      }
    }
    if (best === -1) {
      count++;
      if (!solution) solution = g.map((row) => row.slice());
      return;
    }
    const r = Math.floor(best / n);
    const c = best % n;
    const b = boxOf(p, r, c);
    for (const v of order ? order(bestCands) : bestCands) {
      const bit = 1 << v;
      g[r][c] = v;
      rowM[r] |= bit;
      colM[c] |= bit;
      boxM[b] |= bit;
      go();
      g[r][c] = 0;
      rowM[r] &= ~bit;
      colM[c] &= ~bit;
      boxM[b] &= ~bit;
      if (count >= limit) return;
    }
  };
  go();
  return { count, solution };
}
