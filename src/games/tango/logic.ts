import type { TangoEdge, TangoPuzzle } from './types';

/**
 * Rules:
 *  1. every cell holds a Sun (0) or a Moon (1);
 *  2. each row and column holds the same number of each;
 *  3. no three identical symbols in a row, horizontally or vertically;
 *  4. "=" edges join equal cells, "x" edges join opposite cells;
 *  5. pre-filled cells cannot change.
 */
export function checkTango(puzzle: TangoPuzzle, grid: number[][]): string | null {
  const n = puzzle.size;
  if (grid.length !== n || grid.some((row) => row.length !== n)) return 'The grid is the wrong shape.';
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (grid[r][c] !== 0 && grid[r][c] !== 1) return 'Fill every cell.';
      if (puzzle.givens[r][c] !== -1 && puzzle.givens[r][c] !== grid[r][c]) return 'A fixed cell was changed.';
    }
  for (let i = 0; i < n; i++) {
    let rowSuns = 0;
    let colSuns = 0;
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 0) rowSuns++;
      if (grid[j][i] === 0) colSuns++;
    }
    if (rowSuns * 2 !== n) return `Row ${i + 1} must have equal suns and moons.`;
    if (colSuns * 2 !== n) return `Column ${i + 1} must have equal suns and moons.`;
  }
  for (let i = 0; i < n; i++)
    for (let j = 0; j + 2 < n; j++) {
      if (grid[i][j] === grid[i][j + 1] && grid[i][j] === grid[i][j + 2]) return 'Three in a row is not allowed.';
      if (grid[j][i] === grid[j + 1][i] && grid[j][i] === grid[j + 2][i]) return 'Three in a column is not allowed.';
    }
  for (const e of puzzle.edges) {
    const same = grid[e.a[0]][e.a[1]] === grid[e.b[0]][e.b[1]];
    if (same !== (e.kind === 'same')) return e.kind === 'same' ? 'An "=" pair must match.' : 'An "x" pair must differ.';
  }
  return null;
}

/** Live conflict detection on a partially filled grid (cells as "r,c"). */
export function tangoConflicts(puzzle: TangoPuzzle, grid: number[][]): Set<string> {
  const n = puzzle.size;
  const bad = new Set<string>();
  const v = (r: number, c: number) => grid[r]?.[c];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j + 2 < n; j++) {
      if (v(i, j) >= 0 && v(i, j) === v(i, j + 1) && v(i, j) === v(i, j + 2))
        [0, 1, 2].forEach((k) => bad.add(`${i},${j + k}`));
      if (v(j, i) >= 0 && v(j, i) === v(j + 1, i) && v(j, i) === v(j + 2, i))
        [0, 1, 2].forEach((k) => bad.add(`${j + k},${i}`));
    }
    for (const val of [0, 1]) {
      if (grid[i].filter((x) => x === val).length > n / 2) for (let j = 0; j < n; j++) if (v(i, j) === val) bad.add(`${i},${j}`);
      if (grid.filter((row) => row[i] === val).length > n / 2) for (let j = 0; j < n; j++) if (v(j, i) === val) bad.add(`${j},${i}`);
    }
  }
  for (const e of puzzle.edges) {
    const x = v(e.a[0], e.a[1]);
    const y = v(e.b[0], e.b[1]);
    if (x < 0 || y < 0) continue;
    if ((x === y) !== (e.kind === 'same')) {
      bad.add(`${e.a[0]},${e.a[1]}`);
      bad.add(`${e.b[0]},${e.b[1]}`);
    }
  }
  return bad;
}

/** Counts solutions up to `limit`. Cells filled in reading order with pruning. */
export function solveTango(
  puzzle: TangoPuzzle,
  limit = 2,
  order?: () => [number, number],
): { count: number; solution: number[][] | null } {
  const n = puzzle.size;
  const half = n / 2;
  const g = puzzle.givens.map((row) => row.slice());
  const edgeAt = new Map<string, TangoEdge['kind']>();
  for (const e of puzzle.edges) {
    edgeAt.set(`${e.a[0]},${e.a[1]}|${e.b[0]},${e.b[1]}`, e.kind);
    edgeAt.set(`${e.b[0]},${e.b[1]}|${e.a[0]},${e.a[1]}`, e.kind);
  }
  const rowCnt = Array.from({ length: n }, () => [0, 0]);
  const colCnt = Array.from({ length: n }, () => [0, 0]);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (g[r][c] >= 0) {
        rowCnt[r][g[r][c]]++;
        colCnt[c][g[r][c]]++;
      }

  const ok = (r: number, c: number, val: number): boolean => {
    if (rowCnt[r][val] >= half || colCnt[c][val] >= half) return false;
    const at = (rr: number, cc: number) => (rr < 0 || cc < 0 || rr >= n || cc >= n ? -2 : rr === r && cc === c ? val : g[rr][cc]);
    for (let k = -2; k <= 0; k++) {
      if (at(r, c + k) === val && at(r, c + k + 1) === val && at(r, c + k + 2) === val) return false;
      if (at(r + k, c) === val && at(r + k + 1, c) === val && at(r + k + 2, c) === val) return false;
    }
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nr = r + dr;
      const nc = c + dc;
      const nv = at(nr, nc);
      if (nv < 0) continue;
      const kind = edgeAt.get(`${r},${c}|${nr},${nc}`);
      if (kind && (nv === val) !== (kind === 'same')) return false;
    }
    return true;
  };

  // Pre-filled cells must be mutually consistent.
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (g[r][c] >= 0) {
        const val = g[r][c];
        g[r][c] = -1;
        rowCnt[r][val]--;
        colCnt[c][val]--;
        const fine = ok(r, c, val);
        g[r][c] = val;
        rowCnt[r][val]++;
        colCnt[c][val]++;
        if (!fine) return { count: 0, solution: null };
      }

  let count = 0;
  let solution: number[][] | null = null;
  const go = (idx: number) => {
    if (count >= limit) return;
    while (idx < n * n && g[Math.floor(idx / n)][idx % n] >= 0) idx++;
    if (idx === n * n) {
      count++;
      if (!solution) solution = g.map((row) => row.slice());
      return;
    }
    const r = Math.floor(idx / n);
    const c = idx % n;
    for (const val of order ? order() : [0, 1]) {
      if (!ok(r, c, val)) continue;
      g[r][c] = val;
      rowCnt[r][val]++;
      colCnt[c][val]++;
      go(idx + 1);
      g[r][c] = -1;
      rowCnt[r][val]--;
      colCnt[c][val]--;
      if (count >= limit) return;
    }
  };
  go(0);
  return { count, solution };
}
