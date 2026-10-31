import { REPAIR_CARDS } from '@/config/economy';

export interface PunchCardState {
  /** 0 .. punchesPerCard-1 */
  punchProgress: number;
  cardsHeld: number;
}

export type PunchOutcome = 'punch' | 'card-created' | 'card-converted';

/** Adds one punch; a full card becomes a Gold Repair Card or, if the pocket is full, XP. */
export function addPunch(s: PunchCardState): { state: PunchCardState; outcome: PunchOutcome } {
  const progress = s.punchProgress + 1;
  if (progress < REPAIR_CARDS.punchesPerCard) return { state: { ...s, punchProgress: progress }, outcome: 'punch' };
  if (s.cardsHeld < REPAIR_CARDS.maxCards)
    return { state: { punchProgress: 0, cardsHeld: s.cardsHeld + 1 }, outcome: 'card-created' };
  return { state: { punchProgress: 0, cardsHeld: s.cardsHeld }, outcome: 'card-converted' };
}
