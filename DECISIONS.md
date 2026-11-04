# Decisions

Decisions that shape the codebase. Change one only deliberately, and record
the change here.

## D-001 Rebuild instead of extending the Phase 01 scaffold (2026-10-31)
The two earlier commits contained a static UI with hard-coded sample stats,
no database, no games and no tests of real behaviour. The working tree had
already deleted those files. The rebuild kept the product decisions recorded
in `speifcation.txt` (now only in git history: `git show cbab8e8:speifcation.txt`) (ranks, themes, streak rules, punch sources) and the
theme palettes, and replaced the rest. Old work stays recoverable in git
(`cbab8e8`).

## D-002 Raw SQL on Postgres, two drivers
Production runs on Supabase Postgres via `DATABASE_URL` using `postgres.js`
(`prepare: false` for the transaction pooler). Local dev and all tests use
**PGlite**, real Postgres compiled to WASM, so migrations, constraints,
partial unique indexes, row locks and transactions are exercised without
Docker. No ORM: queries are plain SQL in `src/server/*`.

## D-003 First-party auth, not Supabase Auth
Sessions are random 32-byte tokens in an httpOnly cookie, stored as SHA-256
hashes in `auth_sessions`. Passwords use scrypt (N=16384). Reasons: it works
and is testable with no external service, it supports **guest accounts**
that upgrade in place on sign-up (progress kept), and there is a single
identity table. Trade-offs: no OAuth yet, and password-reset email needs
`RESEND_API_KEY`.

## D-004 Guests play immediately
The first game creates a guest user and session cookie. Guests earn real,
server-validated progress, but are hidden from leaderboards and public
profiles. Signing up converts the guest account. **Signing in to an existing
account from a guest browser abandons the guest's progress**; there is no
merge (documented limitation).

## D-005 Engines are pure; the server owns time and persistence
`GameEngine` = `generate(rng, difficulty)`, `initialState`, `toClient`,
`act(puzzle, state, action)`, `penalty`, optional `highlights`. Engines never
read the clock, DB or network. All randomness comes from a seeded RNG, so a
seed reproduces a puzzle exactly. Every player action, including logic-game
submissions, goes through `act` on the server.

## D-006 Validation is rule-based; uniqueness where it matters
Queens, Mini Sudoku, Tango and Patches are generated with a **unique**
solution, verified by solvers during generation. Zip accepts any path that
satisfies the rules. Crossclimb accepts any valid ladder of the given length,
and generated pairs have no shorter route even through rare dictionary
words. Werd and Pinpoint answers never leave the server: guesses are
evaluated by the server and the history is stored there.

## D-007 Pinpoint is multiple choice
Free-text category guessing is fuzzy, and with no fail state a player could
get stuck forever. GameHub Pinpoint shows clues one at a time and offers 4–8
category options. A wrong pick rules that option out and reveals a clue, so
the game always ends, and score reflects clues used and wrong picks.

## D-008 Werd has no guess limit
To honour the no-fail rule, Werd allows unlimited guesses, and score drops
after par (6). Guesses must be dictionary words. Expert uses strict mode
(revealed letters must be reused).

## D-009 Daily difficulty rotates by UTC weekday
Each Daily Set uses one difficulty: Mon Easy, Tue–Thu Normal, Fri–Sat Hard,
Sun Expert (`DAILY_DIFFICULTY_BY_WEEKDAY`). Players choose difficulty freely
in Unlimited.

## D-010 Daily retries and the reset grace period
A Daily game has one session per player; reopening resumes it. Wrong
submissions are free retries with a small score penalty. A Daily session can
be finished up to `DAILY_GRACE_MINUTES` (10) after 00:00 UTC and counts for
its original date. After that the server returns 410.

## D-011 Streak breaks are detected lazily
No midnight job. Streak state holds `current`, `best`, `last_date` and the
lost streak (`lost_value`, `lost_last_date`). Status (`active`, `at-risk`,
`broken`) is computed from dates at read time. A repair card bridges the
gap: missed days are not counted, but the old length is restored (and joined
with any new streak). Repairs are allowed while the first missed day is
within `repairWindowDays` (7).

## D-012 Punch source A pays once per day; converted cards are not "earned"
"Complete 20 total games in one UTC day" awards one punch per UTC day.
`cards_earned` counts only cards that entered the pocket; conversions are
counted separately in `cards_converted`.

## D-013 Achievement list adjustments
The brief gave **Hoarder** and **Full Pocket** the same requirement (hold
three cards). Full Pocket keeps that requirement; Hoarder became "earn five
Gold Repair Cards over your lifetime" so the two are distinct. **Chaos**
("complete all eight Daily games in randomized order") is implemented as
"completion order differs from the listed order". **Time Traveler** is
"complete games in 12 different UTC hours of one day". All three are
configurable in `src/config/achievements.ts`.

