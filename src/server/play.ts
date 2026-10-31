import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { DAILY_DIFFICULTY_BY_WEEKDAY, GAMES } from '@/config/games';
import { DAILY_GRACE_MINUTES } from '@/config/economy';
import { MASTERY_RANKS, PLAYER_RANKS } from '@/config/ranks';
import { maybeOne, one, type Db, type Queryable } from '@/lib/db';
import type { CompletionEvent } from '@/lib/progression/achievements';
import { rankFromXp } from '@/lib/progression/ranks';
import { computeScore, isPerfect } from '@/lib/progression/score';
import { completionXp } from '@/lib/progression/xp';
import { createRng } from '@/lib/rng';
import { addDays, parseUtcDate, toUtcDate, type UtcDate } from '@/lib/time';
import { ENGINES } from '@/games/registry';
import { isValidClientPuzzle } from '@/games/client-schemas';
import { GAME_IDS, type Difficulty, type GameId, type GameMode } from '@/games/types';
import {
  advanceStreak,
  awardXp,
  ensureStats,
  evaluateAchievements,
  grantPunch,
  notify,
} from './progress';
import type { ActResponse, CompletionResult, RewardEvent, SessionView } from '@/lib/contracts';
export type { CompletionResult, SessionView } from '@/lib/contracts';
import { REPAIR_CARDS, XP_ECONOMY } from '@/config/economy';

export class PlayError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** Unlimited sessions a player may start per minute (anti-scripting). */
const UNLIMITED_STARTS_PER_MINUTE = 30;

export const dailyDifficultyFor = (date: UtcDate): Difficulty => DAILY_DIFFICULTY_BY_WEEKDAY[parseUtcDate(date).getUTCDay()];

export const dailySeed = (date: UtcDate, game: GameId, attempt = 0) => `daily:${date}:${game}${attempt ? `:${attempt}` : ''}`;

/** Candidates tried per game before falling back to reuse (see docs/DAILY.md). */
export const MAX_DAILY_ATTEMPTS = 250;

/** Canonical JSON (sorted keys) so equal puzzles hash identically. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object')
    return `{${Object.keys(v as object)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  return JSON.stringify(v);
}

/** Stable identity of a puzzle: the engine's own fingerprint, else a content hash. */
export function puzzleFingerprint(game: GameId, puzzle: unknown): string {
  const engine = ENGINES[game];
  return engine.fingerprint?.(puzzle) ?? `sha256:${createHash('sha256').update(canonical(puzzle)).digest('hex').slice(0, 40)}`;
}

export interface DailyChoice {
  puzzle: unknown;
  solution: unknown;
  fingerprint: string;
  attempt: number;
  reused: boolean;
}

/**
 * Deterministically picks the Daily puzzle for one game: candidate seeds
 * daily:<date>:<game>, :1, :2 ... are tried in order and the first whose
 * fingerprint has never been used in a Daily Set for that game wins.
 * `lastUsed` maps fingerprint -> last date it was used. If every candidate
 * collides (the content pool is exhausted), the candidate used longest ago
 * is reused and flagged, never a silent repeat of yesterday.
 */
export function chooseDailyPuzzle(game: GameId, date: UtcDate, difficulty: Difficulty, lastUsed: ReadonlyMap<string, string>, maxAttempts = MAX_DAILY_ATTEMPTS): DailyChoice {
  const engine = ENGINES[game];
  let fallback: (DailyChoice & { last: string }) | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { puzzle, solution } = engine.generate(createRng(dailySeed(date, game, attempt)), difficulty, { mode: 'daily' });
    const fingerprint = puzzleFingerprint(game, puzzle);
    const last = lastUsed.get(fingerprint);
    if (!last) return { puzzle, solution, fingerprint, attempt, reused: false };
    if (!fallback || last < fallback.last) fallback = { puzzle, solution, fingerprint, attempt, reused: true, last };
  }
  const { last: _last, ...choice } = fallback!;
  void _last;
  return choice;
}

/**
 * Returns the Daily Set for a UTC date, creating it on first request.
 * Each game's puzzle is chosen by chooseDailyPuzzle against the Daily
 * history, stored with its fingerprint, and never changed afterwards;
 * concurrent first requests converge on one set.
 */
