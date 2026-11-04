import { z } from 'zod';
import type { Msg } from '@/i18n/translate';
import { msg } from './core';
import type { ActResult, SubmitState } from './types';

// Engine-side helpers (server only in practice: they need zod). Game logic
// that boards import uses ./core, which these re-export for the engines.
export { msg, inBounds, ORTHO, type Cell } from './core';

export const cellSchema = z.tuple([z.number().int().min(0).max(63), z.number().int().min(0).max(63)]);

export const initialSubmitState = (): SubmitState => ({ wrongSubmits: 0 });

/**
 * Builds the `act` handler for logic games: the only action is submitting a
 * full board. An invalid board is a free retry that costs a little score.
 */
export function submitAct<P, Sub>(
  schema: z.ZodType<Sub>,
  check: (puzzle: P, submission: Sub) => Msg | null,
) {
  const actionSchema = z.object({ type: z.literal('submit'), solution: schema });
  return (puzzle: P, state: SubmitState, action: unknown): ActResult<SubmitState> => {
    const parsed = actionSchema.safeParse(action);
    if (!parsed.success) return { state, solved: false, message: msg('unreadable') };
    let error: Msg | null;
    try {
      error = check(puzzle, parsed.data.solution as Sub);
    } catch {
      error = msg('unreadable');
    }
    if (error) return { state: { wrongSubmits: state.wrongSubmits + 1 }, solved: false, message: error };
    return { state, solved: true };
  };
}

export const submitPenalty = (state: SubmitState, perMistake = 0.1, max = 0.5) =>
  Math.min(max, state.wrongSubmits * perMistake);
