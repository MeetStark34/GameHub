# Daily Set: generation, uniqueness and history

Code: `ensureDailySet` and `chooseDailyPuzzle` in `src/server/play.ts`.
Tables: `daily_sets`, `daily_puzzles` (with `fingerprint`, `attempt`, `reused`),
`daily_puzzle_history` (migration `0002_phase22.sql`).

## Rules
- One Daily Set per UTC date, containing exactly one puzzle for each of the
  8 games, at the weekday difficulty (`DAILY_DIFFICULTY_BY_WEEKDAY`).
- The set is created on the first request for that date, stored, and never
  changed. Every player receives the same stored puzzles. Concurrent first
  requests converge on one set via `insert ... on conflict do nothing`.
- Tango's Daily board is always 6×6 (`TANGO_DAILY_CONFIG`); Unlimited Hard
  and Expert stay 8×8.

## Repeat prevention
For each game, candidates are generated from deterministic seeds:
`daily:<date>:<game>`, then `daily:<date>:<game>:1`, `:2`, and so on, up
to `MAX_DAILY_ATTEMPTS` (250). For each candidate:

1. Generate the puzzle.
2. Compute its fingerprint: the engine's `fingerprint()` if it has one,
   otherwise `sha256` of the canonical (sorted-key) puzzle JSON.
   - Werd: `word:<answer>` (an answer never returns, whatever the difficulty).
   - Pinpoint: `category:<id>` (a category never repeats, regardless of clue window).
   - Crossclimb: `ladder:<sorted words>`.
   - Logic games: content hash.
3. If that fingerprint was ever used in a previous Daily Set for this game
   (`daily_puzzle_history`), reject it and try the next seed.
4. The first unused candidate is stored with its fingerprint and attempt
   number, and appended to the history.

Because history only grows and each date is created once, the choice for a
date is deterministic given the history. The same date always returns the
same stored set.

## Exhaustion fallback (no silent repeats)
If all 250 candidates collide (the content pool is used up), the candidate
whose fingerprint was used **longest ago** is chosen, marked
`reused = true` in both tables, and a warning is logged. The admin
dashboard (Daily puzzles tab) shows used vs pool size and reuse counts.

Practical pool sizes: Pinpoint has 177 categories, so it reaches the
fallback after about 177 Daily Sets unless more categories are added (add
rows in `src/games/pinpoint/categories/`). Crossclimb has 380+ clued words
and many possible ladders. Werd has 783–1,041 answers per length. The
logic games are effectively unbounded.

## Tests
`tests/integration/play.test.ts`, "daily set uniqueness and history":
- same date gives the same set;
- 7 consecutive dates give 7 distinct fingerprints for every game;
- a previously used puzzle is rejected and the next deterministic
  candidate is chosen;
- the exhaustion path reuses the least recently used puzzle and flags it;
- Daily Tango is 6×6 on every weekday.
