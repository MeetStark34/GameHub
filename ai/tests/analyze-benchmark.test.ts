import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { gamesIn, grade, numbersIn, TASKS } from '../benchmark/tasks';
import { analyzePerformance, type CompletionRecord } from '../tools/analyze';
import { body, buildFixture, NOW, type Fixture } from './fixture';

const rec = (game: CompletionRecord['game'], score: number, seconds: number, day: number, difficulty: CompletionRecord['difficulty'] = 'easy'): CompletionRecord => ({
  game,
  difficulty,
  score,
  durationMs: seconds * 1000,
  perfect: score === 1000,
  completedAt: `2026-03-${String(day).padStart(2, '0')}T10:00:00.000Z`,
});

describe('analyze_player_performance (Block 1 tool)', () => {
  it('handles no data', () => {
    const a = analyzePerformance([]);
    expect(a).toMatchObject({ totalPlays: 0, strongestGame: null, mostPlayed: null, trend: null });
    expect(a.notes[0]).toMatch(/No completed games/);
  });

  it('computes averages, spread, par ratio and picks strengths', () => {
    // Zip par (easy) = 40 s; Pinpoint par (easy) = 30 s.
    const a = analyzePerformance([rec('zip', 1000, 20, 1), rec('zip', 1000, 30, 2), rec('pinpoint', 800, 60, 1), rec('pinpoint', 600, 90, 2), rec('queens', 1000, 10, 3)]);
    const zip = a.games.find((g) => g.game === 'zip')!;
    expect(zip).toMatchObject({ plays: 2, avgScore: 1000, scoreSpread: 0, avgSeconds: 25, bestSeconds: 20, parRatio: 0.63, perfectRate: 1 });
    const pin = a.games.find((g) => g.game === 'pinpoint')!;
    expect(pin.scoreSpread).toBe(141.4); // sample SD of 800, 600
    expect(pin.parRatio).toBe(2.5);
    expect(a.strongestGame).toBe('Zip'); // Queens has only 1 play: not ranked
    expect(a.weakestGame).toBe('Pinpoint');
    expect(a.fastestVsPar).toBe('Zip');
    expect(a.mostPlayed).toBe('Pinpoint'); // tie on plays -> alphabetical
  });

  it('breaks score ties by speed relative to par, independent of input order', () => {
    const rs = [rec('queens', 1000, 30, 1), rec('queens', 1000, 30, 2), rec('zip', 1000, 10, 1), rec('zip', 1000, 10, 2)];
    expect(analyzePerformance(rs).strongestGame).toBe('Zip');
    expect(analyzePerformance([...rs].reverse()).strongestGame).toBe('Zip');
  });

  it('detects a trend over the last 5 vs previous 5 games', () => {
    const rs = Array.from({ length: 10 }, (_, i) => rec('tango', i < 5 ? 600 : 900, 50, i + 1));
    expect(analyzePerformance(rs).trend).toEqual({ recentAvgScore: 900, previousAvgScore: 600, direction: 'improving' });
  });
});

