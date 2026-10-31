import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/rng';
import { DIFFICULTIES } from '../types';
import { QUEENS_CONFIG } from './config';
import { queensEngine } from './engine';
import { checkQueens, countQueensSolutions, solutionToCells } from './logic';

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
});
