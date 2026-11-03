import fs from 'node:fs';
import { llmConfig, paths } from '../lib/config';
import { connectGameHubMcp } from '../agent/harness';

/**
 * Pre-flight check for the local AI system:
 *   npm run ai:check
 * Verifies the model server and model, the demo database / token, and that
 * the MCP server starts and lists its tools.
 */
const ok = (m: string) => console.log(`  ok   ${m}`);
const bad = (m: string) => {
  console.log(`  FAIL ${m}`);
  process.exitCode = 1;
};

async function main() {
  const cfg = llmConfig();
  console.log(`Model server (${cfg.provider} at ${cfg.baseUrl})`);
  try {
    if (cfg.provider === 'ollama') {
      const tags = (await (await fetch(`${cfg.baseUrl}/api/tags`)).json()) as { models: { name: string; details?: { quantization_level?: string; parameter_size?: string } }[] };
      const m = tags.models.find((x) => x.name === cfg.model || x.name === `${cfg.model}:latest`);
      if (m) ok(`${m.name} installed (${m.details?.parameter_size ?? '?'} params, ${m.details?.quantization_level ?? '?'})`);
      else bad(`${cfg.model} not installed. Run: ollama pull ${cfg.model}`);
    } else {
      const r = (await (await fetch(`${cfg.baseUrl}/models`)).json()) as { data: { id: string }[] };
      ok(`OpenAI-compatible server up, models: ${r.data.map((d) => d.id).join(', ')}`);
    }
  } catch {
    bad(cfg.provider === 'ollama' ? 'Ollama not reachable. Start it: ollama serve' : 'llama-server not reachable. See AI_SYSTEM.md');
  }

  console.log('GameHub data');
  if (process.env.AI_DATABASE_URL) ok('AI_DATABASE_URL set (Postgres/Supabase, read-only)');
  else if (fs.existsSync(paths.pgliteDir)) ok(`demo database at ${paths.pgliteDir}`);
  else bad('no demo database. Run: npm run ai:seed');
  if (process.env.GAMEHUB_SESSION_TOKEN || fs.existsSync(paths.tokenFile)) ok('session token available');
  else bad('no session token. Run: npm run ai:seed (demo) or npm run ai:token (your account)');

  console.log('MCP server');
  try {
    const mcp = await connectGameHubMcp();
    const tools = (await mcp.client.listTools()).tools;
    ok(`started, ${tools.length} tools: ${tools.map((t) => t.name).join(', ')}`);
    await mcp.close();
  } catch (err) {
    bad((err as Error).message);
  }
}

main();
