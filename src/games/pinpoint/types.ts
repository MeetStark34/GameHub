export interface PinpointOption {
  id: string;
  label: string;
}

export interface PinpointPuzzle {
  categoryId: string;
  /** Canonical answer (server only until solved). */
  label: string;
  /** Every accepted answer: label + aliases (server only). */
  accept: string[];
  /** Five clues, most ambiguous first. */
  clues: string[];
  /** Multiple-choice assist options (includes the answer). */
  options: PinpointOption[];
  /** Clues that must be revealed before the assist can be opened. */
  assistAfter: number;
}

export interface PinpointState {
  /** Visible clues (1..5). */
  revealed: number;
  /** Wrong free-text guesses, newest last. */
  guesses: string[];
  /** Assist (multiple choice) opened. */
  assist: boolean;
  /** Option ids ruled out while using the assist. */
  wrong: string[];
  solved: boolean;
}

export interface PinpointClient {
  clues: string[];
  totalClues: number;
  guesses: string[];
  assistAvailable: boolean;
  assistAfter: number;
  /** Only present once the assist is opened. */
  options: PinpointOption[] | null;
  wrong: string[];
  /** Revealed after solving. */
  answer: string | null;
}
