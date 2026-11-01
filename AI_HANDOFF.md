# AI / developer handoff

**Current phase:** 22 complete. Next is Phase 21, production deployment.

## Read first
`PROJECT_MASTER.md` → `CURRENT_STATE.md` → `DECISIONS.md` → `FILE_MAP.md`,
then `docs/DAILY.md` and `docs/I18N.md` for the Phase 22 systems.

## Where things live
| Topic | Location |
|---|---|
| XP economy | `src/config/economy.ts` |
| Rank thresholds (player + mastery) | `src/config/ranks.ts` |
| Achievements | `src/config/achievements.ts` (+ translations in `src/i18n/messages/*.ts` → `achievements.items`) |
| Translations | `src/i18n/config.ts`, `src/i18n/messages/{en,fr,hi,ru}.ts` |
| Daily generation and uniqueness | `src/server/play.ts` (`ensureDailySet`, `chooseDailyPuzzle`, `puzzleFingerprint`) |
| Daily history | table `daily_puzzle_history` + `daily_puzzles.fingerprint` (`db/migrations/0002_phase22.sql`) |
| Crossclimb | `src/games/crossclimb/` (clues in `clues.ts`), board `src/components/play/boards/crossclimb-board.tsx` |
| Pinpoint | `src/games/pinpoint/` (categories in `categories/*.ts`), board `.../pinpoint-board.tsx` |
| Tango | `src/games/tango/` (`TANGO_DAILY_CONFIG` = 6×6 Daily) |
| Developer profile | `src/config/site.ts` (`DEVELOPER`), `src/server/developer.ts` |
| Admin authorization | `user_roles` table; `src/server/auth.ts` (`isAdmin`), `src/server/bootstrap.ts`, `npm run admin:grant` |
| Admin dashboard | `src/app/admin/page.tsx`, `src/server/admin-dashboard.ts`, `src/server/admin.ts` |
| Supabase env | `.env.local` (git-ignored), template `.env.example`, `src/lib/db/index.ts` |

## Repair notes (2026-11-01)
- Supabase is connected (`.env.local`, git-ignored). `npm run db:migrate:env`
  applies migrations, `npm run db:inspect` checks state read-only, and
  `npm run test:live` verifies the full pipeline against Supabase inside a
  rolled-back transaction.
- jsonb params must stay `JSON.stringify(x)` + `::jsonb` (D-026). Don't pass
  raw objects to `db.query` for jsonb columns.
- E2E never uses `.env.local` (DATABASE_URL pinned empty in playwright.config.ts).

## Streak + admin notes (2026-11-01)
- All XP goes through `awardXp`; pass `bypassFreeze` only for deliberate
  admin grants. Never write `user_stats.total_xp` directly.
- Manual streak changes go through `adjustStreak`; never write
  `streaks.last_date` by hand.
- Admin deletion: `purgeUser`; new per-user tables need
  `on delete cascade` from users.

## Next tasks
1. **Supabase**: reset the database password (Project Settings → Database),
   put it in `.env.local` as `DATABASE_URL` (direct connection, port 5432),
   run `npm run db:migrate`. For Vercel use the transaction pooler URL
   (port 6543). The publishable key is not needed: the browser never talks
   to Supabase.
2. **Mr. Stark**: set `GAMEHUB_BOOTSTRAP_ADMINS=<your email>`, sign up with
   handle `mstark`, open `/admin?tab=users`, and press "Apply developer
   showcase". This needs the admin role; the Developer badge alone grants
   nothing.
3. Deploy (docs/DEPLOYMENT.md), configure Resend, add a CSP.
4. Expand Pinpoint categories (Daily pool) and the Crossclimb clue bank.
5. UI E2E for Crossclimb and Pinpoint full solves; axe audit.

## Rules that must hold
- Rewards only through server services; every reward has an idempotency key.
- Migrations are append-only. Bump `generatorVersion` when a seed's output changes.
- New UI text goes in `src/i18n/messages/en.ts` plus the three translations;
  `i18n.test.ts` enforces completeness.
- Badges are cosmetic; permissions come only from `user_roles`.
- Leaderboard exclusion is the `users.leaderboard_excluded` column, checked
  in `getLeaderboard`.

## Tests
138 unit/integration, 5 live (opt-in), 19 E2E, all passing.
