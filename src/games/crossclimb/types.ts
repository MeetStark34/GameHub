export interface CrossclimbPuzzle {
  length: number;
  top: string;
  bottom: string;
  /** Number of intermediate words the player must find. */
  rungs: number;
  /**
   * hints[i] = 0-based letter position that changes between rung i and i+1
   * of the reference ladder (top = rung 0), or null when hidden.
   */
  hints: (number | null)[];
}

/** Intermediate words of a reference ladder. */
export type CrossclimbSolution = string[];

export interface CrossclimbState {
  wrongSubmits: number;
}
