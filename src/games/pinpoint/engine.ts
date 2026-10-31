import { z } from 'zod';
import type { GameEngine } from '../types';
import { PINPOINT_CATEGORIES } from './categories';
import { PINPOINT_CLUES_SHOWN, PINPOINT_CONFIG, PINPOINT_PENALTY } from './config';
import type { PinpointClient, PinpointPuzzle, PinpointState } from './types';

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('guess'), option: z.string().max(64) }),
  z.object({ type: z.literal('reveal') }),
]);

export const pinpointEngine: GameEngine<PinpointPuzzle, string, PinpointState, PinpointClient> = {
  id: 'pinpoint',
  generatorVersion: 1,
  generate(rng, difficulty) {
    const cfg = PINPOINT_CONFIG[difficulty];
    const answer = rng.pick(PINPOINT_CATEGORIES);
    const others = rng.shuffle(PINPOINT_CATEGORIES.filter((c) => c.id !== answer.id));
    const ordered = cfg.sameFamilyDistractors
      ? [...others.filter((c) => c.family === answer.family), ...others.filter((c) => c.family !== answer.family)]
      : others;
    const options = rng
      .shuffle([answer, ...ordered.slice(0, cfg.options - 1)])
      .map((c) => ({ id: c.id, label: c.label }));
    const clues = answer.clues.slice(cfg.clueStart, cfg.clueStart + PINPOINT_CLUES_SHOWN);
    return { puzzle: { answerId: answer.id, clues, options }, solution: answer.id };
  },
  initialState: () => ({ revealed: 1, wrong: [] }),
  toClient: (p, s) => ({
    clues: p.clues.slice(0, s.revealed),
    totalClues: p.clues.length,
    options: p.options,
    wrong: s.wrong,
  }),
  act(puzzle, state, action) {
    const parsed = actionSchema.safeParse(action);
    if (!parsed.success) return { state, solved: false, message: 'Pick a category.' };
    if (parsed.data.type === 'reveal') {
      if (state.revealed >= puzzle.clues.length) return { state, solved: false, message: 'All clues are showing.' };
      return { state: { ...state, revealed: state.revealed + 1 }, solved: false };
    }
    const { option } = parsed.data;
    if (!puzzle.options.some((o) => o.id === option)) return { state, solved: false, message: 'Pick one of the categories.' };
    if (state.wrong.includes(option)) return { state, solved: false, message: 'Already ruled out.' };
    if (option === puzzle.answerId) return { state, solved: true };
    // A wrong pick rules that option out and reveals another clue.
    return {
      state: { revealed: Math.min(puzzle.clues.length, state.revealed + 1), wrong: [...state.wrong, option] },
      solved: false,
      message: 'Not that one. Another clue is revealed.',
    };
  },
  penalty(_puzzle, state) {
    const p = (state.revealed - 1) * PINPOINT_PENALTY.perExtraClue + state.wrong.length * PINPOINT_PENALTY.perWrongGuess;
    return Math.min(PINPOINT_PENALTY.max, p);
  },
  highlights: (_p, state) => (state.revealed === 1 && state.wrong.length === 0 ? ['pinpoint:one-clue'] : []),
};
