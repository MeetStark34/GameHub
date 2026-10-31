import type { Difficulty } from '../types';

export interface PinpointDifficulty {
  /** Index into each category's 8 ambiguity-ordered clues where the 5 shown clues start (0 = most cryptic). */
  clueStart: number;
  /** Clues that must be revealed before the multiple-choice assist unlocks. */
  assistAfter: number;
  /** Options in the assist (1 correct + distractors). */
  options: number;
  /** Assist distractors come from the same family (look-alikes). */
  sameFamilyDistractors: boolean;
}

export const PINPOINT_CLUES_SHOWN = 5;

export const PINPOINT_CONFIG: Record<Difficulty, PinpointDifficulty> = {
  easy: { clueStart: 3, assistAfter: 3, options: 4, sameFamilyDistractors: false },
  normal: { clueStart: 2, assistAfter: 5, options: 6, sameFamilyDistractors: false },
  hard: { clueStart: 1, assistAfter: 5, options: 6, sameFamilyDistractors: true },
  expert: { clueStart: 0, assistAfter: 5, options: 8, sameFamilyDistractors: true },
};

/** Score loss: each extra clue, each wrong typed guess, opening the assist, each wrong assist pick. */
export const PINPOINT_PENALTY = { perExtraClue: 0.1, perWrongGuess: 0.03, assist: 0.25, perWrongPick: 0.08, max: 0.85 };
