import path from 'node:path';
import type { AgentTrace } from './harness';

/** Human-readable view of a trace for the terminal. */
export function printTrace(t: AgentTrace, file?: string) {
  const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
  console.log(dim(`model ${t.model} | memory context ${t.memoryContextChars} chars`));
  console.log(`\nUser: ${t.question}`);
  for (const s of t.steps) {
    if (s.type === 'llm') {
      const calls = (s.toolCalls as { name: string; arguments: unknown }[]) ?? [];
      const tok = `${s.promptTokens ?? '?'} prompt / ${s.outputTokens ?? '?'} output tokens, ${s.ms} ms`;
      if (calls.length) for (const c of calls) console.log(`Qwen -> tool call ${c.name}(${JSON.stringify(c.arguments)})  ${dim(tok)}`);
      else console.log(dim(`Qwen final answer (${tok})`));
    } else {
      const res = JSON.stringify(s.result);
      console.log(`MCP  <- ${s.name} ${s.ok ? 'ok' : `REFUSED ${s.errorCode}`} ${dim(`${s.ms} ms`)}\n       ${dim(res.length > 300 ? `${res.slice(0, 300)}…` : res)}`);
    }
  }
  console.log(`\nQwen: ${t.answer}\n`);
  if (file) console.log(dim(`trace: ${path.relative(process.cwd(), file)}`));
}
