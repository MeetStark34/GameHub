/** hit = right letter, right spot; near = in the word elsewhere; miss = absent. */
export type WerdMark = 'hit' | 'near' | 'miss';

export interface WerdGuess {
  word: string;
  marks: WerdMark[];
}

export interface WerdPuzzle {
  length: number;
  answer: string;
  /** Strict mode: revealed hits must stay, revealed letters must be reused. */
  strict: boolean;
  parGuesses: number;
}

export interface WerdState {
  guesses: WerdGuess[];
}

/** What the player sees. The answer is never included. */
export interface WerdClient {
  length: number;
  strict: boolean;
  parGuesses: number;
  guesses: WerdGuess[];
}
