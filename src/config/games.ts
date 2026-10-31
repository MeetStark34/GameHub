import type { Difficulty, GameId } from '@/games/types';

/**
 * Client-safe game metadata. Gameplay rules live in each game's module;
 * this file holds presentation copy and the timing values used by scoring
 * and anti-cheat. All times are in seconds.
 */
export interface GameMeta {
  id: GameId;
  name: string;
  tagline: string;
  /** Short how-to-play bullets shown before and during play. */
  rules: string[];
  /** CSS variable holding this game's accent colour (see globals.css). */
  accentVar: string;
  /** Completing at or under par keeps the full time score. */
  parSeconds: Record<Difficulty, number>;
  /**
   * Completions faster than this are rejected as implausible. Kept far
   * below what a strong player can achieve so it never blocks real play.
   */
  minSeconds: Record<Difficulty, number>;
  /** Short description of what each difficulty changes. */
  difficultyNotes: Record<Difficulty, string>;
}

export const GAMES: Record<GameId, GameMeta> = {
  patches: {
    id: 'patches',
    name: 'Patches',
    tagline: 'Stitch the board into perfect rectangles.',
    rules: [
      'Drag to cut the board into rectangles.',
      'Every rectangle holds exactly one number, equal to its area.',
      'A shape hint (square, wide, tall) must be respected.',
    ],
    accentVar: '--game-patches',
    parSeconds: { easy: 60, normal: 120, hard: 210, expert: 360 },
    minSeconds: { easy: 3, normal: 5, hard: 7, expert: 9 },
    difficultyNotes: {
      easy: '5×5, every shape shown',
      normal: '6×6, most shapes shown',
      hard: '7×7, few shapes shown',
      expert: '8×8, no shape hints',
    },
  },
  sudoku: {
    id: 'sudoku',
    name: 'Mini Sudoku',
    tagline: 'Small grid, sharp logic.',
    rules: [
      'Fill every row, column and box with each number once.',
      'Pre-filled numbers stay put.',
      'Repeated numbers are highlighted as you go.',
    ],
    accentVar: '--game-sudoku',
    parSeconds: { easy: 45, normal: 120, hard: 180, expert: 300 },
    minSeconds: { easy: 3, normal: 6, hard: 8, expert: 10 },
    difficultyNotes: {
      easy: '4×4 warm-up',
      normal: '6×6 with generous givens',
      hard: '6×6 with few givens',
      expert: '6×6, minimal givens',
    },
  },
  zip: {
    id: 'zip',
    name: 'Zip',
    tagline: 'One line. Every cell. In order.',
    rules: [
      'Start on 1 and draw a single path through every cell.',
      'Pass the numbers in order and finish on the last one.',
      'Paths cannot cross walls or themselves.',
    ],
    accentVar: '--game-zip',
    parSeconds: { easy: 40, normal: 75, hard: 120, expert: 180 },
    minSeconds: { easy: 3, normal: 5, hard: 7, expert: 9 },
    difficultyNotes: {
      easy: '5×5, many waypoints',
      normal: '6×6 with walls',
      hard: '7×7, fewer waypoints',
      expert: '8×8, sparse waypoints',
    },
  },
  werd: {
    id: 'werd',
    name: 'Werd',
    tagline: 'Crack the hidden word. No guess limit.',
    rules: [
      'Guess the hidden word; every guess must be a real word.',
      'Green: right letter, right spot. Amber: in the word elsewhere.',
      'There is no guess limit, but fewer guesses score higher.',
    ],
    accentVar: '--game-werd',
    parSeconds: { easy: 90, normal: 120, hard: 150, expert: 180 },
    minSeconds: { easy: 1, normal: 1, hard: 1, expert: 1 },
    difficultyNotes: {
      easy: '4 letters',
      normal: '5 letters',
      hard: '6 letters',
      expert: '6 letters, strict mode',
    },
  },
  pinpoint: {
    id: 'pinpoint',
    name: 'Pinpoint',
    tagline: 'Find the thread that ties the clues together.',
    rules: [
      'Clues appear one at a time. Pick the category they share.',
      'A wrong pick rules that category out and reveals another clue.',
      'Fewer clues and fewer wrong picks score higher.',
    ],
    accentVar: '--game-pinpoint',
    parSeconds: { easy: 30, normal: 45, hard: 60, expert: 90 },
    minSeconds: { easy: 1, normal: 1, hard: 1, expert: 1 },
    difficultyNotes: {
      easy: '4 categories, clear clues',
      normal: '6 categories',
      hard: '6 look-alike categories',
      expert: '8 look-alike categories, cryptic clues',
    },
  },
  crossclimb: {
    id: 'crossclimb',
    name: 'Crossclimb',
    tagline: 'Climb from one word to another, a letter at a time.',
    rules: [
      'Fill each rung with a real word.',
      'Each word changes exactly one letter from the word above.',
      'Reach the bottom word using exactly the rungs given.',
    ],
    accentVar: '--game-crossclimb',
    parSeconds: { easy: 60, normal: 120, hard: 180, expert: 240 },
    minSeconds: { easy: 3, normal: 4, hard: 5, expert: 6 },
    difficultyNotes: {
      easy: '3-letter words, every step hinted',
      normal: '4-letter words, some hints',
      hard: '4-letter words, longer climb',
      expert: '5-letter words, no hints',
    },
  },
  tango: {
    id: 'tango',
    name: 'Tango',
    tagline: 'Balance sun and moon across the grid.',
    rules: [
      'Fill every cell with a sun or a moon.',
      'Each row and column has equal suns and moons; never three in a row.',
      '= joins matching cells, × joins opposite cells.',
    ],
    accentVar: '--game-tango',
    parSeconds: { easy: 60, normal: 120, hard: 180, expert: 300 },
    minSeconds: { easy: 3, normal: 5, hard: 8, expert: 10 },
    difficultyNotes: {
      easy: '6×6 with extra clues',
      normal: '6×6',
      hard: '8×8 with extra clues',
      expert: '8×8, minimal clues',
    },
  },
  queens: {
    id: 'queens',
    name: 'Queens',
    tagline: 'One crown per row, column and colour.',
    rules: [
      'Place one crown in every row, column and colour region.',
      'Crowns may never touch, not even diagonally.',
      'Tap once to mark ×, twice to place a crown.',
    ],
    accentVar: '--game-queens',
    parSeconds: { easy: 60, normal: 120, hard: 180, expert: 300 },
    minSeconds: { easy: 3, normal: 5, hard: 7, expert: 9 },
    difficultyNotes: {
      easy: '6×6',
      normal: '7×7',
      hard: '8×8',
      expert: '9×9',
    },
  },
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  expert: 'Expert',
};

/**
 * Daily Set difficulty by UTC weekday (0 = Sunday). The whole set shares one
 * difficulty so the day has a consistent feel: gentle early week, a stiff
 * Sunday.
 */
export const DAILY_DIFFICULTY_BY_WEEKDAY: Record<number, Difficulty> = {
  0: 'expert',
  1: 'easy',
  2: 'normal',
  3: 'normal',
  4: 'normal',
  5: 'hard',
  6: 'hard',
};
