import type { Difficulty, GameId } from '@/games/types';

/**
 * The whole XP economy. Every XP amount the server awards comes from here;
 * UI components only display values the server returns.
 *
 * Pacing target: a player doing the Daily Set plus a few Unlimited games
 * earns roughly 600-900 XP a day, reaching Pro in ~1-2 weeks, Elite in a few
 * months and Legend in about a year of committed play.
 */
export const XP_ECONOMY = {
  /** Base XP for completing one game, by difficulty. */
  baseByDifficulty: { easy: 20, normal: 35, hard: 55, expert: 80 } satisfies Record<Difficulty, number>,

  /** Optional per-game tuning (1 = neutral). */
  gameMultiplier: {
    patches: 1,
    sudoku: 1,
    zip: 1,
    werd: 1,
    pinpoint: 0.9,
    crossclimb: 1,
    tango: 1,
    queens: 1,
  } satisfies Record<GameId, number>,

  /** Daily Set games are worth a bit more than Unlimited. */
  dailyMultiplier: 1.3,

  /**
   * Performance bonus: score 0..1000. Scores above `from` add up to `max`
   * (fraction of base) at a perfect 1000.
   */
  performanceBonus: { from: 500, max: 0.25 },

  /** Flat bonus for a perfect run (no mistakes, at or under par time). */
  perfectBonus: 10,

  /**
   * Unlimited XP tapers after heavy same-day play so XP stays meaningful.
   * Play itself is never limited. `after` counts Unlimited completions
   * earlier the same UTC day.
   */
  unlimitedTaper: [
    { after: 40, multiplier: 0.5 },
    { after: 80, multiplier: 0.25 },
  ],
  /** Unlimited games never award less than this. */
  unlimitedFloor: 3,

  /** First Daily Set game of a UTC day ("streak keeper"). */
  firstDailyGameBonus: 15,
  /** All eight Daily Set games completed on one day (True Player day). */
  dailySetCompleteBonus: 150,

  /** One-off bonuses when a streak reaches these lengths. */
  streakMilestones: {
    normal: { 3: 30, 7: 100, 14: 200, 30: 400, 60: 700, 100: 1_200, 200: 2_500, 365: 5_000 },
    truePlayer: { 3: 60, 7: 200, 14: 400, 30: 800, 60: 1_400, 100: 2_500, 200: 5_000, 365: 10_000 },
  } as Record<'normal' | 'truePlayer', Record<number, number>>,

  punchEarned: 25,
  cardCreated: 100,
  /** A card earned while the pocket is full is converted into this much XP. */
  cardConverted: 400,
} as const;

/**
 * Gold Streak Repair Cards.
 * Punch source A: complete `dailyVolumeGames` games (any mode) in one UTC day.
 * Punch source B: every `dailySetsPerPunch` full Daily Sets (cumulative, never resets).
 */
export const REPAIR_CARDS = {
  punchesPerCard: 10,
  maxCards: 3,
  dailyVolumeGames: 20,
  dailySetsPerPunch: 2,
  /**
   * A broken streak can be repaired if the first missed day is at most this
   * many days ago. Missed days are bridged, not counted as streak days.
   */
  repairWindowDays: 7,
} as const;

/**
 * Daily Set sessions started before the 00:00 UTC reset may still be
 * completed for that day within this grace period (minutes).
 */
export const DAILY_GRACE_MINUTES = 10;