describe('benchmark grading', () => {
  it('extracts numbers with thousands separators', () => {
    expect(numbersIn('You have 6,721 XP and 12 achievements.')).toEqual([6721, 12]);
    expect(numbersIn('6 721 XP')).toContain(6721);
  });

  it('finds game names in order, including id forms', () => {
    expect(gamesIn('Zip is fastest, then Queens')).toEqual(['zip', 'queens']);
    expect(gamesIn('Your best is Mini Sudoku')).toEqual(['sudoku']);
    expect(gamesIn('Sudoku')).toEqual(['sudoku']);
  });

  it('grades strictly', () => {
    expect(grade('You have 6,721 XP.', { kind: 'number', value: 6721 })).toBe(true);
    expect(grade('You have 6,720 XP.', { kind: 'number', value: 6721 })).toBe(false);
    expect(grade('Your rank is Pro I.', { kind: 'rank', label: 'Pro I' })).toBe(true);
    expect(grade('Your rank is Pro II.', { kind: 'rank', label: 'Pro I' })).toBe(false);
    expect(grade('Queens, then Zip', { kind: 'game', accept: ['zip'] })).toBe(false);
    expect(grade('It is Zip.', { kind: 'game', accept: ['zip'] })).toBe(true);
    expect(grade('I cannot know that.', { kind: 'number', value: 3 })).toBe(false);
    // First answering number counts; a later correct number does not rescue a wrong answer.
    expect(grade('You completed it on 0 days. Your best True Player streak is 6.', { kind: 'number', value: 6 }, 'On how many days have I completed all 8 games?')).toBe(false);
    // Numbers repeated from the question and dates are skipped.
    expect(grade('You completed all 8 games on 6 days.', { kind: 'number', value: 6 }, 'On how many days have I completed all 8 games?')).toBe(true);
    expect(grade('Today, 2026-11-03, you completed 3 of 8.', { kind: 'number', value: 3 }, "How many of today's games?")).toBe(true);
    expect(grade('You completed 8 of 8 games.', { kind: 'number', value: 8 }, 'How many of the 8 games?')).toBe(true);
  });
});

describe('benchmark ground truth vs MCP tools (two independent paths agree)', () => {
  let f: Fixture;
  let mcp: Awaited<ReturnType<Fixture['connect']>>;
  beforeAll(async () => {
    f = await buildFixture();
    mcp = await f.connect();
  });
  afterAll(async () => {
    await mcp.close();
    await f.db.close();
  });

  it('has at least 10 tasks with unique ids', () => {
    expect(TASKS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(TASKS.map((t) => t.id)).size).toBe(TASKS.length);
  });

  it('every ground truth matches what the tools report', async () => {
    const truth = Object.fromEntries(await Promise.all(TASKS.map(async (t) => [t.id, await f.db.tx((q) => t.truth(q, f.demoId, NOW))])));
    const call = async (name: string, args = {}) => body(await mcp.client.callTool({ name, arguments: args }));
    const stats = await call('get_player_stats');
    const streaks = await call('get_streaks');
    const perf = await call('get_game_performance');
    const ach = await call('get_achievements');
    const daily = await call('get_daily_set_status');
    const analysis = await call('analyze_player_performance');

    expect(truth.xp).toEqual({ kind: 'number', value: stats.xp });
    expect(truth.rank).toEqual({ kind: 'rank', label: stats.rank });
    expect(truth.best_streak).toEqual({ kind: 'number', value: streaks.normal.best });
    expect(truth.current_streak).toEqual({ kind: 'number', value: streaks.normal.current });
    expect(truth.true_player_days).toEqual({ kind: 'number', value: stats.truePlayerDays });
    expect(truth.total_games).toEqual({ kind: 'number', value: stats.gamesCompleted });
    expect(truth.achievements).toEqual({ kind: 'number', value: ach.unlockedCount });
    expect(truth.daily_done).toEqual({ kind: 'number', value: daily.completed });
    expect(truth.most_played).toMatchObject({ kind: 'game', accept: ['queens'] });
    expect(analysis.mostPlayed).toBe('Queens');
    const byAvg = [...perf.games].sort((a: { avgTimeSeconds: number }, b: { avgTimeSeconds: number }) => a.avgTimeSeconds - b.avgTimeSeconds)[0];
    expect(grade(byAvg.game, truth.fastest_avg)).toBe(true);
    const byBest = [...perf.games].sort((a: { bestTimeSeconds: number }, b: { bestTimeSeconds: number }) => a.bestTimeSeconds - b.bestTimeSeconds)[0];
    expect(grade(byBest.game, truth.fastest_single)).toBe(true);
    const byScore = [...perf.games].sort((a: { avgScore: number }, b: { avgScore: number }) => a.avgScore - b.avgScore)[0];
    expect(grade(byScore.game, truth.lowest_score)).toBe(true);
  });
});
