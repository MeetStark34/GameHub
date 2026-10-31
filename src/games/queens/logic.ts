import type { Cell } from '../shared';
import type { QueensPuzzle, QueensSolution } from './types';

/**
 * Rules: exactly one crown per row, per column and per colour region, and no
 * two crowns may touch, including diagonally.
 * Returns a player-facing error, or null when the placement is a solution.
 */
export function checkQueens(puzzle: QueensPuzzle, crowns: Cell[]): string | null {
  const n = puzzle.size;
  if (crowns.length !== n) return `Place exactly ${n} crowns.`;
  const rows = new Set<number>();
  const cols = new Set<number>();
  const regions = new Set<number>();
  for (const [r, c] of crowns) {
    if (r < 0 || c < 0 || r >= n || c >= n) return 'A crown is outside the board.';
    rows.add(r);
    cols.add(c);
    regions.add(puzzle.regions[r][c]);
  }
  if (rows.size !== n) return 'Every row needs exactly one crown.';
  if (cols.size !== n) return 'Every column needs exactly one crown.';
  if (regions.size !== n) return 'Every colour region needs exactly one crown.';
  for (let i = 0; i < crowns.length; i++) {
    for (let j = i + 1; j < crowns.length; j++) {
      const [r1, c1] = crowns[i];
      const [r2, c2] = crowns[j];
      if (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1) return 'Two crowns are touching.';
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
