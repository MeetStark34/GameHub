import type { Rng } from '@/lib/rng';
import { ORTHO, inBounds } from '../core';
import { countQueensSolutions } from './logic';
import type { QueensPuzzle, QueensSolution } from './types';

/** Random column permutation where consecutive rows' crowns never touch. */
function randomPlacement(rng: Rng, n: number): QueensSolution {
  const cols: number[] = [];
  const used = new Array<boolean>(n).fill(false);
  const go = (row: number): boolean => {
    if (row === n) return true;
    for (const c of rng.shuffle([...Array(n).keys()])) {
      if (used[c] || (row > 0 && Math.abs(c - cols[row - 1]) <= 1)) continue;
      used[c] = true;
      cols.push(c);
      if (go(row + 1)) return true;
      cols.pop();
      used[c] = false;
    }
    return false;
  };
  go(0);
  return cols;
}

/** Grow one region from each crown with randomized multi-source flood fill. */
function growRegions(rng: Rng, n: number, crowns: QueensSolution): number[][] {
  const regions = Array.from({ length: n }, () => new Array<number>(n).fill(-1));
  const frontier: [number, number, number][] = [];
  const push = (r: number, c: number, reg: number) => {
    for (const [dr, dc] of ORTHO) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc, n) && regions[nr][nc] === -1) frontier.push([nr, nc, reg]);
    }
  };
  crowns.forEach((c, r) => {
    regions[r][c] = r;
    push(r, c, r);
  });
  // Uneven growth weights produce a mix of large and small regions.
  const weight = crowns.map(() => 0.2 + rng.next());
  while (frontier.length) {
    let idx = rng.int(0, frontier.length - 1);
    const alt = rng.int(0, frontier.length - 1);
    if (weight[frontier[alt][2]] > weight[frontier[idx][2]]) idx = alt;
    const [r, c, reg] = frontier[idx];
    frontier[idx] = frontier[frontier.length - 1];
    frontier.pop();
    if (regions[r][c] !== -1) continue;
    regions[r][c] = reg;
    push(r, c, reg);
  }
  return regions;
}

export function generateQueens(rng: Rng, size: number): { puzzle: QueensPuzzle; solution: QueensSolution } {
  for (let attempt = 0; attempt < 20000; attempt++) {
    const solution = randomPlacement(rng, size);
    const regions = growRegions(rng, size, solution);
    // Relabel regions in reading order so colours don't leak the crown's row.
    const relabel = new Map<number, number>();
    for (const row of regions) for (const reg of row) if (!relabel.has(reg)) relabel.set(reg, relabel.size);
    const puzzle: QueensPuzzle = { size, regions: regions.map((row) => row.map((reg) => relabel.get(reg)!)) };
    if (countQueensSolutions(puzzle, 2) === 1) return { puzzle, solution };
  }
  throw new Error(`Queens: failed to generate a unique ${size}x${size} puzzle`);
}
