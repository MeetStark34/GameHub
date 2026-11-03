import { GAMES } from '@/config/games';
import type { Difficulty, GameId } from '@/games/types';

/**
 * analyze_player_performance (course Block 1: own tool).
 *
 * A pure, deterministic function over a player's completion records. It
 * computes the numbers a 4B model is bad at (averages, spreads, par-relative
 * speed, trends) so the model only has to explain them. No database access
 * and no clock, so it is fully unit-tested (ai/tests/analyze.test.ts).
 */
export interface CompletionRecord {
  game: GameId;
  difficulty: Difficulty;
  score: number;
  durationMs: number;
  perfect: boolean;
  completedAt: string;
}

export interface GameAnalysis {
  game: GameId;
  name: string;
  plays: number;
  avgScore: number;
  scoreSpread: number;
  avgSeconds: number;
  bestSeconds: number;
  /** Mean of duration / par for the difficulty played. < 1 = faster than par. */
  parRatio: number;
  perfectRate: number;
}

export interface PerformanceAnalysis {
  totalPlays: number;
  gamesPlayed: number;
  games: GameAnalysis[];
  strongestGame: string | null;
  weakestGame: string | null;
  fastestVsPar: string | null;
  slowestVsPar: string | null;
  mostPlayed: string | null;
  trend: { recentAvgScore: number; previousAvgScore: number; direction: 'improving' | 'declining' | 'steady' } | null;
  notes: string[];
}

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const stdDev = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
};

/** Minimum plays before a game can be called a strength or weakness. */
export const MIN_PLAYS_FOR_RANKING = 2;
/** Size of the "recent" and "previous" windows for the trend. */
export const TREND_WINDOW = 5;

export function analyzePerformance(records: readonly CompletionRecord[]): PerformanceAnalysis {
  const byGame = new Map<GameId, CompletionRecord[]>();
  for (const r of records) byGame.set(r.game, [...(byGame.get(r.game) ?? []), r]);

  const games: GameAnalysis[] = [...byGame.entries()].map(([game, rs]) => ({
    game,
    name: GAMES[game]?.name ?? game,
    plays: rs.length,
    avgScore: round(mean(rs.map((r) => r.score))),
    scoreSpread: round(stdDev(rs.map((r) => r.score))),
    avgSeconds: round(mean(rs.map((r) => r.durationMs / 1000))),
    bestSeconds: round(Math.min(...rs.map((r) => r.durationMs / 1000))),
    parRatio: round(mean(rs.map((r) => r.durationMs / 1000 / (GAMES[game]?.parSeconds[r.difficulty] ?? 60))), 2),
    perfectRate: round(rs.filter((r) => r.perfect).length / rs.length, 2),
  }));
  games.sort((a, b) => b.plays - a.plays || a.name.localeCompare(b.name));

  const ranked = games.filter((g) => g.plays >= MIN_PLAYS_FOR_RANKING);
  // Ties break by name so the result never depends on input order.
  const pick = (cmp: (a: GameAnalysis, b: GameAnalysis) => number) =>
    ranked.length ? [...ranked].sort((a, b) => cmp(a, b) || a.name.localeCompare(b.name))[0].name : null;

  const chronological = [...records].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  let trend: PerformanceAnalysis['trend'] = null;
  if (chronological.length >= TREND_WINDOW * 2) {
    const recent = mean(chronological.slice(-TREND_WINDOW).map((r) => r.score));
    const previous = mean(chronological.slice(-TREND_WINDOW * 2, -TREND_WINDOW).map((r) => r.score));
    const diff = recent - previous;
    trend = { recentAvgScore: round(recent), previousAvgScore: round(previous), direction: diff > 25 ? 'improving' : diff < -25 ? 'declining' : 'steady' };
  }

  const notes: string[] = [];
  if (!records.length) notes.push('No completed games yet.');
  else if (!ranked.length) notes.push(`Every game has fewer than ${MIN_PLAYS_FOR_RANKING} plays; strengths need more data.`);
  if (trend) notes.push(`Average score over the last ${TREND_WINDOW} games is ${trend.direction} (${trend.previousAvgScore} -> ${trend.recentAvgScore}).`);

  return {
    totalPlays: records.length,
    gamesPlayed: games.length,
    games,
    // Equal average scores are separated by speed relative to par.
    strongestGame: pick((a, b) => b.avgScore - a.avgScore || a.parRatio - b.parRatio),
    weakestGame: pick((a, b) => a.avgScore - b.avgScore || b.parRatio - a.parRatio),
    fastestVsPar: pick((a, b) => a.parRatio - b.parRatio),
    slowestVsPar: pick((a, b) => b.parRatio - a.parRatio),
    mostPlayed: games.length ? games[0].name : null,
    trend,
    notes,
  };
}
