'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Small accessible popover: toggles on click, closes on outside click or Escape.
 * `sheetOnMobile`: below `sm` the panel spans the screen width under the header
 * instead of hanging off the trigger, so wide panels never leave the screen.
 */
export function Popover({
  trigger,
  label,
  children,
  align = 'right',
  sheetOnMobile = false,
}: {
  trigger: ReactNode;
  label: string;
  children: (close: () => void) => ReactNode;
  align?: 'right' | 'left';
  sheetOnMobile?: boolean;
}) {
  // Literal class names so Tailwind can see them.
  const position = sheetOnMobile
    ? `fixed inset-x-3 top-14 sm:absolute sm:inset-x-auto sm:top-11 ${align === 'right' ? 'sm:right-0' : 'sm:left-0'}`
    : `absolute top-11 ${align === 'right' ? 'right-0' : 'left-0'}`;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
        title={label}
        className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card px-2 text-xs font-semibold hover:bg-elevated sm:px-2.5"
      >
        {trigger}
      </button>
      {open && (
        <div role="dialog" aria-label={label} className={`animate-toast-in z-50 rounded-xl border border-border bg-card p-1.5 shadow-xl shadow-black/15 ${position}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
