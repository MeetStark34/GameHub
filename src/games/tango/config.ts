import type { Difficulty } from '../types';

export interface TangoDifficulty {
  size: number;
  /** Clues restored on top of a minimal clue set (higher = easier). */
  extraClues: number;
}

export const TANGO_CONFIG: Record<Difficulty, TangoDifficulty> = {
  easy: { size: 6, extraClues: 6 },
  normal: { size: 6, extraClues: 1 },
  hard: { size: 8, extraClues: 4 },
  expert: { size: 8, extraClues: 0 },
};
