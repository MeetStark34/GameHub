import type { Difficulty, GameMode } from '../types';

export interface TangoDifficulty {
  size: number;
  /** Clues restored on top of a minimal clue set (higher = easier). */
  extraClues: number;
}

/** Unlimited mode: board size grows with difficulty. */
export const TANGO_CONFIG: Record<Difficulty, TangoDifficulty> = {
  easy: { size: 6, extraClues: 6 },
  normal: { size: 6, extraClues: 1 },
  hard: { size: 8, extraClues: 4 },
  expert: { size: 8, extraClues: 0 },
};

/**
 * Daily Set: always 6x6 so the daily board stays quick and fits phones.
 * Difficulty still changes the puzzle via how many clues are kept.
 */
export const TANGO_DAILY_CONFIG: Record<Difficulty, TangoDifficulty> = {
  easy: { size: 6, extraClues: 8 },
  normal: { size: 6, extraClues: 3 },
  hard: { size: 6, extraClues: 1 },
  expert: { size: 6, extraClues: 0 },
};

export const tangoConfigFor = (difficulty: Difficulty, mode: GameMode = 'unlimited') =>
  (mode === 'daily' ? TANGO_DAILY_CONFIG : TANGO_CONFIG)[difficulty];
