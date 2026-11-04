import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/rng';
import { DIFFICULTIES } from '../types';
import { QUEENS_CONFIG } from './config';
import { queensEngine } from './engine';
import { checkQueens, countQueensSolutions, queensBlockedCells, queensClash, queensConflicts, solutionToCells } from './logic';
import type { QueensPuzzle } from './types';

describe('queens', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`generates a unique, valid ${difficulty} puzzle`, () => {
      for (let i = 0; i < 4; i++) {
        const { puzzle, solution } = queensEngine.generate(createRng(`q-${difficulty}-${i}`), difficulty);
        expect(puzzle.size).toBe(QUEENS_CONFIG[difficulty].size);
        expect(new Set(puzzle.regions.flat()).size).toBe(puzzle.size);
        expect(countQueensSolutions(puzzle, 3)).toBe(1);
        expect(checkQueens(puzzle, solutionToCells(solution))).toBeNull();
      }
    });
  }

  it('is deterministic for a seed', () => {
    expect(queensEngine.generate(createRng('same'), 'hard')).toEqual(queensEngine.generate(createRng('same'), 'hard'));
  });

  it('rejects wrong counts, duplicate rows and touching crowns', () => {
    const { puzzle, solution } = queensEngine.generate(createRng('rej'), 'normal');
    const cells = solutionToCells(solution);
    expect(checkQueens(puzzle, cells.slice(1))).toMatchObject({ key: 'gameMsg.queens.count' });
    const dupRow = cells.map(([r, c], i) => (i === 1 ? [0, c] : [r, c]) as [number, number]);
    expect(checkQueens(puzzle, dupRow)).not.toBeNull();
    expect(checkQueens({ size: 2, regions: [[0, 0], [1, 1]] }, [[0, 0], [1, 1]])).toMatchObject({ key: 'gameMsg.queens.touching' });
  });

  it('act(): wrong submit costs score, malformed input is rejected, right submit solves', () => {
    const { puzzle, solution } = queensEngine.generate(createRng('act'), 'easy');
    let state = queensEngine.initialState(puzzle);
    const bad = queensEngine.act(puzzle, state, { type: 'submit', solution: [] });
    expect(bad.solved).toBe(false);
    state = bad.state;
    expect(queensEngine.penalty(puzzle, state)).toBeGreaterThan(0);
    expect(queensEngine.act(puzzle, state, { type: 'garbage' }).solved).toBe(false);
    expect(queensEngine.act(puzzle, state, { type: 'submit', solution: [[99, -1]] }).solved).toBe(false);
    expect(queensEngine.act(puzzle, state, { type: 'submit', solution: solutionToCells(solution) }).solved).toBe(true);
  });

  describe('Auto X (queensBlockedCells)', () => {
    // 5x5, regions chosen so region 2 reaches far from the crown.
    const puzzle: QueensPuzzle = {
      size: 5,
      regions: [
        [0, 0, 1, 1, 1],
        [0, 2, 2, 1, 1],
        [3, 3, 2, 4, 4],
        [3, 3, 2, 4, 2],
        [3, 3, 3, 4, 4],
      ],
    };
    const keys = (s: Set<string>) => [...s].sort();

    it('marks the row, column, colour region and the 8 touching cells, never the crown', () => {
      const blocked = queensBlockedCells(puzzle, [[1, 1]]);
      expect(blocked.has('1,1')).toBe(false);
      for (const c of [0, 2, 3, 4]) expect(blocked.has(`1,${c}`)).toBe(true); // row
      for (const r of [0, 2, 3, 4]) expect(blocked.has(`${r},1`)).toBe(true); // column
      for (const k of ['2,2', '3,2', '3,4']) expect(blocked.has(k)).toBe(true); // region 2, incl. far cell 3,4
      for (const k of ['0,0', '0,2', '2,0', '2,2']) expect(blocked.has(k)).toBe(true); // diagonals
      // Cells with no relation to the crown stay free.
      for (const k of ['0,3', '0,4', '2,3', '2,4', '3,3', '4,3', '4,4', '4,0', '3,0', '4,2']) expect(blocked.has(k)).toBe(false);
    });

    it('marks exactly the cells the pairwise rule rejects (same rule as validation)', () => {
      const crowns: [number, number][] = [[0, 4], [3, 0]];
      const expected = new Set<string>();
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 5; c++)
          if (!crowns.some(([cr, cc]) => cr === r && cc === c) && crowns.some((k) => queensClash(puzzle, k, [r, c]))) expected.add(`${r},${c}`);
      expect(keys(queensBlockedCells(puzzle, crowns))).toEqual(keys(expected));
      // Placing a crown on any blocked cell is a conflict for the live checker too.
      for (const k of queensBlockedCells(puzzle, crowns)) {
        const [r, c] = k.split(',').map(Number);
        expect(queensConflicts(puzzle, [...crowns, [r, c]]).size).toBeGreaterThan(0);
      }
    });

    it('recalculates from the remaining crowns when one is removed, and is empty with none', () => {
      const both = queensBlockedCells(puzzle, [[1, 1], [4, 4]]);
      const one = queensBlockedCells(puzzle, [[1, 1]]);
      expect(both.has('4,3')).toBe(true);
      expect(one.has('4,3')).toBe(false);
      expect(keys(one)).toEqual(keys(queensBlockedCells(puzzle, [[1, 1]])));
      expect(queensBlockedCells(puzzle, []).size).toBe(0);
    });

    for (const difficulty of DIFFICULTIES) {
      it(`never blocks a solution cell while placing the solution (${difficulty}, ${QUEENS_CONFIG[difficulty].size}x${QUEENS_CONFIG[difficulty].size})`, () => {
        const { puzzle: p, solution } = queensEngine.generate(createRng(`autox-${difficulty}`), difficulty);
        const cells = solutionToCells(solution);
        for (let k = 1; k < cells.length; k++) {
          const blocked = queensBlockedCells(p, cells.slice(0, k));
          for (const [r, c] of cells) expect(blocked.has(`${r},${c}`)).toBe(false);
        }
        // With the full solution placed, every other cell is blocked.
        expect(queensBlockedCells(p, cells).size).toBe(p.size * p.size - p.size);
        expect(checkQueens(p, cells)).toBeNull();
      });
    }
  });
});
