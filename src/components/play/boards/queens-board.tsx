'use client';

import { useCallback, useMemo, useRef } from 'react';
import { Crown, X } from 'lucide-react';
import { queensConflicts } from '@/games/queens/logic';
import type { QueensPuzzle } from '@/games/queens/types';
import { useI18n } from '@/i18n/client';
import { Button, cn } from '@/components/ui';
import { BoardFrame, cellAt, regionColor, useAutoSubmit, useGridFocus, useStoredState, type BoardProps } from '../board-kit';

type Mark = 0 | 1 | 2; // empty, x, crown

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
    if (!d.moved) {
      d.moved = true;
      setCell(d.start[0], d.start[1], (m) => (m === 0 ? 1 : m));
    }
    d.last = `${cell[0]},${cell[1]}`;
    setCell(cell[0], cell[1], (m) => (m === 0 ? 1 : m)); // drag paints ×
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) setCell(d.start[0], d.start[1], (m) => ((m + 1) % 3) as Mark);
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
                aria-label={`${t('boards.cell', { r: r + 1, c: c + 1 })}, ${t('boards.region', { n: reg + 1 })}: ${t(m === 2 ? 'boards.crown' : m === 1 ? 'boards.marked' : 'boards.empty')}${bad ? `, ${t('boards.conflict')}` : ''}`}
                onPointerDown={(e) => onPointerDown(e, r, c)}
                onKeyDown={(e) => {
                  if (move(e)) return;
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setCell(r, c, (x) => ((x + 1) % 3) as Mark);
                  } else if (e.key.toLowerCase() === 'q') setCell(r, c, () => 2);
                  else if (e.key.toLowerCase() === 'x') setCell(r, c, () => 1);
                  else if (e.key === 'Backspace' || e.key === 'Delete') setCell(r, c, () => 0);
                }}
                className="relative grid aspect-square place-items-center outline-offset-[-3px]"
                style={{ background: regionColor(reg), ...border(r, c) }}
              >
                {m === 1 && <X className="size-[38%] opacity-50" aria-hidden />}
                {m === 2 && <Crown className={cn('animate-pop size-[58%]', bad ? 'text-danger' : 'text-fg')} strokeWidth={2.2} aria-hidden />}
              </button>
            );
          }),
        )}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-muted">
        <span className="num">
          {t('boards.crowns', { count: crowns.length, total: n })}
        </span>
        <Button variant="ghost" size="sm" disabled={solved || busy} onClick={() => setMarks(Array.from({ length: n }, () => Array<Mark>(n).fill(0)))}>
          {t('common.clear')}
        </Button>
      </div>
    </BoardFrame>
  );
}
