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
   - optional `DB_POOL_MAX` (default 5), `DB_AUTO_MIGRATE=1`
4. Deploy, sign up with the bootstrap email, and confirm `/admin` loads.
5. Optional: pre-warm the Daily Set with a scheduled request to `/daily`
   shortly after 00:00 UTC. It is created lazily on first request anyway.

Production refuses to start without `DATABASE_URL` (PGlite is dev and test
only unless `ALLOW_PGLITE_IN_PRODUCTION=1`, which the E2E suite uses).
Runtime: Node.js (not Edge), because route handlers use `node:crypto` and
`postgres`.
