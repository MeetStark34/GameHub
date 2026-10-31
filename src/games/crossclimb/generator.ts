import type { Rng } from '@/lib/rng';
import { oneLetterApart } from '../words/oneLetter';
import { CROSSCLIMB_CLUES } from './clues';
import type { CrossclimbDifficulty } from './config';
import type { ClimbRung, CrossclimbPuzzle } from './types';

let graph: Map<string, string[]> | null = null;

/** One-letter adjacency over the clued words only. */
export function clueGraph(): Map<string, string[]> {
  if (graph) return graph;
  const words = [...CROSSCLIMB_CLUES.keys()].sort();
  graph = new Map(words.map((w) => [w, words.filter((x) => oneLetterApart(w, x))]));
  return graph;
}

/**
 * A ladder whose words connect ONLY along the ladder (no extra one-letter
 * links between non-neighbours), so the correct order is unique up to
 * reversal and the puzzle has no accidental ambiguity.
 */
function isCleanPath(path: string[]): boolean {
  for (let i = 0; i < path.length; i++)
    for (let j = i + 2; j < path.length; j++) if (oneLetterApart(path[i], path[j])) return false;
  return true;
}

function randomPath(rng: Rng, g: Map<string, string[]>, length: number): string[] | null {
  const start = rng.pick([...g.keys()].filter((w) => g.get(w)!.length > 0));
  const path = [start];
  const go = (): boolean => {
    if (path.length === length) return true;
    const last = path[path.length - 1];
    for (const next of rng.shuffle(g.get(last)!)) {
      if (path.includes(next)) continue;
      // Reject chords early: next must not link to anything but `last`.
      if (path.slice(0, -1).some((w) => oneLetterApart(w, next))) continue;
      path.push(next);
      if (go()) return true;
      path.pop();
    }
    return false;
  };
  return go() ? path : null;
}

export function generateCrossclimb(rng: Rng, cfg: CrossclimbDifficulty): { puzzle: CrossclimbPuzzle; solution: string[] } {
  const g = clueGraph();
  const total = cfg.rungs + 2;
  for (let attempt = 0; attempt < 500; attempt++) {
    const path = randomPath(rng, g, total);
    if (!path || !isCleanPath(path)) continue;
    const ids = rng.shuffle(path.map((_, i) => `r${i}`));
    const rungs: ClimbRung[] = path.map((word, i) => ({ id: ids[i], word, clue: CROSSCLIMB_CLUES.get(word)! }));
    const middle = rungs.slice(1, -1);
    let shuffled = rng.shuffle(middle.map((m) => m.id));
    // Never show the rungs already in a correct order.
    const fwd = middle.map((m) => m.id).join();
    const rev = [...middle].reverse().map((m) => m.id).join();
    for (let k = 0; k < 10 && (shuffled.join() === fwd || shuffled.join() === rev); k++) shuffled = rng.shuffle(shuffled);
    return {
      puzzle: { length: 4, middle, top: rungs[0], bottom: rungs[rungs.length - 1], shuffled, firstLetterHints: cfg.firstLetterHints },
      solution: path,
    };
  }
  throw new Error('Crossclimb: failed to build a ladder');
}
