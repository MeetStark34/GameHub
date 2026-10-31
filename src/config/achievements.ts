import type { Difficulty, GameId, GameMode } from '@/games/types';
import type { RankName } from './ranks';

/**
 * Achievement definitions. Add, remove or tune entries here; the engine in
 * src/lib/progression/achievements.ts evaluates any combination of the
 * criterion types below without code changes. Keep `id`s stable once
 * shipped: unlocks are stored by id.
 */
export type AchievementCategory = 'gameplay' | 'streaks' | 'true-player' | 'speed' | 'game' | 'rare' | 'weird';

export const ACHIEVEMENT_CATEGORIES: Record<AchievementCategory, string> = {
  gameplay: 'Gameplay',
  streaks: 'Streaks',
  'true-player': 'True Player',
  speed: 'Speed',
  game: 'Game-specific',
  rare: 'Rare',
  weird: 'Weird',
};

/** Numeric player stats the engine can compare against. */
export type StatKey =
  | 'gamesCompleted'
  | 'dailyGamesCompleted'
  | 'unlimitedGamesCompleted'
  | 'distinctGames'
  | 'perfectCompleted'
  | 'totalXp'
  | 'normalStreak'
  | 'truePlayerStreak'
  | 'truePlayerDays'
  | 'cardsHeld'
  | 'cardsEarned'
  | 'cardsConverted'
  | 'cardsUsed'
  | 'punchesEarned'
  | 'sameGameRun'
  | 'todayGames'
  | 'todayMaxSameGame'
  | 'todayDistinctHours';

export type Criterion =
  | { type: 'stat'; stat: StatKey; gte: number }
  | { type: 'difficultyCount'; difficulty: Difficulty; gte: number }
  | { type: 'gameCount'; game: GameId; gte: number }
  | { type: 'masteryRank'; game: GameId | 'any' | 'all'; rank: RankName }
  /** Evaluated against the completion that just happened. */
  | {
      type: 'completion';
      game?: GameId;
      mode?: GameMode;
      difficulties?: Difficulty[];
      minDurationSec?: number;
      /** Completed in at most this fraction of par time. */
      maxParFraction?: number;
      perfect?: boolean;
      /** Engine-reported highlight, e.g. 'werd:first-guess'. */
      highlight?: string;
    }
  /** Evaluated when the eighth Daily Set game of a day is completed. */
  | { type: 'dailySet'; fromHourUtc?: number; toHourUtc?: number; nonCanonicalOrder?: boolean };

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  /** lucide-react icon name (see src/components/achievements/icon.tsx). */
  icon: string;
  xp: number;
  /** Hidden achievements show "???" until unlocked. */
  hidden?: boolean;
  criterion: Criterion;
}

const gameMastery = (game: GameId, name: string, icon: string, n = 25): AchievementDef => ({
  id: `${game}-${n}`,
  name,
  description: `Complete ${n} ${game === 'sudoku' ? 'Mini Sudoku' : game[0].toUpperCase() + game.slice(1)} games.`,
  category: 'game',
  icon,
  xp: 100,
  criterion: { type: 'gameCount', game, gte: n },
});

