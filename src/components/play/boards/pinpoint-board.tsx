'use client';

import { Eye, X } from 'lucide-react';
import type { PinpointClient } from '@/games/pinpoint/types';
import { Button, cn } from '@/components/ui';
import type { BoardProps } from '../board-kit';

export default function PinpointBoard({ puzzle, solved, busy, act }: BoardProps<PinpointClient>) {
  const hidden = puzzle.totalClues - puzzle.clues.length;
  return (
    <div className="mx-auto w-full max-w-lg">
      <ol aria-label="Clues" className="space-y-2">
        {puzzle.clues.map((clue, i) => (
          <li key={i} className="animate-toast-in flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <span className="num grid size-7 place-items-center rounded-full bg-[var(--game-pinpoint)] font-mono text-xs font-bold text-white">{i + 1}</span>
            <span className="font-display text-lg font-semibold">{clue}</span>
          </li>
        ))}
        {Array.from({ length: hidden }, (_, i) => (
          <li key={`h${i}`} className="flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-muted" aria-label="Hidden clue">
            <span className="num grid size-7 place-items-center rounded-full bg-subtle font-mono text-xs">{puzzle.clues.length + i + 1}</span>
            <span aria-hidden>• • •</span>
          </li>
        ))}
      </ol>
      {!solved && hidden > 0 && (
        <div className="mt-2 flex justify-end">
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => act({ type: 'reveal' })}>
            <Eye className="size-4" aria-hidden /> Reveal next clue
          </Button>
        </div>
      )}
      <h3 className="mb-2 mt-5 text-sm font-semibold text-muted">What links them?</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {puzzle.options.map((o) => {
          const wrong = puzzle.wrong.includes(o.id);
          return (
            <button
              key={o.id}
              disabled={wrong || solved || busy}
              onClick={() => act({ type: 'guess', option: o.id })}
              aria-label={`${o.label}${wrong ? ' (ruled out)' : ''}`}
              className={cn(
                'flex min-h-12 items-center gap-2 rounded-xl border px-4 py-2 text-left font-medium transition',
                wrong ? 'border-border bg-subtle text-muted line-through' : 'border-border bg-card hover:border-[var(--game-pinpoint)] hover:bg-elevated active:scale-[0.98]',
              )}
            >
              {wrong && <X className="size-4 shrink-0 text-danger" aria-hidden />}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
