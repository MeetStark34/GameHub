import type { Msg } from '@/i18n/translate';
import { msg } from '../shared';
import type { ZipPuzzle } from './types';

export const wallKey = (a: [number, number], b: [number, number]) => {
  const [x, y] = a[0] * 100 + a[1] < b[0] * 100 + b[1] ? [a, b] : [b, a];
  return `${x[0]},${x[1]}|${y[0]},${y[1]}`;
};

/**
 * Rules: one continuous path visits every cell exactly once, moving
 * orthogonally, never through a wall, starting on 1, ending on the highest
 * number and passing the numbers in order.
 */
export function checkZip(puzzle: ZipPuzzle, path: [number, number][]): Msg | null {
  const n = puzzle.size;
  if (path.length !== n * n) return msg('zip.cover');
  const walls = new Set(puzzle.walls.map((w) => wallKey(w.a, w.b)));
  const seen = new Set<string>();
  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    if (r < 0 || c < 0 || r >= n || c >= n) return msg('zip.outside');
    const key = `${r},${c}`;
    if (seen.has(key)) return msg('zip.crosses');
    seen.add(key);
    if (i > 0) {
      const [pr, pc] = path[i - 1];
      if (Math.abs(pr - r) + Math.abs(pc - c) !== 1) return msg('zip.adjacent');
      if (walls.has(wallKey([pr, pc], [r, c]))) return msg('zip.wall');
    }
  }
  const index = new Map(path.map(([r, c], i) => [`${r},${c}`, i]));
  const ordered = [...puzzle.waypoints].sort((a, b) => a.n - b.n);
  let last = -1;
  for (const w of ordered) {
    const at = index.get(`${w.r},${w.c}`)!;
    if (at <= last) return msg('zip.order', { n: w.n, prev: w.n - 1 });
    last = at;
  }
  if (index.get(`${ordered[0].r},${ordered[0].c}`) !== 0) return msg('zip.start');
  const end = ordered[ordered.length - 1];
  if (index.get(`${end.r},${end.c}`) !== path.length - 1) return msg('zip.finish', { n: end.n });
  return null;
}