export const ACHIEVEMENTS: AchievementDef[] = [
  // Gameplay
  { id: 'first-steps', name: 'First Steps', description: 'Complete your first game.', category: 'gameplay', icon: 'Footprints', xp: 25, criterion: { type: 'stat', stat: 'gamesCompleted', gte: 1 } },
  { id: 'warming-up', name: 'Warming Up', description: 'Complete 10 games.', category: 'gameplay', icon: 'Flame', xp: 50, criterion: { type: 'stat', stat: 'gamesCompleted', gte: 10 } },
  { id: 'regular', name: 'Regular', description: 'Complete 100 games.', category: 'gameplay', icon: 'Coffee', xp: 200, criterion: { type: 'stat', stat: 'gamesCompleted', gte: 100 } },
  { id: 'dedicated', name: 'Dedicated', description: 'Complete 500 games.', category: 'gameplay', icon: 'Dumbbell', xp: 500, criterion: { type: 'stat', stat: 'gamesCompleted', gte: 500 } },
  { id: 'thousand-club', name: 'Thousand Club', description: 'Complete 1,000 games.', category: 'gameplay', icon: 'Gem', xp: 1000, criterion: { type: 'stat', stat: 'gamesCompleted', gte: 1000 } },
  { id: 'daily-debut', name: 'Daily Debut', description: 'Complete your first Daily Set game.', category: 'gameplay', icon: 'CalendarCheck', xp: 25, criterion: { type: 'stat', stat: 'dailyGamesCompleted', gte: 1 } },
  { id: 'explorer', name: 'Explorer', description: 'Complete every one of the eight games.', category: 'gameplay', icon: 'Compass', xp: 150, criterion: { type: 'stat', stat: 'distinctGames', gte: 8 } },
  { id: 'flawless', name: 'Flawless', description: 'Finish 25 perfect runs (no mistakes, under par).', category: 'gameplay', icon: 'Sparkles', xp: 250, criterion: { type: 'stat', stat: 'perfectCompleted', gte: 25 } },
  { id: 'expert-mind', name: 'Expert Mind', description: 'Complete 25 Expert games.', category: 'gameplay', icon: 'Brain', xp: 300, criterion: { type: 'difficultyCount', difficulty: 'expert', gte: 25 } },

  // Streaks
  { id: 'on-a-roll', name: 'On a Roll', description: 'Reach a 3-day Normal Streak.', category: 'streaks', icon: 'Flame', xp: 50, criterion: { type: 'stat', stat: 'normalStreak', gte: 3 } },
  { id: 'week-warrior', name: 'Week Warrior', description: 'Reach a 7-day Normal Streak.', category: 'streaks', icon: 'CalendarRange', xp: 100, criterion: { type: 'stat', stat: 'normalStreak', gte: 7 } },
  { id: 'monthly', name: 'Month Strong', description: 'Reach a 30-day Normal Streak.', category: 'streaks', icon: 'CalendarDays', xp: 300, criterion: { type: 'stat', stat: 'normalStreak', gte: 30 } },
  { id: 'still-here', name: 'Still Here', description: 'Reach a 100-day Normal Streak.', category: 'streaks', icon: 'Mountain', xp: 1000, criterion: { type: 'stat', stat: 'normalStreak', gte: 100 } },
  { id: 'year-one', name: 'Year One', description: 'Reach a 365-day Normal Streak.', category: 'streaks', icon: 'Trophy', xp: 5000, criterion: { type: 'stat', stat: 'normalStreak', gte: 365 } },
  { id: 'patched-up', name: 'Patched Up', description: 'Repair a streak with a Gold Repair Card.', category: 'streaks', icon: 'Bandage', xp: 50, criterion: { type: 'stat', stat: 'cardsUsed', gte: 1 } },

  // True Player
  { id: 'true-player', name: 'True Player', description: 'Complete all eight Daily Set games in one day.', category: 'true-player', icon: 'Crown', xp: 150, criterion: { type: 'stat', stat: 'truePlayerDays', gte: 1 } },
  { id: 'true-week', name: 'True Week', description: 'Reach a 7-day True Player Streak.', category: 'true-player', icon: 'Crown', xp: 400, criterion: { type: 'stat', stat: 'truePlayerStreak', gte: 7 } },
  { id: 'true-month', name: 'True Month', description: 'Reach a 30-day True Player Streak.', category: 'true-player', icon: 'Medal', xp: 1500, criterion: { type: 'stat', stat: 'truePlayerStreak', gte: 30 } },
  { id: 'true-believer', name: 'True Believer', description: 'Complete 100 True Player Daily Sets.', category: 'true-player', icon: 'Award', xp: 2500, criterion: { type: 'stat', stat: 'truePlayerDays', gte: 100 } },

  // Speed
  { id: 'quick-thinker', name: 'Quick Thinker', description: 'Finish a Normal or harder game in half of par time.', category: 'speed', icon: 'Zap', xp: 75, criterion: { type: 'completion', difficulties: ['normal', 'hard', 'expert'], maxParFraction: 0.5 } },
  { id: 'what', name: 'WHAT', description: 'Finish a Hard or Expert game in under 15% of par time.', category: 'speed', icon: 'Rocket', xp: 300, hidden: true, criterion: { type: 'completion', difficulties: ['hard', 'expert'], maxParFraction: 0.15 } },
  { id: 'slow-and-steady', name: 'Slow & Steady', description: 'Spend at least 30 minutes completing a game.', category: 'speed', icon: 'Turtle', xp: 50, criterion: { type: 'completion', minDurationSec: 1800 } },

  // Game-specific
  gameMastery('patches', 'Patchwork', 'LayoutGrid'),
  gameMastery('sudoku', 'Grid Lock', 'Grid3x3'),
  gameMastery('zip', 'Live Wire', 'Route'),
  gameMastery('werd', 'Wordsmith', 'Type'),
  gameMastery('pinpoint', 'Sharpshooter', 'Crosshair'),
  gameMastery('crossclimb', 'Ladder Climber', 'Ladder'),
  gameMastery('tango', 'Perfect Balance', 'SunMoon'),
  gameMastery('queens', 'Royalty', 'Crown'),
  { id: 'hole-in-one', name: 'Hole in One', description: 'Solve a Werd on your first guess.', category: 'game', icon: 'Target', xp: 250, hidden: true, criterion: { type: 'completion', game: 'werd', highlight: 'werd:first-guess' } },
  { id: 'bullseye', name: 'Bullseye', description: 'Solve a Pinpoint from the first clue.', category: 'game', icon: 'Crosshair', xp: 100, criterion: { type: 'completion', game: 'pinpoint', highlight: 'pinpoint:one-clue' } },
  { id: 'specialist', name: 'Specialist', description: 'Reach Master mastery in any game.', category: 'game', icon: 'GraduationCap', xp: 1000, criterion: { type: 'masteryRank', game: 'any', rank: 'Master' } },
  { id: 'polymath', name: 'Polymath', description: 'Reach Pro mastery in all eight games.', category: 'game', icon: 'Library', xp: 1500, criterion: { type: 'masteryRank', game: 'all', rank: 'Pro' } },

  // Rare
  { id: 'rich', name: 'Rich', description: 'Reach 100,000 XP.', category: 'rare', icon: 'Coins', xp: 1000, criterion: { type: 'stat', stat: 'totalXp', gte: 100_000 } },
  { id: 'insurance-policy', name: 'Insurance Policy', description: 'Earn your first Gold Repair Card.', category: 'rare', icon: 'ShieldCheck', xp: 100, criterion: { type: 'stat', stat: 'cardsEarned', gte: 1 } },
  { id: 'full-pocket', name: 'Full Pocket', description: 'Hold three Gold Repair Cards at once.', category: 'rare', icon: 'Wallet', xp: 200, criterion: { type: 'stat', stat: 'cardsHeld', gte: 3 } },
  { id: 'hoarder', name: 'Hoarder', description: 'Earn five Gold Repair Cards over your lifetime.', category: 'rare', icon: 'Archive', xp: 300, criterion: { type: 'stat', stat: 'cardsEarned', gte: 5 } },

  // Weird
  { id: 'potato', name: 'Potato', description: 'Play the same game 10 times in a row.', category: 'weird', icon: 'Repeat', xp: 50, hidden: true, criterion: { type: 'stat', stat: 'sameGameRun', gte: 10 } },
  { id: 'night-owl', name: 'Night Owl', description: 'Finish a Daily Set between 00:00 and 04:00 UTC.', category: 'weird', icon: 'Moon', xp: 100, hidden: true, criterion: { type: 'dailySet', fromHourUtc: 0, toHourUtc: 4 } },
  { id: 'early-bird', name: 'Early Bird', description: 'Finish a Daily Set between 04:00 and 06:00 UTC.', category: 'weird', icon: 'Sunrise', xp: 100, hidden: true, criterion: { type: 'dailySet', fromHourUtc: 4, toHourUtc: 6 } },
  { id: 'are-you-okay', name: 'Are You Okay?', description: 'Complete 100 games in one UTC day.', category: 'weird', icon: 'HeartPulse', xp: 300, hidden: true, criterion: { type: 'stat', stat: 'todayGames', gte: 100 } },
  { id: 'why', name: 'Why?', description: 'Play the same game 50 times in one day.', category: 'weird', icon: 'CircleHelp', xp: 200, hidden: true, criterion: { type: 'stat', stat: 'todayMaxSameGame', gte: 50 } },
  { id: 'overqualified', name: 'Overqualified', description: 'Complete 100 Easy games.', category: 'weird', icon: 'Baby', xp: 100, hidden: true, criterion: { type: 'difficultyCount', difficulty: 'easy', gte: 100 } },
  { id: 'chaos', name: 'Chaos', description: 'Complete all eight Daily Set games out of their listed order.', category: 'weird', icon: 'Shuffle', xp: 150, hidden: true, criterion: { type: 'dailySet', nonCanonicalOrder: true } },
  { id: 'waste-not', name: 'Waste Not', description: 'Earn a fourth card with a full pocket and convert it to XP.', category: 'weird', icon: 'Recycle', xp: 150, hidden: true, criterion: { type: 'stat', stat: 'cardsConverted', gte: 1 } },
  { id: 'time-traveler', name: 'Time Traveler', description: 'Complete games in 12 different hours of one UTC day.', category: 'weird', icon: 'Clock', xp: 200, hidden: true, criterion: { type: 'stat', stat: 'todayDistinctHours', gte: 12 } },
];

export const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
