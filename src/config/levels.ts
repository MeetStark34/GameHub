export interface LevelDefinition {
  level: number;
  rank: string;
  minXp: number;
  prestigeTiers: {
    tier: number; // 1, 2, 3
    suffix: string; // "I", "II", "III"
    minXp: number;
  }[];
}

/**
 * Authoritative Rank & Level Configuration
 * Fully Git-trackable and editable. Modifying thresholds will recalculate user rank
 * dynamically based on their existing total XP without resetting or losing progress.
 */
export const LEVEL_CONFIG: LevelDefinition[] = [
  {
    level: 1,
    rank: 'Rookie',
    minXp: 0,
    prestigeTiers: [
      { tier: 1, suffix: 'I', minXp: 0 },
      { tier: 2, suffix: 'II', minXp: 300 },
      { tier: 3, suffix: 'III', minXp: 650 },
    ],
  },
  {
    level: 2,
    rank: 'Novice',
    minXp: 1000,
    prestigeTiers: [
      { tier: 1, suffix: 'I', minXp: 1000 },
      { tier: 2, suffix: 'II', minXp: 1600 },
      { tier: 3, suffix: 'III', minXp: 2300 },
    ],
  },
  {
    level: 3,
    rank: 'Amateur',
    minXp: 3000,
    prestigeTiers: [
      { tier: 1, suffix: 'I', minXp: 3000 },
      { tier: 2, suffix: 'II', minXp: 4200 },
      { tier: 3, suffix: 'III', minXp: 5500 },
    ],
  },
  {
    level: 4,
    rank: 'Pro',
    minXp: 7000,
    prestigeTiers: [
      { tier: 1, suffix: 'I', minXp: 7000 },
      { tier: 2, suffix: 'II', minXp: 9500 },
      { tier: 3, suffix: 'III', minXp: 12000 },
    ],
  },
  {
    level: 5,
    rank: 'Veteran',
    minXp: 15000,
    prestigeTiers: [
      { tier: 1, suffix: 'I', minXp: 15000 },
      { tier: 2, suffix: 'II', minXp: 19500 },
      { tier: 3, suffix: 'III', minXp: 24500 },
    ],
  },
  {
    level: 6,
    rank: 'Expert',
    minXp: 30000,
    prestigeTiers: [
      { tier: 1, suffix: 'I', minXp: 30000 },
      { tier: 2, suffix: 'II', minXp: 39000 },
      { tier: 3, suffix: 'III', minXp: 49000 },
    ],
  },
  {
    level: 7,
    rank: 'Elite',
    minXp: 60000,
    prestigeTiers: [
      { tier: 1, suffix: 'I', minXp: 60000 },
      { tier: 2, suffix: 'II', minXp: 72000 },
      { tier: 3, suffix: 'III', minXp: 85000 },
    ],
  },
  {
    level: 8,
    rank: 'Master',
    minXp: 100000,
    prestigeTiers: [
      { tier: 1, suffix: 'I', minXp: 100000 },
      { tier: 2, suffix: 'II', minXp: 122000 },
      { tier: 3, suffix: 'III', minXp: 147000 },
    ],
  },
  {
    level: 9,
    rank: 'Grandmaster',
    minXp: 175000,
    prestigeTiers: [
      { tier: 1, suffix: 'I', minXp: 175000 },
      { tier: 2, suffix: 'II', minXp: 212000 },
      { tier: 3, suffix: 'III', minXp: 254000 },
    ],
  },
  {
    level: 10,
    rank: 'Legend',
    minXp: 300000,
    prestigeTiers: [
      { tier: 1, suffix: 'I', minXp: 300000 },
      { tier: 2, suffix: 'II', minXp: 450000 },
      { tier: 3, suffix: 'III', minXp: 650000 },
    ],
  },
];

export interface PlayerRankInfo {
  level: number;
  rank: string;
  prestigeTier: number;
  prestigeSuffix: string;
  currentXp: number;
  currentLevelMinXp: number;
  nextLevelMinXp: number | null;
  progressPercent: number;
  formattedRank: string; // e.g. "Elite III" or "Level 7 Elite"
}

export function calculateRankFromXp(xp: number): PlayerRankInfo {
  const safeXp = Math.max(0, Math.floor(xp || 0));

  let currentLevel = LEVEL_CONFIG[0];
  let nextLevel: LevelDefinition | null = LEVEL_CONFIG[1] || null;

  for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
    if (safeXp >= LEVEL_CONFIG[i].minXp) {
      currentLevel = LEVEL_CONFIG[i];
      nextLevel = LEVEL_CONFIG[i + 1] || null;
      break;
    }
  }

  // Find prestige tier within the rank
  let prestigeTier = 1;
  let prestigeSuffix = 'I';
  for (let j = currentLevel.prestigeTiers.length - 1; j >= 0; j--) {
    if (safeXp >= currentLevel.prestigeTiers[j].minXp) {
      prestigeTier = currentLevel.prestigeTiers[j].tier;
      prestigeSuffix = currentLevel.prestigeTiers[j].suffix;
      break;
    }
  }

  // Calculate percentage toward next rank or next prestige tier
  let progressPercent = 100;
  if (nextLevel) {
    const range = nextLevel.minXp - currentLevel.minXp;
    const progress = safeXp - currentLevel.minXp;
    progressPercent = Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
  }

  return {
    level: currentLevel.level,
    rank: currentLevel.rank,
    prestigeTier,
    prestigeSuffix,
    currentXp: safeXp,
    currentLevelMinXp: currentLevel.minXp,
    nextLevelMinXp: nextLevel ? nextLevel.minXp : null,
    progressPercent,
    formattedRank: `${currentLevel.rank} ${prestigeSuffix}`,
  };
}
