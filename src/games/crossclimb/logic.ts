import { isWord, normalizeWord, oneLetterApart } from '../words/dictionary';
import type { CrossclimbPuzzle } from './types';

/**
 * Rules: fill exactly `rungs` words between top and bottom; every word is a
 * real word of the same length, all words are different, and each word
 * changes exactly one letter from the one above it.
 */
export function checkCrossclimb(puzzle: CrossclimbPuzzle, raw: string[]): string | null {
  if (raw.length !== puzzle.rungs) return `Fill all ${puzzle.rungs} rungs.`;
  const words = raw.map(normalizeWord);
  for (const [i, w] of words.entries()) {
    if (w.length !== puzzle.length || !/^[a-z]+$/.test(w)) return `Rung ${i + 1} needs ${puzzle.length} letters.`;
    if (!isWord(w)) return `"${w.toUpperCase()}" is not in the word list.`;
  }
  const ladder = [puzzle.top, ...words, puzzle.bottom];
  if (new Set(ladder).size !== ladder.length) return 'Each word in the ladder must be different.';
  for (let i = 1; i < ladder.length; i++) {
    if (!oneLetterApart(ladder[i - 1], ladder[i]))
      return `${ladder[i - 1].toUpperCase()} to ${ladder[i].toUpperCase()} must change exactly one letter.`;
  }
  return null;
}
