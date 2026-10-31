import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/rng';
import { ENGINES } from './registry';
import { DIFFICULTIES, GAME_IDS } from './types';

describe('game registry', () => {
  it('has an engine for every game id', () => {
    for (const id of GAME_IDS) expect(ENGINES[id].id).toBe(id);
  });

  for (const id of GAME_IDS) {
    it(`${id}: generates every difficulty quickly and deterministically, state round-trips JSON`, () => {
      for (const d of DIFFICULTIES) {
        const t0 = performance.now();
        const a = ENGINES[id].generate(createRng(`perf-${id}-${d}`), d);
        const elapsed = performance.now() - t0;
        expect(elapsed).toBeLessThan(3000);
        const b = ENGINES[id].generate(createRng(`perf-${id}-${d}`), d);
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
        const state = ENGINES[id].initialState(a.puzzle);
        expect(JSON.parse(JSON.stringify(state))).toEqual(state);
        // Engines never throw on hostile input.
        for (const junk of [null, 1, 'x', {}, { type: 'submit' }, { type: 'submit', solution: { a: 1 } }])
          expect(() => ENGINES[id].act(a.puzzle, state, junk)).not.toThrow();
      }
    });
  }
});
