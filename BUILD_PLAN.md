# Build plan

`[x]` done and verified · `[~]` done with known gaps (see CURRENT_STATE) · `[ ]` not done

## PHASE 01 Repository audit & architecture
[x] 01.01 Audit (prior commits were static mock UI; working tree had deleted them)
[x] 01.02 Stack: Next 16, React 19, TS, Tailwind 4, Postgres (Supabase/PGlite)
[x] 01.03 Documentation system (PROJECT_MASTER, DECISIONS, FILE_MAP, docs/)

## PHASE 02 App shell
[x] 02.01 Root layout, header, mobile bottom nav, footer, 404
[x] 02.02 Live UTC reset ticker (server-clock corrected, auto-refresh at reset)

## PHASE 03 Design system & themes
[x] 03.01 Token system, 11 themes, server-resolved (no flash), persisted
[x] 03.02 UI primitives, brand mark, original game glyphs

## PHASE 04 Game engine
[x] 04.01 Seeded RNG, GameEngine contract, registry
[x] 04.02 Word lists (SCOWL) baked + dictionary/ladder graph

## PHASE 05 Eight games
[x] 05.01 Engines: Patches, Mini Sudoku, Zip, Werd, Pinpoint, Crossclimb, Tango, Queens (4 difficulties each)
[x] 05.02 Boards with pointer, touch and keyboard input, local persistence
[~] 05.03 Content depth: Pinpoint has 62 categories (expand over time)

## PHASE 06 Daily Set
[x] 06.01 Deterministic, stored, immutable, globally shared per UTC date
[x] 06.02 Weekday difficulty rotation, resume, 10-minute reset grace

## PHASE 07 Unlimited
[x] 07.01 Per-session seeded puzzles, any difficulty, resume, rate limit

## PHASE 08 XP & ranks
[x] 08.01 Ledger-backed idempotent XP, configurable economy, taper
[x] 08.02 10 ranks × 3 tiers derived from XP, uncapped

## PHASE 09 Mastery
[x] 09.01 Per-game mastery ladder, overall mastery

## PHASE 10 Streaks
[x] 10.01 Normal + True Player, lazy break detection, milestones

## PHASE 11 Gold Repair Cards
[x] 11.01 Punch sources A/B, card cap, pocket-full conversion, audited events
[x] 11.02 Player-chosen repair, idempotent request id

## PHASE 12 Achievements
[x] 12.01 Data-driven engine, 47 achievements, hidden ones, gold popup, page

## PHASE 13 Profiles
[x] 13.01 Public profile, badges (cosmetic), privacy toggle

## PHASE 14 Leaderboards
[x] 14.01 Global (XP, longest streak, True Player streak, games), weekly, per-game (best/avg time, high score)

## PHASE 15 Notifications & sound
[x] 15.01 Stored notifications, toasts, notification centre, streak-at-risk nudge
[x] 15.02 Synthesized sounds with global toggle

## PHASE 16 Auth & privacy
[x] 16.01 Guests, sign-up (guest upgrade), login, logout, rate limits
[~] 16.02 Password reset (works; email needs RESEND_API_KEY, not verified live)
[x] 16.03 Export data, delete account
[ ] 16.04 OAuth providers (not started)

## PHASE 17 Admin
[x] 17.01 Server-authorized /admin: overview, user search, roles, badges, audit log
[x] 17.02 Dev tools: +1000 XP, unlock achievement, complete Daily Set, break/repair streak, grant card, reset Daily State, generate puzzle
[ ] 17.03 Reports / moderation queue (not started)

## PHASE 18 Security & anti-cheat
[x] 18.01 CSRF, RLS lockdown, ownership checks, plausibility floor, unique constraints
[ ] 18.02 Content-Security-Policy header

## PHASE 19 Testing
[x] 19.01 Unit + integration: 87 tests passing
[x] 19.02 E2E critical journey + mobile: 10 tests passing
[ ] 19.03 Automated accessibility audit (axe), UI E2E for the other 6 games

## PHASE 20 Performance / accessibility / SEO
[x] 20.01 Code-split boards, metadata, sitemap, robots, icon, reduced motion
[~] 20.02 Accessibility: semantic roles, labels, keyboard play, focus states (not formally audited)
[ ] 20.03 Open Graph image

## PHASE 21 Production deployment
[ ] 21.01 Supabase project + migrations applied
[ ] 21.02 Vercel deploy + env vars + live smoke test

## PHASE 22 Post-testing refinement & personalization
[x] 22.01 Languages EN/FR/HI/RU: central dictionaries, selector, persistence, tests
[x] 22.02 Crossclimb rebuilt (clued rungs, reorder, unlock ends), 380+ clues
[x] 22.03 Pinpoint rebuilt (free-text, typo tolerance, assist), 177 categories
[x] 22.04 Daily Tango 6×6
[x] 22.05 Daily uniqueness: fingerprints + history + flagged fallback
[x] 22.06 Ticker on Dashboard only
[x] 22.07 Footer credit (configurable profile link)
[x] 22.08 Header Themes and Language controls
[~] 22.09–11 Mr. Stark showcase + leaderboard exclusion (code done; account must be created, see AI_HANDOFF)
[x] 22.12 Rank Roadmap page
[x] 22.13 XP economy file documented
[x] 22.14 Developer/admin dashboard
[ ] 22.15 Supabase connected (password rejected; waiting on a reset password)
