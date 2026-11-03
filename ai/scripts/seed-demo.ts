import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createPgliteDb, migrate, type Db } from '@/lib/db';
import { addDays, parseUtcDate, toUtcDate } from '@/lib/time';
import { GAMES } from '@/config/games';
import { GAME_IDS, type Difficulty, type GameId } from '@/games/types';
import { actOnSession, dailyDifficultyFor, startSession } from '@/server/play';
import { winningActionsFor } from '@/server/solutions';
import { createSession, signUp } from '@/server/users';
import { paths } from '../lib/config';

/**
 * Builds the local demo database used by the AI demo, tests and benchmark.
 *
 * Nothing here is mocked: players are created with GameHub's signUp, and
 * every game is a real generated puzzle solved through startSession ->
 * actOnSession -> processCompletion, so XP, streaks, mastery, achievements
 * and the Daily Set are produced by the same code as the website.
 *
 * It only ever writes to a local PGlite directory (.data/ai-demo/pglite) and
 * refuses to run against Supabase/Postgres.
 *
 *   npm run ai:seed
 */
if (process.env.AI_DATABASE_URL) {
  console.error('ai:seed only writes the LOCAL demo database. Unset AI_DATABASE_URL.');
  process.exit(1);
}

/**
 * How long the demo player takes on each game, as a multiple of that day's
 * par time. Under 1 keeps a perfect score; over 1 lowers it (GameHub's
 * computeScore), so the player has clear strengths and weaknesses.
 */
const PAR_FACTOR: Record<GameId, number> = {
  zip: 0.5,
  queens: 0.8,
  tango: 0.9,
  werd: 1.1,
  sudoku: 1.3,
  crossclimb: 1.45,
  patches: 1.7,
  pinpoint: 2.2,
};
const jitter = (day: number, game: GameId) => ((day * 7 + GAME_IDS.indexOf(game) * 3) % 13) - 6;
const secondsFor = (game: GameId, difficulty: Difficulty, day: number) =>
  Math.max(12, Math.round(GAMES[game].parSeconds[difficulty] * PAR_FACTOR[game] * (1 + jitter(day, game) / 60)));
const DAILY_DAYS = 6; // full Daily Sets on the 6 days before today
const TODAY_GAMES: GameId[] = ['queens', 'zip', 'sudoku'];
const EXTRA_QUEENS = 6; // Unlimited Queens -> clearly the most played game

const at = (date: string, hh: number, mm: number, ss = 0) => new Date(`${date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.000Z`);
const plus = (d: Date, s: number) => new Date(d.getTime() + s * 1000);

async function play(db: Db, userId: string, game: GameId, mode: 'daily' | 'unlimited', start: Date, seconds: number) {
  const view = await startSession(db, { userId, game, mode, difficulty: 'easy', fresh: true, now: start });
  const [p] = await db.query<{ solution: unknown; data: unknown }>(
    'select p.solution, p.data from game_sessions s join puzzles p on p.id = s.puzzle_id where s.id = $1',
    [view.id],
  );
  const end = plus(start, seconds);
  let last;
  for (const action of winningActionsFor(game, p.solution, p.data)) last = await actOnSession(db, userId, view.id, action, end);
  if (!last?.solved) throw new Error(`${game} did not complete`);
}

async function main() {
  const now = new Date();
  const today = toUtcDate(now);
  fs.rmSync(paths.pgliteDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(paths.pgliteDir), { recursive: true });
  const db = await createPgliteDb(paths.pgliteDir);
  await migrate(db);

  const pw = () => `Demo-${randomBytes(9).toString('base64url')}1a`;
  const demo = await signUp(db, { email: 'demo.player@example.invalid', password: pw(), handle: 'demo_player', displayName: 'Demo Player' }, null);
  const rival = await signUp(db, { email: 'rival@example.invalid', password: pw(), handle: 'rival_public', displayName: 'Public Rival' }, null);
  const hidden = await signUp(db, { email: 'hidden@example.invalid', password: pw(), handle: 'rival_private', displayName: 'Private Rival' }, null);
  await db.query('update users set profile_public = false where id = $1', [hidden.id]);

  let n = 0;
  for (let d = DAILY_DAYS; d >= 1; d--) {
    const date = addDays(today, -d);
    for (const [i, game] of GAME_IDS.entries()) {
      await play(db, demo.id, game, 'daily', at(date, 9, i * 6), secondsFor(game, dailyDifficultyFor(date), d));
      n++;
    }
    if (d <= 3)
      for (let k = 0; k < EXTRA_QUEENS / 3; k++) {
        await play(db, demo.id, 'queens', 'unlimited', at(date, 18, k * 5), secondsFor('queens', 'easy', d + 10 + k));
        n++;
      }
  }
  // Today: a partial Daily Set, finished well before "now" where possible.
  const startToday = new Date(Math.max(parseUtcDate(today).getTime() + 60_000, now.getTime() - 3 * 3600_000));
  for (const [i, game] of TODAY_GAMES.entries()) {
    await play(db, demo.id, game, 'daily', plus(startToday, i * 400), secondsFor(game, dailyDifficultyFor(today), 0));
    n++;
  }
  // Other players, so leaderboards/profiles and the privacy checks have data.
  await play(db, rival.id, 'queens', 'daily', at(addDays(today, -1), 10, 0), 45);
  await play(db, hidden.id, 'zip', 'daily', at(addDays(today, -1), 11, 0), 30);

  const { token } = await createSession(db, demo.id, false, now);
  fs.writeFileSync(paths.tokenFile, token, { mode: 0o600 });
  const [s] = await db.query<{ total_xp: number; games_completed: number }>('select total_xp, games_completed from user_stats where user_id = $1', [demo.id]);
  await db.close();
  console.log(`Seeded ${paths.pgliteDir}`);
  console.log(`  @demo_player: ${n} games played through the real pipeline, ${s.games_completed} completions, ${s.total_xp} XP`);
  console.log(`  session token written to ${path.relative(process.cwd(), paths.tokenFile)} (git-ignored)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
