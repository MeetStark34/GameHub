# Current state

## Faster navigation and game opening (2026-11-04, D-038 to D-040)
Local production build, 80 ms of added network latency (before -> after):

| | before | after |
|---|---|---|
| Header link click (Dashboard, Daily, ...) | 110-128 ms | 15-33 ms |
| Landing -> Daily | 130-150 ms | 30-35 ms |
| Open a Daily game | ~372 ms | 120-154 ms |
| Open an Unlimited game / change difficulty | ~233 ms | ~97-115 ms |
| First load (FCP, median) | 340 ms | 352 ms (same; 3 font files instead of 5) |

- Header and bottom nav links prefetch fully; the router.refresh() after any
  mutation drops that cache (checked: Daily and Dashboard show a finished
  game right after it). Sign-in, sign-out and account deletion do a full load.
- Play links: hover prefetches the page and its board, a click starts the
  session in parallel with the navigation (PlayIntent).
- zod (30 KB gzipped) no longer ships to game pages; Daily, Dashboard,
  /api/me/summary and sign-in no longer load the game engines and word lists
  on a cold start.
- Sounds no longer block the main thread (offline-rendered WAV via <audio>).
- English pages no longer embed the dictionary twice (HTML 18.5 -> 9.0 KB gz).
- Cold starts: `npm run ops:keep-warm` (D-041) schedules a 5-minute ping from
  Supabase. Prepared but NOT applied yet: it needs the owner to run it.
- Live (2026-11-04, real network from Paris edge): header clicks 18-37 ms
  (were 120-344), opening a Daily game 146-166 ms (was 744), finishing a
  game 332-354 ms (unchanged; ~37 sequential queries in the completion
  transaction are the remaining cost).
- Gates: lint, typecheck, 219 unit/integration, 19 E2E, build: all passing.

## Hung pages fixed (2026-11-04, D-037)
On the live site, signed-in pages with many parallel reads (Dashboard, Daily,
`/api/me/summary`, reliably right after a Daily game) never finished:
postgres.js pipelined queries on busy connections and Supavisor's transaction
mode left backends waiting on `ClientRead`. `max_pipeline: 1` and a default
pool of 10 fix it; reproduced and verified against the live pooler, and
`npm run test:live` has a regression test.

## Performance on Vercel (2026-11-04)
Live site before the fix (`stark-game-hub.vercel.app`): functions ran in
`iad1` (Washington) while the database is in `eu-west-1` (Ireland), so every
query crossed the Atlantic. `/api/health` (one `select 1`) took 1.5 s cold and
350-450 ms warm. See D-034, D-035, D-036.

Measured on a production build with simulated per-query latency (75 ms is
iad1 to Ireland, as deployed before; 2 ms is dub1 to the pooler, as now
configured):

| | 75 ms before | 75 ms after | 2 ms after |
|---|---|---|---|
| Finish a game (last move to result) | 4.9-6.9 s | 2.8-3.0 s | 0.14-0.20 s |
| Reopen a game | 645-734 ms | 377-394 ms | 79-120 ms |
| Dashboard | 519-534 ms | 289-330 ms | 58-68 ms |
| Header navigation | 316-327 ms | 277-294 ms | 33-53 ms |

- `vercel.json` pins functions to `dub1`; PGlite is excluded from Vercel
  function traces (22.8 MB to 2.5 MB per function).
- Route `loading.tsx` files removed: React held each skeleton for at least
  300 ms. Links show a pending hint after 150 ms instead.
- Sounds and toasts wait for the result to paint (AudioContext creation
  blocked the main thread for up to 2 s).
- Fewer sequential round trips (same harness as the 2026-11-02 audit):
  solving a Daily game about 37 instead of 62; a new Unlimited puzzle 2
  instead of 8; opening a Daily game 3 instead of 5, and 1 when resuming.
- After deploying, check the `x-vercel-id` header reads `...::dub1::...`.
- Not changed: prefetches still render each linked page's root layout (about
  one query each for signed-in players); the first request of a UTC day still
  builds the Daily Set in about 30 sequential queries.

## Performance audit (2026-11-02)
Measured on a production build against Postgres 16 with a simulated 30 ms
database round trip (Vercel to Supabase pooler):
- Dashboard TTFB 440 ms -> 115 ms; `/api/me/summary` 490 ms -> 70 ms;
  `/daily` 430 ms -> 120 ms; `/play/*` 245 ms -> 90 ms.
- Dashboard database queries 19 -> 16, sequential round trips about 13 -> 3.
- Fixes: `getPlayerSummary` and `getPublicProfile` issue independent reads
  with `Promise.all`; the root layout loads header data concurrently; one
  request-memoised preferences query (`requestPreferences`) serves both
  locale and theme; `loadStreaks` reads both streaks in one query.
  Rendered HTML and API JSON were byte-identical before and after.
- Not changed: Link prefetches on the Dashboard (~30 requests, ~2 queries
  each for visitors without a `gh-locale` cookie, from `generateMetadata`)
  and the client JS (~168 KB gzip, mostly React/Next framework).

