'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Award, Bell, CreditCard, Crown, Flame, Sparkles, TrendingUp, X } from 'lucide-react';
import type { ThemeId } from '@/config/themes';
import type { RewardEvent } from '@/lib/contracts';
import { playSound, type SoundName } from '@/lib/sound';
import { useI18n } from '@/i18n/client';
import { AchievementIcon } from './achievement-icon';

/* ------------------------------------------------------------------ prefs */

interface Prefs {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  sound: boolean;
  setSound: (on: boolean) => void;
  play: (name: SoundName) => void;
  signedIn: boolean;
}

const PrefsContext = createContext<Prefs | null>(null);

export const usePrefs = () => {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs outside provider');
  return ctx;
};

const ONE_YEAR = 60 * 60 * 24 * 365;

function persist(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

async function saveRemote(body: Record<string, unknown>) {
  await fetch('/api/me/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
}

/* ----------------------------------------------------------------- toasts */

interface Toast {
  id: number;
  event: RewardEvent;
}

interface ToastApi {
  push: (events: RewardEvent[]) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
export const useToasts = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts outside provider');
  return ctx;
};

const EVENT_ICON: Partial<Record<RewardEvent['kind'], typeof Bell>> = {
  'level-up': TrendingUp,
  punch: CreditCard,
  'card-created': CreditCard,
  'pocket-full': CreditCard,
  'card-converted': Sparkles,
  'true-player': Crown,
  'daily-set-complete': Crown,
  'streak-milestone': Flame,
  'streak-repaired': Flame,
  'mastery-up': Award,
};

const EVENT_SOUND: Partial<Record<RewardEvent['kind'], SoundName>> = {
  'level-up': 'level-up',
  achievement: 'achievement',
  'streak-milestone': 'streak',
  'true-player': 'perfect',
};

export function Providers({ children, initialTheme, initialSound, signedIn }: { children: ReactNode; initialTheme: ThemeId; initialSound: boolean; signedIn: boolean }) {
  const [theme, setThemeState] = useState<ThemeId>(initialTheme);
  const [sound, setSoundState] = useState(initialSound);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const setTheme = useCallback(
    (t: ThemeId) => {
      setThemeState(t);
      document.documentElement.dataset.theme = t;
      persist('gh-theme', t);
      if (signedIn) void saveRemote({ theme: t });
    },
    [signedIn],
  );
  const setSound = useCallback(
    (on: boolean) => {
      setSoundState(on);
      persist('gh-sound', on ? '1' : '0');
      if (signedIn) void saveRemote({ soundEnabled: on });
      if (on) playSound('click', true);
    },
    [signedIn],
  );
  const play = useCallback((name: SoundName) => playSound(name, sound), [sound]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (events: RewardEvent[]) => {
      // Stagger so several rewards read as a sequence, not a pile.
      events.forEach((event, i) => {
        window.setTimeout(() => {
          const id = nextId.current++;
          setToasts((t) => [...t.slice(-4), { id, event }]);
          const s = EVENT_SOUND[event.kind];
          if (s) playSound(s, sound);
          window.setTimeout(() => dismiss(id), event.kind === 'achievement' ? 6500 : 5000);
        }, i * 700);
      });
    },
    [dismiss, sound],
  );

  const prefs = useMemo(() => ({ theme, setTheme, sound, setSound, play, signedIn }), [theme, setTheme, sound, setSound, play, signedIn]);
  const toastApi = useMemo(() => ({ push }), [push]);

  return (
    <PrefsContext.Provider value={prefs}>
      <ToastContext.Provider value={toastApi}>
        {children}
        <div
          aria-live="polite"
          aria-atomic="false"
          className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-3 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end"
        >
          {toasts.map((t) => (t.event.kind === 'achievement' ? <AchievementToast key={t.id} event={t.event} onClose={() => dismiss(t.id)} /> : <EventToast key={t.id} event={t.event} onClose={() => dismiss(t.id)} />))}
        </div>
      </ToastContext.Provider>
    </PrefsContext.Provider>
  );
}

function EventToast({ event, onClose }: { event: RewardEvent; onClose: () => void }) {
  const Icon = EVENT_ICON[event.kind] ?? Bell;
  const { msg, t } = useI18n();
  const title = msg(event.i18n?.title, event.title);
  const body = msg(event.i18n?.body, event.body);
  return (
    <div role="status" className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-lg shadow-black/10">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {body && <p className="text-xs text-muted">{body}</p>}
      </div>
      {event.xp ? <span className="num shrink-0 font-mono text-xs font-bold text-gold">+{event.xp} XP</span> : null}
      <button onClick={onClose} className="shrink-0 rounded p-0.5 text-muted hover:text-fg" aria-label={t('common.dismiss')}>
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function AchievementToast({ event, onClose }: { event: RewardEvent; onClose: () => void }) {
  const icon = (event.data?.icon as string) ?? 'Award';
  const { msg, t } = useI18n();
  const title = msg(event.i18n?.title, event.title);
  const body = msg(event.i18n?.body, event.body);
  return (
    <div
      role="status"
      aria-label={t('achievements.toastLabel', { name: title })}
      className="animate-toast-in pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border border-gold/40 bg-card shadow-xl shadow-black/20"
    >
      <span aria-hidden className="animate-shine absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-gold/25 to-transparent" />
      <div className="flex items-center gap-3 p-3">
        <span className="animate-pop grid size-12 shrink-0 place-items-center rounded-xl border border-gold/50 bg-gold/15 text-gold">
          <AchievementIcon name={icon} className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gold">{t('achievements.toastTitle')}</p>
          <p className="truncate font-display text-base font-bold">{title}</p>
          <p className="line-clamp-2 text-xs text-muted">{body}</p>
        </div>
        <span className="num shrink-0 self-start font-mono text-xs font-bold text-gold">+{event.xp} XP</span>
        <button onClick={onClose} className="absolute right-1.5 top-1.5 rounded p-0.5 text-muted hover:text-fg" aria-label={t('common.dismiss')}>
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

