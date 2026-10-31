import type { Difficulty } from '../types';

export interface CrossclimbDifficulty {
  /** Clued middle rungs shown scrambled (the ladder has 2 more words). */
  rungs: number;
  /** Show the first letter of each middle answer. */
  firstLetterHints: boolean;
}

/** All Crossclimb words are 4 letters (see clues.ts). */
export const CROSSCLIMB_WORD_LENGTH = 4;

export const CROSSCLIMB_CONFIG: Record<Difficulty, CrossclimbDifficulty> = {
  easy: { rungs: 3, firstLetterHints: true },
  normal: { rungs: 4, firstLetterHints: true },
  hard: { rungs: 5, firstLetterHints: false },
  expert: { rungs: 6, firstLetterHints: false },
};

/** Score lost per wrong check, and the cap. */
export const CROSSCLIMB_PENALTY = { perMistake: 0.1, max: 0.6 };
