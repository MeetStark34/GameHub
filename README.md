# GameHub 🎮

> **GameHub: Your daily brain training, without the daily limit**  
> *Play. Progress. Master.*

GameHub is a sophisticated, polished gaming platform centered around unlimited brain-training puzzles, dual streaks, game mastery, ten prestige ranks, Steam-inspired achievement popups, and eleven customizable themes.

Unlike platforms that limit you to one puzzle per day, GameHub offers **both** an authoritative UTC **Daily Set** and a truly **Unlimited** mode.

---

## 🧩 The Eight Games

Each game features its own personality, 3-line tagline, difficulty scaling, visual accents, and independent mastery progression:

1. **Patches** — *Shape the board. Find the pattern. Master the grid.* (Polyomino tiling)
2. **Mini Sudoku** — *Deduce the digits. Break the gridlock. Zero guesswork.* (6×6 logical deduction)
3. **Zip** — *Trace the path. Connect the flow. Zip to the end.* (Numbered path connection)
4. **Werd** — *Choose your letters. Interpret the clues. Solve the word.* (Word deduction)
5. **Pinpoint** — *Read the clues. Isolate the link. Pinpoint the concept.* (4-clue association)
6. **Crossclimb** — *Answer the clues. Morph the letters. Climb to the top.* (Trivia word ladder)
7. **Tango** — *Sun and Moon. Equal count. Never three in a row.* (Binary grid balance)
8. **Queens** — *Claim your realm. Protect the crowns. Rule the board.* (Crown territory constraints)

---

## 🌟 Core Features

- **Daily Set & True Player Streak:**
  - One immutable UTC Daily Set published daily for all players.
  - Completing $\ge 1$ daily game increments **Normal Streak**.
  - Completing all $8 / 8$ daily games increments **True Player Streak**.
- **Gold Streak Repair Punch Card:**
  - 10-punch card earned by playing 20 games in a UTC day or completing the Daily Set twice.
  - Store up to 3 repair cards. A 4th earned card automatically converts into **+500 XP**.
- **Ten Official Ranks & Prestige:**
  - Rookie $\rightarrow$ Novice $\rightarrow$ Amateur $\rightarrow$ Pro $\rightarrow$ Veteran $\rightarrow$ Expert $\rightarrow$ Elite $\rightarrow$ Master $\rightarrow$ Grandmaster $\rightarrow$ Legend.
  - Prestige tiers: `Rookie I`, `Rookie II`, `Rookie III` ... `Legend III`.
  - Configurable Git-trackable XP thresholds; changing thresholds recalculates rank without losing user XP.
- **Weird & Secret Achievements:**
  - Steam-inspired popups, rarity badges, and a dedicated **Weird** achievement collection (`Potato`, `Night Owl`, `Touch Grass`, `Chaos`, etc.).
- **11 Hand-Crafted Themes:**
  - System Default, Dracula, Nord, Gruvbox, One Dark, Solarized, Cyberpunk, OLED, Catppuccin, GitHub, Tokyo Night.
- **Auditable XP Ledger:**
  - Centralized XP transactions for tamper-proof anti-cheat validation.

---

## 🛠 Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components)
- **Language:** TypeScript 5.9
- **Styling:** Tailwind CSS 3.4 + CSS Variables (11 themes)
- **Icons:** Lucide React
- **Database & Auth:** Supabase (PostgreSQL, Supabase Auth, Row Level Security)
- **Testing:** Vitest

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone <repo-url>
cd stark-games
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local` and set your Supabase project credentials:
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### 4. Run Tests & Validation
```bash
npm run test        # Runs unit tests (Vitest)
npm run typecheck   # Validates TypeScript without emitting files
npm run build       # Creates production Next.js build
```

---

## 📜 Documentation Index

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design, token architecture, directory layout
- [DATABASE.md](./DATABASE.md) — Supabase schema, RLS policies, tables, and migrations
- [GAME_SYSTEM.md](./GAME_SYSTEM.md) — Game rules, generators, sessions, and verification
- [ECONOMY.md](./ECONOMY.md) — XP rewards, difficulty multipliers, punch cards, and prestige
- [ACHIEVEMENTS.md](./ACHIEVEMENTS.md) — Achievement registry, conditions, and Weird badges
- [HANDOFF.md](./HANDOFF.md) — Real-time state machine for seamless multi-AI coordination
- [CHANGELOG.md](./CHANGELOG.md) — Version release notes and changes
