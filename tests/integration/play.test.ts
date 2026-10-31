import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '@/lib/db';
import { GAME_IDS, type GameId } from '@/games/types';
import { REPAIR_CARDS, XP_ECONOMY } from '@/config/economy';
import { actOnSession, chooseDailyPuzzle, dailyDifficultyFor, dailySeed, ensureDailySet, puzzleFingerprint, startSession, PlayError } from '@/server/play';
import { ENGINES } from '@/games/registry';
import { createRng } from '@/lib/rng';
import { grantPunch } from '@/server/progress';
import { useRepairCard } from '@/server/streaks';
import { createGuest } from '@/server/users';
import { plus, solutionFor, solveSession, testDb, winningAction } from '../helpers';

let db: Db;
beforeAll(async () => {
  db = await testDb();
});
afterAll(async () => {
  await db.close();
});

const stats = (userId: string) =>
  db.query<Record<string, number>>('select * from user_stats where user_id = $1', [userId]).then((r) => r[0]);
const streak = (userId: string, kind: string) =>
  db.query<{ current: number; best: number; last_date: string }>('select * from streaks where user_id = $1 and kind = $2', [userId, kind]).then((r) => r[0]);

async function play(userId: string, game: GameId, mode: 'daily' | 'unlimited', start: Date, seconds = 90) {
  const view = await startSession(db, { userId, game, mode, difficulty: 'easy', fresh: true, now: start });
  return solveSession(db, userId, view.id, plus(start, seconds));
}

describe('daily set', () => {
  it('is shared globally and immutable for a UTC date', async () => {
    const a = await ensureDailySet(db, '2026-03-02');
    const b = await ensureDailySet(db, '2026-03-02');
    expect(Object.keys(a.puzzles).sort()).toEqual([...GAME_IDS].sort());
    expect(a).toEqual(b);
    const u1 = await createGuest(db);
    const u2 = await createGuest(db);
    const s1 = await startSession(db, { userId: u1.id, game: 'queens', mode: 'daily', now: new Date('2026-03-02T10:00:00Z') });
    const s2 = await startSession(db, { userId: u2.id, game: 'queens', mode: 'daily', now: new Date('2026-03-02T23:00:00Z') });
    expect(s1.puzzle).toEqual(s2.puzzle);
    expect(a.difficulty).toBe('easy'); // 2026-03-02 is a Monday
  });

  it('concurrent first requests converge on one set', async () => {
    const [a, b, c] = await Promise.all([ensureDailySet(db, '2026-03-09'), ensureDailySet(db, '2026-03-09'), ensureDailySet(db, '2026-03-09')]);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
    const n = await db.query<{ n: number }>(`select count(*)::int n from daily_puzzles where utc_date = '2026-03-09'`);
    expect(n[0].n).toBe(8);
  });

  it('restarting a daily game resumes the same session', async () => {
    const u = await createGuest(db);
    const now = new Date('2026-03-02T12:00:00Z');
    const a = await startSession(db, { userId: u.id, game: 'zip', mode: 'daily', now });
    const b = await startSession(db, { userId: u.id, game: 'zip', mode: 'daily', now: plus(now, 30) });
    expect(a.id).toBe(b.id);
    expect(a.startedAt).toBe(b.startedAt);
  });
});

