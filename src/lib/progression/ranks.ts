import { RANK_NAMES, TIER_LABELS, type RankLadder, type RankName } from '@/config/ranks';

export interface RankInfo {
  name: RankName;
  /** 0-based index into RANK_NAMES. */
  rankIndex: number;
  /** 1..3 */
  tier: number;
  /** e.g. "Elite II" */
  label: string;
  /** 1..30: overall position on the ladder (Rookie I = 1, Legend III = 30). */
  level: number;
  xp: number;
  /** XP where the current tier began. */
  tierStart: number;
  /** XP needed for the next tier, or null at Legend III. */
  nextAt: number | null;
  /** Label of the next tier, or null at Legend III. */
  nextLabel: string | null;
  /** 0..1 progress through the current tier (1 at Legend III). */
  progress: number;
}

/** Tier start points for a ladder: 3 per rank. */
function tierStarts(ladder: RankLadder): number[] {
  const t = ladder.thresholds;
  const out: number[] = [];
  for (let i = 0; i < t.length; i++) {
    const start = t[i];
    if (i < t.length - 1) {
      const span = t[i + 1] - start;
      out.push(start, start + Math.round(span / 3), start + Math.round((2 * span) / 3));
    } else {
      out.push(start, start + ladder.finalTierStep, start + 2 * ladder.finalTierStep);
    }
  }
  return out;
}

export function rankFromXp(rawXp: number, ladder: RankLadder): RankInfo {
  const xp = Math.max(0, Math.floor(rawXp || 0));
  const starts = tierStarts(ladder);
  let idx = 0;
  for (let i = 0; i < starts.length; i++) if (xp >= starts[i]) idx = i;
  const rankIndex = Math.floor(idx / 3);
  const tier = (idx % 3) + 1;
  const name = RANK_NAMES[rankIndex];
  const nextAt = idx + 1 < starts.length ? starts[idx + 1] : null;
  const next = idx + 1 < starts.length ? idx + 1 : null;
  return {
    name,
    rankIndex,
    tier,
    label: `${name} ${TIER_LABELS[tier - 1]}`,
    level: idx + 1,
    xp,
    tierStart: starts[idx],
    nextAt,
    nextLabel: next === null ? null : `${RANK_NAMES[Math.floor(next / 3)]} ${TIER_LABELS[next % 3]}`,
    progress: nextAt === null ? 1 : (xp - starts[idx]) / (nextAt - starts[idx]),
  };
}
