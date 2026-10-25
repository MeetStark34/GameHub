# GameHub Database Specification

## 1. Overview
GameHub utilizes PostgreSQL hosted on Supabase with strict **Row Level Security (RLS)**.
No client is allowed to write directly to sensitive progression fields (such as `total_xp`, `role`, or `streaks`) without server-side validation.

---

## 2. Core Entities

### `profiles`
Stores user profile information, level, streaks, and inventory.
- `id`: `uuid` (references `auth.users.id` on delete cascade)
- `username`: `text` unique
- `display_name`: `text`
- `avatar_url`: `text`
- `bio`: `text`
- `role`: `text` default `'Player'` (`'Developer'`, `'Founder'`, `'Moderator'`, `'Tester'`, `'Contributor'`)
- `total_xp`: `bigint` default `0`
- `normal_streak`: `integer` default `0`
- `longest_normal_streak`: `integer` default `0`
- `true_player_streak`: `integer` default `0`
- `longest_true_player_streak`: `integer` default `0`
- `gold_repair_cards`: `integer` default `0` (max 3)
- `punch_card_count`: `integer` default `0` (out of 10)
- `show_on_leaderboards`: `boolean` default `true`
- `is_public`: `boolean` default `true`
- `created_at`: `timestamptz` default `now()`
- `updated_at`: `timestamptz` default `now()`

### `game_sessions`
Records every completed game session across Daily Set and Unlimited modes.
- `id`: `uuid` primary key
- `user_id`: `uuid` (references `profiles.id`)
- `game_type`: `text` (`'patches'`, `'sudoku'`, `'zip'`, `'werd'`, `'pinpoint'`, `'crossclimb'`, `'tango'`, `'queens'`)
- `mode`: `text` (`'daily'`, `'unlimited'`)
- `difficulty`: `text` (`'easy'`, `'normal'`, `'hard'`, `'expert'`)
- `puzzle_id`: `text`
- `started_at`: `timestamptz`
- `completed_at`: `timestamptz`
- `elapsed_ms`: `integer`
- `score`: `integer`
- `mistakes`: `integer` default `0`
- `completed`: `boolean` default `true`
- `xp_earned`: `integer` default `0`
- `mastery_xp_earned`: `integer` default `0`
- `created_at`: `timestamptz` default `now()`

### `xp_transactions`
Auditable immutable ledger recording every XP award.
- `id`: `uuid` primary key
- `user_id`: `uuid` (references `profiles.id`)
- `source`: `text` (`'GAME_COMPLETION'`, `'DAILY_SET_COMPLETION'`, `'ACHIEVEMENT'`, `'PUNCH_CARD'`, `'CARD_CONVERSION'`, etc.)
- `amount`: `integer`
- `reference_type`: `text` (e.g. `'game_session'`, `'achievement'`)
- `reference_id`: `text`
- `metadata`: `jsonb`
- `created_at`: `timestamptz` default `now()`

### `daily_sets`
Stores the published immutable UTC daily puzzles.
- `utc_date`: `date` primary key (e.g. `'2026-10-25'`)
- `game_puzzles`: `jsonb` (contains seed/configuration for each of the 8 games)
- `created_at`: `timestamptz` default `now()`

### `user_achievements`
Tracks unlocked player achievements.
- `id`: `uuid` primary key
- `user_id`: `uuid` (references `profiles.id`)
- `achievement_id`: `text`
- `unlocked_at`: `timestamptz` default `now()`

### `admin_audit_logs`
Records all sensitive administrative actions.
- `id`: `uuid` primary key
- `admin_user_id`: `uuid`
- `action`: `text`
- `target_user_id`: `uuid`
- `before_value`: `jsonb`
- `after_value`: `jsonb`
- `reason`: `text`
- `created_at`: `timestamptz` default `now()`

---

## 3. Row Level Security (RLS) Principles
- Users may read public profiles and leaderboards.
- Users may only update their own non-sensitive profile fields (`display_name`, `bio`, `avatar_url`, privacy preferences).
- Users cannot directly update `total_xp`, `role`, or `gold_repair_cards`. These must be modified by trusted server-side procedures or service role client.
