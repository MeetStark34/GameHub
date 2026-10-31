'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CornerDownLeft, Delete } from 'lucide-react';
import type { WerdClient, WerdMark } from '@/games/werd/types';
import { useI18n } from '@/i18n/client';
import { cn } from '@/components/ui';
import type { BoardProps } from '../board-kit';

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const MARK_CLASS: Record<WerdMark, string> = {
  hit: 'bg-success text-white border-success',
  near: 'bg-warning text-white border-warning',
  miss: 'bg-elevated text-muted border-elevated',
};

export default function WerdBoard({ puzzle, solved, busy, act }: BoardProps<WerdClient>) {
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);
  const len = puzzle.length;
  const { t } = useI18n();
  const markWord = (m: WerdMark) => t(`boards.marks.${m}`);

  const letterState = new Map<string, WerdMark>();
  for (const g of puzzle.guesses)
    [...g.word].forEach((ch, i) => {
      const m = g.marks[i];
      const prev = letterState.get(ch);
      if (m === 'hit' || (m === 'near' && prev !== 'hit') || (!prev && m === 'miss')) letterState.set(ch, m);
    });

  const submit = useCallback(async () => {
    if (input.length !== len || busy || solved) {
      if (input.length !== len) setShake((s) => s + 1);
      return;
    }
    const r = await act({ type: 'guess', word: input });
    if (r && !r.message) setInput('');
    else setShake((s) => s + 1);
  }, [input, len, busy, solved, act]);

  const press = useCallback(
    (k: string) => {
      if (solved) return;
      if (k === 'enter') void submit();
      else if (k === 'back') setInput((s) => s.slice(0, -1));
      else if (/^[a-z]$/.test(k)) setInput((s) => (s.length < len ? s + k : s));
    },
    [solved, submit, len],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, [role="menu"]')) return;
      if (e.key === 'Enter') press('enter');
      else if (e.key === 'Backspace') press('back');
      else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toLowerCase());
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest' });
  }, [puzzle.guesses.length]);

  const tile = 'grid aspect-square place-items-center rounded-lg border-2 font-display text-[min(7vw,1.6rem)] font-bold uppercase';
  return (
    <div className="mx-auto w-full max-w-md">
      <p className="mb-2 text-center text-xs text-muted">
        {t('boards.werdInfo', { length: len, par: puzzle.parGuesses, count: puzzle.guesses.length })}
        {puzzle.strict ? ` · ${t('boards.werdStrict')}` : ''}
      </p>
      <ol ref={listRef} aria-label={t('boards.guesses')} className="max-h-[46vh] space-y-1.5 overflow-y-auto p-1">
        {puzzle.guesses.map((g, gi) => (
          <li key={gi} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${len}, 1fr)` }} aria-label={`${g.word}: ${g.marks.map((m, i) => `${g.word[i]} ${markWord(m)}`).join(', ')}`}>
            {[...g.word].map((ch, i) => (
              <span key={i} className={cn(tile, MARK_CLASS[g.marks[i]], 'animate-pop')} style={{ animationDelay: `${i * 60}ms` }} aria-hidden>
                {ch}
              </span>
            ))}
          </li>
        ))}
        {!solved && (
          <li key={`input-${shake}`} className={cn('grid gap-1.5', shake > 0 && 'animate-shake')} style={{ gridTemplateColumns: `repeat(${len}, 1fr)` }} aria-label={t('boards.currentGuess', { guess: input || t('boards.empty') })}>
            {Array.from({ length: len }, (_, i) => (
              <span key={i} className={cn(tile, input[i] ? 'border-fg bg-surface' : 'border-border bg-cell')} aria-hidden>
                {input[i] ?? ''}
              </span>
            ))}
          </li>
        )}
      </ol>

      <div className="mt-4 space-y-1.5" aria-label={t('boards.keyboard')}>
        {ROWS.map((row, ri) => (
          <div key={row} className="flex justify-center gap-1">
            {ri === 2 && (
              <button onClick={() => press('enter')} disabled={solved || busy} className="grid h-12 flex-[1.6] place-items-center rounded-lg bg-accent text-accent-fg" aria-label={t('boards.submitGuess')}>
                <CornerDownLeft className="size-5" aria-hidden />
              </button>
            )}
            {[...row].map((k) => {
              const s = letterState.get(k);
              return (
                <button
                  key={k}
                  onClick={() => press(k)}
                  disabled={solved}
                  aria-label={`${k}${s ? `, ${markWord(s)}` : ''}`}
                  className={cn('h-12 flex-1 rounded-lg border font-semibold uppercase', s ? MARK_CLASS[s] : 'border-border bg-card hover:bg-elevated')}
                >
                  {k}
                </button>
              );
            })}
            {ri === 2 && (
              <button onClick={() => press('back')} disabled={solved} className="grid h-12 flex-[1.4] place-items-center rounded-lg border border-border bg-card" aria-label={t('boards.deleteLetter')}>
                <Delete className="size-5" aria-hidden />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
