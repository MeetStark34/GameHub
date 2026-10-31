'use client';

import { useCallback, useMemo, useRef } from 'react';
import { Undo2 } from 'lucide-react';
import { wallKey } from '@/games/zip/logic';
import type { ZipPuzzle } from '@/games/zip/types';
import { useI18n } from '@/i18n/client';
import { Button, cn } from '@/components/ui';
import { BoardFrame, cellAt, useAutoSubmit, useStoredState, type BoardProps } from '../board-kit';

type Cell = [number, number];

export default function ZipBoard({ sessionId, puzzle, solved, busy, act }: BoardProps<ZipPuzzle>) {
  const n = puzzle.size;
  const { t } = useI18n();
  const ordered = useMemo(() => [...puzzle.waypoints].sort((a, b) => a.n - b.n), [puzzle.waypoints]);
  const start: Cell = [ordered[0].r, ordered[0].c];
  const [path, setPath] = useStoredState<Cell[]>(`gh-board-${sessionId}`, () => [start]);
  const dragging = useRef(false);
  const walls = useMemo(() => new Set(puzzle.walls.map((w) => wallKey(w.a, w.b))), [puzzle.walls]);
  const numberAt = useMemo(() => new Map(puzzle.waypoints.map((w) => [`${w.r},${w.c}`, w.n])), [puzzle.waypoints]);
  const indexOf = useMemo(() => new Map(path.map(([r, c], i) => [`${r},${c}`, i])), [path]);

  /** Try to step the path to `cell`: extend, backtrack, or truncate. */
  const stepTo = useCallback(
    (cell: Cell) => {
      if (solved) return;
      setPath((p) => {
        const key = `${cell[0]},${cell[1]}`;
        const idx = p.findIndex(([r, c]) => `${r},${c}` === key);
        if (idx >= 0) return p.slice(0, idx + 1); // retract to that cell
        const [lr, lc] = p[p.length - 1];
        if (Math.abs(lr - cell[0]) + Math.abs(lc - cell[1]) !== 1) return p;
        if (walls.has(wallKey([lr, lc], cell))) return p;
        const num = numberAt.get(key);
        if (num !== undefined) {
          const reached = Math.max(...p.map(([r, c]) => numberAt.get(`${r},${c}`) ?? 0));
          if (num !== reached + 1) return p; // numbers must be visited in order
        }
        return [...p, cell];
      });
    },
    [solved, setPath, walls, numberAt],
  );

  const full = path.length === n * n;
  const last = path[path.length - 1];
  const endsRight = last[0] === ordered[ordered.length - 1].r && last[1] === ordered[ordered.length - 1].c;
  const submit = useCallback(() => void act({ type: 'submit', solution: path }), [act, path]);
  useAutoSubmit(!solved && full && endsRight, JSON.stringify(path), submit);

  const onKey = (e: React.KeyboardEvent) => {
    const d: Record<string, Cell> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (d[e.key]) {
      e.preventDefault();
      const next: Cell = [last[0] + d[e.key][0], last[1] + d[e.key][1]];
      if (next[0] >= 0 && next[1] >= 0 && next[0] < n && next[1] < n) {
        const prev = path[path.length - 2];
        if (prev && prev[0] === next[0] && prev[1] === next[1]) setPath(path.slice(0, -1));
        else stepTo(next);
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (path.length > 1) setPath(path.slice(0, -1));
    }
  };

  const pts = path.map(([r, c]) => `${((c + 0.5) / n) * 100},${((r + 0.5) / n) * 100}`).join(' ');

  return (
    <BoardFrame size={n} label={t('boards.board', { game: 'Zip', size: `${n}×${n}` })}>
      <div
        role="application"
        tabIndex={0}
        aria-label={t('boards.zipApp', { count: path.length, total: n * n })}
        onKeyDown={onKey}
        className="board relative overflow-hidden rounded-xl border-[2.5px] border-fg bg-surface"
        onPointerDown={(e) => {
          const cell = cellAt(e.clientX, e.clientY);
          if (!cell) return;
          dragging.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          stepTo(cell);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          const cell = cellAt(e.clientX, e.clientY);
          if (cell) stepTo(cell);
        }}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {Array.from({ length: n * n }, (_, i) => {
            const r = Math.floor(i / n);
            const c = i % n;
            const on = indexOf.has(`${r},${c}`);
            return (
              <div
                key={i}
                data-r={r}
                data-c={c}
                className={cn('relative grid aspect-square place-items-center', on ? 'bg-[color-mix(in_oklab,var(--game-zip)_14%,var(--game-surface))]' : 'bg-cell')}
                style={{
                  borderRight: c < n - 1 ? (walls.has(wallKey([r, c], [r, c + 1])) ? '4px solid var(--fg)' : '1px solid var(--cell-line)') : undefined,
                  borderBottom: r < n - 1 ? (walls.has(wallKey([r, c], [r + 1, c])) ? '4px solid var(--fg)' : '1px solid var(--cell-line)') : undefined,
                }}
              />
            );
          })}
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
          <polyline points={pts} fill="none" stroke="var(--game-zip)" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ strokeWidth: `calc(min(100vw, 460px) / ${n * 3.2})` }} />
        </svg>
        <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }} aria-hidden>
          {Array.from({ length: n * n }, (_, i) => {
            const num = numberAt.get(`${Math.floor(i / n)},${i % n}`);
            return (
              <div key={i} className="grid aspect-square place-items-center">
                {num !== undefined && (
                  <span className="grid size-[62%] place-items-center rounded-full bg-fg font-display text-[min(5vw,1.25rem)] font-bold text-bg">{num}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-muted">
        <span className="num">
          {t('boards.cells', { count: path.length, total: n * n })}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" disabled={solved || busy || path.length < 2} onClick={() => setPath(path.slice(0, -1))}>
            <Undo2 className="size-4" aria-hidden /> {t('common.undo')}
          </Button>
          <Button variant="ghost" size="sm" disabled={solved || busy} onClick={() => setPath([start])}>
            {t('common.clear')}
          </Button>
        </div>
      </div>
    </BoardFrame>
  );
}
