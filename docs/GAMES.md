# Games

All engines live in `src/games/<id>/` and implement `GameEngine`
(`src/games/types.ts`). They are pure and seeded (`src/lib/rng.ts`).
Difficulty values live in each `config.ts`; par/minimum times and rules copy
live in `src/config/games.ts`. The server validates every move with
`engine.act()`. The client never decides that a game is solved.

Score (all games): `1000 × timeFactor × (1 − penalty)`. Time factor is 1 up
to par, then falls linearly to 0.5 at 4× par. "Perfect" means penalty 0 and
time ≤ par. Each wrong submission in a logic game costs 0.1 (max 0.5).

| Game | Rules | Generator | Easy | Normal | Hard | Expert |
|---|---|---|---|---|---|---|
| **Patches** | Cut the board into rectangles; each holds exactly one number equal to its area and matches any shape hint | Random rectangle partition, then uniqueness by exact-cover solver | 5×5, all hints | 6×6, 60% hints | 7×7, 25% hints | 8×8, no hints |
| **Mini Sudoku** | Rows, columns and boxes contain each number once | Random full grid, then dig holes keeping a unique solution | 4×4 (+2 givens) | 6×6 (+6 above minimal) | 6×6 (+2) | 6×6 minimal |
| **Zip** | One path through every cell, numbers in order, start at 1, end at the last number, no walls crossed | Random Hamiltonian path (backbite moves), waypoints along it, walls on unused edges | 5×5, 9 numbers | 6×6, 8 numbers, 3 walls | 7×7, 7 numbers, 5 walls | 8×8, 6 numbers, 6 walls |
| **Werd** | Guess the hidden word; hit/near/miss feedback; no guess limit | Random common word | 4 letters | 5 letters | 6 letters | 6 letters, strict mode |
| **Pinpoint** | Clues revealed one at a time; pick the shared category; a wrong pick reveals a clue | Category bank (`categories.ts`, 62 categories × 8 clues ordered by ambiguity) | 4 options, clear clues | 6 options | 6 same-family options | 8 same-family options, cryptic clues |
| **Crossclimb** | Fill the rungs between top and bottom; each step changes exactly one letter; all real words | BFS over common-word one-letter graph; pair rejected if any dictionary word gives a shorter route | 3 letters, 2 rungs, all hints | 4 letters, 3 rungs, 50% hints | 4 letters, 4 rungs | 5 letters, 4 rungs |
| **Tango** | Sun/moon in every cell; rows and columns balanced; never three in a row; `=` same, `×` opposite | Random valid grid, then strip cell and edge clues while unique | 6×6 (+6 clues) | 6×6 (+1) | 8×8 (+4) | 8×8 minimal |
| **Queens** | One crown per row, column and colour region; crowns never touch | Random non-touching placement, regions grown from crowns, kept only if unique | 6×6 | 7×7 | 8×8 | 9×9 |

Secrets: Werd answers and Pinpoint answer ids never reach the browser
(`toClient` strips them; tests assert this). Logic games' solutions are
derivable from the puzzle anyway, so validation is rule-based.

Penalties: Werd loses 0.08 per guess beyond par 6 (max 0.6). Pinpoint loses
0.1 per extra clue plus 0.08 per wrong pick (max 0.8).

Highlights for achievements: `werd:first-guess`, `pinpoint:one-clue`.

## UI (`src/components/play/boards/`)

| Board | Input |
|---|---|
| Queens | Tap cycles ×/crown; drag paints ×; arrows + Space/Q/X |
| Mini Sudoku | Select cell, number pad or digits; arrows |
| Tango | Tap cycles sun/moon/empty; S/M/Space |
| Zip | Drag from the path end; tap a path cell to truncate; arrows / Backspace |
| Patches | Drag a rectangle; tap a patch to remove; Enter twice for keyboard corners |
| Werd | Physical or on-screen keyboard |
| Pinpoint | Option buttons, "Reveal next clue" |
| Crossclimb | One input per rung, free dictionary check per word |

Boards keep progress in `localStorage` (`gh-board-<session>`) and
auto-submit when locally complete. The server still decides.

## Adding content or changing a generator

- Pinpoint: append a category to `categories.ts` (unique id, 8 clues).
- Changing generator output for an existing seed: bump `generatorVersion`.
  Stored Daily puzzles are never regenerated.
