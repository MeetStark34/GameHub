import { isDifficulty, isGameId, type Difficulty, type GameId, type GameMode } from '@/games/types';

export interface PlayTarget {
  game: GameId;
  mode: GameMode;
  difficulty: Difficulty;
}

/**
 * Reads a play page's game, mode and difficulty from its route parts. The
 * play page and the client that starts a session early on click both use
 * it, so they always agree on which session a URL opens.
 */
export function playTarget(game: string, mode: string | null | undefined, difficulty: string | null | undefined): PlayTarget | null {
  if (!isGameId(game)) return null;
  return {
    game,
    mode: mode === 'unlimited' ? 'unlimited' : 'daily',
    difficulty: isDifficulty(difficulty) ? difficulty : 'normal',
  };
}

/** The play target of a same-origin `/play/<game>` URL, or null for any other URL. */
export function playTargetFromUrl(url: URL): PlayTarget | null {
  const m = /^\/play\/([^/]+)\/?$/.exec(url.pathname);
  return m ? playTarget(decodeURIComponent(m[1]), url.searchParams.get('mode'), url.searchParams.get('difficulty')) : null;
}
