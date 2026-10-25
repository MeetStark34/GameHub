# GameHub Game Systems & Rules

## 1. General Principles
- **No Failure / No Forcing Timer:** Games never kick players out or force game-overs due to an arbitrary ticking clock. Puzzles are completed at the player’s own pace.
- **Duration Tracking:** Internal timestamps measure elapsed time (`started_at`, `completed_at`, `elapsed_ms`) purely for statistics, personal bests, and speed leaderboards.
- **Zero Duplicate Feeling:** All eight games feature bespoke visual accents, unique iconography, distinct completion effects, and independent mastery progression.

---

## 2. The 8 Games Specification

### 1. Patches
- **Category:** Spatial polyomino tiling
- **Mechanics:** Players receive an assortment of shaped patch pieces. The objective is to rotate/position all patches into the grid such that every cell is covered with no overlapping tiles.
- **Tagline:** *Shape the board. Find the pattern. Master the grid.*
- **Difficulties:** Easy (4-6 pieces, 4×4 to 5×5), Normal (6-8 pieces, 6×6), Hard (8-10 pieces, irregular shapes), Expert (complex interlocking shapes).

### 2. Mini Sudoku
- **Category:** Concentrated pure deduction
- **Mechanics:** 6×6 grid partitioned into 2×3 blocks. Each row, column, and block must contain digits 1 through 6 exactly once.
- **Tagline:** *Deduce the digits. Break the gridlock. Zero guesswork.*
- **Difficulties:** Easy (abundant givens), Normal (balanced deduction), Hard (minimal givens, multi-step constraints), Expert (requires advanced pairs/triples logic).

### 3. Zip
- **Category:** Numbered sequential pathfinder
- **Mechanics:** A grid with fixed numbered waypoints ($1, 2, 3 \dots N$). The player draws a continuous orthogonal path from 1 through $N$ visiting every required square on the board without self-intersection.
- **Tagline:** *Trace the path. Connect the flow. Zip to the end.*
- **Difficulties:** Easy (5×5 board, dense waypoints), Normal (6×6, standard spacing), Hard (7×7, long paths), Expert (8×8, sparse waypoints).

### 4. Werd
- **Category:** 5-letter word deduction
- **Mechanics:** Guess a hidden 5-letter target word in 6 attempts. Clue tiles turn green (correct letter and position), yellow (letter present in word but wrong position), or gray (letter not in word).
- **Tagline:** *Choose your letters. Interpret the clues. Solve the word.*
- **Difficulties:** Easy (common everyday words), Normal (standard dictionary), Hard (uncommon letters, duplicate vowels), Expert (challenging vocabulary).

### 5. Pinpoint
- **Category:** 4-clue thematic association
- **Mechanics:** Four mysterious clue words are presented. The player inputs the single unifying concept or category uniting all four clues. Fewer clues revealed = higher score.
- **Tagline:** *Read the clues. Isolate the link. Pinpoint the concept.*
- **Difficulties:** Easy (obvious semantic links), Normal (associative links), Hard (wordplay/trivia connections), Expert (abstract metaphors).

### 6. Crossclimb
- **Category:** Trivia ladder word morph
- **Mechanics:** Solve crossword-style clues to identify target words, then arrange them in a vertical ladder where each successive word differs by exactly one letter substitution.
- **Tagline:** *Answer the clues. Morph the letters. Climb to the top.*
- **Difficulties:** Easy (4-letter words, 4 rungs), Normal (5 rungs), Hard (6 rungs, harder trivia), Expert (7 rungs).

### 7. Tango
- **Category:** Binary deduction & balance
- **Mechanics:** 6×6 grid filled with Suns (☀️) and Moons (🌙). Every row and column must contain an equal number of Suns and Moons. No three consecutive identical symbols are permitted horizontally or vertically.
- **Tagline:** *Sun and Moon. Equal count. Never three in a row.*
- **Difficulties:** Easy (many starting symbols), Normal (standard constraints), Hard (sparse starting symbols), Expert (complex multi-line deduction).

### 8. Queens
- **Category:** Non-attacking royal placement
- **Mechanics:** An $N \times N$ board divided into color-coded territories. The player must place exactly one Queen in every row, every column, and each colored territory. Queens cannot touch horizontally, vertically, or diagonally (including adjacent diagonal corners).
- **Tagline:** *Claim your realm. Protect the crowns. Rule the board.*
- **Difficulties:** Easy (6×6 board), Normal (7×7 board), Hard (8×8 board), Expert (9×9 board with intricate territory shapes).
