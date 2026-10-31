# File map

```
db/migrations/0001_init.sql      Schema (append-only). Applied by lib/db migrate() or scripts/migrate.ts
scripts/
  migrate.ts                     npm run db:migrate (Postgres via DATABASE_URL, else local PGlite)
  grant-role.ts                  npm run admin:grant -- <email> [admin|moderator] [--revoke]
  build-wordlists.mjs            Regenerates src/games/words/data from wordlist-english
src/
  config/                        ALL tunable values (client-safe)
    games.ts                     names, rules copy, par/min seconds, daily difficulty rotation
    economy.ts                   XP economy, repair-card rules, daily grace period
    ranks.ts                     player + mastery rank ladders
    achievements.ts              achievement definitions + criterion types
    themes.ts                    the 11 themes (tokens are in app/globals.css)
  games/                         Pure, deterministic engines (no DB, no clock)
    types.ts                     GameEngine contract, ids, difficulties
    shared.ts                    submit-style act() helper, grid utils
    registry.ts                  server-only map id -> engine
    words/dictionary.ts          server-only word lists + ladder graphs
    <game>/types.ts|config.ts|logic.ts|generator.ts|engine.ts|<game>.test.ts
  lib/
    rng.ts                       seeded PRNG (all generation uses it)
    time.ts                      UTC date helpers
    contracts.ts                 shared API shapes (SessionView, CompletionResult, RewardEvent)
    db/index.ts                  Db interface, postgres.js + PGlite drivers, migrate(), getDb()
    progression/                 pure rules: ranks, score, xp, streaks, cards, achievements
    sound.ts                     Web Audio synthesized sounds (client)
  server/                        server-only services (all take a Db/tx handle)
    play.ts                      Daily Set creation, sessions, actOnSession -> processCompletion
    progress.ts                  awardXp, streak advance, grantPunch, achievement evaluation, notify
    streaks.ts                   useRepairCard
    queries.ts                   dashboard summary, achievements view, profile, leaderboards, notifications
    users.ts                     passwords, sessions, guests, sign-up/login, resets, rate limit
    auth.ts                      cookie <-> user for the current request, role checks
    account.ts                   settings, export, delete
    admin.ts                     admin/dev actions + audit log
    bootstrap.ts                 GAMEHUB_BOOTSTRAP_ADMINS
    http.ts                      route() wrapper: CSRF, JSON, errors
    email.ts, request.ts, solutions.ts
  app/                           Next.js App Router pages + api/ route handlers
  components/
    providers.tsx                theme / sound / toast context, achievement popup
    layout/                      reset ticker, header, nav, bottom nav, footer
    play/play-client.tsx         session lifecycle, timer, results; loads boards dynamically
    play/boards/*-board.tsx      one UI per game (pointer, touch, keyboard)
    dashboard/, settings/, admin/, game-card.tsx, brand.tsx, ui.tsx
tests/
  helpers.ts                     in-memory PGlite + winning actions
  integration/play.test.ts       full reward pipeline on real Postgres
  e2e/*.spec.ts                  Playwright journeys (needs `npm run build`)
```

## Key flows

**Play**: `PlayClient` → `POST /api/play/start` → `startSession` (Daily:
`ensureDailySet` + one session per user/date/game; Unlimited: new seeded
puzzle) → board calls `act()` → `POST /api/play/[id]/act` →
`actOnSession` (row lock → `engine.act` → plausibility floor) →
`processCompletion` in the same transaction → `CompletionResult` (stored and
replayed for retries).

**processCompletion**: score → `daily_activity` upsert → completion XP
(ledger key `completion:<session>`) → mastery → user_stats counters →
Daily: first-game bonus + Normal Streak, 8/8 bonus + True Player Streak +
punch source B → punch source A at 20 games → achievements (2 passes) →
level-up / mastery-up notices → insert `completions`.

**Adding a game rule change**: edit `src/games/<id>/*`, bump
`generatorVersion` if output for a seed changes, and update its test.
Stored puzzles never change.