describe('completing games', () => {
  it('rewards a daily completion once and replays the stored result', async () => {
    const u = await createGuest(db);
    const start = new Date('2026-04-01T09:00:00Z');
    const view = await startSession(db, { userId: u.id, game: 'sudoku', mode: 'daily', now: start });
    const { solution } = await solutionFor(db, view.id);
    const action = winningAction('sudoku', solution);

    // Too fast to be plausible: refused but not failed.
    const tooFast = await actOnSession(db, u.id, view.id, action, plus(start, 1));
    expect(tooFast.solved).toBe(false);
    expect(tooFast.message?.key).toBe('errors.tooFast');

    // Wrong board: a free retry with a message.
    const wrong = await actOnSession(db, u.id, view.id, { type: 'submit', solution: [[1]] }, plus(start, 20));
    expect(wrong.solved).toBe(false);
    expect(wrong.message).toBeTruthy();

    const done = await actOnSession(db, u.id, view.id, action, plus(start, 40));
    expect(done.solved).toBe(true);
    const c = done.completion!;
    expect(c.durationMs).toBe(40_000);
    expect(c.xpGained).toBeGreaterThan(0);
    expect(c.streaks).toMatchObject({ normal: 1, normalAdvanced: true });
    expect(c.daily).toMatchObject({ completed: 1, total: 8, setComplete: false });
    expect(c.achievements.map((a) => a.id)).toEqual(expect.arrayContaining(['first-steps', 'daily-debut']));
    expect(c.breakdown.some((b) => b.label === 'First Daily game today')).toBe(true);

    const xpAfter = (await stats(u.id)).total_xp;
    expect(xpAfter).toBe(c.totalXp);

    // Refresh / double submit: same result, no extra XP.
    const again = await actOnSession(db, u.id, view.id, action, plus(start, 50));
    expect(again.completion).toEqual(c);
    expect((await stats(u.id)).total_xp).toBe(xpAfter);
    const ledger = await db.query<{ n: number }>('select count(*)::int n from xp_ledger where user_id = $1', [u.id]);
    const completions = await db.query<{ n: number }>('select count(*)::int n from completions where user_id = $1', [u.id]);
    expect(completions[0].n).toBe(1);
    expect(ledger[0].n).toBeGreaterThan(0);

    const mastery = await db.query<{ xp: number; completions: number }>('select * from mastery where user_id = $1', [u.id]);
    expect(mastery).toHaveLength(1);
    expect(mastery[0].completions).toBe(1);
  });

  it('concurrent solving requests produce exactly one completion', async () => {
    const u = await createGuest(db);
    const start = new Date('2026-04-02T09:00:00Z');
    const view = await startSession(db, { userId: u.id, game: 'werd', mode: 'unlimited', difficulty: 'normal', now: start });
    const { solution } = await solutionFor(db, view.id);
    const action = winningAction('werd', solution);
    const results = await Promise.all([1, 2, 3, 4].map(() => actOnSession(db, u.id, view.id, action, plus(start, 30))));
    expect(results.every((r) => r.solved)).toBe(true);
    const ids = new Set(results.map((r) => r.completion?.sessionId));
    expect(ids.size).toBe(1);
    const xpRows = await db.query<{ n: number }>(`select count(*)::int n from xp_ledger where user_id = $1 and reason like 'complete-%'`, [u.id]);
    expect(xpRows[0].n).toBe(1);
    expect(results[0].completion!.totalXp).toBe((await stats(u.id)).total_xp);
  });

  it("cannot act on another player's session", async () => {
    const owner = await createGuest(db);
    const thief = await createGuest(db);
    const now = new Date('2026-04-03T09:00:00Z');
    const view = await startSession(db, { userId: owner.id, game: 'tango', mode: 'unlimited', difficulty: 'easy', now });
    await expect(actOnSession(db, thief.id, view.id, { type: 'submit', solution: [] }, plus(now, 30))).rejects.toBeInstanceOf(PlayError);
  });

  it('closes a daily game after the reset grace period', async () => {
    const u = await createGuest(db);
    const start = new Date('2026-04-04T23:58:00Z');
    const view = await startSession(db, { userId: u.id, game: 'queens', mode: 'daily', now: start });
    const { solution } = await solutionFor(db, view.id);
    // Within grace: counts for the original date.
    const late = await actOnSession(db, u.id, view.id, winningAction('queens', solution), new Date('2026-04-05T00:05:00Z'));
    expect(late.completion?.daily?.date).toBe('2026-04-04');
    const v2 = await startSession(db, { userId: u.id, game: 'zip', mode: 'daily', now: new Date('2026-04-04T23:59:00Z') });
    const s2 = await solutionFor(db, v2.id);
    await expect(actOnSession(db, u.id, v2.id, winningAction('zip', s2.solution), new Date('2026-04-05T01:00:00Z'))).rejects.toMatchObject({
      status: 410,
    });
  });
});