## D-014 Overall mastery = rank of the average mastery XP
Mastery uses its own ladder (`MASTERY_RANKS`, Legend at 37,500 per game).
Overall mastery is the rank of the mean of the eight per-game XP values.

## D-015 Anti-cheat is proportionate
Server-measured duration only. Solves faster than a per-game, per-difficulty
floor (`minSeconds`, 1–10 s) are refused without failing the game. Unlimited
starts are limited to 30 per minute, and Unlimited XP tapers after 40/80
games a day (never below 3 XP). Leaderboards read only server-recorded
completions. No client-reported score exists anywhere.

## D-016 Leaderboard tie-breaks
Value first, then earlier account creation, then user id. Average-time
boards require at least 3 completions.

## D-017 Themes via `data-theme` and CSS variables
All colour comes from tokens in `globals.css` mapped to Tailwind colours.
Puzzle region colours are `color-mix`ed with each theme's surface, so they
suit every palette. The theme is resolved server-side (account preference,
then cookie), so there's no flash; "System Default" follows
`prefers-color-scheme`.

## D-018 Admin bootstrap via environment
`GAMEHUB_BOOTSTRAP_ADMINS` (operator-set, server-only) grants `admin` to
listed emails on sign-up or sign-in, and is audited. `npm run admin:grant`
and `/admin` manage roles afterwards.

## D-019 Word lists baked into the repo
SCOWL lists (via `wordlist-english`) are filtered by
`scripts/build-wordlists.mjs` into `src/games/words/data/*.json`: answers
from frequency tiers 10–20 with simple inflections removed, guesses from
tiers up to 70. Committing them keeps generation reproducible.

## D-020 First-party i18n, keys over the wire (Phase 22)
A small typed translator (`src/i18n`) instead of a library: dictionaries
are plain TS objects with English as the typed source of truth and
fallback. The server sends translatable messages as `{ key, params }`
(engine feedback, errors, notifications), so stored notifications render
in the player's current language. Word-game content stays English.

## D-021 Crossclimb follows the clue-ladder concept (supersedes part of D-006)
Middle rungs are clued and scrambled; the player orders them, then solves
the clued ends. Ladders are generated only from clued words and rejected if
any two non-neighbours are one letter apart, so the correct order is unique
up to reversal (a reversed ladder is accepted, with the ends swapped).
Answers are validated against the intended word for each clue.

## D-022 Pinpoint is free text with a late assist (supersedes D-007)
Players type the category, matched against label + aliases with
normalisation and an OSA edit-distance tolerance. Aliases must never
collide across categories (tested). To keep the no-fail rule, a
multiple-choice assist unlocks after the last clue (after 3 on Easy) at a
score cost.

## D-023 Daily uniqueness via fingerprint history
See docs/DAILY.md. Deterministic candidate seeds; rejection against
`daily_puzzle_history`; when exhausted, reuse the least recently used and
flag it, never a silent repeat.

## D-024 Developer showcase is data, not a special case in the rules
The showcase writes real rows (ledger XP, streaks, mastery, unlocks with
xp = 0) for the account named in `DEVELOPER.handle` only, and sets
`leaderboard_excluded`. Rank is still computed from XP. The brief asked for
both Elite and Legend; the default is Legend, configurable via `targetXp`.

## D-025 Reset ticker is a Dashboard route layout
`src/app/dashboard/layout.tsx` renders it, so no other page can show it.

## D-026 JSON parameters are JSON text on every driver (repair, 2026-11-01)
All json/jsonb parameters are passed as `JSON.stringify(x)` with a `::jsonb`
cast. postgres.js's default jsonb serializer JSON-encodes again, which stored
every puzzle, state, result and notification on Supabase as a JSON string
(root cause of `puzzle.waypoints is not iterable`). `postgresClientOptions`
in `src/lib/db/index.ts` overrides the json/jsonb serializer to send strings
as-is. Migration 0003 repaired existing rows in place. Server-side runtime
schemas (`src/games/client-schemas.ts`) validate every puzzle before it
reaches a board; a malformed row returns `errors.puzzleCorrupt` instead of
crashing the client. No silent fallbacks.

## D-027 Bootstrap admins also get the Developer badge; showcase on first grant
`GAMEHUB_BOOTSTRAP_ADMINS` (server env only) grants the `admin` role and the
cosmetic `developer` badge on sign-up/sign-in. If that account's handle is
`DEVELOPER.handle` (mstark), the developer showcase and leaderboard exclusion
are applied once, when the role is first granted, so later sign-ins never
overwrite real progress. Permissions still come only from `user_roles`.

