import { z } from 'zod';
import type { GameEngine } from '../types';
import { msg } from '../shared';
import { answerWords, isWord, normalizeWord } from '../words/dictionary';
import { WERD_CONFIG, WERD_PENALTY } from './config';
import { markGuess, strictViolation } from './logic';
import type { WerdClient, WerdPuzzle, WerdState } from './types';

const actionSchema = z.object({ type: z.literal('guess'), word: z.string().max(16) });
const MAX_GUESSES_STORED = 60;

export const werdEngine: GameEngine<WerdPuzzle, string, WerdState, WerdClient> = {
  id: 'werd',
  generatorVersion: 1,
  generate(rng, difficulty) {
    const cfg = WERD_CONFIG[difficulty];
    const answer = rng.pick(answerWords(cfg.length));
    return { puzzle: { length: cfg.length, answer, strict: cfg.strict, parGuesses: cfg.parGuesses }, solution: answer };
  },
  fingerprint: (p) => `word:${p.answer}`,
  initialState: () => ({ guesses: [] }),
  toClient: (p, s) => ({ length: p.length, strict: p.strict, parGuesses: p.parGuesses, guesses: s.guesses }),
  act(puzzle, state, action) {
    const parsed = actionSchema.safeParse(action);
    if (!parsed.success) return { state, solved: false, message: msg('werd.type') };
    const word = normalizeWord(parsed.data.word);
    if (!/^[a-z]+$/.test(word) || word.length !== puzzle.length)
      return { state, solved: false, message: msg('werd.length', { n: puzzle.length }) };
    if (!isWord(word)) return { state, solved: false, message: msg('werd.notWord') };
    if (state.guesses.some((g) => g.word === word)) return { state, solved: false, message: msg('werd.repeat') };
    if (state.guesses.length >= MAX_GUESSES_STORED) return { state, solved: false, message: msg('werd.tooMany') };
    if (puzzle.strict) {
      const why = strictViolation(word, state.guesses);
      if (why) return { state, solved: false, message: why };
    }
    const marks = markGuess(word, puzzle.answer);
    const next: WerdState = { guesses: [...state.guesses, { word, marks }] };
    return { state: next, solved: word === puzzle.answer, feedback: marks };
  },
  penalty(puzzle, state) {
    const extra = Math.max(0, state.guesses.length - puzzle.parGuesses);
    return Math.min(WERD_PENALTY.max, extra * WERD_PENALTY.perExtraGuess);
  },
  highlights: (_p, state) => (state.guesses.length === 1 ? ['werd:first-guess'] : []),
};