export async function ensureDailySet(db: Db, date: UtcDate, retry = true): Promise<{ difficulty: Difficulty; puzzles: Record<GameId, string> }> {
  const existing = await db.query<{ game: GameId; puzzle_id: string; difficulty: Difficulty }>(
    `select dp.game, dp.puzzle_id, ds.difficulty from daily_puzzles dp join daily_sets ds using (utc_date) where dp.utc_date = $1`,
    [date],
  );
  if (existing.length === GAME_IDS.length) {
    return { difficulty: existing[0].difficulty, puzzles: Object.fromEntries(existing.map((r) => [r.game, r.puzzle_id])) as Record<GameId, string> };
  }
  const difficulty = dailyDifficultyFor(date);
  const history = await db.query<{ game: GameId; fingerprint: string; last: string }>(
    `select game, fingerprint, max(utc_date) as last from daily_puzzle_history where utc_date <> $1 group by game, fingerprint`,
    [date],
  );
  // Generate outside the transaction (CPU work), insert inside it.
  const generated = GAME_IDS.map((game) => {
    const used = new Map(history.filter((h) => h.game === game).map((h) => [h.fingerprint, h.last]));
    return { game, version: ENGINES[game].generatorVersion, ...chooseDailyPuzzle(game, date, difficulty, used) };
  });
  await db.tx(async (tx) => {
    const created = await tx.query('insert into daily_sets (utc_date, difficulty) values ($1, $2) on conflict do nothing returning utc_date', [
      date,
      difficulty,
    ]);
    if (!created.length) return; // another request created it
    for (const g of generated) {
      const p = await one<{ id: string }>(
        tx,
        `insert into puzzles (game, difficulty, mode, seed, generator_version, data, solution)
         values ($1, $2, 'daily', $3, $4, $5::jsonb, $6::jsonb) returning id`,
        [g.game, difficulty, dailySeed(date, g.game, g.attempt), g.version, JSON.stringify(g.puzzle), JSON.stringify(g.solution)],
      );
      await tx.query('insert into daily_puzzles (utc_date, game, puzzle_id, fingerprint, attempt, reused) values ($1, $2, $3, $4, $5, $6)', [
        date,
        g.game,
        p.id,
        g.fingerprint,
        g.attempt,
        g.reused,
      ]);
      await tx.query('insert into daily_puzzle_history (game, utc_date, fingerprint, reused) values ($1, $2, $3, $4)', [g.game, date, g.fingerprint, g.reused]);
      if (g.reused) console.warn(`[daily] ${g.game} pool exhausted on ${date}; reused ${g.fingerprint}`);
    }
  });
  if (!retry) throw new Error(`Daily Set for ${date} is incomplete and could not be created.`);
  // Stored sets are never replaced: re-read whatever is now persisted.
  return ensureDailySet(db, date, false);
}

interface SessionRow {
  id: string;
  user_id: string;
  puzzle_id: string;
  game: GameId;
  difficulty: Difficulty;
  mode: GameMode;
  daily_date: string | null;
  status: 'active' | 'completed';
  state: unknown;
  started_at: Date;
  completed_at: Date | null;
  data: unknown;
  result: CompletionResult | null;
}

const SESSION_SELECT = `select s.*, p.data, c.result from game_sessions s
  join puzzles p on p.id = s.puzzle_id left join completions c on c.session_id = s.id`;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Builds the client view. Stored data is checked at runtime: the puzzle and
 * state must be JSON objects and the client payload must match the game's
 * schema, so a malformed row fails loudly here instead of crashing a board.
 */
function toView(row: SessionRow, now: Date): SessionView {
  const engine = ENGINES[row.game];
  if (!isRecord(row.data) || !isRecord(row.state)) {
    console.error(`[play] malformed stored puzzle/state for session ${row.id} (${row.game})`);
    throw new PlayError('errors.puzzleCorrupt', 500);
  }
  let puzzle: unknown;
  try {
    puzzle = engine.toClient(row.data, row.state);
  } catch {
    puzzle = undefined;
  }
  if (!isValidClientPuzzle(row.game, puzzle)) {
    console.error(`[play] client puzzle failed validation for session ${row.id} (${row.game})`);
    throw new PlayError('errors.puzzleCorrupt', 500);
  }
  return {
    id: row.id,
    game: row.game,
    difficulty: row.difficulty,
    mode: row.mode,
    dailyDate: row.daily_date,
    status: row.status,
    puzzle,
    startedAt: new Date(row.started_at).toISOString(),
    serverNow: now.toISOString(),
    completion: row.result,
  };
}

