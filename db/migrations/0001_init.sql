-- GameHub initial schema.
-- Append-only: never edit an applied migration; add a new numbered file.
-- Dates that identify a UTC day are stored as 'YYYY-MM-DD' text so they
-- compare and serialise identically in every driver.

create table users (
  id uuid primary key default gen_random_uuid(),
  handle text not null,
  display_name text not null,
  email text,
  password_hash text,
  is_guest boolean not null default true,
  -- Short public title shown under the name (cosmetic only, never auth).
  title text,
  profile_public boolean not null default true,
  show_on_leaderboards boolean not null default true,
  created_at timestamptz not null default now(),
  constraint users_handle_format check (handle ~ '^[a-z0-9_-]{3,24}$'),
  constraint users_display_name_len check (char_length(display_name) between 1 and 40),
  constraint users_guest_or_credentials check (is_guest or (email is not null and password_hash is not null))
);
create unique index users_handle_key on users (handle);
create unique index users_email_key on users (lower(email)) where email is not null;

create table auth_sessions (
  -- sha256 of the cookie token; the raw token is never stored.
  id text primary key,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now()
);
create index auth_sessions_user_idx on auth_sessions (user_id);

create table password_resets (
  token_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

-- Authorization roles. The ONLY source of admin permissions.
create table user_roles (
  user_id uuid not null references users (id) on delete cascade,
  role text not null check (role in ('admin', 'moderator')),
  granted_by uuid references users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Cosmetic profile badges. Display only; never used for authorization.
create table user_badges (
  user_id uuid not null references users (id) on delete cascade,
  badge text not null check (badge in ('developer', 'moderator', 'tester', 'founder', 'contributor')),
  granted_at timestamptz not null default now(),
  primary key (user_id, badge)
);

create table preferences (
  user_id uuid primary key references users (id) on delete cascade,
  theme text not null default 'system',
  sound_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table puzzles (
  id uuid primary key default gen_random_uuid(),
  game text not null,
  difficulty text not null check (difficulty in ('easy', 'normal', 'hard', 'expert')),
  mode text not null check (mode in ('daily', 'unlimited')),
  seed text not null,
  generator_version integer not null,
  data jsonb not null,
  solution jsonb not null,
  created_at timestamptz not null default now()
);
create unique index puzzles_daily_seed_key on puzzles (seed, game, difficulty) where mode = 'daily';

create table daily_sets (
  utc_date text primary key check (utc_date ~ '^\d{4}-\d{2}-\d{2}$'),
  difficulty text not null,
  created_at timestamptz not null default now()
);

create table daily_puzzles (
  utc_date text not null references daily_sets (utc_date) on delete cascade,
  game text not null,
  puzzle_id uuid not null references puzzles (id),
  primary key (utc_date, game)
);

create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  puzzle_id uuid not null references puzzles (id),
  game text not null,
  difficulty text not null,
  mode text not null check (mode in ('daily', 'unlimited')),
  daily_date text,
  status text not null default 'active' check (status in ('active', 'completed')),
  state jsonb not null,
  action_count integer not null default 0,
  started_at timestamptz not null,
  last_action_at timestamptz,
  completed_at timestamptz,
  constraint sessions_daily_date check ((mode = 'daily') = (daily_date is not null))
);
-- One Daily session per player per game per day: retries resume it.
create unique index game_sessions_daily_key on game_sessions (user_id, daily_date, game) where mode = 'daily';
create index game_sessions_user_idx on game_sessions (user_id, started_at desc);

create table completions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references game_sessions (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  game text not null,
  difficulty text not null,
  mode text not null,
  daily_date text,
  -- UTC day the completion actually happened (volume stats, punch source A).
  utc_date text not null,
  duration_ms integer not null check (duration_ms >= 0),
  score integer not null check (score between 0 and 1000),
  perfect boolean not null,
  xp_awarded integer not null,
  completed_at timestamptz not null,
  -- Immutable summary returned to the client; replayed for retries.
  result jsonb not null
);
create unique index completions_daily_key on completions (user_id, daily_date, game) where mode = 'daily';
create index completions_user_idx on completions (user_id, completed_at desc);
create index completions_board_idx on completions (game, difficulty, duration_ms);
create index completions_week_idx on completions (completed_at);

-- Every XP change, ever. user_stats.total_xp is the cached sum.
create table xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  amount integer not null,
  reason text not null,
  -- Unique per user: makes every award idempotent.
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index xp_ledger_week_idx on xp_ledger (created_at, user_id);

create table user_stats (
  user_id uuid primary key references users (id) on delete cascade,
  total_xp integer not null default 0,
  games_completed integer not null default 0,
  daily_games_completed integer not null default 0,
  unlimited_games_completed integer not null default 0,
  easy_completed integer not null default 0,
  normal_completed integer not null default 0,
  hard_completed integer not null default 0,
  expert_completed integer not null default 0,
  perfect_completed integer not null default 0,
  -- Days with all eight Daily Set games (lifetime; drives punch source B).
  true_player_days integer not null default 0,
  same_game_run integer not null default 0,
  last_game text,
  punch_progress integer not null default 0 check (punch_progress between 0 and 9),
  punches_earned integer not null default 0,
  cards_held integer not null default 0 check (cards_held between 0 and 3),
  cards_earned integer not null default 0,
  cards_converted integer not null default 0,
  cards_used integer not null default 0,
  xp_updated_at timestamptz not null default now()
);
create index user_stats_xp_idx on user_stats (total_xp desc);

create table mastery (
  user_id uuid not null references users (id) on delete cascade,
  game text not null,
  xp integer not null default 0,
  completions integer not null default 0,
  best_score integer not null default 0,
  best_time_ms integer,
  primary key (user_id, game)
);

create table daily_activity (
  user_id uuid not null references users (id) on delete cascade,
  utc_date text not null,
  games_completed integer not null default 0,
  unlimited_completed integer not null default 0,
  -- Daily Set games of THIS date completed (may land after reset via grace).
  daily_completed integer not null default 0,
  daily_order text[] not null default '{}',
  -- Bit i set = a game was completed during UTC hour i.
  hours_mask integer not null default 0,
  per_game jsonb not null default '{}',
  volume_punch_awarded boolean not null default false,
  primary key (user_id, utc_date)
);

create table streaks (
  user_id uuid not null references users (id) on delete cascade,
  kind text not null check (kind in ('normal', 'true_player')),
  current integer not null default 0,
  best integer not null default 0,
  last_date text,
  lost_value integer not null default 0,
  lost_last_date text,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);
create index streaks_board_idx on streaks (kind, best desc);

-- Audit trail for punches and Gold Repair Cards.
create table card_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  kind text not null check (kind in ('punch', 'card_created', 'card_converted', 'card_used', 'admin_adjust')),
  source text not null,
  streak_kind text check (streak_kind in ('normal', 'true_player')),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index card_events_user_idx on card_events (user_id, created_at desc);

create table achievement_unlocks (
  user_id uuid not null references users (id) on delete cascade,
  achievement_id text not null,
  xp integer not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_idx on notifications (user_id, created_at desc);

create table admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users (id) on delete set null,
  action text not null,
  target_user_id uuid references users (id) on delete set null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index admin_audit_created_idx on admin_audit_log (created_at desc);

create table rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count integer not null
);

-- Row Level Security: the app talks to Postgres only from the server with
-- a privileged connection. Enabling RLS with no policies means Supabase's
-- public `anon`/`authenticated` roles (PostgREST) can read or write nothing.
do $$
declare t text;
begin
  foreach t in array array[
    'users','auth_sessions','password_resets','user_roles','user_badges','preferences','puzzles',
    'daily_sets','daily_puzzles','game_sessions','completions','xp_ledger','user_stats','mastery',
    'daily_activity','streaks','card_events','achievement_unlocks','notifications','admin_audit_log','rate_limits'
  ] loop
    execute format('alter table %I enable row level security', t);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on table %I from anon', t);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke all on table %I from authenticated', t);
    end if;
  end loop;
end $$;
