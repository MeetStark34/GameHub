export interface PinpointOption {
  id: string;
  label: string;
}

export interface PinpointPuzzle {
  answerId: string;
  /** Five clues, most ambiguous first. */
  clues: string[];
  options: PinpointOption[];
}

export interface PinpointState {
  /** How many clues are visible (1..clues.length). */
  revealed: number;
  /** Option ids already guessed wrong. */
  wrong: string[];
}

export interface PinpointClient {
  clues: string[];
  totalClues: number;
  options: PinpointOption[];
  wrong: string[];
}
