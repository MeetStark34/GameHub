'use client';

import { useState } from 'react';
import { Eye, ListChecks, X } from 'lucide-react';
import type { PinpointClient } from '@/games/pinpoint/types';
import { useI18n } from '@/i18n/client';
import { Button, cn } from '@/components/ui';
import type { BoardProps } from '../board-kit';

export default function PinpointBoard({ puzzle, solved, busy, act }: BoardProps<PinpointClient>) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const hidden = puzzle.totalClues - puzzle.clues.length;

  async function guess(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    const r = await act({ type: 'guess', text });
    if (r) setText('');
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <ol aria-label={t('boards.pinClues')} className="space-y-2">
        {puzzle.clues.map((clue, i) => (
          <li key={i} className="animate-toast-in flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <span className="num grid size-7 place-items-center rounded-full bg-[var(--game-pinpoint)] font-mono text-xs font-bold text-white">{i + 1}</span>
            <span className="font-display text-lg font-semibold">{clue}</span>
          </li>
        ))}
        {Array.from({ length: hidden }, (_, i) => (
          <li key={`h${i}`} className="flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-muted" aria-label={t('boards.pinHidden')}>
            <span className="num grid size-7 place-items-center rounded-full bg-subtle font-mono text-xs">{puzzle.clues.length + i + 1}</span>
            <span aria-hidden>• • •</span>
          </li>
        ))}
      </ol>

      {solved && puzzle.answer && <p className="mt-4 text-center font-display text-xl font-bold text-success">{t('boards.pinAnswer', { answer: puzzle.answer })}</p>}

      {!solved && (
        <>
          <form onSubmit={guess} className="mt-4 flex gap-2">
            <label className="sr-only" htmlFor="pin-guess">
              {t('boards.pinPrompt')}
            </label>
            <input
              id="pin-guess"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('boards.pinPlaceholder')}
              autoComplete="off"
              maxLength={80}
              className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 focus:border-accent"
            />
            <Button type="submit" disabled={busy || !text.trim()}>
              {t('boards.pinGuess')}
            </Button>
          </form>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {hidden > 0 ? (
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => act({ type: 'reveal' })}>
                <Eye className="size-4" aria-hidden /> {t('boards.pinReveal')}
              </Button>
            ) : (
              <span />
            )}
            {!puzzle.options &&
              (puzzle.assistAvailable ? (
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => act({ type: 'assist' })} title={t('boards.pinAssistNote')}>
                  <ListChecks className="size-4" aria-hidden /> {t('boards.pinAssist')}
                </Button>
              ) : (
                <span className="text-xs text-muted">{t('boards.pinAssistLocked', { count: puzzle.assistAfter })}</span>
              ))}
          </div>
        </>
      )}

      {puzzle.guesses.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1 text-xs font-semibold text-muted">{t('boards.pinWrong')}</h3>
          <ul className="flex flex-wrap gap-1.5">
            {puzzle.guesses.map((g, i) => (
              <li key={i} className="flex items-center gap-1 rounded-lg bg-subtle px-2 py-1 text-xs text-muted line-through">
                <X className="size-3 text-danger" aria-hidden />
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {puzzle.options && !solved && (
        <div className="mt-5">
          <p className="mb-2 text-xs text-muted">{t('boards.pinAssistNote')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {puzzle.options.map((o) => {
              const ruledOut = puzzle.wrong.includes(o.id);
              return (
                <button
                  key={o.id}
                  disabled={ruledOut || busy}
                  onClick={() => act({ type: 'pick', option: o.id })}
                  aria-label={`${o.label}${ruledOut ? ` ${t('boards.pinRuledOut')}` : ''}`}
                  className={cn(
                    'flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-left font-medium transition',
                    ruledOut ? 'border-border bg-subtle text-muted line-through' : 'border-border bg-card hover:border-[var(--game-pinpoint)] hover:bg-elevated',
                  )}
                >
                  {ruledOut && <X className="size-4 shrink-0 text-danger" aria-hidden />}
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