describe('streaks and the True Player day', () => {
  it('normal streak needs one daily game; true player needs all eight; unlimited counts for neither', async () => {
    const u = await createGuest(db);
    const day1 = new Date('2026-05-04T04:30:00Z');
    let last;
    for (const [i, game] of [...GAME_IDS].reverse().entries()) last = await play(u.id, game, 'daily', plus(day1, i * 120));
    expect(last!.completion!.daily).toMatchObject({ completed: 8, setComplete: true });
    expect(last!.completion!.streaks).toMatchObject({ truePlayer: 1, truePlayerAdvanced: true });
    expect(last!.completion!.achievements.map((a) => a.id)).toEqual(expect.arrayContaining(['true-player', 'explorer', 'chaos', 'early-bird']));
    expect((await stats(u.id)).true_player_days).toBe(1);

    // Day 2: partial set keeps Normal going but not True Player.
    const day2 = new Date('2026-05-05T12:00:00Z');
    await play(u.id, 'zip', 'daily', day2);
    await play(u.id, 'queens', 'daily', plus(day2, 300));
    expect((await streak(u.id, 'normal')).current).toBe(2);
    expect((await streak(u.id, 'true_player')).current).toBe(1);

    // Day 3: unlimited only -> nothing advances.
    await play(u.id, 'zip', 'unlimited', new Date('2026-05-06T12:00:00Z'));
    expect((await streak(u.id, 'normal')).last_date).toBe('2026-05-05');

    // Day 4: one daily game -> Normal restarts at 1 (day 3 was missed).
    await play(u.id, 'werd', 'daily', new Date('2026-05-07T12:00:00Z'));
    const n = await streak(u.id, 'normal');
    expect(n.current).toBe(1);
    expect(n.best).toBe(2);
  });

  it('second full Daily Set earns a punch (source B, cumulative)', async () => {
    const u = await createGuest(db);
    for (const [d, date] of ['2026-06-01', '2026-06-03'].entries()) {
      const t = new Date(`${date}T10:00:00Z`);
      for (const [i, game] of GAME_IDS.entries()) await play(u.id, game, 'daily', plus(t, i * 100));
      const s = await stats(u.id);
      expect(s.true_player_days).toBe(d + 1);
      expect(s.punches_earned).toBe(d === 0 ? 0 : 1);
    }
  });

  it('20 games in one UTC day earn one punch (source A), any mode mix', async () => {
    const u = await createGuest(db);
    const t = new Date('2026-06-10T06:00:00Z');
    for (let i = 0; i < 4; i++) await play(u.id, GAME_IDS[i], 'daily', plus(t, i * 100));
    for (let i = 0; i < 17; i++) await play(u.id, GAME_IDS[i % 8], 'unlimited', plus(t, 1000 + i * 100));
    const s = await stats(u.id);
    expect(s.punches_earned).toBe(1);
    expect(s.punch_progress).toBe(1);
    const events = await db.query(`select * from card_events where user_id = $1 and kind = 'punch'`, [u.id]);
    expect(events).toHaveLength(1);
  });
});

describe('gold repair cards', () => {
  it('ten punches make a card, the pocket caps at three, extras convert to XP', async () => {
    const u = await createGuest(db);
    await db.query('insert into user_stats (user_id) values ($1)', [u.id]);
    for (let i = 0; i < REPAIR_CARDS.punchesPerCard * 4; i++) {
      await db.tx((tx) => grantPunch(tx, u.id, 'admin', `test:${i}`, []));
    }
    // Replaying a key is a no-op.
    await db.tx((tx) => grantPunch(tx, u.id, 'admin', 'test:0', []));
    const s = await stats(u.id);
    expect(s.punches_earned).toBe(40);
    expect(s.cards_held).toBe(3);
    expect(s.cards_earned).toBe(3);
    expect(s.cards_converted).toBe(1);
    const converted = await db.query(`select * from xp_ledger where user_id = $1 and reason = 'card-converted'`, [u.id]);
    expect(converted).toHaveLength(1);
    expect(converted[0].amount).toBe(XP_ECONOMY.cardConverted);
    const notes = await db.query<{ kind: string }>('select kind from notifications where user_id = $1', [u.id]);
    expect(notes.map((n) => n.kind)).toEqual(expect.arrayContaining(['pocket-full', 'card-converted', 'card-created']));
  });

  it('repairs only the streak the player chooses, idempotently', async () => {
    const u = await createGuest(db);
    await db.query('insert into user_stats (user_id, cards_held) values ($1, 2)', [u.id]);
    for (const d of ['2026-07-01', '2026-07-02', '2026-07-03']) await play(u.id, 'zip', 'daily', new Date(`${d}T10:00:00Z`));
    const now = new Date('2026-07-06T10:00:00Z');
    await expect(useRepairCard(db, u.id, 'true_player', 'req-0', now)).rejects.toBeInstanceOf(PlayError);
    const r = await useRepairCard(db, u.id, 'normal', 'req-1', now);
    expect(r.streak).toMatchObject({ current: 3, status: 'at-risk' });
    const again = await useRepairCard(db, u.id, 'normal', 'req-1', now);
    expect(again.repeated).toBe(true);
    const s = await stats(u.id);
    expect(s.cards_held).toBe(1);
    expect(s.cards_used).toBe(1);
    // Continue the repaired streak today.
    await play(u.id, 'queens', 'daily', now);
    expect((await streak(u.id, 'normal')).current).toBe(4);
    await expect(useRepairCard(db, u.id, 'normal', 'req-2', now)).rejects.toBeInstanceOf(PlayError);
  });
});

