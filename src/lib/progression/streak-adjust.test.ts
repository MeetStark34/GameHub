import { describe, expect, it } from 'vitest';
import { adjustStreak, emptyStreak, recordQualifyingDay, repairStreak, viewStreak, type StreakState } from './streaks';

const today = '2026-11-10';
const live = (current: number, lastDate = today): StreakState => ({ current, best: current, lastDate, lostValue: 0, lostLastDate: null });

describe('admin streak adjustment', () => {
  it('changes a live streak without touching its due date', () => {
    const s = adjustStreak(live(365, '2026-11-09'), 5, today)!;
    expect(s).toMatchObject({ current: 370, best: 370, lastDate: '2026-11-09' });
    expect(viewStreak(s, today).status).toBe('at-risk'); // still has to be played today
    const down = adjustStreak(live(240), -2, today)!;
    expect(down).toMatchObject({ current: 238, best: 240, lastDate: today }); // best is a lifetime high
  });

  it('keeps following the normal rules afterwards', () => {
    const s = adjustStreak(live(10), 3, today)!;
    expect(recordQualifyingDay(s, '2026-11-11').state.current).toBe(14);
    // Missing two days breaks it like any streak.
    expect(viewStreak(s, '2026-11-12').current).toBe(0);
  });

  it('rejects results below zero, zero and non-integer deltas', () => {
    expect(adjustStreak(live(3), -4, today)).toBeNull();
    expect(adjustStreak(emptyStreak(), -1, today)).toBeNull();
    expect(adjustStreak(live(3), 1.5, today)).toBeNull();
  });

  it('reaching 0 clears the streak so the next Daily game starts it at 1', () => {
    const s = adjustStreak(live(3), -3, today)!;
    expect(viewStreak(s, today)).toMatchObject({ current: 0, status: 'none' });
    expect(recordQualifyingDay(s, today).state.current).toBe(1);
  });

  it('a broken streak restarts live, due today, and the lapsed value stays repairable', () => {
    const broken = live(50, '2026-11-07'); // missed 11-08 and 11-09
    expect(viewStreak(broken, today).current).toBe(0);
    const s = adjustStreak(broken, 2, today)!;
    expect(s).toMatchObject({ current: 2, lastDate: '2026-11-09', lostValue: 50, lostLastDate: '2026-11-07' });
    expect(viewStreak(s, today)).toMatchObject({ current: 2, status: 'at-risk' });
    // Same outcome as a natural fresh start: a card can still bridge the gap.
    expect(repairStreak(s, today)?.current).toBe(52);
  });
});