export async function getSession(db: Queryable, userId: string, sessionId: string, now: Date): Promise<SessionView> {
  const row = await maybeOne<SessionRow>(db, `${SESSION_SELECT} where s.id = $1 and s.user_id = $2`, [sessionId, userId]);
  if (!row) throw new PlayError('errors.gameNotFound', 404);
  return toView(row, now);
}

export interface StartInput {
  userId: string;
  game: GameId;
  mode: GameMode;
  /** Unlimited only; Daily difficulty is fixed per day. */
  difficulty?: Difficulty;
  /** Unlimited: start a new puzzle even if one is in progress. */
  fresh?: boolean;
  now: Date;
}

export async function startSession(db: Db, input: StartInput): Promise<SessionView> {
  const { userId, game, mode, now } = input;
  if (mode === 'daily') {
    const date = toUtcDate(now);
    const set = await ensureDailySet(db, date);
    const engine = ENGINES[game];
    const puzzle = await one<{ data: unknown }>(db, 'select data from puzzles where id = $1', [set.puzzles[game]]);
    await db.query(
      `insert into game_sessions (user_id, puzzle_id, game, difficulty, mode, daily_date, state, started_at)
       values ($1, $2, $3, $4, 'daily', $5, $6::jsonb, $7::timestamptz)
       on conflict (user_id, daily_date, game) where mode = 'daily' do nothing`,
      [userId, set.puzzles[game], game, set.difficulty, date, JSON.stringify(engine.initialState(puzzle.data)), now.toISOString()],
    );
    const row = await one<SessionRow>(db, `${SESSION_SELECT} where s.user_id = $1 and s.daily_date = $2 and s.game = $3 and s.mode = 'daily'`, [
      userId,
      date,
      game,
    ]);
    return toView(row, now);
  }

  const difficulty = input.difficulty ?? 'normal';
  if (!input.fresh) {
    const active = await maybeOne<SessionRow>(
      db,
      `${SESSION_SELECT} where s.user_id = $1 and s.game = $2 and s.difficulty = $3 and s.mode = 'unlimited'
         and s.status = 'active' and s.started_at > $4::timestamptz order by s.started_at desc limit 1`,
      [userId, game, difficulty, new Date(now.getTime() - 86_400_000).toISOString()],
    );
    if (active) return toView(active, now);
  }
  const recent = await one<{ n: number }>(
    db,
    `select count(*)::int as n from game_sessions where user_id = $1 and mode = 'unlimited' and started_at > $2::timestamptz`,
    [userId, new Date(now.getTime() - 60_000).toISOString()],
  );
  if (recent.n >= UNLIMITED_STARTS_PER_MINUTE) throw new PlayError('errors.startingTooFast', 429);

  const engine = ENGINES[game];
  const seed = `unlimited:${randomUUID()}`;
  const { puzzle, solution } = engine.generate(createRng(seed), difficulty, { mode: 'unlimited' });
  const id = await db.tx(async (tx) => {
    const p = await one<{ id: string }>(
      tx,
      `insert into puzzles (game, difficulty, mode, seed, generator_version, data, solution)
       values ($1, $2, 'unlimited', $3, $4, $5::jsonb, $6::jsonb) returning id`,
      [game, difficulty, seed, engine.generatorVersion, JSON.stringify(puzzle), JSON.stringify(solution)],
    );
    const s = await one<{ id: string }>(
      tx,
      `insert into game_sessions (user_id, puzzle_id, game, difficulty, mode, state, started_at)
       values ($1, $2, $3, $4, 'unlimited', $5::jsonb, $6::timestamptz) returning id`,
      [userId, p.id, game, difficulty, JSON.stringify(engine.initialState(puzzle)), now.toISOString()],
    );
    return s.id;
  });
  return getSession(db, userId, id, now);
}

export type ActOutcome = ActResponse;

