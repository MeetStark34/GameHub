import type { Msg } from '@/i18n/translate';
import { msg, type Cell } from '../core';
import type { QueensPuzzle, QueensSolution } from './types';

/**
 * Rules: exactly one crown per row, per column and per colour region, and no
 * two crowns may touch, including diagonally.
 * Returns a player-facing error, or null when the placement is a solution.
 */
export function checkQueens(puzzle: QueensPuzzle, crowns: Cell[]): Msg | null {
  const n = puzzle.size;
  if (crowns.length !== n) return msg('queens.count', { n });
  const rows = new Set<number>();
  const cols = new Set<number>();
  const regions = new Set<number>();
  for (const [r, c] of crowns) {
    if (r < 0 || c < 0 || r >= n || c >= n) return msg('queens.outside');
    rows.add(r);
    cols.add(c);
    regions.add(puzzle.regions[r][c]);
  }
  if (rows.size !== n) return msg('queens.row');
  if (cols.size !== n) return msg('queens.column');
  if (regions.size !== n) return msg('queens.region');
  for (let i = 0; i < crowns.length; i++) {
    for (let j = i + 1; j < crowns.length; j++) {
      const [r1, c1] = crowns[i];
      const [r2, c2] = crowns[j];
      if (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1) return msg('queens.touching');
    }
  }
  return null;
}

/** Cells that conflict with another crown (for live UI highlighting). */
export function queensConflicts(puzzle: QueensPuzzle, crowns: Cell[]): Set<string> {
  const bad = new Set<string>();
  for (let i = 0; i < crowns.length; i++) {
    for (let j = i + 1; j < crowns.length; j++) {
      const [r1, c1] = crowns[i];
      const [r2, c2] = crowns[j];
      const clash =
        r1 === r2 ||
        c1 === c2 ||
        puzzle.regions[r1][c1] === puzzle.regions[r2][c2] ||
        (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1);
      if (clash) {
        bad.add(`${r1},${c1}`);
        bad.add(`${r2},${c2}`);
      }
    }
  }
  return bad;
}

/** First solution (column per row), or null. Used by tests and tooling. */
export function solveQueens(puzzle: QueensPuzzle): QueensSolution | null {
  const n = puzzle.size;
  const cols: number[] = [];
  const go = (row: number): boolean => {
    if (row === n) return true;
    for (let c = 0; c < n; c++) {
      if (cols.includes(c) || (row > 0 && Math.abs(c - cols[row - 1]) <= 1)) continue;
      const reg = puzzle.regions[row][c];
      if (cols.some((cc, r) => puzzle.regions[r][cc] === reg)) continue;
      cols.push(c);
      if (go(row + 1)) return true;
      cols.pop();
    }
    return false;
  };
  return go(0) ? cols : null;
}

/** Counts solutions up to `limit` (row-by-row backtracking). */
export function countQueensSolutions(puzzle: QueensPuzzle, limit = 2): number {
  const n = puzzle.size;
  const colUsed = new Array<boolean>(n).fill(false);
  const regionUsed = new Array<boolean>(n).fill(false);
  let count = 0;
  const place = (row: number, prevCol: number) => {
    if (count >= limit) return;
    if (row === n) {
      count++;
      return;
    }
    for (let c = 0; c < n; c++) {
      if (colUsed[c] || Math.abs(c - prevCol) <= 1) continue;
      const reg = puzzle.regions[row][c];
      if (regionUsed[reg]) continue;
      colUsed[c] = regionUsed[reg] = true;
      place(row + 1, c);
      colUsed[c] = regionUsed[reg] = false;
    }
  };
  place(0, -10);
  return count;
}

export const solutionToCells = (s: QueensSolution): Cell[] => s.map((c, r) => [r, c]);
