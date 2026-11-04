-- Keeps the Vercel functions warm (DECISIONS D-041).
--
-- Vercel stops an idle function instance after roughly 10 minutes; the next
-- visitor then waits for a cold start (0.5-2 s on this app). Supabase's
-- pg_cron + pg_net ping the site every 5 minutes from the database's own
-- region, which keeps one instance of each function group warm: the API
-- route handlers (/api/health, which also runs `select 1`) and the pages
-- (the four most used routes, loaded anonymously so no account is touched).
--
-- Apply once against the production database (idempotent):
--   node --env-file=.env.local scripts/apply-sql.mjs scripts/keep-warm.sql
-- or paste it into the Supabase SQL editor. Change the URLs if the site moves.
-- Remove with:  select cron.unschedule('gamehub-keep-warm');
-- Check with:   select status_code, created from net._http_response order by created desc limit 12;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid) from cron.job where jobname = 'gamehub-keep-warm';

select cron.schedule(
  'gamehub-keep-warm',
  '*/5 * * * *',
  $job$
  select net.http_get(url := u, timeout_milliseconds := 10000)
  from unnest(array[
    'https://stark-game-hub.vercel.app/api/health',
    'https://stark-game-hub.vercel.app/',
    'https://stark-game-hub.vercel.app/daily',
    'https://stark-game-hub.vercel.app/dashboard',
    'https://stark-game-hub.vercel.app/play/queens?mode=daily'
  ]) as u
  $job$
);
