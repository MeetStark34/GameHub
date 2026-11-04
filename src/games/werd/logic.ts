import type { Msg } from '@/i18n/translate';
import { msg } from '../core';
import type { WerdGuess, WerdMark } from './types';

/** Standard two-pass marking that handles repeated letters correctly. */
export function markGuess(guess: string, answer: string): WerdMark[] {
  const marks: WerdMark[] = new Array(guess.length).fill('miss');
  const remaining = new Map<string, number>();
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) marks[i] = 'hit';
    else remaining.set(answer[i], (remaining.get(answer[i]) ?? 0) + 1);
  }
  for (let i = 0; i < guess.length; i++) {
    if (marks[i] === 'hit') continue;
    const left = remaining.get(guess[i]) ?? 0;
    if (left > 0) {
      marks[i] = 'near';
      remaining.set(guess[i], left - 1);
    }
  }
  return marks;
}

/** Strict mode: returns why `word` ignores earlier feedback, or null. */
export function strictViolation(word: string, previous: WerdGuess[]): Msg | null {
  for (const g of previous) {
    const required = new Map<string, number>();
    for (let i = 0; i < g.word.length; i++) {
      if (g.marks[i] === 'hit' && word[i] !== g.word[i])
        return msg('werd.strictHit', { n: i + 1, letter: g.word[i].toUpperCase() });
      if (g.marks[i] !== 'miss') required.set(g.word[i], (required.get(g.word[i]) ?? 0) + 1);
    }
    for (const [letter, n] of required) {
      if ([...word].filter((x) => x === letter).length < n) return msg('werd.strictUse', { letter: letter.toUpperCase() });
    }
  }
  return null;
}
