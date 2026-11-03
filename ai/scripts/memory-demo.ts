import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { llmConfig, paths } from '../lib/config';
import { openAiDb } from '../lib/db';
import { readSessionToken, resolvePrincipal } from '../mcp-server/auth';
import { MemoryStore } from '../memory/store';
import { connectGameHubMcp, runAgent, saveTrace } from '../agent/harness';
import { createChatModel } from '../agent/llm';

/**
 * Memory restart test (course Block 5), with the real model.
 *
 * Each session runs in its OWN Node process with its own MCP server process,
 * so nothing survives in RAM between them; only the memory file on disk does.
 *
 *   Session A : the player states a preference -> Qwen calls remember_preference.
 *   (both processes exit)
 *   Session B : new process, memory ON  -> asks about it; must answer from memory.
 *   Control   : new process, memory OFF -> same question; cannot know.
 *
 * Token cost = Session B first-prompt tokens minus Control first-prompt tokens
 * (exact counts reported by the model server).
 *
 *   npm run ai:memory-demo
 */
const OUT = path.join(path.dirname(paths.traceDir), 'evidence');
const QUESTION_A = 'Please remember for next time: my favourite GameHub game is Tango, and my goal is to reach the Pro II rank.';
const QUESTION_B = 'What did I tell you my favourite game is, and how many times have I completed it?';

async function session(phase: string) {
  const mcp = await connectGameHubMcp();
  try {
    const memory = phase !== 'control';
    const q = phase === 'a' ? QUESTION_A : QUESTION_B;
    const trace = await runAgent({ question: q, model: createChatModel(llmConfig()), mcp: mcp.client, memory, seed: 7 });
    const file = saveTrace(trace, OUT);
    fs.copyFileSync(file, path.join(OUT, `memory-session-${phase}.json`));
    fs.rmSync(file);
    process.stdout.write(`${JSON.stringify({ phase, answer: trace.answer, tools: trace.toolsCalled, memoryChars: trace.memoryContextChars, firstPromptTokens: trace.totals.firstPromptTokens })}\n`);
  } finally {
    await mcp.close();
  }
}

function child(phase: string): { phase: string; answer: string; tools: string[]; memoryChars: number; firstPromptTokens: number | null } {
  const r = spawnSync(process.execPath, ['--conditions=react-server', '--import', 'tsx', path.join('ai', 'scripts', 'memory-demo.ts'), '--phase', phase], {
    encoding: 'utf8',
    env: process.env,
  });
  if (r.status !== 0) throw new Error(`session ${phase} failed: ${r.stderr}`);
  return JSON.parse(r.stdout.trim().split('\n').pop()!);
}

async function main() {
  const i = process.argv.indexOf('--phase');
  if (i >= 0) return session(process.argv[i + 1]);

  // Start from an empty memory for the demo player.
  const db = await openAiDb();
  const userId = await db.withReadOnly(async (q) => (await resolvePrincipal(q, readSessionToken())).userId);
  await db.close();
  new MemoryStore(paths.memoryDir).forget(userId);
  fs.mkdirSync(OUT, { recursive: true });

  console.log('Session A (process 1):', QUESTION_A);
  const a = child('a');
  console.log(`  tools ${JSON.stringify(a.tools)}\n  Qwen: ${a.answer}\n`);
  const stored = new MemoryStore(paths.memoryDir).load(userId);
  console.log('Memory file after session A:', JSON.stringify(stored.preferences), `${stored.sessions.length} session summary(ies)\n`);

  console.log('Session B (process 2, memory ON):', QUESTION_B);
  const b = child('b');
  console.log(`  memory context ${b.memoryChars} chars, tools ${JSON.stringify(b.tools)}\n  Qwen: ${b.answer}\n`);

  console.log('Control (process 3, memory OFF):', QUESTION_B);
  const c = child('control');
  console.log(`  tools ${JSON.stringify(c.tools)}\n  Qwen: ${c.answer}\n`);

  const recalled = /tango/i.test(b.answer);
  const controlKnew = /tango/i.test(c.answer);
  const cost = b.firstPromptTokens != null && c.firstPromptTokens != null ? b.firstPromptTokens - c.firstPromptTokens : null;
  const summary = {
    date: new Date().toISOString(),
    model: llmConfig().model,
    sessionA: a,
    sessionB: b,
    control: c,
    storedPreferences: stored.preferences,
    recalledAcrossRestart: recalled,
    controlKnewWithoutMemory: controlKnew,
    memoryContextChars: b.memoryChars,
    memoryTokenCost: cost,
  };
  fs.writeFileSync(path.join(OUT, 'memory-demo-summary.json'), JSON.stringify(summary, null, 2));
  console.log(`Recalled across restart: ${recalled ? 'YES' : 'NO'} | control without memory knew it: ${controlKnew ? 'yes' : 'no'}`);
  console.log(`Memory cost: ${cost ?? '?'} prompt tokens per question (memory context ${b.memoryChars} chars + the 2 memory tool definitions; B first prompt ${b.firstPromptTokens} vs control ${c.firstPromptTokens})`);
  console.log(`Evidence: ${path.relative(process.cwd(), OUT)}/memory-*.json`);
  if (!recalled) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
