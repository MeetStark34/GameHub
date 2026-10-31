/**
 * Shared scoring: 0..1000. Time is measured by the server. Finishing at or
 * under par keeps the full time factor; slower runs decay gently to 50% at
 * 4x par. Taking longer never fails a game.
 */
export function computeScore(durationMs: number, parSeconds: number, penalty: number): number {
  const t = durationMs / 1000;
  const over = Math.max(0, t - parSeconds) / (3 * parSeconds);
  const timeFactor = 1 - 0.5 * Math.min(1, over);
  const accuracy = 1 - Math.min(0.9, Math.max(0, penalty));
  return Math.round(1000 * timeFactor * accuracy);
}

export const isPerfect = (durationMs: number, parSeconds: number, penalty: number) =>
  penalty === 0 && durationMs <= parSeconds * 1000;
