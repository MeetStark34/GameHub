/**
 * Rank ladders. Ranks are always derived from XP at read time, so editing
 * these thresholds re-ranks everyone instantly without touching stored XP.
 */
export const RANK_NAMES = [
  'Rookie',
  'Novice',
  'Amateur',
  'Pro',
  'Veteran',
  'Expert',
  'Elite',
  'Master',
  'Grandmaster',
  'Legend',
] as const;
export type RankName = (typeof RANK_NAMES)[number];

export interface RankLadder {
  /** XP needed to enter each rank (tier I), same order as RANK_NAMES. */
  thresholds: readonly number[];
  /**
   * The last rank has no upper bound, so its tiers are spaced by this many
   * XP (Legend I at the threshold, II at +step, III at +2*step). XP keeps
   * accumulating past Legend III forever.
   */
  finalTierStep: number;
}

/** Player rank from total XP. */
export const PLAYER_RANKS: RankLadder = {
  thresholds: [0, 1_000, 3_000, 7_000, 15_000, 30_000, 60_000, 100_000, 175_000, 300_000],
  finalTierStep: 100_000,
};

/**
 * Per-game mastery from that game's mastery XP. Same names, smaller scale:
 * one game earns roughly an eighth of what all eight do.
 */
export const MASTERY_RANKS: RankLadder = {
  thresholds: [0, 150, 450, 1_000, 2_000, 4_000, 7_500, 12_500, 22_000, 37_500],
  finalTierStep: 12_500,
};

export const TIER_LABELS = ['I', 'II', 'III'] as const;
