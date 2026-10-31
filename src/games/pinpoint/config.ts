import type { Difficulty } from '../types';

export interface PinpointDifficulty {
  /** Category labels to choose from (1 correct + distractors). */
  options: number;
  /** Index into each category's 8 ambiguity-ordered clues where the 5 shown clues start. */
  clueStart: number;
  /** Prefer distractors from the same family (close, confusing options). */
  sameFamilyDistractors: boolean;
}

export const PINPOINT_CLUES_SHOWN = 5;

export const PINPOINT_CONFIG: Record<Difficulty, PinpointDifficulty> = {
  easy: { options: 4, clueStart: 3, sameFamilyDistractors: false },
  normal: { options: 6, clueStart: 2, sameFamilyDistractors: false },
  hard: { options: 6, clueStart: 1, sameFamilyDistractors: true },
  expert: { options: 8, clueStart: 0, sameFamilyDistractors: true },
};

export const PINPOINT_PENALTY = { perExtraClue: 0.1, perWrongGuess: 0.08, max: 0.8 };
