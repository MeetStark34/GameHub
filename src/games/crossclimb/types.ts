/**
 * Crossclimb: a ladder of words where neighbours differ by exactly one
 * letter. The middle rungs are clued and shown in scrambled order; the
 * player solves each clue, then orders the rungs into a valid ladder. That
 * unlocks the top and bottom words, which are solved from their own clues.
 */
export interface ClimbRung {
  /** Opaque id (not derived from the word). */
  id: string;
  word: string;
  clue: string;
}

export interface CrossclimbPuzzle {
  length: number;
  /** Middle rungs in correct ladder order (server only). */
  middle: ClimbRung[];
  top: ClimbRung;
  bottom: ClimbRung;
  /** Order the middle rungs are first shown in. */
  shuffled: string[];
  /** Reveal each middle answer's first letter. */
  firstLetterHints: boolean;
}

/** The full ladder top -> bottom. */
export type CrossclimbSolution = string[];

export interface CrossclimbState {
  phase: 'middle' | 'ends';
  /** Middle rung ids in the order the player locked them in (phase 'ends'). */
  order: string[] | null;
  mistakes: number;
}

export interface CrossclimbClient {
  length: number;
  phase: 'middle' | 'ends';
  rows: { id: string; clue: string; hint: string | null }[];
  /** Phase 'ends': confirmed middle words in the player's order. */
  locked: { id: string; word: string }[] | null;
  /** Phase 'ends': clues for the word above the first row and below the last. */
  ends: { topClue: string; bottomClue: string } | null;
  mistakes: number;
}
