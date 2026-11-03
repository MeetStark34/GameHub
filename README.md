# GameHub

**GameHub: Your daily brain training, without the daily limit**
*Play. Progress. Master.*

Eight original puzzle games (Patches, Mini Sudoku, Zip, Werd, Pinpoint,
Crossclimb, Tango, Queens) with a shared Daily Set every UTC day, Unlimited
mode, XP, ranks, mastery, two streaks, Gold Streak Repair Cards, achievements,
leaderboards, 11 themes and an admin area. Everything that matters is
validated on the server.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL
(Supabase in production, PGlite locally) · Vitest · Playwright.

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000. Uses an embedded Postgres in .data/pglite
```

No database setup is needed locally: migrations run automatically on first
request. To make yourself an admin locally, sign up, stop the dev server, then:

```bash
npm run admin:grant -- you@example.com admin
```

Or set `GAMEHUB_BOOTSTRAP_ADMINS=you@example.com` in `.env.local` before
signing up.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (PGlite) |
| `npm run build` / `npm start` | Production build / server (`start` needs `DATABASE_URL`) |
| `npm test` | Unit + integration tests (Vitest, real Postgres via PGlite) |
| `npm run test:e2e` | Playwright journeys (run `npm run build` first) |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm run check` | lint + typecheck + tests |
| `npm run db:migrate` | Apply migrations (`DATABASE_URL` or local PGlite) |
| `npm run admin:grant -- <email> [admin\|moderator] [--revoke]` | Manage roles |
| `npm run words:build` | Rebuild baked word lists (changes future puzzles) |
| `npm run ai:*` / `npm run test:ai` | Local AI layer (see below and `AI_SYSTEM.md`) |

## Configuration

See `.env.example`. All game balance lives in `src/config/` and in each
game's `config.ts`.

**XP economy: `src/config/economy.ts`.** Safe to edit any number there:
`baseByDifficulty` (XP per game by difficulty), `gameMultiplier`,
`dailyMultiplier` (Daily vs Unlimited), `performanceBonus`, `perfectBonus`,
`unlimitedTaper` / `unlimitedFloor`, `firstDailyGameBonus`,
`dailySetCompleteBonus`, `streakMilestones`, `punchEarned`, `cardCreated`,
`cardConverted`, and the repair-card rules in `REPAIR_CARDS`. Changes
apply to future awards only; XP already earned stays in the ledger.
Achievement XP is the `xp` field of each entry in `src/config/achievements.ts`.
Rank thresholds are in `src/config/ranks.ts`; ranks are recomputed from XP,
so editing thresholds never changes anyone's XP.

Languages: see `docs/I18N.md`. Daily uniqueness: see `docs/DAILY.md`.

## Local AI assistant (Qwen + MCP), course project

GameHub also contains a separate, **local** AI layer in `ai/`. A local
**Qwen3.5-4B (Q4_K_M)** model answers questions about a player's GameHub data,
such as *"Which game am I best at?"*. It does this by calling tools on a
**GameHub MCP server** that we wrote. The server reads the real GameHub
database over a read-only connection. The AI can read XP but cannot change it;
this is enforced in code and tested. The layer also has cross-session memory
and a benchmark with known answers. None of this is part of the website or the
Vercel deployment.

```bash
ollama pull qwen3.5:4b        # once (Ollama: https://ollama.com). llama.cpp also works, see AI_SYSTEM.md
npm run ai:seed               # once: local demo database with 57 real games played through GameHub's pipeline
npm run ai:check              # model, data and MCP server OK?
npm run ai:demo               # question -> Qwen -> MCP -> data -> answer, plus the XP-protection attacks
npm run ai:ask -- "Which game have I played the most?"
npm run ai:memory-demo        # memory across 3 separate processes, with token cost
npm run ai:benchmark          # 12 tasks x 3 runs, graded automatically
npm run test:ai               # AI tests (no model needed). npm test runs everything
```

| Topic | Document |
|---|---|
| What the AI layer is, how to run Qwen (Ollama or llama.cpp), configuration, security, memory | [AI_SYSTEM.md](AI_SYSTEM.md) |
| MCP server: location, start-up, tools, example call and trace | [MCP.md](MCP.md) |
| Benchmark: tasks, method, results, failure analysis | [BENCHMARK.md](BENCHMARK.md) |
| Evidence per course block, with reproduction commands | [EVIDENCE.md](EVIDENCE.md) |
| AI-use log | [ai_log/](ai_log/README.md) |

## Documentation

Start with `PROJECT_MASTER.md`, then `CURRENT_STATE.md` and `AI_HANDOFF.md`.
Details: `DECISIONS.md`, `FILE_MAP.md`, `docs/`.

Word lists: SCOWL (see `THIRD_PARTY_NOTICES.md`).
"# StarkGameHub" 
"# GameHub" 
"# GameHub" 
