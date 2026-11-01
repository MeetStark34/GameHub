# Current state

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
