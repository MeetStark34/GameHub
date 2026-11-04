-- Deletes expired guest accounts every 15 minutes (DECISIONS D-042).
--
-- Guests expire exactly 12 hours after creation and cannot sign in after
-- that (checked on every request), so this job only removes their data. It
-- runs inside Supabase with pg_cron and does not depend on Vercel or on
-- anyone's browser. purge_expired_guests() comes from migration 0006.
--
-- Apply once against the production database, after migration 0006 (idempotent):
--   npm run ops:guest-cleanup
-- or paste it into the Supabase SQL editor.
-- Check:   select * from cron.job where jobname = 'gamehub-guest-cleanup';
--          select * from guest_cleanup_log order by ran_at desc limit 10;
--          select status, return_message, start_time from cron.job_run_details
--            where jobid = (select jobid from cron.job where jobname = 'gamehub-guest-cleanup')
--            order by start_time desc limit 10;
-- Remove:  select cron.unschedule('gamehub-guest-cleanup');

create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid) from cron.job where jobname = 'gamehub-guest-cleanup';

select cron.schedule(
  'gamehub-guest-cleanup',
  '*/15 * * * *',
  $job$ select * from public.purge_expired_guests('pg_cron') $job$
);
