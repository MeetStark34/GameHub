'use client';

import { useCallback, useMemo } from 'react';
import { tangoConflicts } from '@/games/tango/logic';
import type { TangoPuzzle } from '@/games/tango/types';
import { Button, cn } from '@/components/ui';
import { BoardFrame, useAutoSubmit, useGridFocus, useStoredState, type BoardProps } from '../board-kit';

function Sun() {
  return (
    <svg viewBox="0 0 24 24" className="size-[62%]" aria-hidden>
      <circle cx="12" cy="12" r="7" fill="var(--sun)" />
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="var(--sun)" strokeWidth="1.5" strokeDasharray="2.2 2.6" />
    </svg>
  );
}
function Moon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[58%]" aria-hidden>
      <path d="M17.5 17.6A8 8 0 0 1 9.1 4.2a8.5 8.5 0 1 0 8.4 13.4z" fill="var(--moon)" />
    </svg>
  );
}

export default function TangoBoard({ sessionId, puzzle, solved, busy, act }: BoardProps<TangoPuzzle>) {
  const n = puzzle.size;
  const [grid, setGrid] = useStoredState<number[][]>(`gh-board-${sessionId}`, () => puzzle.givens.map((r) => r.slice()));
  const { focus, setFocus, move, gridRef } = useGridFocus(n, n);
  const conflicts = useMemo(() => tangoConflicts(puzzle, grid), [puzzle, grid]);
  const full = grid.every((row) => row.every((v) => v >= 0));

  const cycle = useCallback(
    (r: number, c: number, to?: number) => {
      if (solved || puzzle.givens[r][c] >= 0) return;
      setGrid((g) => g.map((row, i) => (i === r ? row.map((v, j) => (j === c ? (to ?? (v === -1 ? 0 : v === 0 ? 1 : -1)) : v)) : row)));
    },
    [solved, puzzle.givens, setGrid],
  );
  const submit = useCallback(() => void act({ type: 'submit', solution: grid }), [act, grid]);
  useAutoSubmit(!solved && full && conflicts.size === 0, JSON.stringify(grid), submit);

  const pct = 100 / n;
  return (
    <BoardFrame size={n} label={`Tango board, ${n} by ${n}`}>
      <div className="relative">
        <div ref={gridRef} role="grid" className="board grid gap-1 rounded-xl bg-cell-line p-1" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {grid.map((row, r) =>
            row.map((v, c) => {
              const fixed = puzzle.givens[r][c] >= 0;
              const bad = conflicts.has(`${r},${c}`);
              return (
                <button
                  key={`${r}-${c}`}
                  data-r={r}
                  data-c={c}
                  role="gridcell"
                  tabIndex={focus[0] === r && focus[1] === c ? 0 : -1}
                  disabled={solved}
                  aria-label={`Row ${r + 1}, column ${c + 1}: ${v === 0 ? 'sun' : v === 1 ? 'moon' : 'empty'}${fixed ? ', fixed' : ''}${bad ? ', conflict' : ''}`}
                  onClick={() => {
                    setFocus([r, c]);
                    cycle(r, c);
                  }}
                  onKeyDown={(e) => {
                    if (move(e)) return;
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      cycle(r, c);
                    } else if (e.key.toLowerCase() === 's' || e.key === '1') cycle(r, c, 0);
                    else if (e.key.toLowerCase() === 'm' || e.key === '2') cycle(r, c, 1);
                    else if (e.key === 'Backspace' || e.key === 'Delete') cycle(r, c, -1);
                  }}
                  className={cn('grid aspect-square place-items-center rounded-md outline-offset-[-2px]', fixed ? 'bg-subtle' : 'bg-surface', bad && 'ring-2 ring-inset ring-danger')}
                >
                  {v === 0 && <Sun />}
                  {v === 1 && <Moon />}
                </button>
              );
            }),
          )}
        </div>
        {/* Edge signs sit on the gap between two cells. */}
        <div className="pointer-events-none absolute inset-1" aria-hidden>
          {puzzle.edges.map((e, i) => {
            const horizontal = e.a[0] === e.b[0];
            const top = horizontal ? (e.a[0] + 0.5) * pct : (e.a[0] + 1) * pct;
            const left = horizontal ? (e.a[1] + 1) * pct : (e.a[1] + 0.5) * pct;
            return (
              <span
                key={i}
                className="absolute grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-card font-mono text-[11px] font-bold leading-none"
                style={{ top: `${top}%`, left: `${left}%` }}
              >
                {e.kind === 'same' ? '=' : '×'}
              </span>
            );
          })}
        </div>
      </div>
      <ul className="sr-only">
        {puzzle.edges.map((e, i) => (
          <li key={i}>
            Row {e.a[0] + 1} column {e.a[1] + 1} and row {e.b[0] + 1} column {e.b[1] + 1} must be {e.kind === 'same' ? 'the same' : 'opposite'}.
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between text-sm text-muted">
        <span>Tap: sun → moon → empty. Keys: S, M, Space.</span>
        <Button variant="ghost" size="sm" disabled={solved || busy} onClick={() => setGrid(puzzle.givens.map((r) => r.slice()))}>
          Clear
        </Button>
      </div>
    </BoardFrame>
  );
}
