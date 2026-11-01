import { REPAIR_CARDS } from '@/config/economy';
import { addDays, daysBetween, type UtcDate } from '@/lib/time';

/**
 * Pure streak state machine, shared by the Normal and True Player streaks.
 * A "qualifying day" is a UTC date on which the streak's condition was met
 * (>= 1 Daily Set game for Normal, 8/8 for True Player). Breaks are detected
 * lazily from dates, so no midnight job is needed.
 */
export interface StreakState {
  current: number;
  best: number;
  /** Last qualifying UTC date. */
  lastDate: UtcDate | null;
  /** Length of a streak lost to a gap, kept so a repair card can restore it. */
  lostValue: number;
  /** Last qualifying date of the lost streak. */
  lostLastDate: UtcDate | null;
}

export const emptyStreak = (): StreakState => ({ current: 0, best: 0, lastDate: null, lostValue: 0, lostLastDate: null });

export interface QualifyResult {
  state: StreakState;
  /** True when this day extended (or started) the streak. */
  advanced: boolean;
}

export function recordQualifyingDay(s: StreakState, day: UtcDate): QualifyResult {
  // Same day again, or a late (grace period) completion for an older day.
  if (s.lastDate && day <= s.lastDate) return { state: s, advanced: false };
  if (s.lastDate && addDays(s.lastDate, 1) === day) {
    const current = s.current + 1;
    return { state: { ...s, current, best: Math.max(s.best, current), lastDate: day }, advanced: true };
  }
  // Fresh start; a previous streak (if any) becomes repairable.
  const lost = s.current > 0 && s.lastDate ? { lostValue: s.current, lostLastDate: s.lastDate } : { lostValue: s.lostValue, lostLastDate: s.lostLastDate };
  return { state: { ...s, ...lost, current: 1, best: Math.max(s.best, 1), lastDate: day }, advanced: true };
}

export type StreakStatus = 'none' | 'active' | 'at-risk' | 'broken';

export interface StreakView {
  /** Streak length to display today (0 when broken). */
  current: number;
  best: number;
  status: StreakStatus;
  /** True if today's qualifying condition is already met. */
  doneToday: boolean;
  /** Value a repair card would restore, if a repair is possible now. */
  repairable: { restoresTo: number; missedDays: number } | null;
}

export function viewStreak(s: StreakState, today: UtcDate): StreakView {
  const yesterday = addDays(today, -1);
  const alive = s.lastDate === today || s.lastDate === yesterday;
  const status: StreakStatus = !s.lastDate || s.current === 0 ? 'none' : s.lastDate === today ? 'active' : alive ? 'at-risk' : 'broken';
  return {
    current: alive ? s.current : 0,
    best: s.best,
    status,
    doneToday: s.lastDate === today,
    repairable: repairOption(s, today),
  };
}

function withinWindow(firstMissed: UtcDate, today: UtcDate) {
  return daysBetween(firstMissed, today) <= REPAIR_CARDS.repairWindowDays;
}

function repairOption(s: StreakState, today: UtcDate): StreakView['repairable'] {
  const yesterday = addDays(today, -1);
  // Case A: streak lapsed and nothing new has been played since.
  if (s.lastDate && s.current > 0 && s.lastDate < yesterday) {
    const firstMissed = addDays(s.lastDate, 1);
    if (withinWindow(firstMissed, today)) return { restoresTo: s.current, missedDays: daysBetween(firstMissed, today) };
    return null;
  }
  // Case B: the player already started a new streak after the gap.
  if (s.lostValue > 0 && s.lostLastDate && s.lastDate && (s.lastDate === today || s.lastDate === yesterday)) {
    const firstMissed = addDays(s.lostLastDate, 1);
    if (!withinWindow(firstMissed, today)) return null;
    const newStart = addDays(s.lastDate, -(s.current - 1));
    return { restoresTo: s.lostValue + s.current, missedDays: daysBetween(firstMissed, newStart) };
  }
  return null;
}

/**
 * Manual (admin) adjustment of the streak value players see today, by
 * `delta` days. Keeps the date metadata consistent so the normal rules carry
 * on from the new value, with no special protection:
 *  - live streak (last day today or yesterday): only `current` changes, the
 *    due date stays, so missing tomorrow still breaks it;
 *  - broken or no streak: starts a live streak due today (last day =
 *    yesterday); a lapsed value is kept repairable exactly like a fresh start;
 *  - reaching 0 clears the streak so the next Daily game starts it at 1.
 * `best` is a lifetime high and never goes down. Returns null when the
 * result would be negative.
 */
export function adjustStreak(s: StreakState, delta: number, today: UtcDate): StreakState | null {
  const view = viewStreak(s, today);
  const target = view.current + delta;
  if (!Number.isInteger(delta) || target < 0) return null;
  if (target === 0) return { ...s, current: 0, lastDate: null };
  const alive = view.current > 0;
  if (alive) return { ...s, current: target, best: Math.max(s.best, target) };
  const lost = s.current > 0 && s.lastDate ? { lostValue: s.current, lostLastDate: s.lastDate } : { lostValue: s.lostValue, lostLastDate: s.lostLastDate };
  return { ...s, ...lost, current: target, best: Math.max(s.best, target), lastDate: addDays(today, -1) };
}

/** Applies a repair card. Returns null if nothing is repairable today. */
export function repairStreak(s: StreakState, today: UtcDate): StreakState | null {
  const option = repairOption(s, today);
  if (!option) return null;
  const yesterday = addDays(today, -1);
  if (s.lastDate && s.current > 0 && s.lastDate < yesterday) {
    // Bridge the gap: the streak is alive again, due today.
    return { ...s, lastDate: yesterday, lostValue: 0, lostLastDate: null };
  }
  const current = option.restoresTo;
  return { ...s, current, best: Math.max(s.best, current), lostValue: 0, lostLastDate: null };
}
