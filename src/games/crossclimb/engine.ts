import { z } from 'zod';
import type { GameEngine } from '../types';
import { msg } from '../shared';
import { CROSSCLIMB_CONFIG, CROSSCLIMB_PENALTY } from './config';
import { generateCrossclimb } from './generator';
import { checkMiddle, endAnswers, normalize } from './logic';
import type { CrossclimbClient, CrossclimbPuzzle, CrossclimbSolution, CrossclimbState } from './types';

const word = z.string().max(12);
const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('middle'), rows: z.array(z.object({ id: z.string().max(8), word })).max(10) }),
  z.object({ type: z.literal('ends'), top: word, bottom: word }),
]);

const reversedFor = (p: CrossclimbPuzzle, order: string[]) => order[0] !== p.middle[0].id;

export const crossclimbEngine: GameEngine<CrossclimbPuzzle, CrossclimbSolution, CrossclimbState, CrossclimbClient> = {
  id: 'crossclimb',
  generatorVersion: 2,
  generate: (rng, difficulty) => generateCrossclimb(rng, CROSSCLIMB_CONFIG[difficulty]),
  fingerprint: (p) => `ladder:${[p.top.word, ...p.middle.map((m) => m.word), p.bottom.word].sort().join('-')}`,
  initialState: () => ({ phase: 'middle', order: null, mistakes: 0 }),
  toClient(p, s) {
    const byId = new Map(p.middle.map((m) => [m.id, m]));
    const ends = s.phase === 'ends' && s.order ? endAnswers(p, reversedFor(p, s.order)) : null;
    return {
      length: p.length,
      phase: s.phase,
      rows: p.shuffled.map((id) => {
        const r = byId.get(id)!;
        return { id, clue: r.clue, hint: p.firstLetterHints ? r.word[0] : null };
      }),
      locked: s.order ? s.order.map((id) => ({ id, word: byId.get(id)!.word })) : null,
      ends: ends ? { topClue: ends.top.clue, bottomClue: ends.bottom.clue } : null,
      mistakes: s.mistakes,
    };
  },
  act(p, s, action) {
    const parsed = actionSchema.safeParse(action);
    if (!parsed.success) return { state: s, solved: false, message: msg('unreadable') };
    const a = parsed.data;
    if (a.type === 'middle') {
      if (s.phase !== 'middle') return { state: s, solved: false, message: msg('crossclimb.solved') };
      const res = checkMiddle(p, a.rows);
      if (res.wrong.length) {
        return {
          state: { ...s, mistakes: s.mistakes + 1 },
          solved: false,
          message: msg('crossclimb.wrongRungs', { n: res.wrong.length }),
          feedback: { wrong: res.wrong },
        };
      }
      if (res.orderWrong)
        return {
          state: { ...s, mistakes: s.mistakes + 1 },
          solved: false,
          message: msg('crossclimb.order'),
          feedback: { wrong: [], orderWrong: true },
        };
      return { state: { ...s, phase: 'ends', order: a.rows.map((r) => r.id) }, solved: false, feedback: { unlocked: true } };
    }
    if (s.phase !== 'ends' || !s.order) return { state: s, solved: false, message: msg('crossclimb.middleFirst') };
    const ends = endAnswers(p, reversedFor(p, s.order));
    const topOk = normalize(a.top) === ends.top.word;
    const bottomOk = normalize(a.bottom) === ends.bottom.word;
    if (topOk && bottomOk) return { state: s, solved: true };
    return {
      state: { ...s, mistakes: s.mistakes + 1 },
      solved: false,
      message: msg(!topOk && !bottomOk ? 'crossclimb.bothEnds' : !topOk ? 'crossclimb.top' : 'crossclimb.bottom'),
      feedback: { topOk, bottomOk },
    };
  },
  penalty: (_p, s) => Math.min(CROSSCLIMB_PENALTY.max, s.mistakes * CROSSCLIMB_PENALTY.perMistake),
};
