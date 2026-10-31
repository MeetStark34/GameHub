import type { Difficulty } from '../types';

/** Board size per difficulty. Larger boards mean more regions to reason about. */
export const QUEENS_CONFIG: Record<Difficulty, { size: number }> = {
  easy: { size: 6 },
  normal: { size: 7 },
  hard: { size: 8 },
  expert: { size: 9 },
};
