'use client';

import { useCallback, useMemo, useState } from 'react';
import { Delete } from 'lucide-react';
import { sudokuConflicts } from '@/games/sudoku/logic';
import type { SudokuPuzzle } from '@/games/sudoku/types';
import { useI18n } from '@/i18n/client';
import { cn } from '@/components/ui';
import { BoardFrame, useAutoSubmit, useGridFocus, useStoredState, type BoardProps } from '../board-kit';

export default function SudokuBoard({ sessionId, puzzle, solved, act }: BoardProps<SudokuPuzzle>) {
  const n = puzzle.size;
  const { t } = useI18n();
  const [grid, setGrid] = useStoredState<number[][]>(`gh-board-${sessionId}`, () => puzzle.givens.map((r) => r.slice()));
  const { focus, setFocus, move, gridRef } = useGridFocus(n, n);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const conflicts = useMemo(() => sudokuConflicts(puzzle, grid), [puzzle, grid]);
  const full = grid.every((row) => row.every((v) => v > 0));

  const write = useCallback(
    (v: number) => {
      const [r, c] = sel ?? focus;
      if (solved || puzzle.givens[r][c]) return;
      setGrid((g) => g.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)));
    },
    [sel, focus, solved, puzzle.givens, setGrid],
  );

  const submit = useCallback(() => void act({ type: 'submit', solution: grid }), [act, grid]);
  useAutoSubmit(!solved && full && conflicts.size === 0, JSON.stringify(grid), submit);

  const active = sel ?? focus;
  const activeVal = grid[active[0]][active[1]];
  const box = (r: number, c: number) => Math.floor(r / puzzle.boxRows) * 10 + Math.floor(c / puzzle.boxCols);

  return (
    <BoardFrame size={n} label={t('boards.board', { game: 'Mini Sudoku', size: `${n}×${n}` })}>
      <div
        ref={gridRef}
        role="grid"
        className="board grid overflow-hidden rounded-xl border-[2.5px] border-fg bg-surface"
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
      >
        {grid.map((row, r) =>
          row.map((v, c) => {
            const given = !!puzzle.givens[r][c];
            const isSel = active[0] === r && active[1] === c;
            const related = r === active[0] || c === active[1] || box(r, c) === box(active[0], active[1]);
            const same = v > 0 && v === activeVal;
            const bad = conflicts.has(`${r},${c}`);
            return (
              <button
                key={`${r}-${c}`}
                data-r={r}
                data-c={c}
                role="gridcell"
                tabIndex={focus[0] === r && focus[1] === c ? 0 : -1}
                aria-label={`${t('boards.cell', { r: r + 1, c: c + 1 })}: ${v || t('boards.empty')}${given ? `, ${t('boards.given')}` : ''}${bad ? `, ${t('boards.conflict')}` : ''}`}
                disabled={solved}
                onClick={() => {
                  setSel([r, c]);
                  setFocus([r, c]);
                }}
                onFocus={() => setSel([r, c])}
                onKeyDown={(e) => {
                  if (move(e)) {
                    setSel(null);
                    return;
                  }
                  const d = Number(e.key);
                  if (d >= 1 && d <= n) write(d);
                  else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') write(0);
                }}
                className={cn(
                  'grid aspect-square place-items-center font-display text-[min(7vw,1.75rem)] font-semibold outline-offset-[-3px]',
                  isSel ? 'bg-accent-soft' : same ? 'bg-accent/20' : related ? 'bg-subtle' : 'bg-cell',
                  given ? 'text-fg' : 'text-accent',
                  bad && 'text-danger',
                )}
                style={{
                  borderRight: c < n - 1 ? ((c + 1) % puzzle.boxCols === 0 ? '2px solid var(--fg)' : '1px solid var(--cell-line)') : undefined,
                  borderBottom: r < n - 1 ? ((r + 1) % puzzle.boxRows === 0 ? '2px solid var(--fg)' : '1px solid var(--cell-line)') : undefined,
                }}
              >
                {v || ''}
              </button>
            );
          }),
        )}
      </div>
      <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${n + 1}, 1fr)` }}>
        {Array.from({ length: n }, (_, i) => i + 1).map((d) => (
          <button key={d} disabled={solved} onClick={() => write(d)} className="h-12 rounded-xl border border-border bg-card font-display text-xl font-semibold hover:bg-elevated active:scale-95" aria-label={t('boards.enter', { n: d })}>
            {d}
          </button>
        ))}
        <button disabled={solved} onClick={() => write(0)} className="grid h-12 place-items-center rounded-xl border border-border bg-card hover:bg-elevated" aria-label={t('boards.erase')}>
          <Delete className="size-5" aria-hidden />
        </button>
      </div>
    </BoardFrame>
  );
}
