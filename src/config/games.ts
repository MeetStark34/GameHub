import type { Difficulty, GameId } from '@/games/types';

/**
 * Client-safe game metadata used by scoring and anti-cheat. All times are
 * in seconds. Player-facing copy (taglines, rules, difficulty notes) lives
 * in the i18n dictionaries under `games.<id>` (src/i18n/messages/*.ts).
 * Game names are brand names and are not translated.
 */
export interface GameMeta {
  id: GameId;
  name: string;
  /** CSS variable holding this game's accent colour (see globals.css). */
  accentVar: string;
  /** Completing at or under par keeps the full time score. */
  parSeconds: Record<Difficulty, number>;
  /**
   * Completions faster than this are refused as implausible. Kept far
   * below what a strong player can achieve so it never blocks real play.
   */
  minSeconds: Record<Difficulty, number>;
}

export const GAMES: Record<GameId, GameMeta> = {
  patches: {
    id: 'patches',
    name: 'Patches',
    accentVar: '--game-patches',
    parSeconds: { easy: 60, normal: 120, hard: 210, expert: 360 },
    minSeconds: { easy: 3, normal: 5, hard: 7, expert: 9 },
  },
  sudoku: {
    id: 'sudoku',
    name: 'Mini Sudoku',
    accentVar: '--game-sudoku',
    parSeconds: { easy: 45, normal: 120, hard: 180, expert: 300 },
    minSeconds: { easy: 3, normal: 6, hard: 8, expert: 10 },
  },
  zip: {
    id: 'zip',
    name: 'Zip',
    accentVar: '--game-zip',
    parSeconds: { easy: 40, normal: 75, hard: 120, expert: 180 },
    minSeconds: { easy: 3, normal: 5, hard: 7, expert: 9 },
  },
  werd: {
    id: 'werd',
    name: 'Werd',
    accentVar: '--game-werd',
    parSeconds: { easy: 90, normal: 120, hard: 150, expert: 180 },
    minSeconds: { easy: 1, normal: 1, hard: 1, expert: 1 },
  },
  pinpoint: {
    id: 'pinpoint',
    name: 'Pinpoint',
    accentVar: '--game-pinpoint',
    parSeconds: { easy: 30, normal: 45, hard: 60, expert: 90 },
    minSeconds: { easy: 1, normal: 1, hard: 1, expert: 1 },
  },
  crossclimb: {
    id: 'crossclimb',
    name: 'Crossclimb',
    accentVar: '--game-crossclimb',
    parSeconds: { easy: 75, normal: 120, hard: 180, expert: 240 },
    minSeconds: { easy: 4, normal: 5, hard: 6, expert: 7 },
  },
  tango: {
    id: 'tango',
    name: 'Tango',
    accentVar: '--game-tango',
    parSeconds: { easy: 60, normal: 120, hard: 180, expert: 300 },
    minSeconds: { easy: 3, normal: 5, hard: 8, expert: 10 },
  },
  queens: {
    id: 'queens',
    name: 'Queens',
    accentVar: '--game-queens',
    parSeconds: { easy: 60, normal: 120, hard: 180, expert: 300 },
    minSeconds: { easy: 3, normal: 5, hard: 7, expert: 9 },
  },
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