## D-028 Live database verification runs in a rolled-back transaction
`npm run test:live` drives the real services through postgres.js against
DATABASE_URL inside one transaction that is always rolled back (savepoints
for nested transactions), so Supabase-specific behaviour is verified without
leaving data behind. E2E always runs on an isolated PGlite database:
`playwright.config.ts` pins `DATABASE_URL` to empty so `.env.local` is
never used by tests.

## D-029 schema_migrations is locked down like every other table
The runner-created `schema_migrations` table was exposed to Supabase's
anon/authenticated roles; migration 0004 enables RLS and revokes access.

## D-030 Developer streaks get no protection
The developer account follows the normal streak rules. The showcase seeds a
streak only while its lifetime best is below the showcase value, so it is
applied once; re-running it never refreshes, repairs or protects streaks.

## D-031 XP freeze is enforced at the single XP gate
`user_stats.xp_frozen` (migration 0005) is a role-independent progression
setting. `awardXp` checks it: gameplay awards are written to the ledger as
0 under `frozen:<reason>` (the idempotency key is spent, so nothing is
paid retroactively after unfreezing) and report no XP. Manual admin
adjustments and the showcase pass `bypassFreeze`. Completions, stats,
streaks, mastery and achievements still count; rank follows the frozen
total. Notifications and result toasts carry no XP while frozen.

## D-032 Manual admin adjustments
XP: `adjust-xp`, a whole non-zero amount up to ±1,000,000, through the
ledger (reason `admin`, key `admin-xp:<requestId>` so retries apply once).
A removal that would take the total below 0 is refused rather than clamped,
so the ledger always sums to the total. Streaks: `adjust-streak` changes the
value players see today (`adjustStreak` in src/lib/progression/streaks.ts).
A live streak keeps its due date; a broken streak restarts live and due
today, with the lapsed value repairable as on a natural fresh start; 0
clears it; `best` never decreases. Each change writes its own audit row
(before/after/amount/reason) inside its transaction.

## D-033 Admin account deletion is a hard delete with guards
Admins delete accounts without the target's password through the same
`purgeUser` as self-deletion: every per-player table cascades from
`users`; shared Daily puzzles and sets are kept; Unlimited puzzles are
removed. The audit row is written first with a minimal snapshot (id, handle,
display name, roles, XP; no email), then the FK nulls its target. Guards:
retype the handle, never yourself, never `DEVELOPER.handle`, never the last
admin. Soft-delete was rejected: the schema has no "deleted" state, and
every query would need to learn to skip it.

## D-034 Functions run in the database's region (2026-11-04)
`vercel.json` pins functions to `dub1` (Dublin, AWS eu-west-1), the region
of the Supabase pooler. Vercel's default, `iad1` (Washington, D.C.), put an
Atlantic round trip (~75 ms) on every query; the live site measured 350-450
ms for a single `select 1` (`/api/health`) and about 5 s to finish a Daily
game. If the database moves, move `regions` with it. Verify on a deployment
with the `x-vercel-id` response header (`<edge>::dub1::<id>`). On Vercel
builds (`VERCEL` set) PGlite is excluded from function traces: 2.5 MB per
function instead of 22.8 MB.

## D-035 No route `loading.tsx`; links show a delayed pending hint
React keeps a Suspense fallback on screen for at least 300 ms
(`FALLBACK_THROTTLE_MS` in the React build Next ships), so a `loading.tsx`
skeleton made every navigation take 300 ms or more even when the server
answered in 40 ms. Navigations instead keep the current page and show
`LinkPending` (`useLinkStatus`) on the clicked link, which only appears after
150 ms. Board chunks load in an effect rather than through `next/dynamic` for
the same reason. Sounds and reward toasts start after the result has painted:
the first sound creates the AudioContext, which blocks the main thread
(measured up to 2 s on Windows).

