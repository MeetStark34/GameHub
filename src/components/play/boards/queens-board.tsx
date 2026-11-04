'use client';

import { useCallback, useMemo, useRef } from 'react';
import { Crown, X } from 'lucide-react';
import { queensBlockedCells, queensConflicts } from '@/games/queens/logic';
import type { QueensPuzzle } from '@/games/queens/types';
import { useI18n } from '@/i18n/client';
import { Button, cn } from '@/components/ui';
import { BoardFrame, cellAt, regionColor, useAutoSubmit, useGridFocus, useStoredState, type BoardProps } from '../board-kit';

type Mark = 0 | 1 | 2; // empty, x, crown (the player's own marks; Auto X marks are derived, never stored)
const NONE: ReadonlySet<string> = new Set();
/** Tap / Space cycle. A cell showing an automatic X behaves like an X: the next step is a crown. */
const nextMark = (m: Mark, autoMarked: boolean): Mark => (m === 0 && autoMarked ? 2 : (((m + 1) % 3) as Mark));

export default function QueensBoard({ sessionId, puzzle, solved, busy, act }: BoardProps<QueensPuzzle>) {
  const n = puzzle.size;
  const { t } = useI18n();
  const [marks, setMarks] = useStoredState<Mark[][]>(`gh-board-${sessionId}`, () => Array.from({ length: n }, () => Array<Mark>(n).fill(0)));
  const { focus, setFocus, move, gridRef } = useGridFocus(n, n);
  const drag = useRef<{ start: [number, number]; moved: boolean; last: string } | null>(null);

  const crowns = useMemo(() => {
    const out: [number, number][] = [];
    marks.forEach((row, r) => row.forEach((m, c) => m === 2 && out.push([r, c])));
    return out;
  }, [marks]);
  const conflicts = useMemo(() => queensConflicts(puzzle, crowns), [puzzle, crowns]);
  // Auto X: a per-browser preference. Its marks are recomputed from the crowns on every change,
  // so removing or moving a crown updates them and manual X marks are never touched.
  const [autoX, setAutoX] = useStoredState<boolean>('gh-queens-auto-x', () => false);
  const autoMarks = useMemo(() => (autoX ? queensBlockedCells(puzzle, crowns) : NONE), [autoX, puzzle, crowns]);
  const isAuto = useCallback((r: number, c: number) => autoMarks.has(`${r},${c}`), [autoMarks]);

  const setCell = useCallback(
    (r: number, c: number, f: (m: Mark) => Mark) => {
      if (solved) return;
      setMarks((prev) => prev.map((row, i) => (i === r ? row.map((m, j) => (j === c ? f(m) : m)) : row)));
    },
    [setMarks, solved],
  );

  const submit = useCallback(() => void act({ type: 'submit', solution: crowns }), [act, crowns]);
  useAutoSubmit(!solved && crowns.length === n && conflicts.size === 0, JSON.stringify(crowns), submit);

  const onPointerDown = (e: React.PointerEvent, r: number, c: number) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    drag.current = { start: [r, c], moved: false, last: `${r},${c}` };
    setFocus([r, c]);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (!cell || `${cell[0]},${cell[1]}` === d.last) return;
    // Drag paints ×; cells already showing an automatic × are left automatic.
    if (!d.moved) {
      d.moved = true;
      if (!isAuto(d.start[0], d.start[1])) setCell(d.start[0], d.start[1], (m) => (m === 0 ? 1 : m));
    }
    d.last = `${cell[0]},${cell[1]}`;
    if (!isAuto(cell[0], cell[1])) setCell(cell[0], cell[1], (m) => (m === 0 ? 1 : m));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) {
      const auto = isAuto(d.start[0], d.start[1]);
      setCell(d.start[0], d.start[1], (m) => nextMark(m, auto));
    }
  };

  const border = (r: number, c: number) => {
    const reg = puzzle.regions[r][c];
    const thick = '2.5px solid var(--fg)';
    const thin = '1px solid var(--cell-line)';
    return {
      borderTop: r === 0 || puzzle.regions[r - 1][c] !== reg ? thick : thin,
      borderLeft: c === 0 || puzzle.regions[r][c - 1] !== reg ? thick : thin,
      borderRight: c === n - 1 ? thick : undefined,
      borderBottom: r === n - 1 ? thick : undefined,
    };
  };

  return (
    <BoardFrame size={n} label={t('boards.board', { game: 'Queens', size: `${n}×${n}` })}>
      <div
        ref={gridRef}
        role="grid"
        aria-label={t('boards.placeCrowns')}
        className="board grid overflow-hidden rounded-xl"
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => (drag.current = null)}
      >
        {puzzle.regions.map((row, r) =>
          row.map((reg, c) => {
            const m = marks[r][c];
            const auto = m === 0 && autoMarks.has(`${r},${c}`);
            const bad = m === 2 && conflicts.has(`${r},${c}`);
            const isFocus = focus[0] === r && focus[1] === c;
            return (
              <button
                key={`${r}-${c}`}
                data-r={r}
                data-c={c}
                role="gridcell"
                tabIndex={isFocus ? 0 : -1}
                disabled={solved}
                aria-label={`${t('boards.cell', { r: r + 1, c: c + 1 })}, ${t('boards.region', { n: reg + 1 })}: ${t(m === 2 ? 'boards.crown' : m === 1 ? 'boards.marked' : auto ? 'boards.autoMarked' : 'boards.empty')}${bad ? `, ${t('boards.conflict')}` : ''}`}
                onPointerDown={(e) => onPointerDown(e, r, c)}
                onKeyDown={(e) => {
                  if (move(e)) return;
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setCell(r, c, (x) => nextMark(x, auto));
                  } else if (e.key.toLowerCase() === 'q') setCell(r, c, () => 2);
                  else if (e.key.toLowerCase() === 'x') setCell(r, c, () => 1);
                  else if (e.key === 'Backspace' || e.key === 'Delete') setCell(r, c, () => 0);
                }}
                className="relative grid aspect-square place-items-center outline-offset-[-3px]"
                style={{ background: regionColor(reg), ...border(r, c) }}
              >
                {m === 1 && <X className="size-[38%] opacity-50" aria-hidden />}
                {auto && <X data-auto-x className="size-[34%] opacity-30" aria-hidden />}
                {m === 2 && <Crown className={cn('animate-pop size-[58%]', bad ? 'text-danger' : 'text-fg')} strokeWidth={2.2} aria-hidden />}
              </button>
            );
          }),
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span className="num">
          {t('boards.crowns', { count: crowns.length, total: n })}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-pressed={autoX}
            aria-describedby="queens-auto-x-hint"
            title={t('boards.autoXHint')}
            disabled={solved}
            onClick={() => setAutoX((v) => !v)}
            className={cn(
              'inline-flex h-8 select-none items-center gap-1.5 rounded-xl border pl-2.5 pr-1.5 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50',
              autoX ? 'border-accent bg-accent text-accent-fg shadow-sm hover:brightness-110' : 'border-border bg-card text-fg hover:bg-elevated',
            )}
          >
            <X className="size-4" strokeWidth={2.5} aria-hidden />
            {t('boards.autoX')}
            <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase leading-none', autoX ? 'bg-black/15' : 'bg-subtle text-muted')}>
              {autoX ? t('boards.on') : t('boards.off')}
            </span>
          </button>
          <span id="queens-auto-x-hint" className="sr-only">
            {t('boards.autoXHint')}
          </span>
          <Button variant="ghost" size="sm" disabled={solved || busy} onClick={() => setMarks(Array.from({ length: n }, () => Array<Mark>(n).fill(0)))}>
            {t('common.clear')}
          </Button>
        </div>
      </div>
    </BoardFrame>
  );
}
