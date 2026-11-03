import fs from 'node:fs';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { paths } from '../lib/config';
import type { ChatMessage, ChatModel, ToolCall, ToolSpec } from './llm';

/**
 * The agent harness: User -> Qwen -> (tool call) -> MCP client -> GameHub MCP
 * server -> GameHub data -> MCP result -> Qwen -> answer. Every step is
 * written to a JSON trace.
 *
 * The harness does not decide which tool to call; the model does. The
 * harness only (a) gives the model the tool list from the MCP server,
 * (b) forwards each requested call to the MCP server unchanged (so the
 * server-side guard is what accepts or refuses it), and (c) loads memory
 * context at session start and saves a short summary at the end.
 */

/** Tools the harness itself uses; never offered to the model. */
const HARNESS_ONLY = new Set(['record_session_summary']);
/** Memory tools: offered only when memory is on, so "memory off" really means no memory. */
export const MEMORY_TOOLS = new Set(['recall_memory', 'remember_preference']);

export interface McpConnection {
  client: Client;
  close(): Promise<void>;
}

/** Starts the GameHub MCP server as a child process and connects over stdio. */
export async function connectGameHubMcp(env: Record<string, string> = {}): Promise<McpConnection> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--conditions=react-server', '--import', 'tsx', paths.mcpServerEntry],
    env: { ...(process.env as Record<string, string>), ...env },
    stderr: 'pipe',
  });
  const errLines: string[] = [];
  transport.stderr?.on('data', (d: Buffer) => {
    errLines.push(...d.toString().split('\n').filter(Boolean));
    if (process.env.AI_DEBUG) process.stderr.write(d);
  });
  const client = new Client({ name: 'gamehub-agent', version: '1.0.0' });
  try {
    await client.connect(transport);
  } catch (err) {
    throw new Error(`Could not start the GameHub MCP server: ${errLines.slice(-3).join(' | ') || (err as Error).message}`);
  }
  return { client, close: () => client.close() };
}

export interface TraceStep {
  type: 'llm' | 'tool';
  ms: number;
  [k: string]: unknown;
}

export interface AgentTrace {
  id: string;
  startedAt: string;
  model: string;
  question: string;
  options: { tools: boolean; memory: boolean; seed: number | null };
  memoryContext: string;
  memoryContextChars: number;
  systemPrompt: string;
  steps: TraceStep[];
  toolsCalled: string[];
  blockedCalls: { name: string; code: string }[];
  answer: string;
  totals: { ms: number; llmCalls: number; promptTokens: number; outputTokens: number; firstPromptTokens: number | null };
}

export interface AgentOptions {
  question: string;
  model: ChatModel;
  mcp: Client;
  /** Offer MCP tools to the model (false = baseline: model alone). */
  tools?: boolean;
  /** Load memory at start and save a summary at the end. */
  memory?: boolean;
  seed?: number;
  maxSteps?: number;
  now?: Date;
  /** Prior turns of the same session. */
  history?: ChatMessage[];
}

export function systemPrompt(now: Date, opts: { tools: boolean; memory: string }): string {
  return [
    'You are the GameHub assistant. GameHub is a puzzle site with 8 games (Patches, Mini Sudoku, Zip, Werd, Pinpoint, Crossclimb, Queens, Tango), a Daily Set that resets at 00:00 UTC, XP, ranks, streaks and achievements.',
    `Today is ${now.toISOString().slice(0, 10)} (UTC). You are talking to the signed-in player.`,
    opts.tools
      ? 'For any question about this player, call a tool to get the real data first. Never guess or invent numbers; quote the numbers from the tool result exactly. If a tool fails, say so. You can read XP, ranks, streaks and achievements but you cannot change them.'
      : 'You have no access to the player\'s data. If you do not know something, say you do not know.',
    'Answer in one to three short sentences.',
    opts.memory,
  ]
    .filter(Boolean)
    .join('\n');
}

const textOf = (r: CallToolResult) =>
  r.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { text: string }).text)
    .join('\n');

const MAX_TOOL_CHARS = 6000;

