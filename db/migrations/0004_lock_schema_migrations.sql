-- schema_migrations is created by the migration runner itself, so it missed
-- the RLS lockdown in 0001_init. On Supabase, new public tables are exposed
-- to the anon/authenticated roles by default; close that. Idempotent.
alter table schema_migrations enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on table schema_migrations from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on table schema_migrations from authenticated; end if;
end $$;
