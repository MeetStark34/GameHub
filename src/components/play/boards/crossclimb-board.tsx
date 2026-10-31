'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Link2, Lock } from 'lucide-react';
import type { CrossclimbClient } from '@/games/crossclimb/types';
import { oneLetterApart } from '@/games/words/oneLetter';
import { useI18n } from '@/i18n/client';
import { Button, cn } from '@/components/ui';
import { useStoredState, type BoardProps } from '../board-kit';

interface Local {
  order: string[];
  words: Record<string, string>;
  top: string;
  bottom: string;
}

function LetterBoxes({
  value,
  length,
  onChange,
  label,
  disabled,
  tone,
  hint,
  inputRef,
  onEnter,
}: {
  value: string;
  length: number;
  onChange?: (v: string) => void;
  label: string;
  disabled?: boolean;
  tone?: 'locked' | 'wrong' | 'ok';
  hint?: string | null;
  inputRef?: (el: HTMLInputElement | null) => void;
  onEnter?: () => void;
}) {
  return (
    <div className="relative">
      {onChange && (
        <input
          ref={inputRef}
          value={value}
          disabled={disabled}
          maxLength={length}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          aria-label={label}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, length))}
          onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
          className="peer absolute inset-0 z-10 w-full cursor-text opacity-0"
        />
      )}
      <div className="grid gap-1.5 peer-focus:[&>span]:border-accent" style={{ gridTemplateColumns: `repeat(${length}, 1fr)` }} aria-hidden>
        {Array.from({ length }, (_, k) => (
          <span
            key={k}
            className={cn(
              'grid aspect-square max-h-12 place-items-center rounded-lg border-2 font-display text-lg font-bold uppercase',
              tone === 'locked' ? 'border-transparent bg-[var(--game-crossclimb)] text-white' : value[k] ? 'border-fg bg-surface' : 'border-border bg-cell',
              tone === 'wrong' && 'border-danger text-danger',
              tone === 'ok' && 'border-success',
            )}
          >
            {value[k] ?? (k === 0 && hint ? <span className="text-muted/60">{hint}</span> : '')}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function CrossclimbBoard({ sessionId, puzzle, solved, busy, act }: BoardProps<CrossclimbClient>) {
  const { t } = useI18n();
  const len = puzzle.length;
  const [local, setLocal] = useStoredState<Local>(`gh-board-${sessionId}`, () => ({ order: puzzle.rows.map((r) => r.id), words: {}, top: '', bottom: '' }));
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<string | null>(null);
  const rowsRef = useRef<HTMLOListElement>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const byId = new Map(puzzle.rows.map((r) => [r.id, r]));
  const order = local.order.filter((id) => byId.has(id));

  const setWord = (id: string, w: string) => {
    setLocal((l) => ({ ...l, words: { ...l.words, [id]: w } }));
    setWrong((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  };
  const move = useCallback(
    (id: string, delta: number) =>
      setLocal((l) => {
        const o = [...l.order];
        const i = o.indexOf(id);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= o.length) return l;
        [o[i], o[j]] = [o[j], o[i]];
        return { ...l, order: o };
      }),
    [setLocal],
  );

  // Pointer drag: move the dragged rung to the slot under the pointer.
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const items = [...(rowsRef.current?.querySelectorAll<HTMLElement>('[data-rung]') ?? [])];
      const idx = items.findIndex((el) => {
        const r = el.getBoundingClientRect();
        return e.clientY >= r.top && e.clientY <= r.bottom;
      });
      if (idx < 0) return;
      setLocal((l) => {
        const o = l.order.filter((x) => x !== drag);
        o.splice(idx, 0, drag);
        return o.join() === l.order.join() ? l : { ...l, order: o };
      });
    };
    const onUp = () => setDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, setLocal]);

  const allFilled = order.every((id) => (local.words[id] ?? '').length === len);
  const checkMiddle = async () => {
    const r = await act({ type: 'middle', rows: order.map((id) => ({ id, word: local.words[id] ?? '' })) });
    const fb = r?.feedback as { wrong?: string[] } | undefined;
    setWrong(new Set(fb?.wrong ?? []));
  };
  const finish = () => act({ type: 'ends', top: local.top, bottom: local.bottom });

  const connector = (a: string, b: string, key?: string) => {
    const ok = a.length === len && b.length === len && oneLetterApart(a, b);
    return (
      <div key={key} className="flex h-4 items-center justify-center" aria-hidden>
        <span className={cn('flex items-center gap-1 text-[10px] font-semibold', ok ? 'text-success' : 'text-border')}>
          <Link2 className="size-3" /> {ok && t('boards.climbLinked')}
        </span>
      </div>
    );
  };

  const middlePhase = puzzle.phase === 'middle';
  const lockedWords = puzzle.locked?.map((l) => l.word) ?? [];
  const firstWord = middlePhase ? (local.words[order[0]] ?? '') : lockedWords[0];
  const lastWord = middlePhase ? (local.words[order[order.length - 1]] ?? '') : lockedWords[lockedWords.length - 1];

  const endRow = (which: "top" | "bottom") => {
    const label = t(which === 'top' ? 'boards.climbTop' : 'boards.climbBottom');
    if (middlePhase)
      return (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-2.5 text-sm text-muted">
          <Lock className="size-4 shrink-0" aria-hidden />
          <span className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-widest">{label}</span>
          <span>{t('boards.climbLocked')}</span>
        </div>
      );
    const clue = which === 'top' ? puzzle.ends!.topClue : puzzle.ends!.bottomClue;
    return (
      <div className="rounded-xl border-2 border-[var(--game-crossclimb)] bg-card p-2.5">
        <p className="mb-1.5 text-sm">
          <span className="mr-2 font-mono text-[10px] uppercase tracking-widest text-muted">{label}</span>
          {clue}
        </p>
        <LetterBoxes
          value={local[which]}
          length={len}
          label={t('boards.climbWord', { label: `${label}: ${clue}` })}
          disabled={solved}
          onChange={(v) => setLocal((l) => ({ ...l, [which]: v }))}
          onEnter={() => local.top.length === len && local.bottom.length === len && finish()}
        />
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-lg">
      <p className="mb-3 text-center text-sm text-muted">{middlePhase ? t('boards.climbStep1') : t('boards.climbStep2')}</p>
      {endRow("top")}
      {!middlePhase && connector(local.top, firstWord)}
      {middlePhase && <div className="h-3" />}
      <ol ref={rowsRef} className="space-y-0">
        {middlePhase
          ? order.map((id, i) => {
              const row = byId.get(id)!;
              const w = local.words[id] ?? '';
              return (
                <li key={id} data-rung>
                  {i > 0 && connector(local.words[order[i - 1]] ?? '', w)}
                  <div className={cn('flex items-stretch gap-2 rounded-xl border bg-card p-2.5 transition', drag === id ? 'border-accent shadow-lg' : wrong.has(id) ? 'border-danger' : 'border-border')}>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setDrag(id);
                      }}
                      className="grid w-6 shrink-0 cursor-grab touch-none place-items-center text-muted active:cursor-grabbing"
                      aria-hidden
                      tabIndex={-1}
                    >
                      <GripVertical className="size-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="mb-1.5 text-sm">{row.clue}</p>
                      <LetterBoxes
                        value={w}
                        length={len}
                        hint={row.hint}
                        tone={wrong.has(id) ? 'wrong' : undefined}
                        label={`${t('boards.climbRung', { n: i + 1 })}: ${row.clue}${row.hint ? `. ${t('boards.climbHint', { letter: row.hint.toUpperCase() })}` : ''}`}
                        disabled={solved}
                        inputRef={(el) => {
                          inputs.current[id] = el;
                        }}
                        onChange={(v) => {
                          setWord(id, v);
                          if (v.length === len) inputs.current[order[i + 1]]?.focus();
                        }}
                        onEnter={() => allFilled && checkMiddle()}
                      />
                    </div>
                    <div className="flex shrink-0 flex-col justify-center gap-1">
                      <button type="button" disabled={i === 0} onClick={() => move(id, -1)} className="rounded-md border border-border p-1 disabled:opacity-30" aria-label={`${t('boards.climbMoveUp')} (${i + 1})`}>
                        <ArrowUp className="size-3.5" aria-hidden />
                      </button>
                      <button type="button" disabled={i === order.length - 1} onClick={() => move(id, 1)} className="rounded-md border border-border p-1 disabled:opacity-30" aria-label={`${t('boards.climbMoveDown')} (${i + 1})`}>
                        <ArrowDown className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })
          : puzzle.locked!.map((l, i) => (
              <li key={l.id}>
                {i > 0 && connector(puzzle.locked![i - 1].word, l.word)}
                <div className="rounded-xl border border-border bg-card p-2.5">
                  <p className="mb-1.5 text-sm text-muted">{byId.get(l.id)?.clue}</p>
                  <LetterBoxes value={l.word} length={len} label={l.word} tone="locked" />
                </div>
              </li>
            ))}
      </ol>
      {!middlePhase && connector(lastWord, local.bottom)}
      {middlePhase && <div className="h-3" />}
      {endRow("bottom")}
      {!solved && (
        <div className="mt-4 flex justify-center">
          {middlePhase ? (
            <Button disabled={!allFilled || busy} onClick={checkMiddle}>
              {t('boards.climbCheck')}
            </Button>
          ) : (
            <Button disabled={local.top.length !== len || local.bottom.length !== len || busy} onClick={finish}>
              {t('boards.climbFinish')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
