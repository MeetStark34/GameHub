export interface QueensPuzzle {
  size: number;
  /** regions[r][c] = region index in [0, size). */
  regions: number[][];
}
/** solution[r] = column of the crown in row r. */
export type QueensSolution = number[];
