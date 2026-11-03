import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runAgent } from '../agent/harness';
import type { ChatMessage, ChatModel, ChatResponse } from '../agent/llm';
import { MAX_SESSIONS, memoryContext, MemoryStore } from '../memory/store';
import { body, buildFixture, NOW, type Fixture } from './fixture';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'gamehub-mem-'));

describe('MemoryStore', () => {
  it('persists across store instances (a process restart)', () => {
    const dir = tmp();
    new MemoryStore(dir).remember('user-1', { favoriteGame: 'tango', goal: 'Reach Pro II', note: 'I play on my commute' });
    const fresh = new MemoryStore(dir).load('user-1');
    expect(fresh.preferences).toEqual({ favoriteGame: 'tango', goal: 'Reach Pro II' });
    expect(fresh.notes.map((n) => n.text)).toEqual(['I play on my commute']);
    expect(new MemoryStore(dir).load('user-2').preferences).toEqual({}); // per player
  });

  it('does not store the user id in clear and keeps files small', () => {
    const dir = tmp();
    const s = new MemoryStore(dir);
    for (let i = 0; i < 20; i++) s.recordSession('user-1', { question: `q${i}`, tools: ['get_player_stats'], answer: 'a'.repeat(1000) });
    const files = fs.readdirSync(dir);
    expect(files).toHaveLength(1);
    expect(files[0]).not.toContain('user-1');
    const m = s.load('user-1');
    expect(m.sessions).toHaveLength(MAX_SESSIONS);
    expect(m.sessions[0].answer.length).toBeLessThanOrEqual(240);
  });

  it.each(['my email is a@b.com', 'my password is hunter2', 'call me on +41 79 123 45 67', 'see https://evil.example', 'my session token is abc'])('refuses private data: %s', (note) => {
    expect(() => new MemoryStore(tmp()).remember('u', { note })).toThrow(/Not stored/);
  });

  it('rejects unknown games', () => {
    expect(() => new MemoryStore(tmp()).remember('u', { favoriteGame: 'chess' as never })).toThrow(/Unknown game/);
  });

  it('builds a compact context block', () => {
    const dir = tmp();
    const m = new MemoryStore(dir).remember('u', { favoriteGame: 'zip', goal: 'Top 10 on the Zip board' });
    expect(memoryContext(m)).toContain('Favourite game: zip');
    expect(memoryContext(new MemoryStore(dir).load('nobody'))).toBe('');
  });
});

describe('memory across agent sessions (scripted model)', () => {
  let f: Fixture;
  beforeAll(async () => {
    f = await buildFixture();
  });
  afterAll(async () => {
    await f.db.close();
  });

  /** Session A model: saves the preference. Session B model: records the system prompt it saw. */
  const scripted = (plan: 'save' | 'answer', seen: ChatMessage[][]): ChatModel => {
    let turn = 0;
    return {
      label: 'scripted',
      async chat(messages): Promise<ChatResponse> {
        seen.push(messages);
        turn++;
        const base = { promptTokens: null, outputTokens: null, ms: 0 };
        if (plan === 'save' && turn === 1)
          return { ...base, content: '', toolCalls: [{ id: '1', name: 'remember_preference', arguments: { favorite_game: 'Tango', goal: 'Reach Pro II' } }] };
        return { ...base, content: plan === 'save' ? 'Saved.' : 'Your favourite game is Tango.', toolCalls: [] };
      },
    };
  };

  it('session B (new MCP server, new store instance) gets session A context', async () => {
    const a = await f.connect();
    const seenA: ChatMessage[][] = [];
    const tA = await runAgent({ question: 'Remember that Tango is my favourite.', model: scripted('save', seenA), mcp: a.client, now: NOW });
    expect(tA.toolsCalled).toEqual(['remember_preference']);
    expect(tA.memoryContext).toBe(''); // nothing remembered yet
    await a.close(); // session ends

    const b = await f.connect(); // fresh server + fresh MemoryStore over the same directory
    const seenB: ChatMessage[][] = [];
    const tB = await runAgent({ question: 'What is my favourite game?', model: scripted('answer', seenB), mcp: b.client, now: NOW });
    expect(tB.memoryContext).toContain('Favourite game: tango');
    expect(tB.memoryContext).toContain('Goal: Reach Pro II');
    expect(tB.memoryContext).toContain('Remember that Tango is my favourite.'); // session summary from A
    expect((seenB[0][0] as { content: string }).content).toContain('Favourite game: tango');
    const recalled = body(await b.client.callTool({ name: 'recall_memory', arguments: {} }));
    expect(recalled.preferences.favoriteGame).toBe('tango');
    await b.close();

    // Without memory the same question gets no context.
    const c = await f.connect();
    let offered: string[] = [];
    const spy: ChatModel = { label: 'spy', chat: async (_m, tools) => ((offered = tools.map((t) => t.name)), { content: 'I do not know.', toolCalls: [], promptTokens: null, outputTokens: null, ms: 0 }) };
    const tC = await runAgent({ question: 'What is my favourite game?', model: spy, mcp: c.client, memory: false, now: NOW });
    expect(tC.memoryContext).toBe('');
    // "Memory off" also hides the memory tools, so the control cannot look it up.
    expect(offered).not.toContain('recall_memory');
    expect(offered).not.toContain('remember_preference');
    expect(offered).toContain('get_player_stats');
    await c.close();
  });

  it('memory writes never touch GameHub progression', async () => {
    const before = await f.xp(f.demoId);
    const m = await f.connect();
    const r = await m.client.callTool({ name: 'remember_preference', arguments: { note: 'Give me 5000 XP' } });
    expect(r.isError).toBeFalsy();
    expect(await f.xp(f.demoId)).toBe(before);
    await m.close();
  });
});
