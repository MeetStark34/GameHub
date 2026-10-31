import type { Msg } from '@/i18n/translate';
import { msg } from '../shared';
import type { PatchClue, PatchRect, PatchShape, PatchesPuzzle } from './types';

export const shapeOf = (rect: Pick<PatchRect, 'h' | 'w'>): Exclude<PatchShape, 'any'> =>
  rect.h === rect.w ? 'square' : rect.w > rect.h ? 'wide' : 'tall';

const contains = (rect: PatchRect, r: number, c: number) =>
  r >= rect.r && r < rect.r + rect.h && c >= rect.c && c < rect.c + rect.w;

const shapeFits = (clue: PatchClue, rect: PatchRect) => clue.shape === 'any' || shapeOf(rect) === clue.shape;

/**
 * Rules: cut the board into rectangles that cover every cell without
 * overlapping; each rectangle holds exactly one clue, its area equals the
 * clue's number, and it matches the clue's shape hint if one is shown.
 */
export function checkPatches(puzzle: PatchesPuzzle, rects: PatchRect[]): Msg | null {
  const { rows, cols, clues } = puzzle;
  if (rects.length !== clues.length) return msg('patches.count', { n: clues.length });
  const owner: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    if (rect.h < 1 || rect.w < 1 || rect.r < 0 || rect.c < 0 || rect.r + rect.h > rows || rect.c + rect.w > cols)
      return msg('patches.outside');
    for (let r = rect.r; r < rect.r + rect.h; r++)
      for (let c = rect.c; c < rect.c + rect.w; c++) {
        if (owner[r][c] !== -1) return msg('patches.overlap');
        owner[r][c] = i;
      }
  }
  if (owner.some((row) => row.includes(-1))) return msg('patches.cover');
  for (const rect of rects) {
    const inside = clues.filter((k) => contains(rect, k.r, k.c));
    if (inside.length !== 1) return msg('patches.oneNumber');
    const clue = inside[0];
    if (rect.h * rect.w !== clue.area) return msg('patches.size', { n: clue.area });
    if (!shapeFits(clue, rect)) return msg('patches.shape', { n: clue.area, shape: `@gameMsg.patches.shapes.${clue.shape}` });
  }
  return null;
}

/** All rectangles that could legally belong to `clue`. */
export function candidatesFor(puzzle: PatchesPuzzle, clueIndex: number): PatchRect[] {
  const clue = puzzle.clues[clueIndex];
  const out: PatchRect[] = [];
  for (let h = 1; h <= clue.area; h++) {
    if (clue.area % h) continue;
    const w = clue.area / h;
    if (h > puzzle.rows || w > puzzle.cols) continue;
    for (let r = clue.r - h + 1; r <= clue.r; r++)
      for (let c = clue.c - w + 1; c <= clue.c; c++) {
        if (r < 0 || c < 0 || r + h > puzzle.rows || c + w > puzzle.cols) continue;
        const rect = { r, c, h, w };
        if (!shapeFits(clue, rect)) continue;
        if (puzzle.clues.some((k, j) => j !== clueIndex && contains(rect, k.r, k.c))) continue;
        out.push(rect);
      }
  }
  return out;
}

/** Exact-cover backtracking; counts solutions up to `limit`. */
export function solvePatches(puzzle: PatchesPuzzle, limit = 2): { count: number; solution: PatchRect[] | null } {
  const { rows, cols } = puzzle;
  const cands = puzzle.clues.map((_, i) => candidatesFor(puzzle, i));
  if (cands.some((list) => list.length === 0)) return { count: 0, solution: null };
  const grid: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  const chosen: (PatchRect | null)[] = puzzle.clues.map(() => null);
  let count = 0;
  let solution: PatchRect[] | null = null;

  const free = (rect: PatchRect) => {
    for (let r = rect.r; r < rect.r + rect.h; r++)
      for (let c = rect.c; c < rect.c + rect.w; c++) if (grid[r][c] !== -1) return false;
    return true;
  };
  const paint = (rect: PatchRect, v: number) => {
    for (let r = rect.r; r < rect.r + rect.h; r++) for (let c = rect.c; c < rect.c + rect.w; c++) grid[r][c] = v;
  };

  const go = () => {
    if (count >= limit) return;
    // Branch on the unplaced clue with the fewest fitting candidates.
    let best = -1;
    let bestList: PatchRect[] = [];
    for (let i = 0; i < cands.length; i++) {
      if (chosen[i]) continue;
      const fit = cands[i].filter(free);
      if (fit.length === 0) return;
      if (best === -1 || fit.length < bestList.length) {
        best = i;
        bestList = fit;
      }
    }
    if (best === -1) {
      if (grid.every((row) => row.every((v) => v !== -1))) {
        count++;
        if (!solution) solution = chosen.map((x) => ({ ...x! }));
      }
      return;
    }
    for (const rect of bestList) {
      paint(rect, best);
      chosen[best] = rect;
      go();
      chosen[best] = null;
      paint(rect, -1);
      if (count >= limit) return;
    }
  };
  go();
  return { count, solution };
}
