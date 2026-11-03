# GameHub AI system (local Qwen + MCP)

A small AI layer next to the GameHub web app. A **local** language model,
**Qwen3.5-4B (Q4_K_M)**, answers questions about a player's GameHub data. It
reads that data only through an **MCP server we wrote**. The model is not
trusted: code, tests and a benchmark check what it does.

The web app does not depend on any of this. Nothing in `ai/` is imported by
`src/`, the model never runs on Vercel, and the AI layer reads the database
over its own **read-only** connection.

## Architecture

```text
 User question
      │
      ▼
 Agent harness  (ai/agent/harness.ts)  ── loads memory, records a JSON trace
      │  messages + tool list
      ▼
 Qwen3.5-4B Q4_K_M  (local: Ollama or llama.cpp, ai/agent/llm.ts)
      │  "call get_game_performance {}"      ← the model decides
      ▼
 MCP client  (@modelcontextprotocol/sdk, stdio)
      │
      ▼
 GameHub MCP server  (ai/mcp-server/server.ts, child process)
      │  allowlist + strict input  →  SELECT-only guard  →  READ ONLY transaction
      ▼
 GameHub Postgres  (Supabase, or the local demo database)
      │  rows → JSON result
      ▼
 MCP result → back to Qwen → final answer → trace saved
```

| Course block | What | Where |
|---|---|---|
| 1. Own tool | `analyze_player_performance`: averages, spread, par ratio, strengths, trend | `ai/tools/analyze.ts` |
| 2. Own MCP server | 10 GameHub tools over stdio, started and called by the harness | `ai/mcp-server/` |
| 3. Rule enforced in code | The AI can read XP but can never change it (3 layers) | `ai/mcp-server/guard.ts`, `ai/lib/db.ts` |
| 5. Memory / context | Per-player memory file, loaded at session start | `ai/memory/store.ts` |
| 9. Benchmark | 12 tasks with independently computed answers, 3 runs each, plus comparisons | `ai/benchmark/` |

Evidence and reproduction commands for each block are in [EVIDENCE.md](EVIDENCE.md).
MCP details are in [MCP.md](MCP.md), and the benchmark in [BENCHMARK.md](BENCHMARK.md).

## Folder layout

```text
ai/
  agent/        harness.ts (agent loop + traces), llm.ts (Ollama / OpenAI-compatible client),
                cli.ts (npm run ai:ask), print.ts
  mcp-server/   server.ts (MCP over stdio), tools.ts (tool definitions),
                guard.ts (security rule), auth.ts (session token -> player)
  tools/        analyze.ts (Block 1 tool, pure function)
  memory/       store.ts (Block 5)
  benchmark/    tasks.ts (tasks + ground truth + grading), run.ts, results/
  lib/          config.ts (env), db.ts (read-only database access)
  scripts/      seed-demo.ts, demo.ts, memory-demo.ts, create-token.ts, check-setup.ts
  tests/        Vitest suites (run with npm test)
  traces/       evidence/ (committed demo traces), benchmark/ (benchmark traces),
                runs/ (your own runs, git-ignored)
```

## 1. Run Qwen locally

You need one of the following. Both run fully offline and need no API key.

### Option A: Ollama (used for all results in this repository)

1. Install Ollama from https://ollama.com/download (Windows, macOS or Linux).
2. Download the model:
   ```bash
   ollama pull qwen3.5:4b
   ```
   The `qwen3.5:4b` tag is the 4B model in **Q4_K_M** quantisation (about 3.4 GB).
   You can check this with `ollama show qwen3.5:4b`, which lists `quantization Q4_K_M`.
   `npm run ai:check` prints it too.
3. Ollama runs as a background service on `http://127.0.0.1:11434`.
   If it is not running, start it with `ollama serve`.

### Option B: llama.cpp with the GGUF file

