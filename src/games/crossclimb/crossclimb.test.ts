import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/rng';
import { DIFFICULTIES } from '../types';
import { ladderDistances, ladderGraph, type WordLength } from '../words/dictionary';
import { CROSSCLIMB_CONFIG } from './config';
import { crossclimbEngine } from './engine';
import { checkCrossclimb } from './logic';

describe('crossclimb', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`generates ${difficulty} ladders with no dictionary shortcut`, () => {
      for (let i = 0; i < 3; i++) {
        const { puzzle, solution } = crossclimbEngine.generate(createRng(`c-${difficulty}-${i}`), difficulty);
        const cfg = CROSSCLIMB_CONFIG[difficulty];
        expect(puzzle.top).toHaveLength(cfg.length);
        expect(solution).toHaveLength(cfg.rungs);
        expect(puzzle.hints).toHaveLength(cfg.rungs + 1);
        expect(checkCrossclimb(puzzle, solution)).toBeNull();
        const dist = ladderDistances(ladderGraph('dictionary', cfg.length as WordLength), puzzle.top).get(puzzle.bottom);
        expect(dist?.dist).toBe(cfg.rungs + 1);
      }
    });
  }

  it('rejects non-words, two-letter jumps, repeats and wrong rung counts', () => {
    const puzzle = { length: 4, top: 'cold', bottom: 'warm', rungs: 3, hints: [null, null, null, null] };
    expect(checkCrossclimb(puzzle, ['cord', 'card', 'ward'])).toBeNull();
    expect(checkCrossclimb(puzzle, ['cord', 'card'])).toMatch(/rungs/);
    expect(checkCrossclimb(puzzle, ['cord', 'qxzz', 'ward'])).toMatch(/word list/);
    expect(checkCrossclimb(puzzle, ['cord', 'ward', 'card'])).toMatch(/one letter/);
    expect(checkCrossclimb(puzzle, ['cold', 'cord', 'ward'])).toMatch(/different/);
  });

  it('check action is free and reports validity', () => {
    const puzzle = { length: 4, top: 'cold', bottom: 'warm', rungs: 3, hints: [] };
    const state = crossclimbEngine.initialState(puzzle);
    const r = crossclimbEngine.act(puzzle, state, { type: 'check', word: 'CARD' });
    expect(r.feedback).toEqual({ word: 'card', valid: true });
    expect(r.state.wrongSubmits).toBe(0);
  });
});