describe('daily set uniqueness and history', () => {
  it('different UTC dates get different puzzles for every game; history is recorded', async () => {
    const dates = ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'];
    for (const d of dates) await ensureDailySet(db, d);
    const rows = await db.query<{ game: string; fingerprint: string; utc_date: string }>(
      `select game, fingerprint, utc_date from daily_puzzle_history where utc_date = any($1::text[])`,
      [dates],
    );
    expect(rows).toHaveLength(dates.length * 8);
    for (const game of GAME_IDS) {
      const fps = rows.filter((r) => r.game === game).map((r) => r.fingerprint);
      expect(new Set(fps).size, game).toBe(dates.length);
    }
    const dp = await db.query<{ n: number }>(`select count(*)::int n from daily_puzzles where utc_date = '2026-08-03' and fingerprint is not null`);
    expect(dp[0].n).toBe(8);
  });

  it('rejects a previously used puzzle and moves to the next deterministic candidate', async () => {
    const target = '2026-09-10';
    const difficulty = dailyDifficultyFor(target);
    const first = chooseDailyPuzzle('werd', target, difficulty, new Map());
    expect(first.attempt).toBe(0);
    // Pretend that exact puzzle was already used on an earlier date.
    await db.query(`insert into daily_puzzle_history (game, utc_date, fingerprint) values ('werd', '2026-01-01', $1)`, [first.fingerprint]);
    await ensureDailySet(db, target);
    const chosen = await db.query<{ fingerprint: string; attempt: number; reused: boolean }>(
      `select fingerprint, attempt, reused from daily_puzzles where utc_date = $1 and game = 'werd'`,
      [target],
    );
    expect(chosen[0].fingerprint).not.toBe(first.fingerprint);
    expect(chosen[0].attempt).toBeGreaterThan(0);
    expect(chosen[0].reused).toBe(false);
    // Deterministic: same history -> same choice.
    const again = chooseDailyPuzzle('werd', target, difficulty, new Map([[first.fingerprint, '2026-01-01']]));
    expect(again.fingerprint).toBe(chosen[0].fingerprint);
  });

  it('when a pool is exhausted, reuses the least recently used puzzle and flags it', () => {
    const date = '2026-09-11';
    const d = dailyDifficultyFor(date);
    const cands = [0, 1, 2].map((a) => chooseDailyPuzzle('pinpoint', date, d, new Map(), 1 + a));
    // Mark every candidate in the first 3 attempts as used, the 2nd one longest ago.
    const fps = [0, 1, 2].map((a) => ({ a, fp: chooseCandidateFp('pinpoint', date, d, a) }));
    const used = new Map(fps.map(({ a, fp }) => [fp, a === 1 ? '2025-01-01' : '2026-09-01']));
    const pick = chooseDailyPuzzle('pinpoint', date, d, used, 3);
    expect(pick.reused).toBe(true);
    expect(used.get(pick.fingerprint)).toBe('2025-01-01');
    expect(cands[0].reused).toBe(false);
  });

  it('daily Tango is 6x6 on every weekday', async () => {
    for (const d of ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-07']) {
      const set = await ensureDailySet(db, d);
      const p = await db.query<{ data: { size: number } }>('select data from puzzles where id = $1', [set.puzzles.tango]);
      expect(p[0].data.size, d).toBe(6);
    }
  });
});

function chooseCandidateFp(game: GameId, date: string, difficulty: Parameters<typeof chooseDailyPuzzle>[2], attempt: number) {
  const { puzzle } = ENGINES[game].generate(createRng(dailySeed(date, game, attempt)), difficulty, { mode: 'daily' });
  return puzzleFingerprint(game, puzzle);
}