1. Get `llama-server` from the llama.cpp releases (https://github.com/ggml-org/llama.cpp/releases).
   Pick the CUDA build for an NVIDIA GPU, or the CPU build.
2. Download `Qwen3.5-4B-Q4_K_M.gguf`, for example from the Qwen or unsloth GGUF
   repository on Hugging Face. Keep it **outside** the repository: `*.gguf` and
   `models/` are git-ignored.
3. Start the server with tool calling enabled (`--jinja` uses the model's own chat template):
   ```bash
   llama-server -m /path/to/Qwen3.5-4B-Q4_K_M.gguf --jinja -c 8192 -ngl 99 --port 8080
   ```
4. Point the AI layer at it:
   ```bash
   # bash
   export AI_PROVIDER=openai AI_BASE_URL=http://127.0.0.1:8080/v1
   # PowerShell
   $env:AI_PROVIDER="openai"; $env:AI_BASE_URL="http://127.0.0.1:8080/v1"
   ```

Tip: Ollama already stores the same Q4_K_M GGUF on disk. `llama-server` can load
that file directly. Find its path in `ollama show qwen3.5:4b --modelfile`
(the `FROM` line).

### Settings (environment variables, all optional)

| Variable | Default | Meaning |
|---|---|---|
| `AI_PROVIDER` | `ollama` | `ollama` (native API) or `openai` (any OpenAI-compatible server, such as llama.cpp) |
| `AI_BASE_URL` | `http://127.0.0.1:11434` / `http://127.0.0.1:8080/v1` | Model server |
| `AI_MODEL` | `qwen3.5:4b` | Model name |
| `AI_THINK` | off | `1` turns on Qwen's thinking mode (slower) |
| `AI_TEMPERATURE` | `0.7` | Qwen's recommended setting for non-thinking mode |
| `AI_DATABASE_URL` | unset | Postgres or Supabase URL to read. Unset means the local demo database |
| `GAMEHUB_SESSION_TOKEN` | unset | Session token of the player to act for. Unset means the demo player |
| `AI_MEMORY_DIR` | `.data/ai-memory` | Memory files (git-ignored) |

## 2. Data: the demo player or your own account

**Demo (reproducible, recommended for grading).**

```bash
npm run ai:seed
```

This creates `.data/ai-demo/pglite`, a local GameHub database with three
accounts (`demo_player`, `rival_public`, and `rival_private`, whose profile is
private). It then plays **57 real games** for `demo_player`: real generated
puzzles, solved through GameHub's own `startSession` → `actOnSession` →
`processCompletion` pipeline over the last 7 days. XP, streaks, mastery,
achievements and the Daily Set all come from the same code as the website.
Nothing is mocked. The demo player's session token goes to
`.data/ai-demo/session-token`, which is git-ignored. Running the command again
rebuilds the database from scratch, relative to today's date.

**Your real GameHub account (Supabase).**

```bash
npm run ai:token -- you@example.com          # asks for your password, saves a session token
npm run ai:ask -- --live "What is my rank?"  # reads Supabase through DATABASE_URL in .env.local
```

`ai:token` runs the same check as the login page and creates one session.
Instead, you can copy your browser's `gh_session` cookie value into
`GAMEHUB_SESSION_TOKEN`.

## 3. Ask questions

```bash
npm run ai:check                                        # model, data and MCP server all OK?
npm run ai:ask -- "Which GameHub game am I best at?"
npm run ai:ask -- --no-memory "What is my current XP?"
npm run ai:demo                                         # the full oral-defence demo (see below)
```

Each run prints the call chain and saves the full trace (every model call with
token counts, every tool call with its arguments and result) to
`ai/traces/runs/<timestamp>.json`.

## 4. One-command demo (oral defence)

```bash
ollama serve          # if Ollama is not already running
npm run ai:seed       # once
npm run ai:demo
```

`ai:demo` starts the MCP server and asks Qwen *"Which GameHub game am I best
at?"*. Qwen chooses the tool, the MCP server reads the database, and Qwen
answers. Next, a prompt injection asks Qwen to add 1,000,000 XP. Finally,
forged `award_xp` / `set_rank` / `get_player_stats {xp}` calls are sent
straight to the server. XP is printed before and after the attacks.
The traces are saved in `ai/traces/evidence/demo-*.json`.

## 5. Security rule: the AI cannot change XP

The rule is enforced by code that never reads the prompt:

1. **Tool allowlist and strict inputs** (`guard.ts`, `tools.ts`). The server
   executes only its own read-only tools. A call to `award_xp`, `set_rank`,
   `unlock_achievement` and similar names is refused with
   `POLICY_XP_READ_ONLY`. Every input schema is strict, so a call like
   `get_player_stats {"xp": 999999}` is refused too. Tools never accept a user
   id; the player comes from the session token.
2. **SELECT-only SQL** (`guard.ts`). Tool handlers receive a database handle
   that refuses anything except a single plain `SELECT`. That includes writes
   hidden in CTEs, `FOR UPDATE`, and `set_config`.
3. **Postgres READ ONLY transaction** (`ai/lib/db.ts`). Every tool call runs in
   `SET TRANSACTION READ ONLY`, so Postgres itself rejects writes. This was
   checked on the real Supabase pooler (`npm run test:ai:live`). Supabase's
   transaction pooler ignores the connection-level `default_transaction_read_only`
   setting, which is why the per-transaction setting matters.

XP can only change through GameHub's existing pipeline: `awardXp` in
`src/server/progress.ts`, reached by finishing a game or by an audited admin
action. `ai/tests/xp-guard.test.ts` attacks each layer and checks that XP and
the XP ledger stay unchanged.

The memory tools write only to the memory file, never to the database.

## 6. Memory

- Stored per player in `.data/ai-memory/<hash of user id>.json`, git-ignored,
  outside the GameHub database.
- Holds a favourite game, a goal, up to 8 short notes, and summaries of the last
  5 questions. It refuses anything that looks like private data: email
  addresses, phone numbers, links, passwords or tokens.
- At session start the harness calls `recall_memory` and adds a short context
  block to the system prompt. At the end it stores a one-line summary through
  `record_session_summary`, a tool that only the harness uses and the model never sees.
- Test: `npm run ai:memory-demo` runs session A, session B and a control session
  in three separate processes and reports the exact prompt-token cost of the
  memory. Automated version: `ai/tests/memory.test.ts`.

## 7. Tests

```bash
npm test                 # whole repository, including ai/tests (no model needed)
npm run test:ai          # only the AI layer
npm run test:ai:live     # opt-in: read-only checks against Supabase (needs .env.local)
npm run ai:benchmark     # needs the model running (about 10-20 min)
```

## Limits (stated honestly)

- Answers depend on a 4B model. The benchmark measures how often it is right.
  It is not always right.
- The Supabase path is verified for read-only access. Live questions about your
  own account need your session token, so `ai:token` must be run by you.
- The harness is a command-line tool. There is no chat UI in the website.
