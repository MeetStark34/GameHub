'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Info, RefreshCw } from 'lucide-react';
import { GAMES } from '@/config/games';
import type { ActResponse, SessionView } from '@/lib/contracts';
import { formatDuration } from '@/lib/time';
import { DIFFICULTIES, type Difficulty, type GameId, type GameMode } from '@/games/types';
import { useI18n } from '@/i18n/client';
import type { Msg } from '@/i18n/translate';
import { playTarget } from '@/lib/play-url';
import { GameGlyph } from '@/components/brand';
import { GuestNotice } from '@/components/guest-notice';
import { useToasts, usePrefs } from '@/components/providers';
import { Button, ButtonLink, Card, cn } from '@/components/ui';
import { BOARD_LOADERS, type BoardComponent } from './boards';
import { ResultPanel } from './result-panel';
import { post, requestStart, takeEarlyStart } from './start-session';

const loading = () => <div className="mx-auto aspect-square w-full max-w-md animate-pulse rounded-2xl bg-subtle" />;

/** Boards whose chunk has loaded (module scope, so each stays one stable component). */
const LOADED_BOARDS: Partial<Record<GameId, BoardComponent>> = {};

/** Starts loading the game's board chunk on mount; re-renders once it is ready. */
function useBoardChunk(game: GameId): void {
  const [, setReady] = useState<GameId | null>(null);
  const [failure, setFailure] = useState<unknown>(null);
  useEffect(() => {
    if (LOADED_BOARDS[game]) return;
    let live = true;
    BOARD_LOADERS[game]().then(
      (m) => {
        LOADED_BOARDS[game] = m.default;
        if (live) setReady(game);
      },
      (err) => live && setFailure(err),
    );
    return () => {
      live = false;
    };
  }, [game]);
  // A chunk that fails to load goes to the error boundary, as it did with next/dynamic.
  if (failure) throw failure;
}

/**
 * Runs `fn` after the browser has painted the current update, so the result
 * panel never waits on sounds or reward toasts. (Sounds no longer block the
 * main thread at all, see src/lib/sound.ts, but toasts still cost a render.)
 */
function afterPaint(fn: () => void) {
  requestAnimationFrame(() => setTimeout(fn, 0));
}

