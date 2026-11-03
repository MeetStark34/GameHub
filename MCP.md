# GameHub MCP server

Our own [Model Context Protocol](https://modelcontextprotocol.io) server. It gives
a language model read-only, per-player access to GameHub data.

## Where it lives

| File | Role |
|---|---|
| `ai/mcp-server/server.ts` | MCP server (official TypeScript SDK, low-level `Server`, stdio transport). Lists tools and dispatches calls |
| `ai/mcp-server/tools.ts` | The tools: description, strict zod input schema (converted to JSON Schema for the listing), handler |
| `ai/mcp-server/guard.ts` | Security rule: tool allowlist, XP-mutation refusal, SELECT-only SQL guard |
| `ai/mcp-server/auth.ts` | Session token → player (same sha256 lookup as the website's `gh_session` cookie, read-only) |
| `ai/lib/db.ts` | Read-only database: Supabase/Postgres (`AI_DATABASE_URL`) or the local demo database |
| `ai/agent/harness.ts` | MCP **client**: starts the server as a child process and calls it |

The handlers reuse GameHub's own server code where it exists
(`getPublicProfile`, `getAchievements`, `loadMastery`, `loadStreaks`,
`rankFromXp`, `viewStreak`, `dailyDifficultyFor`). The AI therefore sees the
same numbers as the website. Each handler receives a database handle that can
only run `SELECT`, inside a `READ ONLY` transaction.

## How it starts

The harness starts it, so normally you do nothing:

```text
node --conditions=react-server --import tsx ai/mcp-server/server.ts
```

- `--import tsx` runs the TypeScript directly. `--conditions=react-server`
  lets the server import GameHub's `server-only` modules outside Next.js.
- At start-up it opens the database read-only, resolves the session token to
  a player (it refuses to start if the token is unknown or expired), and then
  speaks MCP on stdin/stdout. Logs go to stderr, for example
  `[gamehub-mcp] ready: pglite demo database (read-only), acting for @demo_player, 11 tools`.
- To start it by hand: `npm run ai:mcp`. It then waits for an MCP client on stdin.
  You can also attach any MCP client, such as the MCP Inspector:
  `npx @modelcontextprotocol/inspector node --conditions=react-server --import tsx ai/mcp-server/server.ts`.

## How Qwen connects to it

```text
ai/agent/harness.ts
  connectGameHubMcp()   -> StdioClientTransport spawns the server, Client.connect()
  client.listTools()    -> name, description, JSON Schema of each tool
  -> passed to Qwen as its tool definitions (Ollama `tools` / OpenAI `tools`)
  Qwen returns tool_calls [{name, arguments}]
  client.callTool({name, arguments})   -> forwarded UNCHANGED, the server decides
  result text -> appended to the conversation as a `tool` message -> Qwen again
```

The harness never decides which tool to use, and never filters or fixes a call.
That keeps the server as the single place where rules are enforced.

## Tools

All tools act for the signed-in player only. No tool accepts a user id.

| Tool | Input | Returns |
|---|---|---|
| `get_player_profile` | `{ handle? }` | Own profile, or another player's **public** profile (private profile → `found:false`). No email |
| `get_player_stats` | `{}` | XP, rank, level, next rank, completed games (daily / unlimited / by difficulty / perfect), True Player days, repair cards |
| `get_game_performance` | `{ game? }` | Per game: completions, average and best time (s), average and best score, mastery rank |
| `get_game_history` | `{ game?, mode?, limit? (1-25) }` | Latest completions, newest first |
| `get_achievements` | `{ status?: unlocked\|locked\|all }` | Unlocked count / total, unlocked list, closest locked ones (hidden ones stay hidden) |
| `get_streaks` | `{}` | Normal and True Player streak: current, best, status |
| `get_daily_set_status` | `{}` | Today's Daily Set: difficulty and the status of each of the 8 games, completed count |
| `analyze_player_performance` | `{ game? }` | **Block 1 tool**: strongest and weakest game, speed vs par, most played, spread, trend |
| `recall_memory` | `{}` | Remembered preferences, notes, recent questions |
| `remember_preference` | `{ favorite_game?, goal?, note? }` | Saves to the memory file (never the database). Private-data filter |
| `record_session_summary` | harness only | Not offered to the model. Stores a one-line summary of the session |

`game` accepts an id or a display name in any case: `sudoku`, `Mini Sudoku`,
`mini-sudoku`. Every schema has `additionalProperties: false`.

### Errors

Errors come back as an MCP error result (`isError: true`) with
`{"error": CODE, "message": ...}`:

| Code | When |
|---|---|
| `POLICY_XP_READ_ONLY` | A tool name that would change progression (`award_xp`, `set_rank`, `unlock_achievement`, ...), or progression fields smuggled into a read tool (`{"xp": 999999}`) |
| `POLICY_UNKNOWN_TOOL` | Any other tool name that is not on the list |
| `POLICY_INVALID_INPUT` | Input fails the schema (`limit: 500`, unknown game, ...) |
| `POLICY_WRITE_SQL` | A handler tried non-SELECT SQL (guard), or Postgres refused a write (read-only transaction) |
| `TOOL_ERROR` | Anything else |

## Example: real call against GameHub data

From `npm run ai:demo` with Qwen3.5-4B Q4_K_M on 2026-11-03. The full trace is in
`ai/traces/evidence/demo-question.json`.

```text
User:  Which GameHub game am I best at?

[1] Harness -> Qwen: system prompt + question + 8 tool definitions from tools/list
                     (memory is off in the demo, so the 2 memory tools are hidden)
    Qwen -> tool_calls: analyze_player_performance {}        (1169 prompt / 16 output tokens, 6.9 s)

[2] MCP client -> GameHub MCP server: tools/call analyze_player_performance {}
    server: allowlist ok -> schema ok -> READ ONLY transaction ->
            SELECT game, difficulty, score, duration_ms, perfect, completed_at FROM completions WHERE user_id = <demo_player>
            -> analyzePerformance(...)                         (35 ms)
    result:
    {
      "totalPlays": 57, "gamesPlayed": 8,
      "games": [ {"name":"Queens","plays":13,"avgScore":1000,"avgSeconds":89.7,"parRatio":0.8, ...},
                 {"name":"Mini Sudoku","plays":7,"avgScore":945.6,"avgSeconds":199.7,"parRatio":1.33, ...}, ... ],
      "strongestGame": "Zip", "weakestGame": "Pinpoint", "fastestVsPar": "Zip", "mostPlayed": "Queens",
      "trend": {"recentAvgScore": 992.2, "previousAvgScore": 941.2, "direction": "improving"}
    }

[3] Harness -> Qwen: tool result appended as a `tool` message
    Qwen -> final answer                                      (1760 prompt / 40 output tokens, 1.3 s)

Qwen:  You're best at Zip, which has an average score of 1000 and is also your fastest game
       relative to par. You're most played at Queens with 13 games.
```

Every claim in the answer is in the tool result: strongestGame = Zip,
Zip's avgScore = 1000 (Queens and Tango also average 1000; the tie is broken by
speed vs par), fastestVsPar = Zip (parRatio 0.49), and mostPlayed = Queens with
13 plays.
The same demo then sends forged `award_xp`, `set_rank` and
`get_player_stats {"xp":1000000}` calls. All three are refused with
`POLICY_XP_READ_ONLY`, and XP stays at 6604 → 6604
(`ai/traces/evidence/demo-xp-guard.json`).

## Reproduce

```bash
npm run ai:seed                       # demo data (once)
npm run ai:check                      # starts the server and lists the tools
npm run ai:ask -- "Which game have I played the most?"
npm run test:ai                       # tool listing, outputs, validation, authorization, XP guard (in-process MCP)
```
