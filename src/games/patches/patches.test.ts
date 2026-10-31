import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/rng';
import { DIFFICULTIES } from '../types';
import { PATCHES_CONFIG } from './config';
import { patchesEngine } from './engine';
import { checkPatches, solvePatches } from './logic';

describe('patches', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`generates unique ${difficulty} puzzles`, () => {
      for (let i = 0; i < 4; i++) {
        const { puzzle, solution } = patchesEngine.generate(createRng(`p-${difficulty}-${i}`), difficulty);
        const cfg = PATCHES_CONFIG[difficulty];
        expect(puzzle.rows).toBe(cfg.rows);
        expect(puzzle.clues.reduce((s, k) => s + k.area, 0)).toBe(cfg.rows * cfg.cols);
        expect(solvePatches(puzzle, 3).count).toBe(1);
        expect(checkPatches(puzzle, solution)).toBeNull();
        if (cfg.shapeHintRate === 0) expect(puzzle.clues.every((k) => k.shape === 'any')).toBe(true);
        if (cfg.shapeHintRate === 1) expect(puzzle.clues.every((k) => k.shape !== 'any')).toBe(true);
      }
    });
  }

  it('rejects overlap, gaps, wrong areas and wrong count', () => {
    const { puzzle, solution } = patchesEngine.generate(createRng('rej'), 'normal');
    expect(checkPatches(puzzle, solution.slice(1))).toMatch(/exactly/);
    const grown = solution.map((x, i) => (i === 0 ? { ...x, w: x.w + 1 } : x));
    expect(checkPatches(puzzle, grown)).not.toBeNull();
    const outside = solution.map((x, i) => (i === 0 ? { ...x, r: 40 } : x));
    expect(checkPatches(puzzle, outside)).toMatch(/outside/);
  });
});
