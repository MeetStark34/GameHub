-- Phase 22: language preference, leaderboard exclusion, Daily puzzle history.

alter table preferences add column language text;

-- Server/admin-controlled. Excluded players keep all stats but never rank
-- publicly (e.g. the developer showcase account). Not user-editable.
alter table users add column leaderboard_excluded boolean not null default false;

-- Fingerprint of each Daily puzzle and how it was chosen.
alter table daily_puzzles add column fingerprint text;
alter table daily_puzzles add column attempt integer not null default 0;
alter table daily_puzzles add column reused boolean not null default false;

-- Every fingerprint ever used in a Daily Set, per game. Used to reject
-- repeats when a new Daily Set is generated.
create table daily_puzzle_history (
  game text not null,
  utc_date text not null,
  fingerprint text not null,
  reused boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (game, utc_date)
);
create index daily_puzzle_history_fp_idx on daily_puzzle_history (game, fingerprint);

alter table daily_puzzle_history enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on table daily_puzzle_history from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on table daily_puzzle_history from authenticated; end if;
end $$;
