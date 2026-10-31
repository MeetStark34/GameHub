# GameHub — Project Master

**GameHub: Your daily brain training, without the daily limit**
*Play. Progress. Master.*

This is the product constitution. It states what GameHub is and the rules
that must not be broken. Implementation details live in `docs/`; the exact
state of the build lives in `CURRENT_STATE.md`.

## Vision

A daily brain-training platform that feels like a productivity app crossed
with a premium puzzle platform and a personal progression system. Eight
original puzzle games, one shared Daily Set per UTC day, unlimited practice,
and a progression layer (XP, ranks, mastery, streaks, cards, achievements)
that rewards consistency without punishing anyone.

## Non-negotiable product rules

1. **Exactly eight games**, in this order: Patches, Mini Sudoku, Zip, Werd,
   Pinpoint, Crossclimb, Tango, Queens. Each has Daily and Unlimited modes
   and Easy / Normal / Hard / Expert difficulties that change the puzzle.
2. **Daily Set** = one puzzle per game per UTC date, identical for every
   player, server-generated, stored, immutable once created.
3. **Reset at 00:00 UTC**, never local midnight. The UI shows a live
   countdown ticker.
4. **No fail system**: no lives, no energy, no cooldowns, no time limits.
   Time is recorded, never enforced. Every puzzle is always completable.
5. **Normal Streak**: +1 for any UTC day with ≥ 1 Daily Set game completed.
   **True Player Streak**: +1 only for 8/8. Unlimited affects neither.
6. **Gold Streak Repair Cards**: punches from (A) 20 games in one UTC day
   or (B) every 2 full Daily Sets (cumulative). 10 punches = 1 card,
   max 3 held, extra cards convert to XP with a "Pocket full" notice.
   Cards are spent only when the player chooses which streak to repair.
7. **Ranks** Rookie → Legend, each with tiers I/II/III, derived from XP at
   read time. Thresholds: 0, 1k, 3k, 7k, 15k, 30k, 60k, 100k, 175k, 300k.
   XP has no cap. Each game has its own mastery ladder with the same names.
8. **Exactly 11 themes**, all free: System Default, Dracula, Nord, Gruvbox,
   One Dark, Solarized, Cyberpunk, OLED, Catppuccin, GitHub, Tokyo Night.
9. Display badges (Developer, Moderator, Tester, Founder, Contributor) are
   cosmetic. **Authorization comes only from the `user_roles` table.**

## Engineering principles

- **Server authority**: XP, streaks, cards, achievements, Daily completion,
  leaderboards and admin rights are decided on the server. The client sends
  moves; the server validates them against the stored puzzle.
- **Idempotency**: every reward has a unique key in the database
  (`xp_ledger`, `card_events`, `achievement_unlocks`, one completion per
  session). Refreshes, double clicks and retries cannot double-pay.
- **Configuration first**: balance lives in `src/config/*` and each game's
  `config.ts`. Components only display what the server returns.
- **Modular games**: each game is a self-contained `GameEngine` in
  `src/games/<id>/` plus a board in `src/components/play/boards/`.
- **Append-only migrations** in `db/migrations/`. Never edit an applied file.
- **Never fake completion**: docs must describe what exists. Unfinished
  work is listed in `CURRENT_STATE.md` as unfinished.
- **Originality**: puzzle mechanics are generic genres; all code, content,
  art, copy and UI are original to GameHub.

## Document map

| File | Purpose |
|---|---|
| `README.md` | Setup and commands |
| `PROJECT_MASTER.md` | This constitution |
| `BUILD_PLAN.md` | Phases and status |
| `CURRENT_STATE.md` | Exact implementation state |
| `AI_HANDOFF.md` | What the next developer needs |
| `DECISIONS.md` | Architectural and product decisions |
| `FILE_MAP.md` | Module relationships |
| `docs/GAMES.md` | Rules, generators, difficulty per game |
| `docs/PROGRESSION.md` | XP, ranks, mastery, streaks, cards, achievements |
| `docs/DATABASE.md` | Schema and invariants |
| `docs/SECURITY.md` | Auth, authorization, anti-cheat, RLS |
| `docs/TESTING.md` | Test strategy and how to run |
| `docs/DEPLOYMENT.md` | Vercel + Supabase deployment |
