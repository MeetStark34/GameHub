# Database

Schema: `db/migrations/0001_init.sql` (append-only; add `0002_*.sql` for
changes). Applied by `migrate()` (automatic for PGlite, or with
`DB_AUTO_MIGRATE=1`) or by `npm run db:migrate`. Applied versions are in
`schema_migrations`.

| Table | Purpose | Key invariants |
|---|---|---|
| `users` | Accounts and guests | handle unique `^[a-z0-9_-]{3,24}$`; email unique (case-insensitive); members must have email and password hash |
| `auth_sessions` | Session token hashes | cascade on user delete |
| `password_resets` | Hashed one-hour reset tokens | single use (`used_at`) |
| `user_roles` | **Authorization** (`admin`, `moderator`) | only source of permissions |
| `user_badges` | Cosmetic badges | never used for auth |
| `preferences` | Theme, sound | |
| `puzzles` | Generated puzzle + solution | Daily: unique `(seed, game, difficulty)` |
| `daily_sets`, `daily_puzzles` | Immutable set per UTC date | PK `(utc_date, game)` |
| `game_sessions` | One play-through; server state | Daily: unique `(user, daily_date, game)` |
| `completions` | Finished games + stored result | unique `session_id`; Daily: unique `(user, daily_date, game)` |
| `xp_ledger` | Every XP change | unique `(user_id, idempotency_key)` |
| `user_stats` | Cached totals and counters | `cards_held` 0–3, `punch_progress` 0–9 |
| `mastery` | Per-game XP and bests | PK `(user, game)` |
| `daily_activity` | Per-UTC-day volume, Daily progress, hour mask | PK `(user, utc_date)` |
| `streaks` | normal / true_player state | PK `(user, kind)` |
| `card_events` | Punch / card audit trail | unique `(user_id, idempotency_key)` |
| `achievement_unlocks` | Unlocks | PK `(user, achievement_id)` |
| `notifications` | In-app notifications | |
| `admin_audit_log` | Every admin action | |
| `rate_limits` | Fixed-window counters | |

UTC dates are `text` (`YYYY-MM-DD`) so drivers serialise them identically.

**RLS**: enabled on every table with no policies, and privileges revoked
from Supabase's `anon` and `authenticated` roles. The browser never talks to
the database; the server connects with the database owner role.

**Transactions**: `actOnSession` locks the session row (`for update`) and
runs validation plus every reward in one transaction. `ensureDailySet` uses
`insert ... on conflict do nothing` so concurrent creators converge.

**Account deletion** cascades through every user-owned table and also deletes
that user's Unlimited puzzles. Daily puzzles are shared and kept.

Growth note: Unlimited sessions store one `puzzles` row each. A periodic
cleanup of old, never-completed Unlimited sessions is not implemented yet.

## Phase 22 (`0002_phase22.sql`)
- `preferences.language`: interface language (en/fr/hi/ru).
- `users.leaderboard_excluded`: admin-controlled; excluded players keep all
  stats but are filtered out of every public leaderboard query.
- `daily_puzzles.fingerprint | attempt | reused`, plus the new table
  `daily_puzzle_history (game, utc_date, fingerprint, reused)`, PK
  `(game, utc_date)`, index `(game, fingerprint)`. See docs/DAILY.md.
