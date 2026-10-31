# Current state (2026-10-31)

## Summary
GameHub is functionally complete locally. All eight games are playable in
Daily and Unlimited modes at four difficulties. The full progression system
runs server-side and is verified by tests. **It has not been deployed**, and
it has not been run against a real Supabase database.

## Verified
- `npm run lint`: clean
- `npm run typecheck`: clean
- `npm test`: **87/87 pass** (11 files: 8 game suites, registry, progression, integration on real Postgres via PGlite)
- `npm run build`: passes, no warnings
- `npm run test:e2e`: **10/10 pass** (desktop journey + Pixel 7 mobile), against a production build
- Manual screenshot review: landing, all 8 boards, dashboard, Tokyo Night theme, mobile dashboard and Zip

## Working
Games (all 8 × 4 difficulties) · shared immutable Daily Set · Unlimited ·
server validation of every move · scoring · XP ledger · ranks · mastery ·
Normal and True Player streaks · punches, cards, pocket-full conversion,
repairs · 47 achievements with popups · notifications · sounds · 11 themes ·
landing · dashboard · Daily and Unlimited pages · results panel · profiles ·
leaderboards (9 boards) · settings, privacy, export, delete · guest → member
upgrade · login, logout, password reset flow · admin with dev tools and
audit log · reset ticker · SEO basics.

## Incomplete or unverified
1. **Deployment**: no Supabase project or Vercel deployment yet. The
   postgres.js driver path is written but untested live.
2. **Password-reset email**: needs `RESEND_API_KEY`. Without it the link is
   only logged (dev). Not tested against Resend.
3. **OAuth**: not implemented.
4. **Signing in from a guest browser** discards guest progress (no merge).
5. **E2E solves only Queens and Mini Sudoku through the UI.** The other six
   boards were checked visually but not played through by automated tests;
   their engines and server flow are fully tested.
6. **Accessibility**: keyboard play, ARIA labels and reduced motion are
   implemented, but no axe or screen-reader audit has been done.
7. **No CSP header** and no Open Graph image.
8. **Unlimited puzzle cleanup**: abandoned Unlimited sessions are never purged.
9. **Pinpoint content**: 62 categories; repeats will be noticeable over weeks.
10. Admin has no reports or moderation queue. Config (XP, achievements,
    themes) is edited in code by design, not in the admin UI.

## Known bugs
None known.

## Migrations
`0001_init` (only migration).
