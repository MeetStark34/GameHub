'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActResponse } from '@/lib/contracts';

export interface BoardProps<Pub> {
  sessionId: string;
  puzzle: Pub;
  solved: boolean;
  busy: boolean;
  /** Sends an action to the server; resolves to null on network failure. */
  act: (action: unknown) => Promise<ActResponse | null>;
}

/** useState persisted to localStorage per key (refresh-safe board progress). */
export function useStoredState<T>(key: string, initial: () => T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial();
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial();
    } catch {
      return initial();
    }
  });
  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // storage full or disabled: progress just isn't persisted
        }
        return next;
      });
    },
    [key],
  );
  return [value, set];
}

/** Reads the cell under a pointer from data-r / data-c attributes. */
export function cellAt(x: number, y: number): [number, number] | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-r]');
  if (!el) return null;
  return [Number(el.dataset.r), Number(el.dataset.c)];
}

/**
 * Roving focus for grid boards: one cell is tabbable, arrows move focus.
 * Returns the focused cell, a setter and a keydown handler for arrows.
 */
export function useGridFocus(rows: number, cols: number) {
  const [focus, setFocus] = useState<[number, number]>([0, 0]);
  const gridRef = useRef<HTMLDivElement>(null);
  const move = useCallback(
    (e: React.KeyboardEvent): boolean => {
      const d: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      const delta = d[e.key];
      if (!delta) return false;
      e.preventDefault();
      setFocus(([r, c]) => {
        const next: [number, number] = [Math.min(rows - 1, Math.max(0, r + delta[0])), Math.min(cols - 1, Math.max(0, c + delta[1]))];
        requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>(`[data-r="${next[0]}"][data-c="${next[1]}"]`)?.focus());
        return next;
      });
      return true;
    },
    [rows, cols],
  );
  return { focus, setFocus, move, gridRef };
}

/** Auto-submit helper: fires `submit` once whenever `ready` becomes true with a new key. */
export function useAutoSubmit(ready: boolean, key: string, submit: () => void) {
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (ready && last.current !== key) {
      last.current = key;
      submit();
    }
  }, [ready, key, submit]);
}

export const regionColor = (i: number) => `var(--region-${i % 12})`;

export function BoardFrame({ children, size, label }: { children: React.ReactNode; size: number; label: string }) {
  // Cells shrink on small screens but stay comfortably tappable.
  const max = size <= 5 ? 360 : size <= 7 ? 420 : 460;
  return (
    <div className="mx-auto w-full" style={{ maxWidth: max }} role="group" aria-label={label}>
      {children}
    </div>
  );
}
