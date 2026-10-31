import type { Rng } from '@/lib/rng';
import type { PatchesDifficulty } from './config';
import { shapeOf, solvePatches } from './logic';
import type { PatchClue, PatchRect, PatchesPuzzle } from './types';

/** Random partition of the board into rectangles of area <= maxArea. */
function randomPartition(rng: Rng, rows: number, cols: number, maxArea: number): PatchRect[] {
  const taken: boolean[][] = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const rects: PatchRect[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (taken[r][c]) continue;
      let maxW = 0;
      while (c + maxW < cols && !taken[r][c + maxW]) maxW++;
      const options: PatchRect[] = [];
      for (let w = 1; w <= maxW; w++)
        for (let h = 1; r + h <= rows && h * w <= maxArea; h++) {
          let clear = true;
          for (let x = 0; x < w && clear; x++) if (taken[r + h - 1][c + x]) clear = false;
          if (!clear) break;
          options.push({ r, c, h, w });
        }
      // Prefer mid-sized patches; single cells make puzzles trivial.
      const weighted = options.flatMap((o) => {
        const a = o.h * o.w;
        const weight = a === 1 ? 1 : a <= 2 ? 3 : 6;
        return Array<PatchRect>(weight).fill(o);
      });
      const rect = rng.pick(weighted);
      for (let y = rect.r; y < rect.r + rect.h; y++) for (let x = rect.c; x < rect.c + rect.w; x++) taken[y][x] = true;
      rects.push(rect);
    }
  return rects;
}

export function generatePatches(rng: Rng, cfg: PatchesDifficulty): { puzzle: PatchesPuzzle; solution: PatchRect[] } {
  for (let attempt = 0; attempt < 5000; attempt++) {
    const rects = randomPartition(rng, cfg.rows, cfg.cols, cfg.maxArea);
    if (rects.filter((x) => x.h * x.w === 1).length > 2) continue;
    const clues: PatchClue[] = rects.map((rect) => ({
      r: rect.r + rng.int(0, rect.h - 1),
      c: rect.c + rng.int(0, rect.w - 1),
      area: rect.h * rect.w,
      shape: rng.chance(cfg.shapeHintRate) ? shapeOf(rect) : 'any',
    }));
    // Keep clue order stable (reading order) so indices are predictable.
    const order = clues.map((k, i) => i).sort((a, b) => clues[a].r - clues[b].r || clues[a].c - clues[b].c);
    const puzzle: PatchesPuzzle = { rows: cfg.rows, cols: cfg.cols, clues: order.map((i) => clues[i]) };
    if (solvePatches(puzzle, 2).count === 1) return { puzzle, solution: order.map((i) => rects[i]) };
  }
  throw new Error('Patches: failed to generate a unique puzzle');
}
