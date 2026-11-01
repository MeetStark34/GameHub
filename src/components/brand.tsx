import type { GameId } from '@/games/types';

/** GameHub mark: a 2x2 tile grid with one lit tile. */
export function LogoMark({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="2" y="2" width="13" height="13" rx="3.5" fill="currentColor" opacity="0.9" />
      <rect x="17" y="2" width="13" height="13" rx="3.5" fill="var(--accent)" />
      <rect x="2" y="17" width="13" height="13" rx="3.5" fill="currentColor" opacity="0.35" />
      <rect x="17" y="17" width="13" height="13" rx="3.5" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

/** `compact`: logo mark only on phones, so the header keeps room for its controls. */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
      <LogoMark />
      <span className={compact ? 'hidden sm:inline' : undefined}>
        Game<span className="text-accent">Hub</span>
      </span>
    </span>
  );
}

/** Original line glyphs for each game, drawn on a 24px grid. */
export function GameGlyph({ game, className = 'size-6' }: { game: GameId; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
      {game === 'patches' && (
        <>
          <rect x="3" y="3" width="10" height="7" rx="1.5" />
          <rect x="15" y="3" width="6" height="11" rx="1.5" />
          <rect x="3" y="12" width="10" height="9" rx="1.5" />
          <rect x="15" y="16" width="6" height="5" rx="1.5" />
        </>
      )}
      {game === 'sudoku' && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2.5" />
          <path d="M9 3v18M15 3v18M3 9h18M3 15h18" opacity="0.5" />
          <path d="M5.5 5.5l1.5-1v3.5" />
          <path d="M16.6 17.2a1.5 1.5 0 1 1 2.4 1.2l-2.4 1.6h2.6" />
        </>
      )}
      {game === 'zip' && (
        <>
          <path d="M5 5h14v5H5v5h14v4H9" />
          <circle cx="5" cy="5" r="1.8" fill="currentColor" />
          <circle cx="9" cy="19" r="1.8" fill="currentColor" />
        </>
      )}
      {game === 'werd' && (
        <>
          <rect x="2.5" y="7" width="5.5" height="10" rx="1.4" />
          <rect x="9.25" y="7" width="5.5" height="10" rx="1.4" fill="currentColor" fillOpacity="0.25" />
          <rect x="16" y="7" width="5.5" height="10" rx="1.4" />
          <path d="M4.2 14l1-4 1 4M11 10h2l-2 4h2M17.7 10v4h2" strokeWidth="1.3" />
        </>
      )}
      {game === 'pinpoint' && (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="4.5" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" />
        </>
      )}
      {game === 'crossclimb' && (
        <>
          <path d="M7 2.5v19M17 2.5v19" />
          <path d="M7 6.5h10M7 11h10M7 15.5h10" />
          <path d="M7 20h10" opacity="0.5" />
        </>
      )}
      {game === 'tango' && (
        <>
          <circle cx="8" cy="12" r="4" />
          <path d="M8 4.5v1.2M8 18.3v1.2M2.5 12h1.2M12.3 12h.7M4.2 8.2l.8.8M4.2 15.8l.8-.8" />
          <path d="M19.5 15.6A5 5 0 0 1 16 7a5.5 5.5 0 1 0 3.5 8.6z" fill="currentColor" fillOpacity="0.25" />
        </>
      )}
      {game === 'queens' && (
        <>
          <path d="M4 18h16l1.2-10-5 4L12 5.5 7.8 12l-5-4L4 18z" />
          <path d="M4.5 21h15" />
        </>
      )}
    </svg>
  );
}
