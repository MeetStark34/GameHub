import { RANK_NAMES, TIER_LABELS, type RankLadder } from '@/config/ranks';

export interface LadderTier {
  label: string;
  tier: number;
  start: number;
  /** Start of the next tier, or null for Legend III (no upper limit). */
  end: number | null;
}

export interface LadderRank {
  name: (typeof RANK_NAMES)[number];
  index: number;
  start: number;
  tiers: LadderTier[];
}

/** The full rank ladder with every tier's XP range (used by the roadmap page). */
export function ladderOf(ladder: RankLadder): LadderRank[] {
  const t = ladder.thresholds;
  return RANK_NAMES.map((name, i) => {
    const start = t[i];
    const starts =
      i < t.length - 1
        ? [start, start + Math.round((t[i + 1] - start) / 3), start + Math.round((2 * (t[i + 1] - start)) / 3), t[i + 1]]
        : [start, start + ladder.finalTierStep, start + 2 * ladder.finalTierStep, null];
    return {
      name,
      index: i,
      start,
      tiers: [0, 1, 2].map((k) => ({ label: `${name} ${TIER_LABELS[k]}`, tier: k + 1, start: starts[k]!, end: starts[k + 1] })),
    };
  });
}
