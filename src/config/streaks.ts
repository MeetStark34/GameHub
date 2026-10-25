export interface StreakConfig {
  goldPunchCardRequirement: number; // 10 punches
  maxStoredRepairCards: number; // 3 cards
  gamesPerDayPunchTarget: number; // 20 games/day
  dailySetsPunchTarget: number; // 2 complete daily sets
}

export const STREAK_CONFIG: StreakConfig = {
  goldPunchCardRequirement: 10,
  maxStoredRepairCards: 3,
  gamesPerDayPunchTarget: 20,
  dailySetsPunchTarget: 2,
};
