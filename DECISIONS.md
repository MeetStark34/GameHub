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
