# AI / developer handoff

**Current phase:** 21, production deployment (everything before it is done;
see BUILD_PLAN for the `[~]` and `[ ]` items).

## Read first
`PROJECT_MASTER.md` → `CURRENT_STATE.md` → `DECISIONS.md` → `FILE_MAP.md`.

## Run it
```bash
npm install
npm run dev                  # PGlite in .data/pglite, auto-migrates
npm run check                # lint + typecheck + 87 tests
npm run build && npx playwright install chromium && npm run test:e2e
```
PGlite is single-process: stop `npm run dev` before running
`npm run db:migrate` or `npm run admin:grant` against `.data/pglite`.

## Next tasks (in order)
1. Deploy (docs/DEPLOYMENT.md). Run migrations on Supabase, set env vars on
   Vercel, smoke-test sign-up, a Daily game, admin and the leaderboard
   against real Postgres. Watch for postgres.js type differences (counts
   are cast to `::int` everywhere; timestamps come back as `Date`).
2. Configure Resend and verify password reset end to end.
3. Add a CSP header in `next.config.ts` (fonts are self-hosted via next/font;
   inline styles are used for dynamic board colours, so allow
   `style-src 'self' 'unsafe-inline'`).
4. Add UI E2E for Zip, Patches, Tango (solvable from public data) and run
   axe (`@axe-core/playwright`).
5. Cleanup job for stale Unlimited sessions/puzzles (new migration plus a
   scheduled route).
6. Expand Pinpoint categories; consider OAuth; consider merging guest
   progress when signing in to an existing account.

## Rules that must hold
- Never trust the client: rewards come only from `processCompletion` and the
  other `src/server/*` services.
- Every new reward needs a unique idempotency key (`awardXp`, `card_events`).
- Migrations are append-only (`db/migrations/0002_*.sql`).
- If generator output changes for a seed, bump `generatorVersion`.
- Badges are cosmetic; permissions come only from `user_roles`.

## Changed files this session
Everything under `src/`, `db/`, `scripts/`, `tests/` plus the configs, docs
and `THIRD_PARTY_NOTICES.md` (complete rebuild). See `git log`.

## Tests
87 unit/integration and 10 E2E, all passing at handoff.

## Migrations
`0001_init`.
