import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '@/config/achievements';
import { REPAIR_CARDS, XP_ECONOMY } from '@/config/economy';
import { MASTERY_RANKS, PLAYER_RANKS } from '@/config/ranks';
import { GAME_IDS } from '@/games/types';
import { newlyUnlocked, type AchievementStats, type CompletionEvent } from './achievements';
import { addPunch } from './cards';
import { rankFromXp } from './ranks';
import { computeScore, isPerfect } from './score';
import { emptyStreak, recordQualifyingDay, repairStreak, viewStreak } from './streaks';
import { completionXp, streakMilestoneXp } from './xp';

describe('ranks', () => {
  it('maps the configured thresholds to tier I of each rank', () => {
    const expected = ['Rookie', 'Novice', 'Amateur', 'Pro', 'Veteran', 'Expert', 'Elite', 'Master', 'Grandmaster', 'Legend'];
    PLAYER_RANKS.thresholds.forEach((t, i) => {
      const r = rankFromXp(t, PLAYER_RANKS);
      expect(r.label).toBe(`${expected[i]} I`);
      expect(r.level).toBe(i * 3 + 1);
      if (t > 0) expect(rankFromXp(t - 1, PLAYER_RANKS).name).toBe(expected[i - 1]);
    });
  });

  it('splits ranks into three tiers and keeps going past Legend', () => {
    expect(rankFromXp(0, PLAYER_RANKS).label).toBe('Rookie I');
    expect(rankFromXp(332, PLAYER_RANKS).label).toBe('Rookie I');
    expect(rankFromXp(333, PLAYER_RANKS).label).toBe('Rookie II');
    expect(rankFromXp(666, PLAYER_RANKS).label).toBe('Rookie II');
    expect(rankFromXp(667, PLAYER_RANKS).label).toBe('Rookie III');
    expect(rankFromXp(347_421, PLAYER_RANKS).label).toBe('Legend I');
    expect(rankFromXp(400_000, PLAYER_RANKS).label).toBe('Legend II');
    const top = rankFromXp(9_999_999, PLAYER_RANKS);
    expect(top.label).toBe('Legend III');
    expect(top.level).toBe(30);
    expect(top.nextAt).toBeNull();
    expect(top.xp).toBe(9_999_999);
  });

  it('reports progress to the next tier', () => {
    const r = rankFromXp(500, PLAYER_RANKS);
    expect(r.nextLabel).toBe('Rookie III');
    expect(r.progress).toBeGreaterThan(0);
    expect(r.progress).toBeLessThan(1);
    expect(rankFromXp(-50, PLAYER_RANKS).xp).toBe(0);
    expect(rankFromXp(MASTERY_RANKS.thresholds[9], MASTERY_RANKS).name).toBe('Legend');
  });

  it('re-ranks from stored XP when thresholds change', () => {
    const custom = { thresholds: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90], finalTierStep: 5 };
    expect(rankFromXp(1_000, custom).label).toBe('Legend III');
    expect(rankFromXp(1_000, PLAYER_RANKS).label).toBe('Novice I');
  });
});

