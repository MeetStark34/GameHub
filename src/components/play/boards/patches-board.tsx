'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { shapeOf } from '@/games/patches/logic';
import type { PatchRect, PatchShape, PatchesPuzzle } from '@/games/patches/types';
import { useI18n } from '@/i18n/client';
import { Button, cn } from '@/components/ui';
import { BoardFrame, cellAt, regionColor, useAutoSubmit, useGridFocus, useStoredState, type BoardProps } from '../board-kit';

type Cell = [number, number];
const rectFrom = (a: Cell, b: Cell): PatchRect => ({
  r: Math.min(a[0], b[0]),
  c: Math.min(a[1], b[1]),
  h: Math.abs(a[0] - b[0]) + 1,
  w: Math.abs(a[1] - b[1]) + 1,
});
const inRect = (x: PatchRect, r: number, c: number) => r >= x.r && r < x.r + x.h && c >= x.c && c < x.c + x.w;
const overlaps = (a: PatchRect, b: PatchRect) => a.r < b.r + b.h && b.r < a.r + a.h && a.c < b.c + b.w && b.c < a.c + a.w;

function ShapeHint({ shape }: { shape: PatchShape }) {
  if (shape === 'any') return null;
  const box = shape === 'square' ? { w: 8, h: 8 } : shape === 'wide' ? { w: 11, h: 6 } : { w: 6, h: 11 };
  return (
    <svg viewBox="0 0 14 14" className="absolute right-[6%] top-[6%] size-[30%] opacity-70" aria-hidden>
      <rect x={(14 - box.w) / 2} y={(14 - box.h) / 2} width={box.w} height={box.h} rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default function PatchesBoard({ sessionId, puzzle, solved, busy, act }: BoardProps<PatchesPuzzle>) {
  const { rows, cols, clues } = puzzle;
  const { t } = useI18n();
  const [rects, setRects] = useStoredState<PatchRect[]>(`gh-board-${sessionId}`, () => []);
  const [preview, setPreview] = useState<PatchRect | null>(null);
  const [anchor, setAnchor] = useState<Cell | null>(null); // keyboard selection
  const drag = useRef<Cell | null>(null);
  const { focus, move, gridRef } = useGridFocus(rows, cols);

  const status = useMemo(
    () =>
      rects.map((x) => {
        const inside = clues.filter((k) => inRect(x, k.r, k.c));
        if (inside.length !== 1) return false;
        const k = inside[0];
        return k.area === x.h * x.w && (k.shape === 'any' || k.shape === shapeOf(x));
      }),
    [rects, clues],
  );
  const colorOf = (x: PatchRect) => {
    const k = clues.findIndex((q) => inRect(x, q.r, q.c));
    return k >= 0 ? k : 11;
  };

  const commit = useCallback(
    (x: PatchRect) => {
      if (solved) return;
      setRects((prev) => {
        const same = prev.find((p) => p.r === x.r && p.c === x.c && p.h === x.h && p.w === x.w);
        if (same || (x.h === 1 && x.w === 1 && prev.some((p) => inRect(p, x.r, x.c)))) return prev.filter((p) => !inRect(p, x.r, x.c)); // tap removes
        return [...prev.filter((p) => !overlaps(p, x)), x];
      });
    },
    [solved, setRects],
  );

  const covered = rects.reduce((s, x) => s + x.h * x.w, 0) === rows * cols;
  const allGood = rects.length === clues.length && status.every(Boolean) && covered;
  const submit = useCallback(() => void act({ type: 'submit', solution: rects }), [act, rects]);
  useAutoSubmit(!solved && allGood, JSON.stringify(rects), submit);

  const ownerAt = (r: number, c: number) => rects.findIndex((x) => inRect(x, r, c));

  return (
    <BoardFrame size={Math.max(rows, cols)} label={t('boards.board', { game: 'Patches', size: `${rows}×${cols}` })}>
      <div
        ref={gridRef}
        role="grid"
        aria-label={t('boards.patchesGrid')}
        className="board relative grid overflow-hidden rounded-xl border-[2.5px] border-fg bg-surface"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        onPointerDown={(e) => {
          const cell = cellAt(e.clientX, e.clientY);
          if (!cell || solved) return;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          drag.current = cell;
          setPreview(rectFrom(cell, cell));
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const cell = cellAt(e.clientX, e.clientY);
          if (cell) setPreview(rectFrom(drag.current, cell));
        }}
        onPointerUp={() => {
          if (preview) commit(preview);
          drag.current = null;
          setPreview(null);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setPreview(null);
        }}
      >
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const clue = clues.find((k) => k.r === r && k.c === c);
          const owner = ownerAt(r, c);
          const rect = owner >= 0 ? rects[owner] : null;
          const inPreview = preview && inRect(preview, r, c);
          const isAnchor = anchor && anchor[0] === r && anchor[1] === c;
          const keyPreview = anchor && inRect(rectFrom(anchor, focus), r, c);
          const edge = (dr: number, dc: number) => {
            const o = ownerAt(r + dr, c + dc);
            return o !== owner || owner === -1;
          };
          return (
            <div
              key={i}
              data-r={r}
              data-c={c}
              role="gridcell"
              tabIndex={focus[0] === r && focus[1] === c ? 0 : -1}
              aria-label={`${t('boards.cell', { r: r + 1, c: c + 1 })}${clue ? `, ${t('boards.clue', { n: clue.area })}${clue.shape !== 'any' ? ` ${t(`gameMsg.patches.shapes.${clue.shape}`)}` : ''}` : ''}${rect ? `, ${t('boards.inPatch')}` : ''}`}
              onKeyDown={(e) => {
                if (move(e)) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!anchor) setAnchor([r, c]);
                  else {
                    commit(rectFrom(anchor, [r, c]));
                    setAnchor(null);
                  }
                } else if (e.key === 'Escape') setAnchor(null);
                else if ((e.key === 'Delete' || e.key === 'Backspace') && rect) setRects(rects.filter((x) => x !== rect));
              }}
              className={cn('relative grid aspect-square place-items-center outline-offset-[-3px]', isAnchor && 'ring-2 ring-inset ring-accent')}
              style={{
                background: inPreview || keyPreview ? 'color-mix(in oklab, var(--accent) 30%, var(--game-surface))' : rect ? regionColor(colorOf(rect)) : 'var(--cell)',
                boxShadow: rect
                  ? [edge(-1, 0) && 'inset 0 2px 0 var(--fg)', edge(1, 0) && 'inset 0 -2px 0 var(--fg)', edge(0, -1) && 'inset 2px 0 0 var(--fg)', edge(0, 1) && 'inset -2px 0 0 var(--fg)']
                      .filter(Boolean)
                      .join(',')
                  : 'inset 0 0 0 0.5px var(--cell-line)',
                opacity: rect && !status[owner] ? 0.75 : 1,
              }}
            >
              {clue && (
                <>
                  <span className={cn('font-display text-[min(6vw,1.5rem)] font-bold', rect && !status[owner] && 'text-danger')}>{clue.area}</span>
                  <ShapeHint shape={clue.shape} />
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-muted">
        <span className="num">
          {t('boards.patches', { count: rects.length, total: clues.length })}
        </span>
        <Button variant="ghost" size="sm" disabled={solved || busy} onClick={() => setRects([])}>
          {t('common.clear')}
        </Button>
      </div>
    </BoardFrame>
  );
}
