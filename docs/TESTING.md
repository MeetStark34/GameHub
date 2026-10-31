# Testing

```bash
npm test             # Vitest: unit + integration (≈10 s)
npm run build && npm run test:e2e   # Playwright (≈2 min, needs `npx playwright install chromium` once)
```

## Unit (`src/**/*.test.ts`)
- Every game, every difficulty: generator output matches config,
  uniqueness via solvers (Queens, Sudoku, Tango, Patches), reference
  solution validates, determinism per seed, rejection of wrong, malformed
  and hostile input, secrets hidden from `toClient`.
- `registry.test.ts`: all 8 × 4 generate in < 3 s, JSON round-trip, `act()`
  never throws on junk.
- `progression.test.ts`: rank tiers and thresholds, re-ranking, scoring,
  Daily > Unlimited XP, taper, streak transitions, both repair cases,
  repair window, punch → card → pocket full → convert, achievement criteria
  including weird and event-based ones.

## Integration (`tests/integration/play.test.ts`)
Real Postgres (PGlite in memory, real migrations):
shared and immutable Daily Set, concurrent creation, resume, plausibility
floor, wrong-submit retry, single reward on replay, **4 concurrent solves
→ 1 completion**, cross-user access denied, reset grace and 410 after it,
Normal vs True Player vs Unlimited, punch sources A and B, card cap and
conversion with notifications, chosen-streak repair with idempotent
`requestId`.

## E2E (`tests/e2e/`)
`journey.spec.ts` (desktop, one browser session, serial): landing → solve
Daily Queens through the UI → result panel, XP, mastery, "First Steps"
popup → dashboard streak → guest claims account (progress kept, bootstrap
admin) → admin "Complete Daily Set" → 8/8 and True Player streak →
Unlimited Mini Sudoku via keyboard → Dracula theme persists across pages →
public profile (no email) → leaderboard privacy toggle → non-admin gets 404
on /admin.
`mobile.spec.ts` (Pixel 7): no horizontal overflow on main pages, bottom
nav visible, board cells ≥ 36 px.
`zz-shots.spec.ts`: screenshot helper, skipped unless `SHOTS_DIR` is set.

## Not covered by automated tests
Werd, Pinpoint, Crossclimb, Zip, Patches and Tango are not solved through
the UI in E2E (their engines and server flow are covered in unit and
integration tests). No automated accessibility audit (axe) and no
visual-regression suite. Production Postgres (Supabase) has not been
exercised; only PGlite.
