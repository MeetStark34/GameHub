import { ACHIEVEMENTS, type AchievementDef, type Criterion, type StatKey } from '@/config/achievements';
import { RANK_NAMES } from '@/config/ranks';
import { GAME_IDS, type Difficulty, type GameId, type GameMode } from '@/games/types';

export interface AchievementStats extends Record<StatKey, number> {
  byDifficulty: Record<Difficulty, number>;
  byGame: Record<GameId, number>;
  /** Mastery rank index (0 = Rookie) per game. */
  masteryRankIndex: Record<GameId, number>;
}

export interface CompletionEvent {
  game: GameId;
  mode: GameMode;
  difficulty: Difficulty;
  durationMs: number;
  parSeconds: number;
  perfect: boolean;
  highlights: string[];
  /** Set when this completion was the eighth Daily Set game of its day. */
  dailySet: { hourUtc: number; order: GameId[] } | null;
}

function met(c: Criterion, stats: AchievementStats, event: CompletionEvent | null): boolean {
  switch (c.type) {
    case 'stat':
      return (stats[c.stat] ?? 0) >= c.gte;
    case 'difficultyCount':
      return (stats.byDifficulty[c.difficulty] ?? 0) >= c.gte;
    case 'gameCount':
      return (stats.byGame[c.game] ?? 0) >= c.gte;
    case 'masteryRank': {
      const need = RANK_NAMES.indexOf(c.rank);
      const idx = GAME_IDS.map((g) => stats.masteryRankIndex[g] ?? 0);
      if (c.game === 'any') return idx.some((i) => i >= need);
      if (c.game === 'all') return idx.every((i) => i >= need);
      return (stats.masteryRankIndex[c.game] ?? 0) >= need;
    }
    case 'completion': {
      if (!event) return false;
      if (c.game && event.game !== c.game) return false;
      if (c.mode && event.mode !== c.mode) return false;
      if (c.difficulties && !c.difficulties.includes(event.difficulty)) return false;
      if (c.minDurationSec !== undefined && event.durationMs < c.minDurationSec * 1000) return false;
      if (c.maxParFraction !== undefined && event.durationMs > c.maxParFraction * event.parSeconds * 1000) return false;
      if (c.perfect && !event.perfect) return false;
      if (c.highlight && !event.highlights.includes(c.highlight)) return false;
      return true;
    }
    case 'dailySet': {
      const set = event?.dailySet;
      if (!set) return false;
      if (c.fromHourUtc !== undefined && set.hourUtc < c.fromHourUtc) return false;
      if (c.toHourUtc !== undefined && set.hourUtc >= c.toHourUtc) return false;
      if (c.nonCanonicalOrder && set.order.join() === GAME_IDS.join()) return false;
      return true;
    }
  }
}

/** Achievements newly satisfied by these stats/event, excluding ones already unlocked. */
export function newlyUnlocked(
  stats: AchievementStats,
  event: CompletionEvent | null,
  unlocked: ReadonlySet<string>,
  defs: readonly AchievementDef[] = ACHIEVEMENTS,
): AchievementDef[] {
  return defs.filter((a) => !unlocked.has(a.id) && met(a.criterion, stats, event));
}

/** Progress (0..1) for display; event-based achievements are binary. */
export function achievementProgress(a: AchievementDef, stats: AchievementStats): { value: number; target: number } | null {
  const c = a.criterion;
  if (c.type === 'stat') return { value: Math.min(stats[c.stat] ?? 0, c.gte), target: c.gte };
  if (c.type === 'difficultyCount') return { value: Math.min(stats.byDifficulty[c.difficulty] ?? 0, c.gte), target: c.gte };
  if (c.type === 'gameCount') return { value: Math.min(stats.byGame[c.game] ?? 0, c.gte), target: c.gte };
  return null;
}
