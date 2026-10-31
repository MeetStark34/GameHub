import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/rng';
import { DIFFICULTIES } from '../types';
import { SUDOKU_CONFIG } from './config';
import { sudokuEngine } from './engine';
import { checkSudoku, solveSudoku, sudokuConflicts } from './logic';

const givenCount = (g: number[][]) => g.flat().filter(Boolean).length;

describe('mini sudoku', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`generates unique ${difficulty} puzzles whose reference solution validates`, () => {
      for (let i = 0; i < 5; i++) {
        const { puzzle, solution } = sudokuEngine.generate(createRng(`s-${difficulty}-${i}`), difficulty);
        expect(puzzle.size).toBe(SUDOKU_CONFIG[difficulty].size);
        expect(solveSudoku(puzzle, puzzle.givens, 3).count).toBe(1);
        expect(checkSudoku(puzzle, solution)).toBeNull();
      }
    });
  }

  it('harder 6x6 difficulties show fewer givens on average', () => {
    const avg = (d: 'normal' | 'hard' | 'expert') => {
      let total = 0;
      for (let i = 0; i < 10; i++) total += givenCount(sudokuEngine.generate(createRng(`avg-${i}`), d).puzzle.givens);
      return total / 10;
    };
    expect(avg('normal')).toBeGreaterThan(avg('hard'));
    expect(avg('hard')).toBeGreaterThan(avg('expert'));
  });

  it('rejects repeats, empty cells and changed givens', () => {
    const { puzzle, solution } = sudokuEngine.generate(createRng('rej'), 'normal');
    const empty = solution.map((row) => row.slice());
    empty[0][0] = 0;
    expect(checkSudoku(puzzle, empty)).toMatch(/Fill/);
    const swapped = solution.map((row) => row.slice());
    [swapped[0][0], swapped[0][1]] = [swapped[0][1], swapped[0][0]];
    expect(checkSudoku(puzzle, swapped)).not.toBeNull();
    expect(sudokuConflicts(puzzle, [[1, 1, 0, 0, 0, 0], ...solution.slice(1)]).has('0,0')).toBe(true);
  });

  it('act() handles malformed shapes without throwing', () => {
    const { puzzle } = sudokuEngine.generate(createRng('m'), 'easy');
    const state = sudokuEngine.initialState(puzzle);
    expect(sudokuEngine.act(puzzle, state, { type: 'submit', solution: [[1]] }).solved).toBe(false);
    expect(sudokuEngine.act(puzzle, state, { type: 'submit', solution: 'x' }).solved).toBe(false);
  });
});
