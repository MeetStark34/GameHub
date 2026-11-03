import { z } from 'zod';
import { ACHIEVEMENTS } from '@/config/achievements';
import { GAMES } from '@/config/games';
import { MASTERY_RANKS, PLAYER_RANKS } from '@/config/ranks';
import { maybeOne, type Queryable } from '@/lib/db';
import { rankFromXp } from '@/lib/progression/ranks';
import { viewStreak } from '@/lib/progression/streaks';
import { toUtcDate } from '@/lib/time';
import { GAME_IDS, type Difficulty, type GameId, type GameMode } from '@/games/types';
import { dailyDifficultyFor } from '@/server/play';
import { getAchievements, getPublicProfile, loadMastery } from '@/server/queries';
import { loadStreaks } from '@/server/progress';
import type { AiDb } from '../lib/db';
import { memoryContext, type MemoryStore } from '../memory/store';
import { analyzePerformance, type CompletionRecord } from '../tools/analyze';
import type { Principal } from './auth';
import { PolicyViolation } from './guard';

/**
 * The GameHub MCP tools. Every tool:
 *  - has a strict zod input schema (unknown fields are rejected, so a model
 *    cannot smuggle `xp: 999999` into a read call);
 *  - acts only for the authenticated player (the model never passes a user id);
 *  - runs inside a READ ONLY transaction with a SELECT-only Queryable;
 *  - returns compact JSON (seconds instead of ms, names instead of ids).
 */
export interface ToolContext {
  db: AiDb;
  principal: Principal;
  memory: MemoryStore;
  now: () => Date;
}

/** Accepts a game id ("sudoku") or display name ("Mini Sudoku"), any case. */
const gameArg = z
  .string()
  .max(40)
  .transform((s, ctx) => {
    const k = s.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
    const id = GAME_IDS.find((g) => g === k.replace(/ /g, '') || GAMES[g].name.toLowerCase() === k || GAMES[g].name.toLowerCase().replace('mini ', '') === k);
    if (!id) {
      ctx.addIssue({ code: 'custom', message: `Unknown game. Use one of: ${GAME_IDS.map((g) => GAMES[g].name).join(', ')}` });
      return z.NEVER;
    }
    return id;
  });

const pct = (p: { value: number; target: number } | null) => (p ? p.value / p.target : 0);
const sec = (ms: number | null | undefined) => (ms == null ? null : Math.round(ms / 100) / 10);
const gameName = (g: GameId) => GAMES[g]?.name ?? g;

interface ToolDef<S extends z.ZodType> {
  name: string;
  description: string;
  input: S;
  /** Hint for clients; every DB-backed tool here is read-only. */
  readOnly: boolean;
  run: (args: z.output<S>, ctx: ToolContext, q: Queryable) => Promise<unknown>;
}

const def = <S extends z.ZodType>(d: ToolDef<S>) => d;
const empty = z.object({}).strict();

async function completionRecords(q: Queryable, userId: string, game?: GameId): Promise<CompletionRecord[]> {
  const rows = await q.query<{ game: GameId; difficulty: Difficulty; score: number; duration_ms: number; perfect: boolean; completed_at: Date }>(
    `select game, difficulty, score, duration_ms, perfect, completed_at from completions
     where user_id = $1 and ($2::text is null or game = $2) order by completed_at`,
    [userId, game ?? null],
  );
  return rows.map((r) => ({ game: r.game, difficulty: r.difficulty, score: r.score, durationMs: r.duration_ms, perfect: r.perfect, completedAt: new Date(r.completed_at).toISOString() }));
}

