export type AchievementCategory =
  | 'Gameplay'
  | 'Streaks'
  | 'True Player'
  | 'Speed'
  | 'Game-Specific'
  | 'Rare'
  | 'Weird';

export type AchievementRarity =
  | 'Common'
  | 'Uncommon'
  | 'Rare'
  | 'Epic'
  | 'Legendary'
  | 'Secret';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  xpReward: number;
  icon: string; // Lucide icon or emoji
  isSecret: boolean;
  maxProgress?: number;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // Gameplay
  {
    id: 'first_step',
    name: 'First Step',
    description: 'Complete your first puzzle on GameHub.',
    category: 'Gameplay',
    rarity: 'Common',
    xpReward: 50,
    icon: 'Sparkles',
    isSecret: false,
  },
  {
    id: 'brain_on_fire',
    name: 'Brain on Fire',
    description: 'Complete 50 total puzzles across any modes.',
    category: 'Gameplay',
    rarity: 'Uncommon',
    xpReward: 250,
    icon: 'Flame',
    isSecret: false,
    maxProgress: 50,
  },
  {
    id: 'century_club',
    name: 'Century Club',
    description: 'Solve 100 puzzles.',
    category: 'Gameplay',
    rarity: 'Rare',
    xpReward: 600,
    icon: 'Award',
    isSecret: false,
    maxProgress: 100,
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Complete 10 puzzles with zero mistakes or undos.',
    category: 'Gameplay',
    rarity: 'Rare',
    xpReward: 400,
    icon: 'CheckCircle2',
    isSecret: false,
    maxProgress: 10,
  },

  // Streaks
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day Normal Streak.',
    category: 'Streaks',
    rarity: 'Uncommon',
    xpReward: 300,
    icon: 'Calendar',
    isSecret: false,
    maxProgress: 7,
  },
  {
    id: 'month_of_steel',
    name: 'Month of Steel',
    description: 'Maintain a 30-day Normal Streak.',
    category: 'Streaks',
    rarity: 'Epic',
    xpReward: 1500,
    icon: 'Shield',
    isSecret: false,
    maxProgress: 30,
  },
  {
    id: 'still_here',
    name: 'Still Here',
    description: 'Reach an astonishing 100-day Normal Streak.',
    category: 'Streaks',
    rarity: 'Legendary',
    xpReward: 5000,
    icon: 'Infinity',
    isSecret: false,
    maxProgress: 100,
  },

  // True Player
  {
    id: 'first_true_set',
    name: 'The Octet',
    description: 'Complete all 8 games in a single Daily Set.',
    category: 'True Player',
    rarity: 'Uncommon',
    xpReward: 200,
    icon: 'Crown',
    isSecret: false,
  },
  {
    id: 'true_player_streak_7',
    name: 'Devoted Octet',
    description: 'Maintain a 7-day True Player Streak.',
    category: 'True Player',
    rarity: 'Rare',
    xpReward: 1000,
    icon: 'Medal',
    isSecret: false,
    maxProgress: 7,
  },
  {
    id: 'true_player_streak_30',
    name: 'Grand Champion',
    description: 'Maintain a 30-day True Player Streak.',
    category: 'True Player',
    rarity: 'Legendary',
    xpReward: 4000,
    icon: 'Trophy',
    isSecret: false,
    maxProgress: 30,
  },

  // Punch Card
  {
    id: 'insurance_policy',
    name: 'Insurance Policy',
    description: 'Earn your first Gold Streak Repair Card.',
    category: 'Gameplay',
    rarity: 'Rare',
    xpReward: 350,
    icon: 'ShieldCheck',
    isSecret: false,
  },
  {
    id: 'full_pocket',
    name: 'Full Pocket',
    description: 'Hold the maximum capacity of 3 Gold Streak Repair Cards.',
    category: 'Rare',
    rarity: 'Epic',
    xpReward: 600,
    icon: 'Package',
    isSecret: false,
  },
  {
    id: 'waste_not',
    name: 'Waste Not',
    description: 'Have a 4th earned Gold Repair Card automatically converted into bonus XP.',
    category: 'Rare',
    rarity: 'Epic',
    xpReward: 500,
    icon: 'Coins',
    isSecret: false,
  },

  // Weird Achievements (First-class category)
  {
    id: 'potato',
    name: 'Potato',
    description: 'Play the exact same game 10 times consecutively.',
    category: 'Weird',
    rarity: 'Secret',
    xpReward: 150,
    icon: 'HelpCircle',
    isSecret: true,
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete a Daily Set between 00:00 and 04:00 UTC.',
    category: 'Weird',
    rarity: 'Rare',
    xpReward: 250,
    icon: 'Moon',
    isSecret: false,
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete a Daily Set between 04:00 and 06:00 UTC.',
    category: 'Weird',
    rarity: 'Rare',
    xpReward: 250,
    icon: 'Sunrise',
    isSecret: false,
  },
  {
    id: 'why',
    name: 'Why?',
    description: 'Play the same game 50 times in a single UTC day.',
    category: 'Weird',
    rarity: 'Secret',
    xpReward: 500,
    icon: 'HelpCircle',
    isSecret: true,
  },
  {
    id: 'touch_grass',
    name: 'Touch Grass',
    description: 'Return after a 7+ day absence and complete a Daily Set.',
    category: 'Weird',
    rarity: 'Secret',
    xpReward: 300,
    icon: 'Compass',
    isSecret: true,
  },
  {
    id: 'slow_and_steady',
    name: 'Slow & Steady',
    description: 'Spend more than 30 continuous minutes contemplating a single puzzle before solving it.',
    category: 'Weird',
    rarity: 'Secret',
    xpReward: 200,
    icon: 'Clock',
    isSecret: true,
  },
  {
    id: 'what',
    name: 'WHAT',
    description: 'Complete a puzzle in an unreal sub-second flash of inspiration.',
    category: 'Weird',
    rarity: 'Secret',
    xpReward: 350,
    icon: 'Zap',
    isSecret: true,
  },
  {
    id: 'chaos',
    name: 'Chaos',
    description: 'Complete the Daily Set in a bizarre reverse or randomized sequence.',
    category: 'Weird',
    rarity: 'Secret',
    xpReward: 250,
    icon: 'Shuffle',
    isSecret: true,
  },
  {
    id: 'overqualified',
    name: 'Overqualified',
    description: 'Complete 100 Easy games as an established player.',
    category: 'Weird',
    rarity: 'Rare',
    xpReward: 300,
    icon: 'Coffee',
    isSecret: false,
    maxProgress: 100,
  },
  {
    id: 'are_you_okay',
    name: 'Are You Okay?',
    description: 'Complete 100 puzzles in a single UTC day.',
    category: 'Weird',
    rarity: 'Secret',
    xpReward: 1000,
    icon: 'AlertCircle',
    isSecret: true,
  },
  {
    id: 'rich',
    name: 'Rich',
    description: 'Accumulate a lifetime total of 100,000 XP.',
    category: 'Rare',
    rarity: 'Legendary',
    xpReward: 2500,
    icon: 'Gem',
    isSecret: false,
    maxProgress: 100000,
  },
];
