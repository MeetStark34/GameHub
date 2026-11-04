import type { ComponentType } from 'react';
import type { GameId } from '@/games/types';
import type { BoardProps } from './board-kit';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BoardComponent = ComponentType<BoardProps<any>>;

/**
 * Code-split: each game's board only loads when that game is played (or a
 * link to it is hovered, see PlayIntent). The chunk is fetched in parallel
 * with the session rather than through next/dynamic, whose Suspense fallback
 * made React hold the board back for its ~300 ms reveal throttle even when
 * everything had arrived.
 */
export const BOARD_LOADERS: Record<GameId, () => Promise<{ default: BoardComponent }>> = {
  patches: () => import('./boards/patches-board'),
  sudoku: () => import('./boards/sudoku-board'),
  zip: () => import('./boards/zip-board'),
  werd: () => import('./boards/werd-board'),
  pinpoint: () => import('./boards/pinpoint-board'),
  crossclimb: () => import('./boards/crossclimb-board'),
  tango: () => import('./boards/tango-board'),
  queens: () => import('./boards/queens-board'),
};

/** Starts downloading a board's chunk; safe to call repeatedly. */
export function preloadBoard(game: GameId): void {
  BOARD_LOADERS[game]().catch(() => {
    // The play page retries and reports a failed chunk itself.
  });
}
