import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/rng';
import { DIFFICULTIES } from '../types';
import { PINPOINT_CATEGORIES } from './categories';
import { PINPOINT_CONFIG } from './config';
import { pinpointEngine } from './engine';

describe('pinpoint', () => {
  it('content is well formed', () => {
    const ids = new Set(PINPOINT_CATEGORIES.map((c) => c.id));
    expect(ids.size).toBe(PINPOINT_CATEGORIES.length);
    for (const c of PINPOINT_CATEGORIES) {
      expect(c.clues).toHaveLength(8);
      expect(new Set(c.clues).size).toBe(8);
    }
  });

  for (const difficulty of DIFFICULTIES) {
    it(`${difficulty}: right option count, answer included, answer hidden from client`, () => {
      const { puzzle } = pinpointEngine.generate(createRng(`pp-${difficulty}`), difficulty);
      expect(puzzle.options).toHaveLength(PINPOINT_CONFIG[difficulty].options);
      expect(puzzle.options.some((o) => o.id === puzzle.answerId)).toBe(true);
      expect(puzzle.clues).toHaveLength(5);
      const client = pinpointEngine.toClient(puzzle, pinpointEngine.initialState(puzzle));
      expect(client.clues).toHaveLength(1);
      expect(client).not.toHaveProperty('answerId');
    });
  }

  it('is always completable: wrong guesses reveal clues and rule options out', () => {
    const { puzzle } = pinpointEngine.generate(createRng('complete'), 'expert');
    let state = pinpointEngine.initialState(puzzle);
    for (const o of puzzle.options.filter((x) => x.id !== puzzle.answerId)) {
      const r = pinpointEngine.act(puzzle, state, { type: 'guess', option: o.id });
      expect(r.solved).toBe(false);
      state = r.state;
    }
    expect(state.revealed).toBe(5);
    expect(pinpointEngine.act(puzzle, state, { type: 'guess', option: 'not-an-option' }).message).toMatch(/Pick/);
    expect(pinpointEngine.act(puzzle, state, { type: 'guess', option: puzzle.answerId }).solved).toBe(true);
    expect(pinpointEngine.penalty(puzzle, state)).toBeLessThanOrEqual(0.8);
  });
});