export const TOOLS = [
  def({
    name: 'get_player_profile',
    description:
      'Profile of the signed-in player (no arguments), or the PUBLIC profile of another player by handle. Returns name, handle, member-since date, XP, rank and badges. Private profiles of other players are not available.',
    input: z.object({ handle: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_-]+$/).optional() }).strict(),
    readOnly: true,
    run: async ({ handle }, ctx, q) => {
      const target = handle?.toLowerCase() ?? ctx.principal.handle;
      const p = await getPublicProfile(q, target, ctx.principal.userId, ctx.now());
      if (!p) return { found: false, handle: target, reason: 'No such player, or the profile is private.' };
      return {
        found: true,
        isYou: p.isOwner,
        handle: p.handle,
        displayName: p.displayName,
        title: p.title,
        memberSince: p.memberSince.slice(0, 10),
        xp: p.xp,
        rank: p.rank.label,
        badges: p.badges,
        gamesCompleted: p.gamesCompleted,
      };
    },
  }),
  def({
    name: 'get_player_stats',
    description:
      "The signed-in player's totals: XP, rank (and next rank), total completed games (daily / unlimited / per difficulty / perfect), True Player days (days with the full Daily Set of 8 completed), and Gold Repair Cards.",
    input: empty,
    readOnly: true,
    run: async (_a, ctx, q) => {
      const s = await maybeOne<Record<string, number>>(q, 'select * from user_stats where user_id = $1', [ctx.principal.userId]);
      const xp = s?.total_xp ?? 0;
      const rank = rankFromXp(xp, PLAYER_RANKS);
      return {
        xp,
        rank: rank.label,
        level: rank.level,
        nextRank: rank.nextLabel,
        xpToNextRank: rank.nextAt == null ? null : rank.nextAt - xp,
        gamesCompleted: s?.games_completed ?? 0,
        dailyGamesCompleted: s?.daily_games_completed ?? 0,
        unlimitedGamesCompleted: s?.unlimited_games_completed ?? 0,
        byDifficulty: { easy: s?.easy_completed ?? 0, normal: s?.normal_completed ?? 0, hard: s?.hard_completed ?? 0, expert: s?.expert_completed ?? 0 },
        perfectGames: s?.perfect_completed ?? 0,
        truePlayerDays: s?.true_player_days ?? 0,
        repairCardsHeld: s?.cards_held ?? 0,
      };
    },
  }),
  def({
    name: 'get_game_performance',
    description:
      'Per-game performance of the signed-in player: number of completions, average and best time in seconds, average and best score (0-1000), and mastery rank. Optionally for one game.',
    input: z.object({ game: gameArg.optional() }).strict(),
    readOnly: true,
    run: async ({ game }, ctx, q) => {
      const [rows, mastery] = await Promise.all([
        q.query<{ game: GameId; plays: number; avg_ms: number; best_ms: number; avg_score: number; best_score: number }>(
          `select game, count(*)::int plays, round(avg(duration_ms))::int avg_ms, min(duration_ms)::int best_ms,
                  round(avg(score))::int avg_score, max(score)::int best_score
           from completions where user_id = $1 and ($2::text is null or game = $2) group by game order by plays desc, game`,
          [ctx.principal.userId, game ?? null],
        ),
        loadMastery(q, ctx.principal.userId),
      ]);
      const m = new Map(mastery.entries.map((e) => [e.game, e]));
      return {
        games: rows.map((r) => ({
          game: gameName(r.game),
          completions: r.plays,
          avgTimeSeconds: sec(r.avg_ms),
          bestTimeSeconds: sec(r.best_ms),
          avgScore: r.avg_score,
          bestScore: r.best_score,
          masteryRank: m.get(r.game)?.rank.label ?? rankFromXp(0, MASTERY_RANKS).label,
          masteryXp: m.get(r.game)?.xp ?? 0,
        })),
        notPlayedYet: game ? [] : GAME_IDS.filter((g) => !rows.some((r) => r.game === g)).map(gameName),
      };
    },
  }),
  def({
    name: 'get_game_history',
    description: "The signed-in player's most recent completed games, newest first: game, mode, difficulty, score, time in seconds, XP earned, date.",
    input: z
      .object({
        game: gameArg.optional(),
        mode: z.enum(['daily', 'unlimited']).optional(),
        limit: z.number().int().min(1).max(25).optional(),
      })
      .strict(),
    readOnly: true,
    run: async ({ game, mode, limit }, ctx, q) => {
      const rows = await q.query<{ game: GameId; mode: GameMode; difficulty: Difficulty; score: number; duration_ms: number; xp_awarded: number; completed_at: Date }>(
        `select game, mode, difficulty, score, duration_ms, xp_awarded, completed_at from completions
         where user_id = $1 and ($2::text is null or game = $2) and ($3::text is null or mode = $3)
         order by completed_at desc limit $4`,
        [ctx.principal.userId, game ?? null, mode ?? null, limit ?? 10],
      );
      return {
        games: rows.map((r) => ({
          game: gameName(r.game),
          mode: r.mode,
          difficulty: r.difficulty,
          score: r.score,
          timeSeconds: sec(r.duration_ms),
          xpEarned: r.xp_awarded,
          completedAt: new Date(r.completed_at).toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
        })),
      };
    },
  }),
  def({
    name: 'get_achievements',
    description:
      "The signed-in player's achievements: how many are unlocked out of the total, the unlocked ones, and (status 'locked' or 'all') the locked ones closest to completion. Hidden achievements stay hidden until unlocked.",
    input: z.object({ status: z.enum(['unlocked', 'locked', 'all']).optional() }).strict(),
    readOnly: true,
    run: async ({ status = 'unlocked' }, ctx, q) => {
      const all = await getAchievements(q, ctx.principal.userId, ctx.now());
      const unlocked = all.filter((a) => a.unlockedAt);
      const locked = all
        .filter((a) => !a.unlockedAt && !a.hidden)
        .map((a) => ({ name: a.name, description: a.description, progress: a.progress }))
        .sort((a, b) => pct(b.progress) - pct(a.progress))
        .slice(0, 5);
      return {
        unlockedCount: unlocked.length,
        total: ACHIEVEMENTS.length,
        unlocked: status === 'locked' ? undefined : unlocked.map((a) => ({ name: a.name, unlockedAt: a.unlockedAt!.slice(0, 10) })),
        closestLocked: status === 'unlocked' ? undefined : locked,
      };
    },
  }),
  def({
    name: 'get_streaks',
    description:
      "The signed-in player's two streaks. 'normal' = consecutive UTC days with at least one Daily Set game; 'truePlayer' = consecutive days with all 8 Daily Set games. Each has current length, best (longest ever) and status (active = done today, at-risk = not yet today, broken, none).",
    input: empty,
    readOnly: true,
    run: async (_a, ctx, q) => {
      const today = toUtcDate(ctx.now());
      const s = await loadStreaks(q, ctx.principal.userId);
      const view = (k: 'normal' | 'true_player') => {
        const v = viewStreak(s[k], today);
        return { current: v.current, best: v.best, status: v.status, doneToday: v.doneToday };
      };
      return { today, normal: view('normal'), truePlayer: view('true_player') };
    },
  }),
  def({
    name: 'get_daily_set_status',
    description:
      "Today's Daily Set (the same 8 puzzles for everyone, resets at 00:00 UTC) for the signed-in player: difficulty, and for each game whether it is not started, in progress or completed (with score and time). Also how many of the 8 are done.",
    input: empty,
    readOnly: true,
    run: async (_a, ctx, q) => {
      const today = toUtcDate(ctx.now());
      const rows = await q.query<{ game: GameId; status: string; score: number | null; duration_ms: number | null }>(
        `select s.game, s.status, c.score, c.duration_ms from game_sessions s left join completions c on c.session_id = s.id
         where s.user_id = $1 and s.mode = 'daily' and s.daily_date = $2`,
        [ctx.principal.userId, today],
      );
      const by = new Map(rows.map((r) => [r.game, r]));
      const games = GAME_IDS.map((g) => {
        const r = by.get(g);
        const status = !r ? 'not started' : r.status === 'completed' ? 'completed' : 'in progress';
        return { game: gameName(g), status, score: r?.score ?? null, timeSeconds: sec(r?.duration_ms) };
      });
      const completed = games.filter((g) => g.status === 'completed').length;
      return { date: today, difficulty: dailyDifficultyFor(today), completed, total: GAME_IDS.length, truePlayerToday: completed === GAME_IDS.length, games };
    },
  }),
  def({
    name: 'analyze_player_performance',
    description:
      "Analysis of the signed-in player's completed games, computed by GameHub code: strongest and weakest game (by average score), fastest and slowest game relative to par time, most played game, per-game averages and score spread, and the recent score trend. Use this for 'what am I best/worst at' or 'how am I improving' questions.",
    input: z.object({ game: gameArg.optional() }).strict(),
    readOnly: true,
    run: async ({ game }, ctx, q) => analyzePerformance(await completionRecords(q, ctx.principal.userId, game)),
  }),
  def({
    name: 'recall_memory',
    description: 'What the assistant remembered about this player from earlier sessions: favourite game, goal, notes and recent questions.',
    input: empty,
    readOnly: true,
    run: async (_a, ctx) => {
      const m = ctx.memory.load(ctx.principal.userId);
      return { ...m, asContext: memoryContext(m) };
    },
  }),
  def({
    name: 'remember_preference',
    description:
      "Saves a player preference to the assistant's memory for future sessions: favourite game, a short goal, or a short note about how they like to play. Only game-related preferences; never personal or contact data. This does NOT change XP, ranks or any game data.",
    input: z
      .object({ favorite_game: gameArg.optional(), goal: z.string().trim().min(1).max(160).optional(), note: z.string().trim().min(1).max(160).optional() })
      .strict()
      .refine((v) => v.favorite_game || v.goal || v.note, 'Give favorite_game, goal or note.'),
    readOnly: false,
    run: async ({ favorite_game, goal, note }, ctx) => {
      const m = ctx.memory.remember(ctx.principal.userId, { favoriteGame: favorite_game, goal, note });
      return { saved: true, preferences: m.preferences, notes: m.notes.length };
    },
  }),
  def({
    name: 'record_session_summary',
    description: 'Used by the agent harness (not offered to the model): stores a one-line summary of the finished interaction in memory.',
    input: z
      .object({ question: z.string().max(500), tools: z.array(z.string().max(60)).max(20), answer: z.string().max(4000) })
      .strict(),
    readOnly: false,
    run: async ({ question, tools, answer }, ctx) => {
      // The privacy filter applies here too: a question containing contact data is not kept verbatim.
      const clean = (s: string) => s.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email]').replace(/https?:\/\/\S+/g, '[link]');
      const m = ctx.memory.recordSession(ctx.principal.userId, { question: clean(question), tools, answer: clean(answer) });
      return { saved: true, sessions: m.sessions.length };
    },
  }),
];

