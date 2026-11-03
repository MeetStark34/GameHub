import fs from 'node:fs';
import path from 'node:path';
import { llmConfig, paths } from '../lib/config';
import { openAiDb } from '../lib/db';
import { readSessionToken, resolvePrincipal } from '../mcp-server/auth';
import { connectGameHubMcp, runAgent, saveTrace } from '../agent/harness';
import { createChatModel } from '../agent/llm';
import { describeExpected, grade, TASKS, type Expected } from './tasks';

/**
 * Runs every benchmark task N times (default 3) through the full system
 * (Qwen -> MCP -> GameHub data) and grades the answers automatically.
 *
 *   npm run ai:benchmark                       # Qwen3.5-4B + MCP tools, 3 runs
 *   npm run ai:benchmark -- --no-tools         # baseline: same model, no tools
 *   npm run ai:benchmark -- --model qwen3.5:2b # model comparison
 *   npm run ai:benchmark -- --runs 1 --tasks xp,rank
 *
 * Writes ai/benchmark/results/<label>.json and .md, and every trace to
 * ai/traces/benchmark/<label>/. Memory is OFF so runs stay independent.
 */
const argv = process.argv.slice(2);
const opt = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const runs = Number(opt('--runs') ?? 3);
const useTools = !argv.includes('--no-tools');
const cfg = llmConfig({ ...(opt('--model') ? { model: opt('--model') } : {}) });
const only = opt('--tasks')?.split(',');
const tasks = only ? TASKS.filter((t) => only.includes(t.id)) : TASKS;
const label = opt('--label') ?? `${new Date().toISOString().slice(0, 10)}_${cfg.model.replace(/[^a-z0-9.]+/gi, '-')}_${useTools ? 'mcp' : 'no-tools'}`;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sd = (xs: number[]) => (xs.length < 2 ? 0 : Math.sqrt(xs.reduce((s, x) => s + (x - mean(xs)) ** 2, 0) / (xs.length - 1)));
const r1 = (n: number) => Math.round(n * 10) / 10;

interface Row {
  task: string;
  run: number;
  question: string;
  expected: string;
  answer: string;
  correct: boolean;
  tools: string[];
  usedExpectedTool: boolean;
  ms: number;
  promptTokens: number;
  outputTokens: number;
  trace: string;
}

