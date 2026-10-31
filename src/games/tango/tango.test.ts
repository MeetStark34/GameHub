import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/rng';
import { DIFFICULTIES } from '../types';
import { TANGO_CONFIG, TANGO_DAILY_CONFIG } from './config';
import { tangoEngine } from './engine';
import { checkTango, solveTango, tangoConflicts } from './logic';

describe('tango', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`generates unique ${difficulty} puzzles`, () => {
      for (let i = 0; i < 3; i++) {
        const { puzzle, solution } = tangoEngine.generate(createRng(`t-${difficulty}-${i}`), difficulty);
        expect(puzzle.size).toBe(TANGO_CONFIG[difficulty].size);
        expect(solveTango(puzzle, 3).count).toBe(1);
        expect(checkTango(puzzle, solution)).toBeNull();
        // Not trivially pre-filled.
        expect(puzzle.givens.flat().filter((v) => v >= 0).length).toBeLessThan(puzzle.size * puzzle.size / 2);
      }
    });
  }

  for (const difficulty of DIFFICULTIES) {
    it(`daily ${difficulty} is always a unique 6x6`, () => {
      for (let i = 0; i < 3; i++) {
        const { puzzle, solution } = tangoEngine.generate(createRng(`td-${difficulty}-${i}`), difficulty, { mode: 'daily' });
        expect(puzzle.size).toBe(6);
        expect(TANGO_DAILY_CONFIG[difficulty].size).toBe(6);
        expect(solveTango(puzzle, 3).count).toBe(1);
        expect(checkTango(puzzle, solution)).toBeNull();
      }
    });
  }

  it('rejects three-in-a-row, imbalance and broken signs', () => {
    const puzzle = { size: 4, givens: Array.from({ length: 4 }, () => [-1, -1, -1, -1]), edges: [] };
    expect(checkTango(puzzle, [[0, 0, 0, 1], [1, 1, 1, 0], [0, 1, 0, 1], [1, 0, 1, 0]])).not.toBeNull();
    const good = [[0, 1, 0, 1], [1, 0, 1, 0], [0, 1, 1, 0], [1, 0, 0, 1]];
    expect(checkTango(puzzle, good)).toBeNull();
    expect(checkTango({ ...puzzle, edges: [{ a: [0, 0], b: [0, 1], kind: 'same' }] }, good)).toMatchObject({ key: 'gameMsg.tango.same' });
    expect(tangoConflicts(puzzle, [[0, 0, 0, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]]).size).toBe(3);
  });
});
