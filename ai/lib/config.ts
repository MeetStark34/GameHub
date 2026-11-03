import path from 'node:path';

/**
 * Configuration for the local AI layer. Everything comes from environment
 * variables so nothing secret is ever hard-coded or committed.
 *
 *   AI_PROVIDER        ollama (default) | openai  (openai = any OpenAI-compatible
 *                      server, e.g. llama.cpp's `llama-server --jinja`)
 *   AI_BASE_URL        default http://127.0.0.1:11434 (ollama) / http://127.0.0.1:8080/v1 (openai)
 *   AI_MODEL           default qwen3.5:4b (Ollama tag; Q4_K_M weights)
 *   AI_THINK           1 to let Qwen think before answering (slower). Default off.
 *   AI_TEMPERATURE     default 0.7 (Qwen's recommended non-thinking setting)
 *
 *   AI_DATABASE_URL    Postgres URL the MCP server reads (e.g. your Supabase
 *                      DATABASE_URL). Unset = the local demo database.
 *   AI_PGLITE_DIR      local demo database (default .data/ai-demo/pglite)
 *   GAMEHUB_SESSION_TOKEN  a GameHub session token (the gh_session cookie value).
 *                      Unset = read .data/ai-demo/session-token (written by ai:seed).
 *   AI_MEMORY_DIR      default .data/ai-memory
 *   AI_TRACE_DIR       default ai/traces/runs
 */
const root = process.cwd();

export const AI_DEFAULT_MODEL = 'qwen3.5:4b';

export interface LlmConfig {
  provider: 'ollama' | 'openai';
  baseUrl: string;
  model: string;
  think: boolean;
  temperature: number;
  numCtx: number;
}

export function llmConfig(overrides: Partial<LlmConfig> = {}): LlmConfig {
  const provider = (overrides.provider ?? process.env.AI_PROVIDER ?? 'ollama') === 'openai' ? 'openai' : 'ollama';
  const baseUrl = overrides.baseUrl ?? process.env.AI_BASE_URL ?? (provider === 'ollama' ? 'http://127.0.0.1:11434' : 'http://127.0.0.1:8080/v1');
  return {
    provider,
    baseUrl: baseUrl.replace(/\/$/, ''),
    model: overrides.model ?? process.env.AI_MODEL ?? AI_DEFAULT_MODEL,
    think: overrides.think ?? process.env.AI_THINK === '1',
    temperature: overrides.temperature ?? Number(process.env.AI_TEMPERATURE ?? 0.7),
    numCtx: overrides.numCtx ?? Number(process.env.AI_NUM_CTX ?? 8192),
  };
}

export const paths = {
  demoDir: path.join(root, '.data', 'ai-demo'),
  pgliteDir: process.env.AI_PGLITE_DIR ?? path.join(root, '.data', 'ai-demo', 'pglite'),
  tokenFile: process.env.AI_SESSION_TOKEN_FILE ?? path.join(root, '.data', 'ai-demo', 'session-token'),
  memoryDir: process.env.AI_MEMORY_DIR ?? path.join(root, '.data', 'ai-memory'),
  traceDir: process.env.AI_TRACE_DIR ?? path.join(root, 'ai', 'traces', 'runs'),
  benchmarkDir: path.join(root, 'ai', 'benchmark', 'results'),
  mcpServerEntry: path.join(root, 'ai', 'mcp-server', 'server.ts'),
};
