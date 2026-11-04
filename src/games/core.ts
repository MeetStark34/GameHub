import type { Msg } from '@/i18n/translate';

/**
 * Dependency-free helpers shared by game logic. Boards import the logic
 * modules in the browser, so this file must stay free of zod and other
 * server-side validation (zod alone is ~30 KB gzipped); engine-only helpers
 * that need it live in ./shared.
 */

/** A translatable game message (key under gameMsg.* in src/i18n/messages). */
export const msg = (key: string, params?: Msg['params']): Msg => ({ key: `gameMsg.${key}`, params });

export type Cell = [row: number, col: number];

export const inBounds = (r: number, c: number, rows: number, cols = rows) =>
  r >= 0 && c >= 0 && r < rows && c < cols;

export const ORTHO: readonly Cell[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
