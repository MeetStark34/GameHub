import path from 'node:path';
import { llmConfig, paths } from '../lib/config';
import { connectGameHubMcp, runAgent, saveTrace } from './harness';
import { createChatModel } from './llm';
import { printTrace } from './print';

/**
 * Ask the local Qwen model a GameHub question.
 *
 *   npm run ai:ask -- "Which GameHub game am I best at?"
 *   npm run ai:ask -- --no-memory "What is my current XP?"
 *   npm run ai:ask -- --live "What is my rank?"      # your real Supabase account
 *
 * --live reads .env.local: AI_DATABASE_URL defaults to DATABASE_URL and the
 * token to .data/ai-live/session-token (create it with `npm run ai:token`).
 */
const argv = process.argv.slice(2);
const flag = (f: string) => argv.includes(f);
const question = argv.filter((a) => !a.startsWith('--')).join(' ').trim();

async function main() {
  if (!question) {
    console.log('Usage: npm run ai:ask -- [--no-memory] [--no-tools] [--live] "your question"');
    process.exit(1);
  }
  if (flag('--live')) {
    process.env.AI_DATABASE_URL ??= process.env.DATABASE_URL;
    process.env.AI_SESSION_TOKEN_FILE ??= path.join(process.cwd(), '.data', 'ai-live', 'session-token');
    if (!process.env.AI_DATABASE_URL) throw new Error('--live needs DATABASE_URL in .env.local (or AI_DATABASE_URL).');
  }
  const mcp = await connectGameHubMcp({ ...(process.env.AI_SESSION_TOKEN_FILE ? { AI_SESSION_TOKEN_FILE: process.env.AI_SESSION_TOKEN_FILE } : {}) });
  try {
    const trace = await runAgent({ question, model: createChatModel(llmConfig()), mcp: mcp.client, tools: !flag('--no-tools'), memory: !flag('--no-memory') });
    printTrace(trace, saveTrace(trace, process.env.AI_TRACE_DIR ?? paths.traceDir));
  } finally {
    await mcp.close();
  }
}

main().catch((err) => {
  console.error(`\n${(err as Error).message}`);
  if (/fetch failed|ECONNREFUSED/.test(String((err as Error).message) + String((err as Error).cause)))
    console.error('Is the model server running? Ollama: `ollama serve` (and `ollama pull qwen3.5:4b`). llama.cpp: see AI_SYSTEM.md.');
  process.exit(1);
});
