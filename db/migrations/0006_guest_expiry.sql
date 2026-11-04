-- Temporary guest accounts (DECISIONS D-042).
-- A guest account lives exactly 12 hours from its creation. The app writes
-- guest_expires_at when it creates the guest (server clock, UTC), sign-up
-- clears it when a guest upgrades in place, and the constraint below keeps the
-- two in step. Expired guests can no longer sign in (src/server/users.ts,
-- userForToken) and purge_expired_guests() deletes them. The function is run
-- every 15 minutes by pg_cron in production: scripts/guest-cleanup-cron.sql.
--
-- Non-destructive: adds a column, a trigger, a constraint, an index, a log
-- table and a function. It deletes nothing by itself.

alter table users add column guest_expires_at timestamptz;

-- Existing guests expire 12 hours after they were created (for all of them
-- that is already in the past, so the first cleanup run removes them).
update users set guest_expires_at = created_at + interval '12 hours' where is_guest;

-- Defence in depth, and safe for the deploy window when this migration is
-- live but the previous app version still runs (it does not know the column):
-- a guest row always gets created_at + 12 h, a member row never keeps an expiry.
create or replace function users_guest_expiry_default() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.is_guest then
    if new.guest_expires_at is null then
      new.guest_expires_at := coalesce(new.created_at, now()) + interval '12 hours';
    end if;
  else
    new.guest_expires_at := null;
  end if;
  return new;
end $$;
create trigger users_guest_expiry_default before insert or update of is_guest, guest_expires_at on users
  for each row execute function users_guest_expiry_default();

alter table users add constraint users_guest_expiry check (is_guest = (guest_expires_at is not null));
create index users_guest_expiry_idx on users (guest_expires_at) where is_guest;

-- One row per cleanup run: counts only, no handles, ids or other personal data.
create table guest_cleanup_log (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  source text not null,
  deleted_guests integer not null,
  deleted_puzzles integer not null
);
create index guest_cleanup_log_ran_idx on guest_cleanup_log (ran_at desc);

alter table guest_cleanup_log enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on table guest_cleanup_log from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on table guest_cleanup_log from authenticated; end if;
end $$;

-- Deletes expired guest accounts and everything they own, in one transaction
-- (the caller's). Same scope as purgeUser in src/server/account.ts: every
-- per-user table cascades from users; the guests' private Unlimited puzzles
-- are removed afterwards unless another session still uses them. Daily Set
-- puzzles, daily_sets and other shared data are never touched; admin audit
-- rows survive (their user references are set to null by the foreign key).
-- Idempotent and safe to run concurrently (skip locked). Only rows that are
-- unmistakably guests qualify: is_guest, no email, no password, a guest-
-- handle and no role.
create or replace function purge_expired_guests(p_source text default 'manual', p_limit integer default 5000)
returns table (deleted_guests integer, deleted_puzzles integer)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_ids uuid[];
  v_puzzles uuid[];
  v_guests integer := 0;
  v_puzzle_count integer := 0;
begin
  select coalesce(array_agg(id), '{}') into v_ids from (
    select u.id
    from users u
    where u.is_guest
      and u.guest_expires_at <= now()
      and u.email is null
      and u.password_hash is null
      and u.handle like 'guest-%'
      and not exists (select 1 from user_roles r where r.user_id = u.id)
    order by u.guest_expires_at
    limit greatest(p_limit, 0)
    for update of u skip locked
  ) expired;

  if cardinality(v_ids) > 0 then
    select coalesce(array_agg(distinct s.puzzle_id), '{}') into v_puzzles
    from game_sessions s
    where s.user_id = any(v_ids) and s.mode = 'unlimited';

    delete from users where id = any(v_ids) and is_guest;
    get diagnostics v_guests = row_count;

    delete from puzzles p
    where p.mode = 'unlimited'
      and p.id = any(v_puzzles)
      and not exists (select 1 from game_sessions s where s.puzzle_id = p.id)
      and not exists (select 1 from daily_puzzles d where d.puzzle_id = p.id);
    get diagnostics v_puzzle_count = row_count;
  end if;

  insert into guest_cleanup_log (source, deleted_guests, deleted_puzzles) values (left(p_source, 40), v_guests, v_puzzle_count);
  delete from guest_cleanup_log where ran_at < now() - interval '30 days';

  return query select v_guests, v_puzzle_count;
end $$;

-- Supabase exposes public functions to its API roles by default; this one is
-- for the server and pg_cron only.
revoke all on function purge_expired_guests(text, integer) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on function purge_expired_guests(text, integer) from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on function purge_expired_guests(text, integer) from authenticated; end if;
end $$;
