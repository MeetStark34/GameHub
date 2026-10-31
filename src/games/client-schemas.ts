import { z } from 'zod';
import type { GameId } from './types';

/**
 * Runtime contracts for the puzzle data each board receives (engine
 * `toClient` output). TypeScript types alone cannot guarantee what comes
 * back from the database; the server validates every payload against these
 * before sending it, so a board never renders with missing fields.
 */
const int = z.number().int();
const cell = z.tuple([int, int]);

export const CLIENT_PUZZLE_SCHEMAS: Record<GameId, z.ZodType> = {
  patches: z.object({
    rows: int.positive(),
    cols: int.positive(),
    clues: z.array(z.object({ r: int, c: int, area: int.positive(), shape: z.enum(['square', 'wide', 'tall', 'any']) })).min(1),
  }),
  sudoku: z.object({ size: int.positive(), boxRows: int.positive(), boxCols: int.positive(), givens: z.array(z.array(int)).min(1) }),
  zip: z.object({
    size: int.positive(),
    waypoints: z.array(z.object({ r: int, c: int, n: int.positive() })).min(2),
    walls: z.array(z.object({ a: cell, b: cell })),
  }),
  werd: z.object({
    length: int.positive(),
    strict: z.boolean(),
    parGuesses: int.positive(),
    guesses: z.array(z.object({ word: z.string(), marks: z.array(z.enum(['hit', 'near', 'miss'])) })),
  }),
  pinpoint: z.object({
    clues: z.array(z.string()).min(1),
    totalClues: int.positive(),
    guesses: z.array(z.string()),
    assistAvailable: z.boolean(),
    assistAfter: int.positive(),
    options: z.array(z.object({ id: z.string(), label: z.string() })).nullable(),
    wrong: z.array(z.string()),
    answer: z.string().nullable(),
  }),
  crossclimb: z.object({
    length: int.positive(),
    phase: z.enum(['middle', 'ends']),
    rows: z.array(z.object({ id: z.string(), clue: z.string(), hint: z.string().nullable() })).min(1),
    locked: z.array(z.object({ id: z.string(), word: z.string() })).nullable(),
    ends: z.object({ topClue: z.string(), bottomClue: z.string() }).nullable(),
    mistakes: int.nonnegative(),
  }),
  tango: z.object({
    size: int.positive(),
    givens: z.array(z.array(int)).min(1),
    edges: z.array(z.object({ a: cell, b: cell, kind: z.enum(['same', 'diff']) })),
  }),
  queens: z.object({ size: int.positive(), regions: z.array(z.array(int)).min(1) }),
};

/** True when `payload` is a well-formed client puzzle for `game`. */
export function isValidClientPuzzle(game: GameId, payload: unknown): boolean {
  return CLIENT_PUZZLE_SCHEMAS[game].safeParse(payload).success;
}
