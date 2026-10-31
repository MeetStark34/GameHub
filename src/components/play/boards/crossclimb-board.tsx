'use client';

import { useCallback, useRef, useState } from 'react';
import { Check, CircleAlert } from 'lucide-react';
import type { CrossclimbPuzzle } from '@/games/crossclimb/types';
import { Button, cn } from '@/components/ui';
import { useStoredState, type BoardProps } from '../board-kit';

const diffCount = (a: string, b: string) => [...a].filter((ch, i) => ch !== b[i]).length;

function Fixed({ word, label, length }: { word: string; label: string; length: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-right font-mono text-[10px] uppercase tracking-widest text-muted">{label}</span>
      <div className="grid flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${length}, 1fr)` }} aria-label={`${label} word: ${word}`}>
        {[...word].map((ch, i) => (
          <span key={i} className="grid aspect-square max-h-14 place-items-center rounded-lg bg-[var(--game-crossclimb)] font-display text-xl font-bold uppercase text-white" aria-hidden>
            {ch}
          </span>
        ))}
      </div>
      <span className="w-6" />
    </div>
  );
}

export default function CrossclimbBoard({ sessionId, puzzle, solved, busy, act }: BoardProps<CrossclimbPuzzle>) {
  const { length, rungs } = puzzle;
  const [words, setWords] = useStoredState<string[]>(`gh-board-${sessionId}`, () => Array(rungs).fill(''));
  const [valid, setValid] = useState<Record<string, boolean>>({});
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const check = useCallback(
    async (w: string) => {
      if (w.length !== length || w in valid) return;
      const r = await act({ type: 'check', word: w });
      const fb = r?.feedback as { word: string; valid: boolean } | undefined;
      if (fb) setValid((v) => ({ ...v, [fb.word]: fb.valid }));
    },
    [act, length, valid],
  );

  const ladder = [puzzle.top, ...words, puzzle.bottom];
  const stepOk = (i: number) => {
    const a = ladder[i];
    const b = ladder[i + 1];
    return a.length === length && b.length === length && diffCount(a, b) === 1;
  };
  const allFilled = words.every((w) => w.length === length);

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="space-y-2">
        <Fixed word={puzzle.top} label="Top" length={length} />
        {words.map((w, i) => {
          const hint = puzzle.hints[i];
          const known = w.length === length ? valid[w] : undefined;
          const ok = w.length === length && known !== false && stepOk(i) && (i < rungs - 1 || stepOk(i + 1));
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="num w-14 shrink-0 text-right font-mono text-xs text-muted">Rung {i + 1}</span>
              <div className="relative flex-1">
                <input
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  value={w}
                  disabled={solved}
                  maxLength={length}
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={`Rung ${i + 1}, ${length} letters${hint !== null && hint !== undefined ? `, letter ${hint + 1} changes from the word above` : ''}`}
                  onChange={(e) => {
                    const v = e.target.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, length);
                    setWords((ws) => ws.map((x, j) => (j === i ? v : x)));
                    if (v.length === length) {
                      void check(v);
                      inputs.current[i + 1]?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && allFilled) void act({ type: 'submit', solution: words });
                    if (e.key === 'ArrowDown') inputs.current[i + 1]?.focus();
                    if (e.key === 'ArrowUp') inputs.current[i - 1]?.focus();
                  }}
                  className="absolute inset-0 z-10 w-full cursor-text opacity-0"
                />
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${length}, 1fr)` }} aria-hidden onClick={() => inputs.current[i]?.focus()}>
                  {Array.from({ length }, (_, k) => (
                    <span
                      key={k}
                      className={cn(
                        'grid aspect-square max-h-14 place-items-center rounded-lg border-2 font-display text-xl font-bold uppercase',
                        w[k] ? 'border-fg bg-surface' : 'border-border bg-cell',
                        hint === k && 'border-dashed border-[var(--game-crossclimb)]',
                      )}
                    >
                      {w[k] ?? ''}
                    </span>
                  ))}
                </div>
              </div>
              <span className="grid w-6 place-items-center">
                {known === false ? (
                  <CircleAlert className="size-5 text-danger" aria-label="Not in word list" />
                ) : ok ? (
                  <Check className="size-5 text-success" aria-label="Rung fits" />
                ) : null}
              </span>
            </div>
          );
        })}
        <Fixed word={puzzle.bottom} label="Bottom" length={length} />
      </div>
      {puzzle.hints.some((h) => h !== null) && <p className="mt-3 text-center text-xs text-muted">Dashed boxes show which letter changes from the word above.</p>}
      {!solved && (
        <div className="mt-4 flex justify-center gap-2">
          <Button disabled={!allFilled || busy} onClick={() => act({ type: 'submit', solution: words })}>
            Submit ladder
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setWords(Array(rungs).fill(''))}>
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
