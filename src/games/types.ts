import type { Rng } from '@/lib/rng';

export const GAME_IDS = [
  'patches',
  'sudoku',
  'zip',
  'werd',
  'pinpoint',
  'crossclimb',
  'tango',
  'queens',
] as const;
export type GameId = (typeof GAME_IDS)[number];

export const DIFFICULTIES = ['easy', 'normal', 'hard', 'expert'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export type GameMode = 'daily' | 'unlimited';

export function isGameId(v: unknown): v is GameId {
  return typeof v === 'string' && (GAME_IDS as readonly string[]).includes(v);
}
export function isDifficulty(v: unknown): v is Difficulty {
  return typeof v === 'string' && (DIFFICULTIES as readonly string[]).includes(v);
}

export interface Generated<P, Sol> {
  puzzle: P;
  /** A reference solution. Never sent to the client. */
  solution: Sol;
}

/**
 * Result of applying a player action to a session on the server.
 * `solved` is the only path to a completion; there is no fail state.
 */
export interface ActResult<St> {
  state: St;
  solved: boolean;
  /** Short, player-facing message when an action was rejected or wrong. */
  message?: string;
  /** Game-specific feedback for the UI (e.g. Werd letter marks). */
  feedback?: unknown;
}

/**
 * Contract every game implements. Engines are pure and deterministic:
 * all randomness comes from the supplied Rng, and no engine touches the
 * database, clock or network. The server owns persistence and timing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface GameEngine<P = any, Sol = any, St = any, Pub = any> {
  id: GameId;
  /** Bump when generator output for a given seed changes. */
  generatorVersion: number;
  generate(rng: Rng, difficulty: Difficulty): Generated<P, Sol>;
  initialState(puzzle: P): St;
  /** Data safe to show the player for the current state (no secrets). */
  toClient(puzzle: P, state: St): Pub;
  /** Validate and apply an untrusted action. Never throws on bad input. */
  act(puzzle: P, state: St, action: unknown): ActResult<St>;
  /**
   * Fraction of score lost to mistakes/hints/extra guesses, in [0, 0.9].
   * Time is scored separately by the shared scoring module.
   */
  penalty(puzzle: P, state: St): number;
  /** Notable things about a solved run, for achievements (e.g. 'werd:first-guess'). */
  highlights?(puzzle: P, state: St): string[];
}

/** Common state shape for "solve the board, then submit" logic games. */
export interface SubmitState {
  /** Rejected submissions (each one costs a little score, never fails). */
  wrongSubmits: number;
}