/** guestExpiresAt: undefined for members (no guest warning), null for a signed-out visitor, else the guest's expiry. */
export function PlayClient({
  game,
  mode,
  difficulty,
  hasSession,
  guestExpiresAt,
}: {
  game: GameId;
  mode: GameMode;
  difficulty: Difficulty;
  hasSession: boolean;
  guestExpiresAt?: string | null;
}) {
  const meta = GAMES[game];
  const router = useRouter();
  const { push } = useToasts();
  const { play } = usePrefs();
  const { t, list, msg } = useI18n();
  const [view, setView] = useState<SessionView | null>(null);
  const [error, setError] = useState<Msg | null>(null);
  const [message, setMessage] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [offset, setOffset] = useState(0);

  const start = useCallback(
    async (fresh = false) => {
      setError(null);
      setView(null);
      const target = playTarget(game, mode, difficulty)!;
      // A click on the play link usually started this already (see PlayIntent).
      const r = await ((!fresh && takeEarlyStart(target)) || requestStart(target, fresh));
      if (!r.data) return setError(r.error ?? { key: 'play.startFailed' });
      setOffset(new Date(r.data.serverNow).getTime() - r.receivedAt);
      setView(r.data);
      // The first game creates a guest account: re-render so the header shows it.
      // Existing players skip this full server round trip (nothing in the header changed).
      if (!hasSession && r.data.status === 'active') router.refresh();
    },
    [game, mode, difficulty, hasSession, router],
  );

  // Guard against StrictMode's double effect run (would create two guests).
  const startedKey = useRef<string | null>(null);
  useEffect(() => {
    const key = `${game}:${mode}:${difficulty}`;
    if (startedKey.current === key) return;
    startedKey.current = key;
    void start(false);
  }, [start, game, mode, difficulty]);

  const act = useCallback(
    async (action: unknown): Promise<ActResponse | null> => {
      if (!view) return null;
      setBusy(true);
      const r = await post<ActResponse>(`/api/play/${view.id}/act`, { action });
      setBusy(false);
      if (!r.data) {
        setMessage(r.error ?? { key: 'play.generic' });
        afterPaint(() => play('error'));
        if (r.status === 410) router.refresh();
        return null;
      }
      setView(r.data.view);
      if (r.data.message) {
        setMessage(r.data.message);
        if (!r.data.solved) afterPaint(() => play('error'));
      } else setMessage(null);
      if (r.data.completion && r.data.view.status === 'completed') {
        const c = r.data.completion;
        afterPaint(() => {
          play(c.perfect ? 'perfect' : 'complete');
          push(c.events);
        });
        router.refresh();
      }
      return r.data;
    },
    [view, play, push, router],
  );

  useBoardChunk(game);
  const Board = LOADED_BOARDS[game];
  const done = view?.status === 'completed';
  const modeLabel = t(`mode.${mode}`);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl text-white" style={{ background: `var(${meta.accentVar})` }}>
          <GameGlyph game={game} className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold leading-tight tracking-tight">{meta.name}</h1>
          <p className="text-sm text-muted">
            <span className={cn('font-semibold', mode === 'daily' ? 'text-accent' : 'text-fg')}>{modeLabel}</span>
            {' · '}
            {t(`difficulty.${view?.difficulty ?? difficulty}`)}
            {view?.dailyDate && ` · ${view.dailyDate}`}
          </p>
        </div>
        {view && <Timer view={view} offset={offset} />}
      </div>

      {mode === 'unlimited' && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label={t('difficulty.label')} className="flex rounded-xl border border-border bg-card p-1">
            {DIFFICULTIES.map((d) => (
              <Link
                key={d}
                role="radio"
                aria-checked={d === difficulty}
                href={`/play/${game}?mode=unlimited&difficulty=${d}`}
                prefetch={false}
                className={cn('rounded-lg px-3 py-1 text-sm font-medium', d === difficulty ? 'bg-accent text-accent-fg' : 'text-muted hover:text-fg')}
              >
                {t(`difficulty.${d}`)}
              </Link>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={() => start(true)} disabled={busy}>
            <RefreshCw className="size-4" aria-hidden /> {t('play.newPuzzle')}
          </Button>
        </div>
      )}

      <Card className="mb-4 overflow-hidden">
        <button onClick={() => setRulesOpen((o) => !o)} aria-expanded={rulesOpen} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium">
          <Info className="size-4 text-muted" aria-hidden />
          <span className="flex-1">{t(`games.${game}.tagline`)}</span>
          <span className="text-muted">{t('play.howToPlay')}</span>
          <ChevronDown className={cn('size-4 text-muted transition', rulesOpen && 'rotate-180')} aria-hidden />
        </button>
        {rulesOpen && (
          <ul className="list-disc space-y-1 border-t border-border px-8 py-3 text-sm text-muted">
            {list(`games.${game}.rules`).map((r) => (
              <li key={r}>{r}</li>
            ))}
            <li>{t('play.noPressure')}</li>
          </ul>
        )}
      </Card>

      {error && (
        <Card className="p-6 text-center">
          <p className="mb-4 text-danger">{msg(error)}</p>
          <Button onClick={() => start(false)}>{t('common.tryAgain')}</Button>
        </Card>
      )}

      {!error && (!view || !Board) && loading()}

      {view && Board && (
        <>
          <div className="relative">
            <Board key={view.id} sessionId={view.id} puzzle={view.puzzle} solved={done} busy={busy} act={act} />
          </div>
          <p aria-live="assertive" className={cn('mt-3 min-h-6 text-center text-sm font-medium', message && !done ? 'text-danger' : 'text-success')}>
            {!done && message && msg(message)}
          </p>
        </>
      )}

      {done && view?.completion && (
        <div className="mt-6">
          <ResultPanel result={view.completion} onPlayAgain={mode === 'unlimited' ? () => start(true) : undefined} />
        </div>
      )}

      {!done && view && (
        <div className="mt-6 flex justify-center">
          <ButtonLink href={mode === 'daily' ? '/daily' : '/unlimited'} variant="ghost" size="sm">
            {t('play.backTo', { mode: modeLabel })}
          </ButtonLink>
        </div>
      )}

      {guestExpiresAt !== undefined && <GuestNotice expiresAt={guestExpiresAt} className="mt-6" />}
    </div>
  );
}

function Timer({ view, offset }: { view: SessionView; offset: number }) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now() + offset);
  const done = view.status === 'completed';
  useEffect(() => {
    if (done) return;
    const id = window.setInterval(() => setNow(Date.now() + offset), 1000);
    return () => window.clearInterval(id);
  }, [done, offset]);
  const ms = done && view.completion ? view.completion.durationMs : Math.max(0, now - new Date(view.startedAt).getTime());
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-1.5 text-right">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{done ? t('play.finalTime') : t('play.time')}</p>
      <p className="num font-mono text-lg font-bold leading-tight" aria-label={t('play.elapsed', { time: formatDuration(ms) })}>
        {formatDuration(ms)}
      </p>
    </div>
  );
}