async function main() {
  const now = new Date();
  // 1. Ground truth, computed independently and BEFORE the MCP server opens the database.
  const db = await openAiDb();
  const truths = new Map<string, Expected>();
  let handle = '';
  await db.withReadOnly(async (q) => {
    const p = await resolvePrincipal(q, readSessionToken());
    handle = p.handle;
    for (const t of tasks) truths.set(t.id, await t.truth(q, p.userId, now));
  });
  await db.close();
  console.log(`Benchmark "${label}": ${tasks.length} tasks x ${runs} runs, model ${cfg.model}, tools ${useTools ? 'on' : 'off'}, player @${handle}`);

  // 2. Run the system.
  const model = createChatModel(cfg);
  const mcp = await connectGameHubMcp();
  const traceDir = path.join(path.dirname(paths.traceDir), 'benchmark', label);
  const rows: Row[] = [];
  try {
    for (let run = 1; run <= runs; run++) {
      for (const t of tasks) {
        const trace = await runAgent({ question: t.question, model, mcp: mcp.client, tools: useTools, memory: false, seed: run, now });
        const exp = truths.get(t.id)!;
        const row: Row = {
          task: t.id,
          run,
          question: t.question,
          expected: describeExpected(exp),
          answer: trace.answer,
          correct: grade(trace.answer, exp, t.question),
          tools: trace.toolsCalled,
          usedExpectedTool: trace.toolsCalled.some((n) => t.expectedTools.includes(n)),
          ms: trace.totals.ms,
          promptTokens: trace.totals.promptTokens,
          outputTokens: trace.totals.outputTokens,
          trace: path.relative(process.cwd(), saveTrace(trace, traceDir)).replace(/\\/g, '/'),
        };
        rows.push(row);
        console.log(`${row.correct ? 'PASS' : 'FAIL'} run ${run} ${t.id.padEnd(16)} expected ${row.expected.padEnd(14)} ${(row.ms / 1000).toFixed(1)}s  tools=[${row.tools.join(',')}]  "${row.answer.replace(/\s+/g, ' ').slice(0, 110)}"`);
      }
    }
  } finally {
    await mcp.close();
  }

  // 3. Aggregate.
  const perRun = Array.from({ length: runs }, (_, i) => rows.filter((r) => r.run === i + 1));
  const runAcc = perRun.map((rs) => (100 * rs.filter((r) => r.correct).length) / rs.length);
  const perTask = tasks.map((t) => {
    const rs = rows.filter((r) => r.task === t.id);
    return { task: t.id, question: t.question, expected: rs[0]?.expected, correct: rs.filter((r) => r.correct).length, runs: rs.length, meanSeconds: r1(mean(rs.map((r) => r.ms / 1000))) };
  });
  const summary = {
    label,
    date: now.toISOString(),
    model: cfg.model,
    provider: cfg.provider,
    tools: useTools,
    temperature: cfg.temperature,
    think: cfg.think,
    tasks: tasks.length,
    runs,
    attempts: rows.length,
    correct: rows.filter((r) => r.correct).length,
    failures: rows.filter((r) => !r.correct).length,
    accuracyPct: r1((100 * rows.filter((r) => r.correct).length) / rows.length),
    accuracyPerRunPct: runAcc.map(r1),
    accuracyMeanPct: r1(mean(runAcc)),
    accuracySdPct: r1(sd(runAcc)),
    latencyMeanSeconds: r1(mean(rows.map((r) => r.ms / 1000))),
    latencySdSeconds: r1(sd(rows.map((r) => r.ms / 1000))),
    promptTokensMean: Math.round(mean(rows.map((r) => r.promptTokens))),
    outputTokensMean: Math.round(mean(rows.map((r) => r.outputTokens))),
    expectedToolRatePct: r1((100 * rows.filter((r) => r.usedExpectedTool).length) / rows.length),
    noToolCallPct: r1((100 * rows.filter((r) => !r.tools.length).length) / rows.length),
    perTask,
  };
  fs.mkdirSync(paths.benchmarkDir, { recursive: true });
  const base = path.join(paths.benchmarkDir, label);
  fs.writeFileSync(`${base}.json`, JSON.stringify({ summary, rows }, null, 2));
  fs.writeFileSync(`${base}.md`, markdown(summary, rows));
  console.log(`\nAccuracy ${summary.accuracyPct}% (${summary.correct}/${summary.attempts}); per run ${summary.accuracyPerRunPct.join(' / ')} -> mean ${summary.accuracyMeanPct} ± ${summary.accuracySdPct} pp`);
  console.log(`Latency ${summary.latencyMeanSeconds} ± ${summary.latencySdSeconds} s per question. Results: ${path.relative(process.cwd(), base)}.{json,md}`);
}

function markdown(s: Record<string, unknown> & { perTask: { task: string; question: string; expected?: string; correct: number; runs: number; meanSeconds: number }[] }, rows: Row[]) {
  const lines = [
    `# Benchmark ${s.label}`,
    '',
    `Model \`${s.model}\` (${s.provider}), tools ${s.tools ? 'on (GameHub MCP)' : 'off'}, temperature ${s.temperature}, thinking ${s.think ? 'on' : 'off'}. ${s.tasks} tasks x ${s.runs} runs, ${s.date}.`,
    '',
    `| Metric | Value |`,
    `|---|---|`,
    `| Accuracy | ${s.accuracyPct}% (${s.correct}/${s.attempts}) |`,
    `| Accuracy per run | ${(s.accuracyPerRunPct as number[]).join(' / ')} % |`,
    `| Mean ± SD over runs | ${s.accuracyMeanPct} ± ${s.accuracySdPct} pp |`,
    `| Failures | ${s.failures} |`,
    `| Latency per question | ${s.latencyMeanSeconds} ± ${s.latencySdSeconds} s |`,
    `| Prompt / output tokens per question | ${s.promptTokensMean} / ${s.outputTokensMean} |`,
    `| Called an expected tool | ${s.expectedToolRatePct}% |`,
    `| Answered without any tool call | ${s.noToolCallPct}% |`,
    '',
    '| Task | Expected | Correct | Mean s |',
    '|---|---|---|---|',
    ...s.perTask.map((t) => `| ${t.task} | ${t.expected} | ${t.correct}/${t.runs} | ${t.meanSeconds} |`),
    '',
    '## Failures',
    '',
    ...(rows.filter((r) => !r.correct).length
      ? rows.filter((r) => !r.correct).map((r) => `- **${r.task}** run ${r.run}: expected ${r.expected}; tools [${r.tools.join(', ')}]; answer: "${r.answer.replace(/\s+/g, ' ').replace(/\|/g, '/')}" (trace \`${r.trace}\`)`)
      : ['None.']),
    '',
  ];
  return lines.join('\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
