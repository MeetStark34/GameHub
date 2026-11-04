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

## Repair migrations
- `0003_repair_json_encoding`: unwraps json/jsonb values that the
  postgres.js driver had double-encoded (string scalars containing a JSON
  document) in puzzles, game_sessions, completions, daily_activity,
  notifications and admin_audit_log. Only strings whose text is a JSON
  object/array/string are unwrapped, so it is idempotent and lossless.
- `0004_lock_schema_migrations`: RLS on and anon/authenticated revoked for
  `schema_migrations`.

Apply to the configured database with `npm run db:migrate:env` (reads
`.env.local`). Inspect shapes and migration state read-only with
`npm run db:inspect` (never prints credentials or emails).

## 0005_xp_freeze
`user_stats.xp_frozen boolean not null default false`,
`xp_freeze_changed_at timestamptz`, `xp_freeze_changed_by uuid` (references
users, on delete set null). Additive only. History of every change is in
`admin_audit_log` (`xp-freeze` / `xp-unfreeze`).

## 0006_guest_expiry
`users.guest_expires_at timestamptz`: set only for guests, exactly 12 hours
after `created_at`; constraint `users_guest_expiry` requires
`is_guest = (guest_expires_at is not null)`; partial index on it for guests.
Existing guests were backfilled with `created_at + 12 h`. Table
`guest_cleanup_log (id, ran_at, source, deleted_guests, deleted_puzzles)`:
counts only, pruned after 30 days, RLS on, anon/authenticated revoked.
Function `purge_expired_guests(source text, limit int)` deletes expired
guests (same scope as Account deletion below, plus the guests' own Unlimited
puzzles) and logs the run; EXECUTE revoked from public/anon/authenticated.
Scheduled by pg_cron, not by the migration: `scripts/guest-cleanup-cron.sql`.
Additive only: the migration itself deletes nothing.

## Admin audit actions
`xp-add`, `xp-remove` (amount, before, after, xpFrozen, reason),
`streak-adjust` (kind, amount, before, after, reason), `xp-freeze` /
`xp-unfreeze` (totalXp, reason), `delete-account` (deletedUserId, handle,
displayName, isGuest, roles, totalXp, createdAt; no email), plus the existing
generic rows (`set-role`, `set-badge`, `grant-card`, ...). `actor_id` and
`target_user_id` are set null if those users are later deleted; the
snapshot in `details` keeps the row readable.

## Account deletion
`purgeUser` (src/server/account.ts) deletes the users row; these cascade:
auth_sessions, password_resets, user_roles, user_badges, preferences,
game_sessions (and their completions), completions, xp_ledger, user_stats,
mastery, daily_activity, streaks, card_events, achievement_unlocks,
notifications. Kept: puzzles used by Daily Sets, daily_sets, daily_puzzles,
daily_puzzle_history, admin_audit_log rows (user refs set null).