/** Deadline for completing a Daily Set game of `date`. */
export const dailyDeadline = (date: UtcDate) => new Date(parseUtcDate(addDays(date, 1)).getTime() + DAILY_GRACE_MINUTES * 60_000);

/**
 * Applies one untrusted player action. Solving triggers the full reward
 * pipeline inside the same transaction. A session row lock serialises
 * concurrent requests; a solved session replays its stored result.
 */
export async function actOnSession(db: Db, userId: string, sessionId: string, action: unknown, now: Date): Promise<ActOutcome> {
  return db.tx(async (tx) => {
    const locked = await maybeOne<{ id: string }>(tx, 'select id from game_sessions where id = $1 and user_id = $2 for update', [sessionId, userId]);
    if (!locked) throw new PlayError('errors.gameNotFound', 404);
    const row = await one<SessionRow>(tx, `${SESSION_SELECT} where s.id = $1`, [sessionId]);
    if (row.status === 'completed') return { view: toView(row, now), solved: true, completion: row.result };
    if (row.mode === 'daily' && now > dailyDeadline(row.daily_date!))
      throw new PlayError('errors.dailyEnded', 410);

    const engine = ENGINES[row.game];
    let result;
    try {
      result = engine.act(row.data, row.state, action);
    } catch {
      return { view: toView(row, now), solved: false, message: { key: 'errors.moveUnreadable' }, completion: null };
    }

    const durationMs = now.getTime() - new Date(row.started_at).getTime();
    if (result.solved && durationMs < GAMES[row.game].minSeconds[row.difficulty] * 1000) {
      // Too fast to be a real solve: refuse without failing the game.
      return { view: toView(row, now), solved: false, message: { key: 'errors.tooFast' }, completion: null };
    }

    await tx.query(
      `update game_sessions set state = $2::jsonb, action_count = action_count + 1, last_action_at = $3::timestamptz where id = $1`,
      [sessionId, JSON.stringify(result.state), now.toISOString()],
    );
    let completion: CompletionResult | null = null;
    if (result.solved) {
      completion = await processCompletion(tx, { ...row, state: result.state }, durationMs, now);
      await tx.query(`update game_sessions set status = 'completed', completed_at = $2::timestamptz where id = $1`, [sessionId, now.toISOString()]);
    }
    const fresh = await one<SessionRow>(tx, `${SESSION_SELECT} where s.id = $1`, [sessionId]);
    return { view: toView(fresh, now), solved: result.solved, message: result.message, feedback: result.feedback, completion };
  });
}

const DIFFICULTY_COLUMNS: Record<Difficulty, string> = {
  easy: 'easy_completed',
  normal: 'normal_completed',
  hard: 'hard_completed',
  expert: 'expert_completed',
};