describe('scoring and XP', () => {
  it('scores time and penalties', () => {
    expect(computeScore(30_000, 60, 0)).toBe(1000);
    expect(computeScore(240_000, 60, 0)).toBe(500);
    expect(computeScore(10 * 3600_000, 60, 0)).toBe(500);
    expect(computeScore(30_000, 60, 0.2)).toBe(800);
    expect(isPerfect(30_000, 60, 0)).toBe(true);
    expect(isPerfect(30_000, 60, 0.1)).toBe(false);
  });

  it('daily pays more than unlimited; harder pays more than easier', () => {
    const base = { game: 'queens' as const, score: 700, perfect: false, unlimitedEarlierToday: 0 };
    const daily = completionXp({ ...base, difficulty: 'normal', mode: 'daily' }).xp;
    const unl = completionXp({ ...base, difficulty: 'normal', mode: 'unlimited' }).xp;
    expect(daily).toBeGreaterThan(unl);
    const easy = completionXp({ ...base, difficulty: 'easy', mode: 'unlimited' }).xp;
    const expert = completionXp({ ...base, difficulty: 'expert', mode: 'unlimited' }).xp;
    expect(expert).toBeGreaterThan(easy);
  });

  it('tapers heavy unlimited play but never to zero', () => {
    const base = { game: 'zip' as const, difficulty: 'hard' as const, mode: 'unlimited' as const, score: 1000, perfect: true };
    const fresh = completionXp({ ...base, unlimitedEarlierToday: 0 });
    const tired = completionXp({ ...base, unlimitedEarlierToday: 100 });
    expect(tired.xp).toBeLessThan(fresh.xp);
    expect(tired.xp).toBeGreaterThanOrEqual(XP_ECONOMY.unlimitedFloor);
    expect(tired.masteryXp).toBe(fresh.masteryXp);
    expect(fresh.breakdown.reduce((s, b) => s + b.amount, 0)).toBe(fresh.xp);
    expect(tired.breakdown.reduce((s, b) => s + b.amount, 0)).toBe(tired.xp);
  });

  it('streak milestones', () => {
    expect(streakMilestoneXp('normal', 7)).toBeGreaterThan(0);
    expect(streakMilestoneXp('normal', 8)).toBe(0);
  });
});