## D-036 Hot paths count round trips
Every query costs one network round trip, so independent queries are issued
together: inside a transaction `Promise.all` pipelines them on its connection
(postgres.js and PGlite both execute them in the order issued); outside one
they run in parallel, so only reads are grouped there. `processCompletion`
passes the XP-freeze flag from its row-locked `user_stats` read to the reward
helpers instead of re-reading it per award. A new Unlimited puzzle and its
session are one `insert ... with` statement. `actOnSession` locks and reads
the session in one statement and replays a completed session with a fresh
read (a request that waited on the lock cannot see the committed completion
through the first statement's join).

## D-037 postgres.js never pipelines outside a transaction (2026-11-04)
`postgresClientOptions.max_pipeline = 1`. When every pooled connection was
busy, postgres.js 4 queued further queries on a busy connection (pipelining,
up to 100). Through Supavisor's transaction mode (port 6543) part of such a
pipeline can reach a different server connection, so a backend waits for the
client forever (`pg_stat_activity`: state `active`, wait `ClientRead`) and the
request never finishes. On the live site this hung every signed-in page with
more parallel reads than connections, e.g. the Dashboard, Daily and
`/api/me/summary` right after a Daily game (D-036 added those parallel reads),
and a stuck connection kept hanging later requests on the same instance.
Reproduced against the live pooler (12 parallel `select`s on a pool of 3: hung
in the first round with the default, 50 rounds clean with `max_pipeline: 1`);
`npm run test:live` keeps a regression test. Queries inside `sql.begin` still
pipeline on their own connection: the pooler keeps one server connection for
the whole transaction (verified the same way). The default pool is now 10
connections (`DB_POOL_MAX`), so a request's parallel reads still run at once.

## D-038 Header links are fully prefetched; sign-in and sign-out reload (2026-11-04)
Every page is dynamic (the root layout reads cookies), and without
`loading.js` Next.js's default prefetch fetched nothing usable, so each click
on a header link waited a full server round trip (110-130 ms locally with 80
ms of added latency, 120-350 ms on the live site). The main navigation (header
and bottom nav links, the logo, the result panel's Daily/Dashboard buttons and
the landing page's two calls to action) now uses `prefetch` (full): those
clicks render from the client cache in 15-35 ms. This is safe because
`router.refresh()` drops the whole client cache (Next 16 bumps the segment
cache version and re-prefetches visible links), and every mutation already
calls it: finishing a game, a guest's first start, settings, language,
notifications, streak repair, the midnight reset ticker. Prefetched entries
otherwise live for `staleTimes.static` (5 min). Signing in, signing out and
deleting the account use a full page load instead of `router.push` +
`refresh`, which would first show pages prefetched for the previous identity
(and keep the previous theme and sound settings). Footer links no longer
prefetch: on dynamic routes that only cost a server render the browser
aborted.

## D-039 Opening a game: one round trip, started on click (2026-11-04)
Play links do not prefetch on render (a /daily view would render eight game
pages). `PlayIntent` (root layout) listens on the document instead: hover,
touch or focus on any `/play/...` link prefetches that page and its board
chunk; a plain left click (not a new-tab click) also sends
`POST /api/play/start` at once, in parallel with the navigation, and
`PlayClient` picks the response up (`takeEarlyStart`, 15 s TTL, each used
once). Starting on click rather than on hover matters: creating a Daily
session starts its timer. Early starts run one after another, so a first-time
visitor's second click carries the guest cookie from the first. The page and
the early start parse a URL with the same `playTarget`. Opening a Daily game
went from ~372 ms to 120-150 ms, an Unlimited one from ~233 ms to ~97 ms
(local build, 80 ms added latency).

## D-040 Lighter modules on hot paths (2026-11-04)
- Boards import game logic in the browser; the logic now imports `games/core`
  (msg, Cell, ORTHO, inBounds) instead of `games/shared`, which needs zod:
  30 KB gzipped of zod left the game pages.
- `dailyDifficultyFor` lives in `config/games`, `PlayError` in
  `server/errors`, `audit` in `server/audit` (each re-exported from its old
  module). The Daily and Dashboard pages, `/api/me/summary`, sign-in and
  sign-up no longer load the game engines and word lists on a cold start
  (Daily 1009 KB -> 613 KB of server code, sign-in 790 KB -> 348 KB).
- Fonts preload only their Latin files (5 -> 3 files on a first visit);
  `subsets` only controls preloading, so Cyrillic glyphs still load on demand.
- Sounds are rendered once with an OfflineAudioContext into WAV blobs and
  played through `<audio>`: creating a realtime AudioContext blocked the main
  thread 67 ms (Chrome) to 174 ms (Edge) on Windows, right as a result or
  reward appeared; the new path blocks it for 0 ms (the first sound may start
  up to ~0.3 s later).
- English pages no longer embed the English dictionary in their RSC payload:
  the client bundles it as the fallback already (English HTML 78.6 -> 48.7 KB,
  18.5 -> 9.0 KB gzipped). Other languages still receive theirs.

## D-041 Keep-warm ping from Supabase (2026-11-04, prepared, not applied)
Measured on the live site: an instance idle for 7 minutes was still warm; after
10-15 minutes the first request paid a cold start (+0.4-0.7 s, up to 2 s for
a full first visit). `scripts/keep-warm.sql` schedules a pg_cron job that has
pg_net GET `/api/health` and four anonymous pages every 5 minutes, from the
database's region, so one instance of each function group stays warm (about
43k requests a month, far inside Hobby limits; anonymous pages touch no
account). It is idempotent and removable (`select
cron.unschedule('gamehub-keep-warm')`). Apply with `npm run ops:keep-warm`
(needs DATABASE_URL in .env.local) or paste the file into the Supabase SQL
editor.
