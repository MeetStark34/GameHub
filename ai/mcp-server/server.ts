import { pathToFileURL } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { paths } from '../lib/config';
import { openAiDb } from '../lib/db';
import { MemoryStore } from '../memory/store';
import { readSessionToken, resolvePrincipal } from './auth';
import { assertToolAllowed, PolicyViolation } from './guard';
import { parseToolArgs, TOOL_NAMES, TOOLS, toolInputJsonSchema, type ToolContext } from './tools';

/**
 * GameHub MCP server (course Block 2).
 *
 * Speaks the Model Context Protocol over stdio. The agent harness
 * (ai/agent/harness.ts) starts it as a child process and calls its tools; any
 * other MCP client (e.g. the MCP Inspector) can too:
 *
 *   npm run ai:mcp            # start on stdio (normally started by the harness)
 *
 * stdout carries protocol messages only; logs go to stderr.
 */
export const SERVER_INFO = { name: 'gamehub-mcp', version: '1.0.0' };

const log = (msg: string) => process.stderr.write(`[gamehub-mcp] ${msg}\n`);

export async function callTool(ctx: ToolContext, name: string, rawArgs: unknown): Promise<CallToolResult> {
  const started = Date.now();
  try {
    assertToolAllowed(name, TOOL_NAMES); // layer 1: allowlist
    const tool = TOOLS.find((t) => t.name === name)!;
    const args = parseToolArgs(tool, rawArgs); // layer 1: strict input
    // layers 2 + 3: SELECT-only Queryable inside a READ ONLY transaction
    const result = await ctx.db.withReadOnly((q) => (tool.run as (a: unknown, c: ToolContext, q: unknown) => Promise<unknown>)(args, ctx, q));
    log(`ok ${name} ${Date.now() - started}ms`);
    return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result as Record<string, unknown> };
  } catch (err) {
    const code = err instanceof PolicyViolation ? err.code : 'TOOL_ERROR';
    // Database-level refusal (layer 3) is reported as the same policy.
    const pgReadOnly = /read-only transaction/i.test((err as Error).message);
    const finalCode = pgReadOnly ? 'POLICY_WRITE_SQL' : code;
    log(`${finalCode} ${name}: ${(err as Error).message}`);
    return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: finalCode, message: (err as Error).message }) }] };
  }
}

export function createGameHubServer(ctx: ToolContext): Server {
  const server = new Server(SERVER_INFO, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: toolInputJsonSchema(t) as { type: 'object' },
      annotations: { readOnlyHint: t.readOnly, destructiveHint: false, openWorldHint: false },
    })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => callTool(ctx, req.params.name, req.params.arguments));
  return server;
}

async function main() {
  const db = await openAiDb();
  const principal = await db.withReadOnly((q) => resolvePrincipal(q, readSessionToken()));
  log(`ready: ${db.describe}, acting for @${principal.handle}, ${TOOLS.length} tools`);
  const server = createGameHubServer({ db, principal, memory: new MemoryStore(paths.memoryDir), now: () => new Date() });
  const shutdown = async () => {
    await server.close().catch(() => {});
    await db.close().catch(() => {});
    process.exit(0);
  };
  process.stdin.on('close', shutdown);
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  await server.connect(new StdioServerTransport());
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    log(`failed to start: ${(err as Error).message}`);
    process.exit(1);
  });
}
