import type { Difficulty } from '../types';
import type { WordLength } from '../words/dictionary';

export interface WerdDifficulty {
  length: WordLength;
  strict: boolean;
  /** Guesses allowed before score starts dropping (there is no guess limit). */
  parGuesses: number;
}

export const WERD_CONFIG: Record<Difficulty, WerdDifficulty> = {
  easy: { length: 4, strict: false, parGuesses: 6 },
  normal: { length: 5, strict: false, parGuesses: 6 },
  hard: { length: 6, strict: false, parGuesses: 6 },
  expert: { length: 6, strict: true, parGuesses: 6 },
};

/** Score lost per guess beyond par, and the cap. */
export const WERD_PENALTY = { perExtraGuess: 0.08, max: 0.6 };
