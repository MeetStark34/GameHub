import type { Difficulty } from '../types';
import type { WordLength } from '../words/dictionary';

export interface CrossclimbDifficulty {
  length: WordLength;
  rungs: number;
  /** Probability each step shows which letter changes. */
  hintRate: number;
}

export const CROSSCLIMB_CONFIG: Record<Difficulty, CrossclimbDifficulty> = {
  easy: { length: 3, rungs: 2, hintRate: 1 },
  normal: { length: 4, rungs: 3, hintRate: 0.5 },
  hard: { length: 4, rungs: 4, hintRate: 0 },
  expert: { length: 5, rungs: 4, hintRate: 0 },
};
