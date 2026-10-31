import type { Difficulty } from '../types';

export interface ZipDifficulty {
  size: number;
  /** Numbered waypoints including start and finish (fewer = harder). */
  waypoints: number;
  /** Walls blocking moves between neighbouring cells. */
  walls: number;
}

export const ZIP_CONFIG: Record<Difficulty, ZipDifficulty> = {
  easy: { size: 5, waypoints: 9, walls: 0 },
  normal: { size: 6, waypoints: 8, walls: 3 },
  hard: { size: 7, waypoints: 7, walls: 5 },
  expert: { size: 8, waypoints: 6, walls: 6 },
};