async function processCompletion(tx: Queryable, s: SessionRow, durationMs: number, now: Date): Promise<CompletionResult> {
  const { user_id: userId, game, difficulty, mode } = s;
  const engine = ENGINES[game];
  const meta = GAMES[game];
  const events: RewardEvent[] = [];
  const penalty = engine.penalty(s.data, s.state);
  const score = computeScore(durationMs, meta.parSeconds[difficulty], penalty);
  const perfect = isPerfect(durationMs, meta.parSeconds[difficulty], penalty);
  const today = toUtcDate(now);
  const hour = now.getUTCHours();

  const before = await ensureStats(tx, userId);
  const masteryBefore = await maybeOne<{ xp: number }>(tx, 'select xp from mastery where user_id = $1 and game = $2', [userId, game]);

  // Volume activity for the UTC day the game was actually finished.
  const activity = await one<{ games_completed: number; unlimited_completed: number; volume_punch_awarded: boolean }>(
    tx,
    `insert into daily_activity (user_id, utc_date, games_completed, unlimited_completed, hours_mask, per_game)
     values ($1, $2, 1, $3, $4, jsonb_build_object($5::text, 1))
     on conflict (user_id, utc_date) do update set
       games_completed = daily_activity.games_completed + 1,
       unlimited_completed = daily_activity.unlimited_completed + excluded.unlimited_completed,
       hours_mask = daily_activity.hours_mask | excluded.hours_mask,
       per_game = jsonb_set(daily_activity.per_game, array[$5::text],
         to_jsonb(coalesce((daily_activity.per_game ->> $5::text)::int, 0) + 1))
     returning games_completed, unlimited_completed, volume_punch_awarded`,
    [userId, today, mode === 'unlimited' ? 1 : 0, 1 << hour, game],
  );

  const xp = completionXp({
    game,
    difficulty,
    mode,
    score,
    perfect,
    unlimitedEarlierToday: mode === 'unlimited' ? activity.unlimited_completed - 1 : 0,
  });
  const breakdown = [...xp.breakdown];
  await awardXp(tx, userId, xp.xp, `complete-${mode}`, `completion:${s.id}`);

  const mastery = await one<{ xp: number }>(
    tx,
    `insert into mastery (user_id, game, xp, completions, best_score, best_time_ms) values ($1, $2, $3, 1, $4, $5)
     on conflict (user_id, game) do update set xp = mastery.xp + excluded.xp, completions = mastery.completions + 1,
       best_score = greatest(mastery.best_score, excluded.best_score),
       best_time_ms = least(coalesce(mastery.best_time_ms, excluded.best_time_ms), excluded.best_time_ms)
     returning xp`,
    [userId, game, xp.masteryXp, score, durationMs],
  );

  const difficultyColumn = DIFFICULTY_COLUMNS[difficulty];
  await tx.query(
    `update user_stats set games_completed = games_completed + 1,
       daily_games_completed = daily_games_completed + $2, unlimited_games_completed = unlimited_games_completed + $3,
       ${difficultyColumn} = ${difficultyColumn} + 1,
       perfect_completed = perfect_completed + $4,
       same_game_run = case when last_game = $5 then same_game_run + 1 else 1 end, last_game = $5
     where user_id = $1`,
    [userId, mode === 'daily' ? 1 : 0, mode === 'unlimited' ? 1 : 0, perfect ? 1 : 0, game],
  );

  let normal = { current: 0, advanced: false };
  let truePlayer = { current: 0, advanced: false };
  let daily: CompletionResult['daily'] = null;
  let dailySetEvent: CompletionEvent['dailySet'] = null;

  if (mode === 'daily') {
    const date = s.daily_date!;
    const progress = await one<{ daily_completed: number; daily_order: GameId[] }>(
      tx,
      `insert into daily_activity (user_id, utc_date, daily_completed, daily_order) values ($1, $2, 1, array[$3::text])
       on conflict (user_id, utc_date) do update set daily_completed = daily_activity.daily_completed + 1,
         daily_order = array_append(daily_activity.daily_order, $3::text)
       returning daily_completed, daily_order`,
      [userId, date, game],
    );
    const setComplete = progress.daily_completed === GAME_IDS.length;
    daily = { date, completed: progress.daily_completed, total: GAME_IDS.length, setComplete };

    if (progress.daily_completed === 1) {
      if (await awardXp(tx, userId, XP_ECONOMY.firstDailyGameBonus, 'first-daily', `daily-first:${date}`))
        breakdown.push({ label: 'First Daily game today', amount: XP_ECONOMY.firstDailyGameBonus });
      normal = await advanceStreak(tx, userId, 'normal', date, events);
    }
    if (setComplete) {
      if (await awardXp(tx, userId, XP_ECONOMY.dailySetCompleteBonus, 'daily-set', `daily-set:${date}`))
        breakdown.push({ label: 'Daily Set complete', amount: XP_ECONOMY.dailySetCompleteBonus });
      truePlayer = await advanceStreak(tx, userId, 'true_player', date, events);
      const tp = await one<{ true_player_days: number }>(
        tx,
        'update user_stats set true_player_days = true_player_days + 1 where user_id = $1 returning true_player_days',
        [userId],
      );
      const e: RewardEvent = {
        kind: 'true-player',
        title: 'True Player!',
        body: `All ${GAME_IDS.length} Daily Set games complete. True Player Streak: ${truePlayer.current}.`,
        i18n: { title: { key: 'events.truePlayer.title' }, body: { key: 'events.truePlayer.body', params: { count: truePlayer.current } } },
        xp: XP_ECONOMY.dailySetCompleteBonus,
      };
      events.push(e);
      await notify(tx, userId, e);
      if (tp.true_player_days % REPAIR_CARDS.dailySetsPerPunch === 0)
        await grantPunch(tx, userId, 'daily-sets', `punch:daily-sets:${tp.true_player_days}`, events);
      dailySetEvent = { hourUtc: hour, order: progress.daily_order };
    }
  }

  if (activity.games_completed >= REPAIR_CARDS.dailyVolumeGames && !activity.volume_punch_awarded) {
    await tx.query('update daily_activity set volume_punch_awarded = true where user_id = $1 and utc_date = $2', [userId, today]);
    await grantPunch(tx, userId, 'volume', `punch:volume:${today}`, events);
  }

  const achievements = await evaluateAchievements(
    tx,
    userId,
    today,
    {
      game,
      mode,
      difficulty,
      durationMs,
      parSeconds: meta.parSeconds[difficulty],
      perfect,
      highlights: engine.highlights?.(s.data, s.state) ?? [],
      dailySet: dailySetEvent,
    },
    events,
  );

  const after = await one<{ total_xp: number }>(tx, 'select total_xp from user_stats where user_id = $1', [userId]);
  const rankBefore = rankFromXp(before.total_xp, PLAYER_RANKS);
  const rankAfter = rankFromXp(after.total_xp, PLAYER_RANKS);
  if (rankAfter.level > rankBefore.level) {
    const e: RewardEvent = {
      kind: 'level-up',
      title: `Level up: ${rankAfter.label}`,
      body: `You reached level ${rankAfter.level}.`,
      i18n: { title: { key: 'events.levelUp.title', params: { rank: rankAfter.label } }, body: { key: 'events.levelUp.body', params: { level: rankAfter.level } } },
      data: { level: rankAfter.level },
    };
    events.unshift(e);
    await notify(tx, userId, e);
  }
  const mBefore = rankFromXp(masteryBefore?.xp ?? 0, MASTERY_RANKS);
  const mAfter = rankFromXp(mastery.xp, MASTERY_RANKS);
  if (mAfter.rankIndex > mBefore.rankIndex) {
    const e: RewardEvent = {
      kind: 'mastery-up',
      title: `${meta.name} mastery: ${mAfter.name}`,
      body: `Your ${meta.name} mastery rank went up.`,
      i18n: { title: { key: 'events.masteryUp.title', params: { game: meta.name, rank: mAfter.name } }, body: { key: 'events.masteryUp.body', params: { game: meta.name } } },
    };
    events.push(e);
    await notify(tx, userId, e);
  }

  if (mode === 'daily' && !normal.advanced) {
    const n = await maybeOne<{ current: number }>(tx, `select current from streaks where user_id = $1 and kind = 'normal'`, [userId]);
    normal = { current: n?.current ?? 0, advanced: false };
  }
  if (!truePlayer.advanced) {
    const t = await maybeOne<{ current: number }>(tx, `select current from streaks where user_id = $1 and kind = 'true_player'`, [userId]);
    truePlayer = { current: t?.current ?? 0, advanced: false };
  }

  const result: CompletionResult = {
    sessionId: s.id,
    game,
    difficulty,
    mode,
    durationMs,
    score,
    perfect,
    xpGained: after.total_xp - before.total_xp,
    breakdown,
    totalXp: after.total_xp,
    rank: { before: rankBefore.label, after: rankAfter.label, levelUp: rankAfter.level > rankBefore.level, progress: rankAfter.progress, nextLabel: rankAfter.nextLabel },
    mastery: { before: mBefore.label, after: mAfter.label, xp: mastery.xp, rankUp: mAfter.rankIndex > mBefore.rankIndex },
    streaks: { normal: normal.current, truePlayer: truePlayer.current, normalAdvanced: normal.advanced, truePlayerAdvanced: truePlayer.advanced },
    daily,
    achievements,
    events,
  };

  await tx.query(
    `insert into completions (session_id, user_id, game, difficulty, mode, daily_date, utc_date, duration_ms, score, perfect, xp_awarded, completed_at, result)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz, $13::jsonb)`,
    [s.id, userId, game, difficulty, mode, s.daily_date, today, durationMs, score, perfect, result.xpGained, now.toISOString(), JSON.stringify(result)],
  );
  return result;
}
