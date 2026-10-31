# Security

## Authentication
- scrypt (N=16384, r=8, p=1, 64-byte key, random salt). Unknown-email logins
  still run a full scrypt (no timing oracle).
- Session cookie `gh_session`: 32 random bytes, httpOnly, `SameSite=Lax`,
  `Secure` in production. Only the SHA-256 hash is stored. 30 days for
  members, 365 for guests. Password reset deletes all sessions.
- Rate limits (Postgres-backed): login 30/15 min per IP and 8/15 min per
  email; sign-up 10/hour per IP; forgot-password 5/hour per IP; Unlimited
  starts 30/min per user.

## CSRF
Every mutating route goes through `route()` (`src/server/http.ts`): the
`Origin` host must equal the request host, and the body must be JSON. Cookies
are `SameSite=Lax`.

## Authorization
- Admin and moderator rights come only from `user_roles`, checked on the
  server for every admin page render (non-admins get 404) and every
  `/api/admin` call. Badges and profile fields are cosmetic.
- Every session API checks ownership (`where id = $1 and user_id = $2`).
- First admin: `GAMEHUB_BOOTSTRAP_ADMINS` (server env) or
  `npm run admin:grant`. Every admin action is written to `admin_audit_log`.

## Game integrity (anti-cheat)
- The server stores the puzzle; the client receives only `toClient()` data
  (no Werd or Pinpoint answers).
- Every move is validated by the engine on the server. Solved is decided
  only there.
- Duration = server time between session start and the solving action.
- Solves faster than `minSeconds[difficulty]` are refused (not failed).
- One Daily session and completion per player per game per date (unique
  indexes). All rewards are keyed in the ledger, so retries are no-ops.
- Leaderboards read server-recorded completions and stats only.

Known limits: a scripted client that plays legitimately (solving puzzles
with its own solver and waiting out the floor) is not detected. XP taper and
start rate limits bound its impact. No CAPTCHA.

## Secrets
Only `NEXT_PUBLIC_SITE_URL` is public. `DATABASE_URL`, `RESEND_API_KEY` and
`GAMEHUB_BOOTSTRAP_ADMINS` are server-only. No Supabase keys are used or
needed by the app. `.env*` files are git-ignored.

## Headers
`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy` and
`Permissions-Policy` are set in `next.config.ts`; `X-Powered-By` is off.
There is no Content-Security-Policy yet.

## Privacy
Export (`/api/me/export`) returns all personal data as JSON. Delete
(`/api/me/delete`, password or handle confirmation) cascades. Emails are
never shown publicly. Players can hide their profile and leave leaderboards.
No legal review has been done; do not claim compliance.

## Phase 22 notes
- `leaderboard_excluded` is set only by admin actions (or the developer
  showcase) and is never accepted from user settings.
- The developer showcase only targets the account named in
  `src/config/site.ts`, needs the admin role, and is audited.
- The Developer badge never grants permissions (tested).
- The language cookie is validated against the supported list; unknown
  values fall back to English.