describe('streaks', () => {
  it('advances on consecutive days and ignores repeats', () => {
    let s = emptyStreak();
    s = recordQualifyingDay(s, '2026-01-01').state;
    s = recordQualifyingDay(s, '2026-01-01').state;
    s = recordQualifyingDay(s, '2026-01-02').state;
    expect(s.current).toBe(2);
    expect(viewStreak(s, '2026-01-02').status).toBe('active');
    expect(viewStreak(s, '2026-01-03').status).toBe('at-risk');
    expect(viewStreak(s, '2026-01-03').current).toBe(2);
    expect(viewStreak(s, '2026-01-04')).toMatchObject({ status: 'broken', current: 0 });
  });

  it('ignores late completions for days before the last qualifying day', () => {
    let s = recordQualifyingDay(emptyStreak(), '2026-01-05').state;
    s = recordQualifyingDay(s, '2026-01-04').state;
    expect(s).toMatchObject({ current: 1, lastDate: '2026-01-05' });
  });

  it('repairs a lapsed streak by bridging the gap (case A)', () => {
    let s = emptyStreak();
    for (const d of ['2026-01-01', '2026-01-02', '2026-01-03']) s = recordQualifyingDay(s, d).state;
    const today = '2026-01-06';
    expect(viewStreak(s, today).repairable).toEqual({ restoresTo: 3, missedDays: 2 });
    const fixed = repairStreak(s, today)!;
    expect(viewStreak(fixed, today)).toMatchObject({ status: 'at-risk', current: 3 });
    expect(recordQualifyingDay(fixed, today).state.current).toBe(4);
    expect(repairStreak(fixed, today)).toBeNull();
  });

  it('repairs after a new streak already started (case B)', () => {
    let s = emptyStreak();
    for (const d of ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04']) s = recordQualifyingDay(s, d).state;
    s = recordQualifyingDay(s, '2026-01-07').state; // missed 5th and 6th
    s = recordQualifyingDay(s, '2026-01-08').state;
    expect(s.current).toBe(2);
    expect(viewStreak(s, '2026-01-08').repairable).toEqual({ restoresTo: 6, missedDays: 2 });
    const fixed = repairStreak(s, '2026-01-08')!;
    expect(fixed.current).toBe(6);
    expect(fixed.best).toBe(6);
  });

  it('refuses repairs outside the window', () => {
    let s = recordQualifyingDay(emptyStreak(), '2026-01-01').state;
    s = recordQualifyingDay(s, '2026-01-02').state;
    const late = `2026-01-${String(3 + REPAIR_CARDS.repairWindowDays + 1).padStart(2, '0')}`;
    expect(viewStreak(s, late).repairable).toBeNull();
    expect(repairStreak(s, late)).toBeNull();
    expect(repairStreak(emptyStreak(), '2026-01-02')).toBeNull();
  });
});

describe('punch cards', () => {
  it('ten punches make a card; a full pocket converts', () => {
    let s = { punchProgress: 0, cardsHeld: 0 };
    const outcomes: string[] = [];
    for (let i = 0; i < 40; i++) {
      const r = addPunch(s);
      s = r.state;
      outcomes.push(r.outcome);
    }
    expect(outcomes.filter((o) => o === 'card-created')).toHaveLength(REPAIR_CARDS.maxCards);
    expect(outcomes.filter((o) => o === 'card-converted')).toHaveLength(1);
    expect(s).toEqual({ punchProgress: 0, cardsHeld: REPAIR_CARDS.maxCards });
  });
});

describe('achievements', () => {
  const zero = () => {
    const per = <T extends string>(keys: readonly T[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<T, number>;
    return {
      gamesCompleted: 0, dailyGamesCompleted: 0, unlimitedGamesCompleted: 0, distinctGames: 0, perfectCompleted: 0,
      totalXp: 0, normalStreak: 0, truePlayerStreak: 0, truePlayerDays: 0, cardsHeld: 0, cardsEarned: 0,
      cardsConverted: 0, cardsUsed: 0, punchesEarned: 0, sameGameRun: 0, todayGames: 0, todayMaxSameGame: 0,
      todayDistinctHours: 0,
      byDifficulty: per(['easy', 'normal', 'hard', 'expert'] as const),
      byGame: per(GAME_IDS),
      masteryRankIndex: per(GAME_IDS),
    } satisfies AchievementStats;
  };
  const event = (over: Partial<CompletionEvent> = {}): CompletionEvent => ({
    game: 'queens', mode: 'unlimited', difficulty: 'normal', durationMs: 60_000, parSeconds: 120, perfect: false,
    highlights: [], dailySet: null, ...over,
  });

  it('definitions have unique ids and positive XP', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) expect(a.xp).toBeGreaterThan(0);
  });

  it('unlocks stat achievements once', () => {
    const s = { ...zero(), gamesCompleted: 1 };
    const ids = newlyUnlocked(s, event(), new Set()).map((a) => a.id);
    expect(ids).toContain('first-steps');
    expect(ids).toContain('quick-thinker');
    expect(newlyUnlocked(s, event(), new Set(['first-steps'])).map((a) => a.id)).not.toContain('first-steps');
  });

  it('evaluates weird and event achievements', () => {
    const ids = (s: AchievementStats, e: CompletionEvent | null) => newlyUnlocked(s, e, new Set()).map((a) => a.id);
    expect(ids({ ...zero(), sameGameRun: 10 }, null)).toContain('potato');
    expect(ids(zero(), event({ durationMs: 31 * 60_000 }))).toContain('slow-and-steady');
    expect(ids(zero(), event({ difficulty: 'expert', durationMs: 10_000, parSeconds: 300 }))).toContain('what');
    expect(ids(zero(), event({ dailySet: { hourUtc: 2, order: [...GAME_IDS] } }))).toContain('night-owl');
    expect(ids(zero(), event({ dailySet: { hourUtc: 2, order: [...GAME_IDS] } }))).not.toContain('chaos');
    expect(ids(zero(), event({ dailySet: { hourUtc: 5, order: [...GAME_IDS].reverse() } }))).toEqual(expect.arrayContaining(['early-bird', 'chaos']));
    expect(ids(zero(), event({ game: 'werd', highlights: ['werd:first-guess'] }))).toContain('hole-in-one');
    const masters = { ...zero(), masteryRankIndex: { ...zero().masteryRankIndex, zip: 7 } };
    expect(ids(masters, null)).toContain('specialist');
    expect(ids(masters, null)).not.toContain('polymath');
  });
});
