# Deployment (Vercel + Supabase)

Status: **not yet deployed**. These steps are written against the code but
have not been run against a live Supabase project.

1. **Supabase**: create a project. Under Settings → Database, copy the
   *transaction pooler* connection string (port 6543).
2. **Migrate**: `DATABASE_URL=<pooler or direct URL> npm run db:migrate`.
3. **Vercel**: import the GitHub repo. Set environment variables:
   - `DATABASE_URL`: the pooler string (server-only)
   - `NEXT_PUBLIC_SITE_URL`: e.g. `https://gamehub.example.com`
   - `GAMEHUB_BOOTSTRAP_ADMINS`: your email, for the first admin (remove later)
   - `RESEND_API_KEY` and `EMAIL_FROM`: needed for password-reset email
   - optional `DB_POOL_MAX` (default 10), `DB_AUTO_MIGRATE=1`
4. Deploy, sign up with the bootstrap email, and confirm `/admin` loads.
   **Region:** `vercel.json` runs functions in `dub1` (Dublin), next to a
   Supabase project in `eu-west-1`. If your database is elsewhere, set
   `regions` to the Vercel region closest to it: each page makes several
   sequential queries, so a cross-ocean hop multiplies. Check any response's
   `x-vercel-id` header (`<edge>::dub1::<id>`), e.g.
   `curl -sI https://<your-app>/api/health | grep -i x-vercel-id`.
5. Optional: pre-warm the Daily Set with a scheduled request to `/daily`
   shortly after 00:00 UTC. It is created lazily on first request anyway.
6. Optional, recommended on low traffic: `npm run ops:keep-warm` schedules a
   pg_cron job in Supabase that pings the site every 5 minutes, so visitors
   rarely meet a cold start (DECISIONS D-041; edit the URLs in
   `scripts/keep-warm.sql` first if your domain differs).

Production refuses to start without `DATABASE_URL` (PGlite is dev and test
only unless `ALLOW_PGLITE_IN_PRODUCTION=1`, which the E2E suite uses).
Runtime: Node.js (not Edge), because route handlers use `node:crypto` and
`postgres`.
