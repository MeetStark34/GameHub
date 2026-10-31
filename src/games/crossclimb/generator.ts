import type { Rng } from '@/lib/rng';
import { answerWords, ladderDistances, ladderGraph } from '../words/dictionary';
import type { CrossclimbDifficulty } from './config';
import type { CrossclimbPuzzle, CrossclimbSolution } from './types';

export function generateCrossclimb(
  rng: Rng,
  cfg: CrossclimbDifficulty,
): { puzzle: CrossclimbPuzzle; solution: CrossclimbSolution } {
  const steps = cfg.rungs + 1;
  const common = ladderGraph('answers', cfg.length);
  const full = ladderGraph('dictionary', cfg.length);
  const pool = answerWords(cfg.length).filter((w) => (common.get(w)?.length ?? 0) >= 2);

  for (let attempt = 0; attempt < 400; attempt++) {
    const top = rng.pick(pool);
    const viaCommon = ladderDistances(common, top);
    const targets = [...viaCommon].filter(([, v]) => v.dist === steps).map(([w]) => w);
    if (!targets.length) continue;
    const bottom = rng.pick(targets.sort());
    // Reject pairs that a rarer dictionary word could shortcut.
    if (ladderDistances(full, top).get(bottom)?.dist !== steps) continue;

    // Walk back from bottom picking random predecessors -> one common-word ladder.
    const ladder = [bottom];
    while (ladder[0] !== top) ladder.unshift(rng.pick(viaCommon.get(ladder[0])!.prev.slice().sort()));
    const hints = ladder.slice(1).map((w, i) => {
      if (!rng.chance(cfg.hintRate)) return null;
      return [...w].findIndex((ch, k) => ch !== ladder[i][k]);
    });
    return {
      puzzle: { length: cfg.length, top, bottom, rungs: cfg.rungs, hints },
      solution: ladder.slice(1, -1),
    };
  }
  throw new Error('Crossclimb: failed to generate a ladder');
}
