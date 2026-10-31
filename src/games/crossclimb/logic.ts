import { oneLetterApart } from '../words/oneLetter';
import type { CrossclimbPuzzle } from './types';

export const normalize = (w: string) => w.trim().toLowerCase();

/** True if each neighbour pair differs by exactly one letter. */
export const isLadder = (words: string[]) => words.every((w, i) => i === 0 || oneLetterApart(words[i - 1], w));

export interface MiddleCheck {
  /** Row ids whose typed word is not that clue's answer. */
  wrong: string[];
  /** All words right, but the order does not form a ladder. */
  orderWrong: boolean;
  /** Ladder runs bottom-to-top (accepted, ends are swapped). */
  reversed: boolean;
}

/**
 * Phase 1: every clue answered correctly and the rows ordered so that the
 * middle words form the ladder (either direction).
 */
export function checkMiddle(puzzle: CrossclimbPuzzle, rows: { id: string; word: string }[]): MiddleCheck {
  const answers = new Map(puzzle.middle.map((r) => [r.id, r.word]));
  const wrong = rows.filter((r) => answers.get(r.id) !== normalize(r.word)).map((r) => r.id);
  const missing = puzzle.middle.filter((m) => !rows.some((r) => r.id === m.id)).map((m) => m.id);
  if (wrong.length || missing.length || rows.length !== puzzle.middle.length)
    return { wrong: [...wrong, ...missing], orderWrong: false, reversed: false };
  const ids = rows.map((r) => r.id);
  const forward = puzzle.middle.map((m) => m.id);
  if (ids.join() === forward.join()) return { wrong: [], orderWrong: false, reversed: false };
  if (ids.join() === [...forward].reverse().join()) return { wrong: [], orderWrong: false, reversed: true };
  return { wrong: [], orderWrong: true, reversed: false };
}

/** Phase 2: the ends in the player's orientation. */
export function endAnswers(puzzle: CrossclimbPuzzle, reversed: boolean) {
  return reversed ? { top: puzzle.bottom, bottom: puzzle.top } : { top: puzzle.top, bottom: puzzle.bottom };
}
