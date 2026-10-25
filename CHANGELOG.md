# GameHub Changelog

All notable changes to GameHub are documented in this file using [Keep a Changelog](https://keepachangelog.com/) standards.

## [0.1.0] - Phase 01.00 Foundation & Architecture

### Added
- Next.js 15 App Router architecture with TypeScript 5.9 and Tailwind CSS.
- Configuration-first architecture under `/src/config/`:
  - `economy.ts` (Centralized XP rewards, difficulty multipliers, punch conversion)
  - `levels.ts` (10 official ranks from Rookie to Legend, prestige calculation)
  - `games.ts` (8 signature games metadata, 3-line punch taglines, accents, and rules)
  - `achievements.ts` (Categories, rarity, secret badges, and Weird achievements)
  - `streaks.ts` (Normal & True Player streaks, 10-punch card, max 3 storage)
  - `themes.ts` (11 complete theme palettes with design tokens)
  - `roles.ts` (Developer, Founder, Moderator, Tester, Contributor, Player)
- Theme system supporting all 11 themes:
  - System Default, Dracula, Nord, Gruvbox, One Dark, Solarized, Cyberpunk, OLED, Catppuccin, GitHub, Tokyo Night.
  - Interactive theme selector in navigation bar with localStorage persistence.
- Live UTC Midnight Reset countdown strip component with continuous live ticker.
- Foundational layouts and page skeletons:
  - Hero / Landing page showcasing all 8 games with individual visual personalities.
  - Dashboard with streaks, XP, level status, punch cards, and game mastery preview.
  - Daily Set UI with progress tracking ($4/8$) and completion banners.
  - Unlimited Mode selector with game selection and 4 difficulty tiers.
  - Achievements page with category filters and dedicated Weird collection callout.
  - Leaderboard with XP, Normal Streak, True Player Streak, and Weekly tabs.
  - Profile gaming identity page (Mr. Stark Developer badge, level 7, mastery breakdown).
  - Settings page with audio toggles, theme switcher, privacy toggles, data export & deletion.
  - Admin portal with developer tools, XP granting simulation, streak repair, and audit log.
- Supabase SSR integration setup:
  - Browser client (`src/lib/supabase/client.ts`)
  - Server client with Next.js 15 async cookies (`src/lib/supabase/server.ts`)
  - Session refresh middleware (`src/middleware.ts`, `src/lib/supabase/middleware.ts`)
- Unit test suite using Vitest with tests for level calculation, prestige tiers, and XP economy.
- Full documentation suite (`README.md`, `ARCHITECTURE.md`, `DATABASE.md`, `GAME_SYSTEM.md`, `ECONOMY.md`, `ACHIEVEMENTS.md`, `CONTRIBUTING.md`, `DEPLOYMENT.md`, `HANDOFF.md`, `CHANGELOG.md`).
