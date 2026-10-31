import type { Rng } from '@/lib/rng';
import type { TangoDifficulty } from './config';
import { solveTango } from './logic';
import type { TangoEdge, TangoPuzzle, TangoSolution, TangoValue } from './types';

type Clue = { kind: 'cell'; r: number; c: number } | { kind: 'edge'; a: [number, number]; b: [number, number] };

export function generateTango(rng: Rng, cfg: TangoDifficulty): { puzzle: TangoPuzzle; solution: TangoSolution } {
  const n = cfg.size;
  const blank: TangoPuzzle = { size: n, givens: Array.from({ length: n }, () => new Array(n).fill(-1)), edges: [] };
  const full = solveTango(blank, 1, () => (rng.chance(0.5) ? [0, 1] : [1, 0])).solution as TangoSolution | null;
  if (!full) throw new Error('Tango: could not build a full grid');

  const all: Clue[] = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      all.push({ kind: 'cell', r, c });
      if (c + 1 < n) all.push({ kind: 'edge', a: [r, c], b: [r, c + 1] });
      if (r + 1 < n) all.push({ kind: 'edge', a: [r, c], b: [r + 1, c] });
    }

  const build = (clues: Clue[]): TangoPuzzle => {
    const givens = Array.from({ length: n }, () => new Array<number>(n).fill(-1));
    const edges: TangoEdge[] = [];
    for (const k of clues) {
      if (k.kind === 'cell') givens[k.r][k.c] = full[k.r][k.c];
      else edges.push({ a: k.a, b: k.b, kind: full[k.a[0]][k.a[1]] === full[k.b[0]][k.b[1]] ? 'same' : 'diff' });
    }
    return { size: n, givens, edges };
  };

  // Start from every clue (trivially unique) and strip clues in random order
  // while the solution stays unique, leaving a minimal mix of cells and signs.
  let kept = rng.shuffle(all);
  const removed: Clue[] = [];
  for (const clue of kept.slice()) {
    const trial = kept.filter((k) => k !== clue);
    if (solveTango(build(trial), 2).count === 1) {
      kept = trial;
      removed.push(clue);
    }
  }
  kept = kept.concat(rng.shuffle(removed).slice(0, cfg.extraClues));
  return { puzzle: build(kept), solution: full.map((row) => row.slice() as TangoValue[]) };
}