export async function runAgent(o: AgentOptions): Promise<AgentTrace> {
  const started = Date.now();
  const now = o.now ?? new Date();
  const useTools = o.tools ?? true;
  const useMemory = o.memory ?? true;

  const listed = (await o.mcp.listTools()).tools;
  const specs: ToolSpec[] = useTools
    ? listed.filter((t) => !HARNESS_ONLY.has(t.name) && (useMemory || !MEMORY_TOOLS.has(t.name))).map((t) => ({ name: t.name, description: t.description ?? '', parameters: t.inputSchema as Record<string, unknown> }))
    : [];

  let memoryContext = '';
  if (useMemory) {
    const r = (await o.mcp.callTool({ name: 'recall_memory', arguments: {} })) as CallToolResult;
    if (!r.isError) memoryContext = (JSON.parse(textOf(r)) as { asContext: string }).asContext;
  }

  const sys = systemPrompt(now, { tools: useTools, memory: memoryContext });
  const messages: ChatMessage[] = [{ role: 'system', content: sys }, ...(o.history ?? []), { role: 'user', content: o.question }];
  const steps: TraceStep[] = [];
  const toolsCalled: string[] = [];
  const blocked: AgentTrace['blockedCalls'] = [];
  let answer = '';
  let firstPromptTokens: number | null = null;

  for (let step = 0; step < (o.maxSteps ?? 6); step++) {
    const res = await o.model.chat(messages, specs, { seed: o.seed });
    if (firstPromptTokens === null) firstPromptTokens = res.promptTokens;
    steps.push({ type: 'llm', ms: res.ms, promptTokens: res.promptTokens, outputTokens: res.outputTokens, content: res.content, toolCalls: res.toolCalls, thinking: res.thinking || undefined });
    if (!res.toolCalls.length) {
      answer = res.content;
      messages.push({ role: 'assistant', content: res.content });
      break;
    }
    messages.push({ role: 'assistant', content: res.content, toolCalls: res.toolCalls });
    for (const call of res.toolCalls) messages.push(await executeCall(o.mcp, call, steps, toolsCalled, blocked));
  }
  if (!answer) answer = '(no final answer within the step limit)';

  if (useMemory && useTools)
    await o.mcp.callTool({ name: 'record_session_summary', arguments: { question: o.question, tools: toolsCalled, answer } }).catch(() => undefined);

  const llm = steps.filter((s) => s.type === 'llm');
  return {
    id: `${new Date(started).toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 6)}`,
    startedAt: new Date(started).toISOString(),
    model: o.model.label,
    question: o.question,
    options: { tools: useTools, memory: useMemory, seed: o.seed ?? null },
    memoryContext,
    memoryContextChars: memoryContext.length,
    systemPrompt: sys,
    steps,
    toolsCalled,
    blockedCalls: blocked,
    answer,
    totals: {
      ms: Date.now() - started,
      llmCalls: llm.length,
      promptTokens: llm.reduce((s, x) => s + Number(x.promptTokens ?? 0), 0),
      outputTokens: llm.reduce((s, x) => s + Number(x.outputTokens ?? 0), 0),
      firstPromptTokens,
    },
  };
}

async function executeCall(mcp: Client, call: ToolCall, steps: TraceStep[], called: string[], blocked: AgentTrace['blockedCalls']): Promise<ChatMessage> {
  const t0 = Date.now();
  called.push(call.name);
  let result: CallToolResult;
  if (call.rawArguments !== undefined) {
    result = { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: 'BAD_ARGUMENTS', message: 'Tool arguments must be a JSON object.' }) }] };
  } else {
    try {
      result = (await mcp.callTool({ name: call.name, arguments: call.arguments })) as CallToolResult;
    } catch (err) {
      result = { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: 'MCP_ERROR', message: (err as Error).message }) }] };
    }
  }
  const text = textOf(result);
  let code: string | null = null;
  if (result.isError) {
    try {
      code = (JSON.parse(text) as { error?: string }).error ?? 'TOOL_ERROR';
    } catch {
      code = 'TOOL_ERROR';
    }
    if (code.startsWith('POLICY_')) blocked.push({ name: call.name, code });
  }
  steps.push({ type: 'tool', ms: Date.now() - t0, name: call.name, arguments: call.arguments, ok: !result.isError, errorCode: code, result: safeJson(text) });
  return { role: 'tool', toolCallId: call.id, name: call.name, content: text.length > MAX_TOOL_CHARS ? `${text.slice(0, MAX_TOOL_CHARS)}…(truncated)` : text };
}

const safeJson = (s: string) => {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
};

export function saveTrace(trace: AgentTrace, dir = paths.traceDir): string {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${trace.id}.json`);
  fs.writeFileSync(file, JSON.stringify(trace, null, 2));
  return file;
}
