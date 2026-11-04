import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { Db } from '@/lib/db';
import { GAME_IDS, type GameId } from '@/games/types';
import { startSession } from '@/server/play';
import { createSession, signUp } from '@/server/users';
import { plus, solveSession, testDb } from '../../tests/helpers';
import { aiDbFrom } from '../lib/db';
import { MemoryStore } from '../memory/store';
import { resolvePrincipal } from '../mcp-server/auth';
import { createGameHubServer } from '../mcp-server/server';
import type { ToolContext } from '../mcp-server/tools';

/** Fixed clock for the tests: Tuesday 2026-03-10, 12:00 UTC. */
export const NOW = new Date('2026-03-10T12:00:00Z');

export interface Fixture {
  db: Db;
  demoId: string;
  otherId: string;
  token: string;
  memoryDir: string;
  /** A connected MCP client + server pair (in-process transport) for the demo player. */
  connect(): Promise<{ client: Client; ctx: ToolContext; close(): Promise<void> }>;
  xp(userId: string): Promise<number>;
}

async function play(db: Db, userId: string, game: GameId, mode: 'daily' | 'unlimited', start: Date, seconds: number) {
  const v = await startSession(db, { userId, game, mode, difficulty: 'easy', fresh: true, now: start });
  await solveSession(db, userId, v.id, plus(start, seconds));
}

/**
 * Real GameHub data in an in-memory Postgres (PGlite): accounts via signUp,
 * games via the real play pipeline. Demo player: a full Daily Set on 03-09,
 * Queens daily + 2 Unlimited Queens on 03-10. Other player: Zip on 03-09,
 * private profile.
 */
export async function buildFixture(): Promise<Fixture> {
  const db = await testDb();
  const demo = await signUp(db, { email: 'demo@example.invalid', password: 'Demo-pass-123', handle: 'demo_player', displayName: 'Demo' }, null);
  const other = await signUp(db, { email: 'other@example.invalid', password: 'Other-pass-123', handle: 'other_player', displayName: 'Other' }, null);
  await db.query('update users set profile_public = false where id = $1', [other.id]);
  for (const [i, g] of GAME_IDS.entries()) await play(db, demo.id, g, 'daily', new Date(`2026-03-09T09:${String(i * 5).padStart(2, '0')}:00Z`), 30 + i * 10);
  await play(db, demo.id, 'queens', 'daily', new Date('2026-03-10T08:00:00Z'), 40);
  await play(db, demo.id, 'queens', 'unlimited', new Date('2026-03-10T09:00:00Z'), 35);
  await play(db, demo.id, 'queens', 'unlimited', new Date('2026-03-10T09:10:00Z'), 45);
  await play(db, other.id, 'zip', 'daily', new Date('2026-03-09T10:00:00Z'), 20);
  const { token } = await createSession(db, demo.id, null, new Date('2026-03-10T07:00:00Z'));
  const memoryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamehub-ai-mem-'));

  const aiDb = { ...aiDbFrom(db, 'test'), close: async () => {} };
  return {
    db,
    demoId: demo.id,
    otherId: other.id,
    token,
    memoryDir,
    xp: async (id) => (await db.query<{ total_xp: number }>('select total_xp from user_stats where user_id = $1', [id]))[0]?.total_xp ?? 0,
    async connect() {
      const principal = await aiDb.withReadOnly((q) => resolvePrincipal(q, token, NOW));
      const ctx: ToolContext = { db: aiDb, principal, memory: new MemoryStore(memoryDir), now: () => NOW };
      const server = createGameHubServer(ctx);
      const [a, b] = InMemoryTransport.createLinkedPair();
      const client = new Client({ name: 'test', version: '1' });
      await Promise.all([server.connect(a), client.connect(b)]);
      return { client, ctx, close: async () => { await client.close(); await server.close(); } };
    },
  };
}

/** Parses a tool result's JSON text. */
export const body = (r: unknown) => JSON.parse((r as { content: { text: string }[] }).content[0].text);
