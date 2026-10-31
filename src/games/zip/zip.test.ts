import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/rng';
import { DIFFICULTIES } from '../types';
import { ZIP_CONFIG } from './config';
import { zipEngine } from './engine';
import { randomHamiltonianPath } from './generator';
import { checkZip } from './logic';

describe('zip', () => {
  it('backbite paths are Hamiltonian', () => {
    const rng = createRng('ham');
    for (const n of [4, 5, 6, 7, 8]) {
      const p = randomHamiltonianPath(rng, n);
      expect(new Set(p.map(([r, c]) => `${r},${c}`)).size).toBe(n * n);
      for (let i = 1; i < p.length; i++) expect(Math.abs(p[i][0] - p[i - 1][0]) + Math.abs(p[i][1] - p[i - 1][1])).toBe(1);
    }
  });

  for (const difficulty of DIFFICULTIES) {
    it(`generates solvable ${difficulty} puzzles`, () => {
      for (let i = 0; i < 5; i++) {
        const { puzzle, solution } = zipEngine.generate(createRng(`z-${difficulty}-${i}`), difficulty);
        const cfg = ZIP_CONFIG[difficulty];
        expect(puzzle.size).toBe(cfg.size);
        expect(puzzle.waypoints).toHaveLength(cfg.waypoints);
        expect(puzzle.walls).toHaveLength(cfg.walls);
        expect(new Set(puzzle.waypoints.map((w) => `${w.r},${w.c}`)).size).toBe(cfg.waypoints);
        expect(checkZip(puzzle, solution)).toBeNull();
      }
    });
  }

  it('rejects reversed, short, jumping and walled paths', () => {
    const { puzzle, solution } = zipEngine.generate(createRng('rej'), 'hard');
    expect(checkZip(puzzle, [...solution].reverse())).not.toBeNull();
    expect(checkZip(puzzle, solution.slice(1))).toMatch(/every cell/);
    const jump = solution.slice();
    [jump[3], jump[5]] = [jump[5], jump[3]];
    expect(checkZip(puzzle, jump)).not.toBeNull();
    const w = puzzle.walls[0];
    expect(checkZip({ ...puzzle, walls: [{ a: solution[0], b: solution[1] }] }, solution)).toMatch(/wall/);
    expect(w).toBeDefined();
  });
});
