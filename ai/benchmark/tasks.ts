import { GAMES } from '@/config/games';
import { PLAYER_RANKS } from '@/config/ranks';
import type { Queryable } from '@/lib/db';
import { rankFromXp } from '@/lib/progression/ranks';
import { addDays, toUtcDate } from '@/lib/time';
import { GAME_IDS, type GameId } from '@/games/types';

/**
 * Benchmark tasks with known answers (course Block 9).
 *
 * Each expected answer is computed INDEPENDENTLY of the MCP tools: directly
 * from the database tables with its own SQL (the only shared code is the
 * rank ladder from src/config/ranks.ts, which defines what a rank is).
 * So a bug in a tool shows up as a benchmark failure instead of being
 * copied into the "truth".
 */
export type Expected = { kind: 'number'; value: number } | { kind: 'game'; accept: GameId[] } | { kind: 'rank'; label: string };

export interface BenchTask {
  id: string;
  question: string;
  /** Tool(s) a correct solution would typically use (for failure analysis only, not grading). */
  expectedTools: string[];
  truth: (q: Queryable, userId: string, now: Date) => Promise<Expected>;
}

const num = async (q: Queryable, sql: string, params: unknown[]): Promise<Expected> => {
  const rows = await q.query<{ v: number | null }>(sql, params);
  return { kind: 'number', value: Number(rows[0]?.v ?? 0) };
};

/** Games tied for the extreme of `agg` (ties are all accepted). */
const gameBy = async (q: Queryable, userId: string, agg: string, dir: 'asc' | 'desc'): Promise<Expected> => {
  const rows = await q.query<{ game: GameId; v: number }>(`select game, ${agg} as v from completions where user_id = $1 group by game order by v ${dir}`, [userId]);
  const best = rows[0]?.v;
  return { kind: 'game', accept: rows.filter((r) => Number(r.v) === Number(best)).map((r) => r.game) };
};

export const TASKS: BenchTask[] = [
  {
    id: 'xp',
    question: 'What is my current XP?',
    expectedTools: ['get_player_stats'],
    truth: (q, u) => num(q, 'select total_xp v from user_stats where user_id = $1', [u]),
  },
  {
    id: 'rank',
    question: 'What is my current player rank?',
    expectedTools: ['get_player_stats'],
    truth: async (q, u) => {
      const [r] = await q.query<{ v: number }>('select total_xp v from user_stats where user_id = $1', [u]);
      return { kind: 'rank', label: rankFromXp(Number(r?.v ?? 0), PLAYER_RANKS).label };
    },
  },
  {
    id: 'best_streak',
    question: 'What is the longest daily streak I have ever had?',
    expectedTools: ['get_streaks'],
    truth: (q, u) => num(q, "select best v from streaks where user_id = $1 and kind = 'normal'", [u]),
  },
  {
    id: 'current_streak',
    question: 'How many days long is my current streak?',
    expectedTools: ['get_streaks'],
    truth: (q, u, now) =>
      num(q, "select case when last_date >= $2 then current else 0 end v from streaks where user_id = $1 and kind = 'normal'", [u, addDays(toUtcDate(now), -1)]),
  },
  {
    id: 'true_player_days',
    question: 'On how many days have I completed all 8 games of the Daily Set?',
    expectedTools: ['get_player_stats'],
    // Independent of user_stats: count days with 8 distinct Daily games of that date.
    truth: (q, u) =>
      num(
        q,
        `select count(*)::int v from (select daily_date from completions where user_id = $1 and mode = 'daily'
         group by daily_date having count(distinct game) = ${GAME_IDS.length}) d`,
        [u],
      ),
  },
  {
    id: 'total_games',
    question: 'How many games have I completed in total?',
    expectedTools: ['get_player_stats'],
    truth: (q, u) => num(q, 'select count(*)::int v from completions where user_id = $1', [u]),
  },
  {
    id: 'achievements',
    question: 'How many achievements have I unlocked?',
    expectedTools: ['get_achievements'],
    truth: (q, u) => num(q, 'select count(*)::int v from achievement_unlocks where user_id = $1', [u]),
  },
  {
    id: 'daily_done',
    question: "How many of today's Daily Set games have I completed?",
    expectedTools: ['get_daily_set_status'],
    truth: (q, u, now) => num(q, "select count(*)::int v from completions where user_id = $1 and mode = 'daily' and daily_date = $2", [u, toUtcDate(now)]),
  },
  {
    id: 'most_played',
    question: 'Which game have I played the most?',
    expectedTools: ['get_game_performance', 'analyze_player_performance'],
    truth: (q, u) => gameBy(q, u, 'count(*)', 'desc'),
  },
  {
    id: 'fastest_avg',
    question: 'Which game do I finish fastest on average, in seconds?',
    expectedTools: ['get_game_performance'],
    truth: (q, u) => gameBy(q, u, 'avg(duration_ms)', 'asc'),
  },
  {
    id: 'fastest_single',
    question: 'In which game did I set my single fastest completion time?',
    expectedTools: ['get_game_performance'],
    truth: (q, u) => gameBy(q, u, 'min(duration_ms)', 'asc'),
  },
  {
    id: 'lowest_score',
    question: 'Which game has my lowest average score?',
    expectedTools: ['get_game_performance', 'analyze_player_performance'],
    truth: (q, u) => gameBy(q, u, 'avg(score)', 'asc'),
  },
];

/* ----------------------------- grading ----------------------------- */

/** All numbers in a text; "6,721" and "6 721" count as 6721. */
export function numbersIn(text: string): number[] {
  const cleaned = text.replace(/(\d)[,   ](?=\d{3}\b)/g, '$1');
  return (cleaned.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

const GAME_PATTERNS: [GameId, RegExp][] = GAME_IDS.map((g) => {
  const name = GAMES[g].name.replace(/^Mini /, '');
  return [g, new RegExp(`\\b(${name}|${g})\\b`, 'i')];
});

/** Games mentioned in a text, in order of first appearance. */
export function gamesIn(text: string): GameId[] {
  return GAME_PATTERNS.map(([g, re]) => ({ g, i: text.search(re) }))
    .filter((x) => x.i >= 0)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.g);
}

/**
 * Numbers that answer the question: dates are dropped, and so are numbers
 * that only repeat the question ("all 8 games") unless one is the expected value.
 */
export function answerNumbers(answer: string, question: string, expected?: number): number[] {
  const inQuestion = new Set(numbersIn(question));
  return numbersIn(answer.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')).filter((n) => n === expected || !inQuestion.has(n));
}

/**
 * Grades an answer strictly:
 *  - numbers: the FIRST number that answers the question must be the expected
 *    value (so "0 days ... best streak 6" does not pass for 6);
 *  - games: the FIRST game named must be an accepted one (so "Zip, Queens and
 *    Tango" does not pass for Tango);
 *  - ranks: the exact label (so "Pro II" does not pass for "Pro I").
 */
export function grade(answer: string, e: Expected, question = ''): boolean {
  if (e.kind === 'number') return answerNumbers(answer, question, e.value)[0] === e.value;
  if (e.kind === 'game') return e.accept.includes(gamesIn(answer)[0] as GameId);
  return new RegExp(`\\b${e.label.replace(/ /g, '\\s+')}(?![IVX\\w])`, 'i').test(answer);
}

export const describeExpected = (e: Expected) =>
  e.kind === 'number' ? String(e.value) : e.kind === 'rank' ? e.label : e.accept.map((g) => GAMES[g].name).join(' or ');
