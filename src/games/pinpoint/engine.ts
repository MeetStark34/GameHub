import { z } from 'zod';
import type { GameEngine } from '../types';
import { msg } from '../shared';
import { PINPOINT_CATEGORIES } from './categories';
import { PINPOINT_CLUES_SHOWN, PINPOINT_CONFIG, PINPOINT_PENALTY } from './config';
import { matchesAnswer } from './match';
import type { PinpointClient, PinpointPuzzle, PinpointState } from './types';

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('guess'), text: z.string().max(80) }),
  z.object({ type: z.literal('reveal') }),
  z.object({ type: z.literal('assist') }),
  z.object({ type: z.literal('pick'), option: z.string().max(64) }),
]);

const MAX_GUESSES = 40;

export const pinpointEngine: GameEngine<PinpointPuzzle, string, PinpointState, PinpointClient> = {
  id: 'pinpoint',
  generatorVersion: 2,
  generate(rng, difficulty) {
    const cfg = PINPOINT_CONFIG[difficulty];
    const answer = rng.pick(PINPOINT_CATEGORIES);
    const others = rng.shuffle(PINPOINT_CATEGORIES.filter((c) => c.id !== answer.id));
    const ordered = cfg.sameFamilyDistractors
      ? [...others.filter((c) => c.family === answer.family), ...others.filter((c) => c.family !== answer.family)]
      : others;
    const options = rng.shuffle([answer, ...ordered.slice(0, cfg.options - 1)]).map((c) => ({ id: c.id, label: c.label }));
    return {
      puzzle: {
        categoryId: answer.id,
        label: answer.label,
        accept: [answer.label, ...answer.aliases],
        clues: answer.clues.slice(cfg.clueStart, cfg.clueStart + PINPOINT_CLUES_SHOWN),
        options,
        assistAfter: cfg.assistAfter,
      },
      solution: answer.id,
    };
  },
  fingerprint: (p) => `category:${p.categoryId}`,
  initialState: () => ({ revealed: 1, guesses: [], assist: false, wrong: [], solved: false }),
  toClient: (p, s) => ({
    clues: p.clues.slice(0, s.revealed),
    totalClues: p.clues.length,
    guesses: s.guesses,
    assistAvailable: s.revealed >= p.assistAfter,
    assistAfter: p.assistAfter,
    options: s.assist ? p.options : null,
    wrong: s.wrong,
    answer: s.solved ? p.label : null,
  }),
  act(p, s, action) {
    const parsed = actionSchema.safeParse(action);
    if (!parsed.success) return { state: s, solved: false, message: msg('pinpoint.unreadable') };
    const a = parsed.data;
    const reveal = (n: number) => Math.min(p.clues.length, n);
    switch (a.type) {
      case 'reveal':
        if (s.revealed >= p.clues.length) return { state: s, solved: false, message: msg('pinpoint.allShown') };
        return { state: { ...s, revealed: s.revealed + 1 }, solved: false };
      case 'assist':
        if (s.revealed < p.assistAfter) return { state: s, solved: false, message: msg('pinpoint.assistLocked', { n: p.assistAfter }) };
        return { state: { ...s, assist: true }, solved: false };
      case 'pick': {
        if (!s.assist) return { state: s, solved: false, message: msg('pinpoint.openFirst') };
        if (!p.options.some((o) => o.id === a.option) || s.wrong.includes(a.option)) return { state: s, solved: false, message: msg('pinpoint.pickRemaining') };
        if (a.option === p.categoryId) return { state: { ...s, solved: true }, solved: true };
        return { state: { ...s, wrong: [...s.wrong, a.option] }, solved: false, message: msg('pinpoint.notThat') };
      }
      case 'guess': {
        const text = a.text.trim();
        if (text.length < 2) return { state: s, solved: false, message: msg('pinpoint.type') };
        if (matchesAnswer(text, p.accept)) return { state: { ...s, solved: true }, solved: true };
        if (s.guesses.length >= MAX_GUESSES) return { state: s, solved: false, message: msg('pinpoint.tryChoices') };
        return {
          state: { ...s, guesses: [...s.guesses, text.slice(0, 60)], revealed: reveal(s.revealed + 1) },
          solved: false,
          message: msg(s.revealed < p.clues.length ? 'pinpoint.wrongMore' : 'pinpoint.wrong'),
        };
      }
    }
  },
  penalty(_p, s) {
    const P = PINPOINT_PENALTY;
    const raw = (s.revealed - 1) * P.perExtraClue + s.guesses.length * P.perWrongGuess + (s.assist ? P.assist : 0) + s.wrong.length * P.perWrongPick;
    return Math.min(P.max, raw);
  },
  highlights: (_p, s) => (s.revealed === 1 && s.guesses.length === 0 && !s.assist ? ['pinpoint:one-clue'] : []),
};
