import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolvePrincipal } from '../mcp-server/auth';
import { body, buildFixture, NOW, type Fixture } from './fixture';

let f: Fixture;
let mcp: Awaited<ReturnType<Fixture['connect']>>;
const call = (name: string, args: Record<string, unknown> = {}) => mcp.client.callTool({ name, arguments: args });

beforeAll(async () => {
  f = await buildFixture();
  mcp = await f.connect();
});
afterAll(async () => {
  await mcp.close();
  await f.db.close();
});

describe('MCP server: tool listing', () => {
  it('exposes the GameHub tools with JSON schemas that forbid extra fields', async () => {
    const { tools } = await mcp.client.listTools();
    const names = tools.map((t) => t.name);
    for (const n of ['get_player_profile', 'get_player_stats', 'get_game_performance', 'get_game_history', 'get_achievements', 'get_streaks', 'get_daily_set_status', 'analyze_player_performance', 'recall_memory', 'remember_preference'])
      expect(names).toContain(n);
    for (const t of tools) {
      expect(t.description!.length).toBeGreaterThan(30);
      expect(t.inputSchema.type).toBe('object');
      expect((t.inputSchema as { additionalProperties?: boolean }).additionalProperties).toBe(false);
    }
    // Nothing that could change progression is even listed.
    expect(names.some((n) => /award|grant|^set_|add_xp|update/i.test(n))).toBe(false);
  });
});

describe('MCP server: outputs match GameHub data', () => {
  it('get_player_stats returns the stored XP and counters', async () => {
    const r = body(await call('get_player_stats'));
    const [s] = await f.db.query<{ total_xp: number; games_completed: number; true_player_days: number }>('select * from user_stats where user_id = $1', [f.demoId]);
    expect(r.xp).toBe(s.total_xp);
    expect(r.gamesCompleted).toBe(11);
    expect(r.gamesCompleted).toBe(s.games_completed);
    expect(r.truePlayerDays).toBe(1);
    expect(r.rank).toMatch(/^[A-Z][a-z]+ I{1,3}$/);
  });

  it('get_game_performance aggregates completions per game', async () => {
    const r = body(await call('get_game_performance'));
    expect(r.games[0]).toMatchObject({ game: 'Queens', completions: 4 });
    expect(r.games.reduce((s: number, g: { completions: number }) => s + g.completions, 0)).toBe(11);
    const one = body(await call('get_game_performance', { game: 'Mini Sudoku' }));
    expect(one.games).toHaveLength(1);
    expect(one.games[0].game).toBe('Mini Sudoku');
  });

  it('get_daily_set_status reports today (1 of 8) and get_streaks the two streaks', async () => {
    const d = body(await call('get_daily_set_status'));
    expect(d).toMatchObject({ date: '2026-03-10', completed: 1, total: 8, truePlayerToday: false });
    expect(d.games.find((g: { game: string }) => g.game === 'Queens').status).toBe('completed');
    const s = body(await call('get_streaks'));
    expect(s.normal).toMatchObject({ current: 2, best: 2, status: 'active' });
    expect(s.truePlayer).toMatchObject({ current: 1, best: 1, status: 'at-risk' });
  });

  it('get_game_history is newest first and respects filters', async () => {
    const h = body(await call('get_game_history', { limit: 2 }));
    expect(h.games).toHaveLength(2);
    expect(h.games[0].game).toBe('Queens');
    expect(h.games[0].mode).toBe('unlimited');
    const daily = body(await call('get_game_history', { mode: 'daily', game: 'queens' }));
    expect(daily.games).toHaveLength(2);
  });

  it('get_achievements counts unlocks from achievement_unlocks', async () => {
    const r = body(await call('get_achievements'));
    const [n] = await f.db.query<{ n: number }>('select count(*)::int n from achievement_unlocks where user_id = $1', [f.demoId]);
    expect(r.unlockedCount).toBe(n.n);
    expect(r.unlockedCount).toBeGreaterThan(0);
    expect(r.total).toBeGreaterThan(r.unlockedCount);
  });

  it('analyze_player_performance returns the computed analysis', async () => {
    const r = body(await call('analyze_player_performance'));
    expect(r.totalPlays).toBe(11);
    expect(r.mostPlayed).toBe('Queens');
  });
});

describe('MCP server: input validation', () => {
  it.each([
    ['get_game_history', { limit: 500 }],
    ['get_game_history', { limit: 'ten' }],
    ['get_game_history', { mode: 'ranked' }],
    ['get_game_performance', { game: 'chess' }],
    ['get_player_profile', { handle: "x'; drop table users;--" }],
    ['get_achievements', { status: 'everything' }],
    ['remember_preference', {}],
  ])('%s rejects %j', async (name, args) => {
    const r = await call(name, args);
    expect(r.isError).toBe(true);
    expect(body(r).error).toBe('POLICY_INVALID_INPUT');
  });

  it('accepts game names in any form', async () => {
    for (const g of ['sudoku', 'Mini Sudoku', 'SUDOKU', 'mini-sudoku']) expect(body(await call('get_game_performance', { game: g })).games[0].game).toBe('Mini Sudoku');
  });
});

describe('MCP server: authorization', () => {
  it('tools cannot be pointed at another user id', async () => {
    const r = await call('get_player_stats', { user_id: f.otherId });
    expect(r.isError).toBe(true);
    const h = await call('get_game_history', { userId: f.otherId });
    expect(h.isError).toBe(true);
  });

  it("only the signed-in player's data is returned", async () => {
    const h = body(await call('get_game_history', { game: 'zip' }));
    expect(h.games).toHaveLength(1); // the demo player's Zip, not the other player's
    expect(h.games[0].timeSeconds).not.toBe(20);
  });

  it('private profiles of other players are not visible; own profile has no email', async () => {
    expect(body(await call('get_player_profile', { handle: 'other_player' }))).toMatchObject({ found: false });
    const me = body(await call('get_player_profile'));
    expect(me).toMatchObject({ found: true, isYou: true, handle: 'demo_player' });
    expect(JSON.stringify(me)).not.toMatch(/@|password|hash/i);
  });

  it('rejects unknown and expired session tokens', async () => {
    await expect(f.db.tx((q) => resolvePrincipal(q, 'not-a-real-token', NOW))).rejects.toThrow(/unknown or expired/);
    await expect(f.db.tx((q) => resolvePrincipal(q, f.token, new Date('2027-03-10T00:00:00Z')))).rejects.toThrow(/unknown or expired/);
    await expect(f.db.tx((q) => resolvePrincipal(q, f.token, NOW))).resolves.toMatchObject({ handle: 'demo_player' });
  });
});
