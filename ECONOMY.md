# GameHub XP Economy & Progression Specification

## 1. Centralized Economy Philosophy
All XP values and multiplier ratios are centralized in `/src/config/economy.ts` and `/src/config/levels.ts`.  
They must never be hardcoded into UI components.

---

## 2. Default XP Thresholds & Ranks

| Level | Rank | Minimum XP | Prestige Tiers |
|---|---|---|---|
| **1** | **Rookie** | 0 XP | Rookie I (0 XP), Rookie II (300 XP), Rookie III (650 XP) |
| **2** | **Novice** | 1,000 XP | Novice I (1,000 XP), Novice II (1,600 XP), Novice III (2,300 XP) |
| **3** | **Amateur** | 3,000 XP | Amateur I (3,000 XP), Amateur II (4,200 XP), Amateur III (5,500 XP) |
| **4** | **Pro** | 7,000 XP | Pro I (7,000 XP), Pro II (9,500 XP), Pro III (12,000 XP) |
| **5** | **Veteran** | 15,000 XP | Veteran I (15,000 XP), Veteran II (19,500 XP), Veteran III (24,500 XP) |
| **6** | **Expert** | 30,000 XP | Expert I (30,000 XP), Expert II (39,000 XP), Expert III (49,000 XP) |
| **7** | **Elite** | 60,000 XP | Elite I (60,000 XP), Elite II (72,000 XP), Elite III (85,000 XP) |
| **8** | **Master** | 100,000 XP | Master I (100,000 XP), Master II (122,000 XP), Master III (147,000 XP) |
| **9** | **Grandmaster** | 175,000 XP | Grandmaster I (175,000 XP), Grandmaster II (212,000 XP), Grandmaster III (254,000 XP) |
| **10** | **Legend** | 300,000 XP | Legend I (300,000 XP), Legend II (450,000 XP), Legend III (650,000 XP) |

*XP accumulates indefinitely beyond 300,000 XP (e.g. `Legend: 347,421 XP`). There is no hard cap.*

---

## 3. Reward Multipliers & Base XP

- **Unlimited Mode Base:** 20 XP
- **Daily Set Base:** 35 XP
- **Difficulty Multipliers:**
  - Easy: $1.0\times$
  - Normal: $1.25\times$
  - Hard: $1.6\times$
  - Expert: $2.0\times$
- **Daily Set Full Completion Bonus:** +150 XP
- **True Player Bonus:** +100 XP
- **Perfect Solve Bonus:** +25 XP
- **Gold Streak Repair Pocket Full Conversion:** +500 XP (generously awarded when user holds 3/3 cards and earns a 4th)

---

## 4. Streaks & Punch Card Economy

1. **Normal Streak:** +1 for completing at least 1 Daily Set game in a UTC day. Resets to 0 if no daily game played.
2. **True Player Streak:** +1 for completing all 8 Daily Set games in that UTC day. Partial set (e.g. 4/8) keeps Normal Streak intact, but resets True Player Streak to 0.
3. **Gold Streak Repair Punch Card:** Requires 10 punches.
   - *Source 1:* Complete 20 games in a UTC day (Daily or Unlimited, resets daily).
   - *Source 2:* Complete the full 8-game Daily Set twice (does not reset daily).
   - *Max Inventory:* 3 cards.
   - *Consumption:* Consumed on 1 repair choice (Normal Streak OR True Player Streak).
