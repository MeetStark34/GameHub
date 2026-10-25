# GameHub Architecture & System Design

## 1. Architectural Philosophy
GameHub is engineered as a production-grade, public gaming platform with the following core principles:

1. **Configuration-First Architecture:**  
   Economy numbers, rank thresholds, prestige formulas, achievements, and game metadata reside in isolated, human-readable, Git-trackable files under `/src/config/`. Application code imports definitions rather than hardcoding values.
2. **Server-Authoritative Anti-Cheat:**  
   Game completions, streak increments, and XP awards must be verified on the server. The client cannot arbitrarily submit awarded XP or self-promote rank.
3. **Auditable XP Transaction Ledger:**  
   XP is not merely an incremented integer in a mutable column; it is backed by an auditable ledger of transactions (`xp_transactions`). Total XP is derived or updated using strict transactional safety.
4. **Theme Design Tokens:**  
   11 themes are defined using CSS variables (`--bg-primary`, `--bg-surface`, `--accent`, etc.) mapped via Tailwind CSS (`bg-theme-bg`, `text-theme-text`). Switching themes mutates classes on `<html>` without rebuilding CSS or re-rendering entire component trees.

---

## 2. Directory Layout

```text
stark-games/
├── public/                 # Static public assets
├── src/
│   ├── app/                # Next.js App Router routes & pages
│   │   ├── globals.css     # 11-theme CSS design tokens & base resets
│   │   ├── layout.tsx      # Root layout, ThemeProvider, ResetStrip, Navbar, Footer
│   │   ├── page.tsx        # Landing / Hero page
│   │   ├── daily/          # UTC Daily Set page
│   │   ├── unlimited/      # Unlimited game selector & generator
│   │   ├── dashboard/      # Authenticated user command center
│   │   ├── achievements/   # Badges, rarity, and Weird achievements
│   │   ├── leaderboard/    # Global, streak, and weekly rankings
│   │   ├── profile/        # Gaming identity, mastery & statistics
│   │   ├── settings/       # Theme, sound, privacy, export & deletion
│   │   └── admin/          # Developer tools, audit logs, user management
│   ├── components/         # Reusable UI & domain components
│   │   ├── layout/         # Navbar, ResetStrip, Footer
│   │   ├── theme/          # ThemeProvider, ThemeSelector
│   │   └── ui/             # Buttons, cards, badges, dialogs, progress bars
│   ├── config/             # Authoritative configuration layer
│   │   ├── economy.ts      # XP bonuses, difficulty multipliers, punch conversions
│   │   ├── levels.ts       # 10 official ranks, prestige tiers, calculations
│   │   ├── achievements.ts # Registry of all badges and conditions
│   │   ├── games.ts        # 8 signature games, personalities, rules, taglines
│   │   ├── streaks.ts      # Dual streaks, punch cards, max storage
│   │   ├── themes.ts       # 11 theme definitions and color palettes
│   │   └── roles.ts        # Developer, Founder, Moderator, Tester, Contributor
│   ├── lib/                # Shared utilities & clients
│   │   ├── supabase/       # SSR browser, server, admin client & middleware
│   │   └── utils.ts        # Formatting & className helpers
│   └── types/              # Global TypeScript interfaces
├── ARCHITECTURE.md         # Architecture overview
├── DATABASE.md             # Database schema & migrations
├── ECONOMY.md              # Centralized XP economy reference
├── GAME_SYSTEM.md          # 8 games rules and procedural generators
├── ACHIEVEMENTS.md         # Achievements documentation
├── HANDOFF.md              # Inter-AI handoff specification
└── CHANGELOG.md            # Version change history
```

---

## 3. The 11-Theme System

| Theme ID | Name | Accent | Primary Background | Description |
|---|---|---|---|---|
| `system` | System Default | `#6366f1` | `#0f172a` | Slate & indigo dark mode |
| `dracula` | Dracula | `#bd93f9` | `#282a36` | Classic pastel vampire tones |
| `nord` | Nord | `#88c0d0` | `#2e3440` | Arctic north-bluish palette |
| `gruvbox` | Gruvbox | `#fe8019` | `#282828` | Retro warm groove |
| `onedark` | One Dark | `#61afef` | `#1e222a` | Atom editor balanced dark |
| `solarized` | Solarized | `#268bd2` | `#002b36` | Scientific color balance |
| `cyberpunk` | Cyberpunk | `#ff007f` | `#0d0221` | Electric neon high contrast |
| `oled` | OLED | `#3b82f6` | `#000000` | True pitch black |
| `catppuccin` | Catppuccin | `#cba6f7` | `#1e1e2e` | Soothing mocha pastel |
| `github` | GitHub | `#2f81f7` | `#0d1117` | GitHub dark dimension |
| `tokyonight` | Tokyo Night | `#7aa2f7` | `#1a1b26` | Neon city night lights |

All theme tokens are controlled through CSS variables in `globals.css` and can be toggled without page reloads.

---

## 4. State Management & Data Flow

- **Client State:** Theme preferences (`localStorage` + `ThemeProvider`), ephemeral puzzle board state, timer duration.
- **Server State:** Supabase PostgreSQL for user profiles, game sessions, streaks, inventory, and achievements.
- **Middleware:** Next.js middleware refreshes auth sessions transparently via `@supabase/ssr`.
