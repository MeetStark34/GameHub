import type { Difficulty } from '../types';

export interface PatchesDifficulty {
  rows: number;
  cols: number;
  /** Largest patch the generator will cut. */
  maxArea: number;
  /** Probability each clue shows its shape hint. */
  shapeHintRate: number;
}

export const PATCHES_CONFIG: Record<Difficulty, PatchesDifficulty> = {
  easy: { rows: 5, cols: 5, maxArea: 6, shapeHintRate: 1 },
  normal: { rows: 6, cols: 6, maxArea: 8, shapeHintRate: 0.6 },
  hard: { rows: 7, cols: 7, maxArea: 9, shapeHintRate: 0.25 },
  expert: { rows: 8, cols: 8, maxArea: 12, shapeHintRate: 0 },
};