## Streak UX + admin player tools (2026-11-01)
- Header shows both streaks (flame/orange "Streak" and crown/gold "True
  Player") with an explainer popover; verified at 360px to desktop.
- Developer account: no streak protection; it keeps 365/240 until the
  normal rules change them. Showcase re-runs never touch existing streaks.
- Admin: custom XP add/remove, custom Normal/True Player adjustment, XP
  freeze, account deletion with confirmation; controls grouped into Player
  progression / Account / Roles & badges. Every action audited.
- Migration 0005 applied to Supabase. Gates: lint, typecheck,
  138 unit/integration, 5 live, 19 E2E, build: all passing.

## Repair (2026-11-01): Supabase gameplay fixed
- Root cause of `puzzle.waypoints is not iterable`: postgres.js double-encoded
  every jsonb write (puzzles, session state, results, notifications) on
  Supabase. Fixed in the driver config, repaired in place by migration 0003,
  and guarded by server-side puzzle schemas (D-026).
- Supabase migrations applied: 0001–0004 (0004 locks down `schema_migrations`).
- Verified on Supabase (`npm run test:live`, rolled back): all 8 games in
  Daily and in Unlimited at all 4 difficulties, XP, streaks, True Player,
  idempotency, bootstrap admin, showcase, leaderboard exclusion.
- `starkmeet@gmail.com` has no account yet. Signing up with that email
  (server env `GAMEHUB_BOOTSTRAP_ADMINS`) grants admin and the Developer
  badge. With handle `mstark`, the Legend showcase and leaderboard exclusion
  are applied automatically.
- Any dev server started before this fix must be restarted: it keeps the old
  database client in memory.
- Gates: lint, typecheck, 126 unit/integration, 3 live, 16 E2E, build: all passing.

---

# State after Phase 22 (2026-10-31)

## Summary
GameHub runs completely locally: 8 games × Daily/Unlimited × 4
difficulties, the full server-side progression system, 4 interface
languages, and an admin/developer dashboard. **It is not deployed**, and the
Supabase database has not been connected (the password supplied was rejected
by Supabase; see AI_HANDOFF).

## Verified at handoff
- `npm run lint`: clean · `npm run typecheck`: clean · `npm run build`: passes, no warnings
- `npm test`: **114/114** (13 files: 8 game suites, registry, progression, i18n, 2 integration files on real Postgres via PGlite)
- `npm run test:e2e`: **13 passed** (desktop journey, language, Pixel 7 mobile) plus one on-demand screenshot spec (skipped)
- Screenshot review: Crossclimb, Pinpoint, Rank Roadmap, Hindi landing, mobile

## Phase 22 delivered
1. **Languages**: EN (default) / FR / HI / RU via a central dictionary
   (`src/i18n`). Header and Settings selectors; choice saved to cookie and
   account; browser language as first-visit fallback. Covers navigation,
   every player page, game rules, board labels, engine feedback, API errors,
   toasts, stored notifications, achievements and footer.
2. **Crossclimb rebuilt**: clued rungs shown scrambled → solve → reorder into
   a one-letter ladder (ordering unique by construction) → unlocks clued top
   and bottom words. 380+ original clues. Difficulty = rung count and hints.
3. **Pinpoint rebuilt**: free-text category guessing with alias, plural and
   typo tolerance; wrong guesses reveal clues; multiple-choice assist only
   after the clues run out (score cost). 177 categories (from 62) in family
   files.
4. **Daily Tango is 6×6** (Unlimited keeps 8×8 for Hard and Expert).
5. **Daily uniqueness**: fingerprints plus `daily_puzzle_history`; repeats
   are rejected deterministically, with a flagged least-recently-used
   fallback (docs/DAILY.md).
6. **Reset ticker on the Dashboard only** (`src/app/dashboard/layout.tsx`).
7. **Footer credit** "Made with 💙 Love by MStark", linked to `/u/mstark`
   (configured in `src/config/site.ts`).
8. **Header controls**: rank (links to `/ranks`), streak, Themes popover
   (all 11 themes), Language popover.
9–11. **Mr. Stark developer profile**: an admin action applies the showcase
   (Developer badge, Legend XP through the ledger, high streaks and mastery,
   all achievements) to the configured account only. `leaderboard_excluded`
   removes it from every public board at query level.
12. **Rank Roadmap page** `/ranks`.
13. **XP economy file**: `src/config/economy.ts` (see README).
14. **Developer dashboard** `/admin`, with tabs: Overview, Daily puzzles,
   Activity & suspicious, Users & dev tools, System & audit.

## Incomplete or unverified
1. **Supabase not connected**: the supplied password failed authentication
   (`28P01`). No migrations have been applied remotely, and the postgres.js
   path is untested live.
2. **Mr. Stark account does not exist yet.** Sign up as handle `mstark`, then
   apply the showcase from /admin → Users & dev tools (see AI_HANDOFF).
   The brief asked for both "Elite" (item 9) and "Legend-level" (item 10);
   the default is Legend (1,000,000 XP), and `targetXp: 60_000` gives Elite.
3. Word-game content (Werd, Crossclimb, Pinpoint) is English-only by design;
   the admin dashboard is English-only.
4. Pinpoint Daily falls back to reuse after ~177 days unless categories are added.
5. Not deployed; no OAuth; reset email needs Resend; no CSP; no axe audit;
   E2E solves only Queens and Mini Sudoku through the UI. The new Crossclimb
   and Pinpoint flows are covered by unit, integration and visual checks,
   not by a full UI solve.
6. Local dev databases created before Phase 22 contain old-format Crossclimb
   and Pinpoint sessions; delete `.data/pglite` to start fresh. Production
   has no data yet.

## Known bugs
None known.

## Migrations
`0001_init` … `0005_xp_freeze` (all applied to Supabase).