export type GameHubTool = (typeof TOOLS)[number];
export const TOOL_NAMES: ReadonlySet<string> = new Set(TOOLS.map((t) => t.name));

/** JSON Schema for the MCP tool listing, derived from the zod schema. */
export function toolInputJsonSchema(t: GameHubTool): Record<string, unknown> {
  const s = z.toJSONSchema(t.input, { io: 'input', unrepresentable: 'any' }) as Record<string, unknown>;
  delete s.$schema;
  return { type: 'object', properties: {}, ...s };
}

/** Validates input with the tool's strict schema; throws PolicyViolation on bad input. */
export function parseToolArgs(t: GameHubTool, args: unknown): unknown {
  const r = (t.input as z.ZodType).safeParse(args ?? {});
  if (!r.success) {
    const smuggled = r.error.issues.some((i) => i.code === 'unrecognized_keys' && i.keys.some((k) => /xp|rank|level|streak|score|achievement/i.test(k)));
    if (smuggled) throw new PolicyViolation('POLICY_XP_READ_ONLY', `Refused: ${t.name} is read-only and does not accept progression values (${z.prettifyError(r.error)}).`);
    throw new PolicyViolation('POLICY_INVALID_INPUT', `Invalid input for ${t.name}: ${z.prettifyError(r.error)}`);
  }
  return r.data;
}
