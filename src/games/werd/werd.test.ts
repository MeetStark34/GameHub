import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/rng';
import { DIFFICULTIES } from '../types';
import { isWord } from '../words/dictionary';
import { WERD_CONFIG } from './config';
import { werdEngine } from './engine';
import { markGuess, strictViolation } from './logic';

describe('werd', () => {
  it('marks repeated letters correctly', () => {
    expect(markGuess('speed', 'abide')).toEqual(['miss', 'miss', 'near', 'miss', 'near']);
    expect(markGuess('eerie', 'tease')).toEqual(['miss', 'hit', 'miss', 'miss', 'hit']);
    expect(markGuess('eerie', 'enter')).toEqual(['hit', 'near', 'near', 'miss', 'miss']);
    expect(markGuess('crane', 'crane')).toEqual(['hit', 'hit', 'hit', 'hit', 'hit']);
  });

  for (const difficulty of DIFFICULTIES) {
    it(`${difficulty}: answer is a dictionary word of the configured length and is hidden`, () => {
      const { puzzle } = werdEngine.generate(createRng(`w-${difficulty}`), difficulty);
      expect(puzzle.answer).toHaveLength(WERD_CONFIG[difficulty].length);
      expect(isWord(puzzle.answer)).toBe(true);
      const client = werdEngine.toClient(puzzle, werdEngine.initialState(puzzle));
      expect(JSON.stringify(client)).not.toContain(puzzle.answer);
    });
  }

  it('rejects non-words, wrong length and repeats without penalty; solves on the answer', () => {
    const puzzle = { length: 5, answer: 'crane', strict: false, parGuesses: 2 };
    let state = werdEngine.initialState(puzzle);
    expect(werdEngine.act(puzzle, state, { type: 'guess', word: 'zzzzz' }).message?.key).toBe('gameMsg.werd.notWord');
    expect(werdEngine.act(puzzle, state, { type: 'guess', word: 'cat' }).message?.key).toBe('gameMsg.werd.length');
    let r = werdEngine.act(puzzle, state, { type: 'guess', word: 'Stone' });
    expect(r.solved).toBe(false);
    state = r.state;
    expect(werdEngine.act(puzzle, state, { type: 'guess', word: 'stone' }).message?.key).toBe('gameMsg.werd.repeat');
    r = werdEngine.act(puzzle, state, { type: 'guess', word: 'house' });
    state = r.state;
    r = werdEngine.act(puzzle, state, { type: 'guess', word: 'crane' });
    expect(r.solved).toBe(true);
    expect(werdEngine.penalty(puzzle, r.state)).toBeCloseTo(0.08);
  });

  it('strict mode enforces revealed letters', () => {
    const prev = [{ word: 'stone', marks: markGuess('stone', 'crane') }];
    expect(strictViolation('house', prev)).not.toBeNull();
    expect(strictViolation('crane', prev)).toBeNull();
  });
});
