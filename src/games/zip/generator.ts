import type { Rng } from '@/lib/rng';
import { ORTHO, inBounds } from '../shared';
import type { ZipDifficulty } from './config';
import { wallKey } from './logic';
import type { ZipPuzzle, ZipSolution, ZipWall, ZipWaypoint } from './types';

/**
 * Random Hamiltonian path on an n x n grid using "backbite" moves starting
 * from a serpentine path. Each move keeps the path Hamiltonian.
 */
export function randomHamiltonianPath(rng: Rng, n: number): ZipSolution {
  let path: ZipSolution = [];
  for (let r = 0; r < n; r++)
    for (let i = 0; i < n; i++) path.push([r, r % 2 === 0 ? i : n - 1 - i]);
  const steps = n * n * 40;
  for (let s = 0; s < steps; s++) {
    if (rng.chance(0.5)) path.reverse();
    // Backbite from the head: join head to a neighbour x = path[i], cut (i-1, i).
    const [hr, hc] = path[0];
    const [dr, dc] = rng.pick(ORTHO);
    const nr = hr + dr;
    const nc = hc + dc;
    if (!inBounds(nr, nc, n)) continue;
    const i = path.findIndex(([r, c]) => r === nr && c === nc);
    if (i <= 1) continue;
    path = path.slice(0, i).reverse().concat(path.slice(i));
  }
  return path;
}

export function generateZip(rng: Rng, cfg: ZipDifficulty): { puzzle: ZipPuzzle; solution: ZipSolution } {
  const n = cfg.size;
  const path = randomHamiltonianPath(rng, n);
  const total = n * n;

  // Waypoint indices: start, finish, and spread-out interior points.
  const interior = cfg.waypoints - 2;
  const indices = [0];
  const span = (total - 1) / (interior + 1);
  for (let k = 1; k <= interior; k++) {
    const centre = k * span;
    const jitter = Math.floor(span / 3);
    indices.push(Math.min(total - 2, Math.max(indices[indices.length - 1] + 1, Math.round(centre) + rng.int(-jitter, jitter))));
  }
  indices.push(total - 1);
  const waypoints: ZipWaypoint[] = indices.map((idx, k) => ({ r: path[idx][0], c: path[idx][1], n: k + 1 }));

  // Walls only between cells the solution does not step between.
  const used = new Set<string>();
  for (let i = 1; i < total; i++) used.add(wallKey(path[i - 1], path[i]));
  const candidates: ZipWall[] = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
      ] as const) {
        const b: [number, number] = [r + dr, c + dc];
        if (inBounds(b[0], b[1], n) && !used.has(wallKey([r, c], b))) candidates.push({ a: [r, c], b });
      }
  const walls = rng.shuffle(candidates).slice(0, cfg.walls);

  return { puzzle: { size: n, waypoints, walls }, solution: path };
}
