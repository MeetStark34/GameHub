import { GameDifficulty } from './games';

export type XpSourceCategory =
  | 'GAME_COMPLETION'
  | 'DAILY_GAME_COMPLETION'
  | 'DIFFICULTY_BONUS'
  | 'DAILY_SET_COMPLETION'
  | 'TRUE_PLAYER_BONUS'
  | 'PERFECT_COMPLETION'
  | 'STREAK_MILESTONE'
  | 'ACHIEVEMENT'
  | 'PUNCH_CARD'
  | 'CARD_CONVERSION'
  | 'GAME_MASTERY'
  | 'SPECIAL_MILESTONE';

export interface EconomyConfig {
  unlimitedBaseXp: number;
  dailyBaseXp: number;
  difficultyMultipliers: Record<GameDifficulty, number>;
  dailySetBonusXp: number;
  truePlayerBonusXp: number;
  perfectCompletionBonusXp: number;
  fullPunchCardXpBonus: number;
  cardConversionXp: number; // For 4th card when inventory is full (3/3)
  masteryXpRatio: number; // Ratio of earned XP that converts to Game Mastery XP
  streakMilestones: { days: number; xp: number }[];
}

/**
 * Authoritative XP Economy Configuration
 * Git-trackable, easily editable, validated.
 */
export const ECONOMY_CONFIG: EconomyConfig = {
  unlimitedBaseXp: 20,
  dailyBaseXp: 35,
  difficultyMultipliers: {
    easy: 1.0,
    normal: 1.25,
    hard: 1.6,
    expert: 2.0,
  },
  dailySetBonusXp: 150, // For completing all 8 daily games
  truePlayerBonusXp: 100, // Extra True Player bonus
  perfectCompletionBonusXp: 25, // Zero mistakes / optimal solve
  fullPunchCardXpBonus: 100,
  cardConversionXp: 500, // Generous reward for pocket-full card conversion
  masteryXpRatio: 1.0,
  streakMilestones: [
    { days: 7, xp: 200 },
    { days: 14, xp: 450 },
    { days: 30, xp: 1000 },
    { days: 50, xp: 2000 },
    { days: 100, xp: 5000 },
    { days: 365, xp: 20000 },
  ],
};

/**
 * Calculates XP for a completed game session
 */
export function calculateGameXp(params: {
  isDaily: boolean;
  difficulty: GameDifficulty;
  isPerfect?: boolean;
}): {
  baseXp: number;
  difficultyBonus: number;
  perfectBonus: number;
  totalXp: number;
  masteryXp: number;
} {
  const baseXp = params.isDaily ? ECONOMY_CONFIG.dailyBaseXp : ECONOMY_CONFIG.unlimitedBaseXp;
  const multiplier = ECONOMY_CONFIG.difficultyMultipliers[params.difficulty] || 1.0;
  const difficultyBonus = Math.round(baseXp * (multiplier - 1.0));
  const perfectBonus = params.isPerfect ? ECONOMY_CONFIG.perfectCompletionBonusXp : 0;
  const totalXp = baseXp + difficultyBonus + perfectBonus;
  const masteryXp = Math.round(totalXp * ECONOMY_CONFIG.masteryXpRatio);

  return {
    baseXp,
    difficultyBonus,
    perfectBonus,
    totalXp,
    masteryXp,
  };
}
