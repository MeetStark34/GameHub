/**
 * Shapes shared by the server and the browser. Client-safe: no secrets,
 * no server imports.
 */
import type { Difficulty, GameId, GameMode } from '@/games/types';
import type { Msg } from '@/i18n/translate';

export interface RewardEvent {
  kind:
    | 'level-up'
    | 'achievement'
    | 'punch'
    | 'card-created'
    | 'pocket-full'
    | 'card-converted'
    | 'daily-set-complete'
    | 'true-player'
    | 'streak-milestone'
    | 'streak-repaired'
    | 'mastery-up';
  title: string;
  body: string;
  /** Translatable versions of title/body (events.* keys). */
  i18n?: { title: Msg; body: Msg };
  xp?: number;
  data?: Record<string, unknown>;
}

export interface UnlockedAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
}

export interface CompletionResult {
  sessionId: string;
  game: GameId;
  difficulty: Difficulty;
  mode: GameMode;
  durationMs: number;
  score: number;
  perfect: boolean;
  xpGained: number;
  breakdown: { label: string; amount: number }[];
  totalXp: number;
  rank: { before: string; after: string; levelUp: boolean; progress: number; nextLabel: string | null };
  mastery: { before: string; after: string; xp: number; rankUp: boolean };
  streaks: { normal: number; truePlayer: number; normalAdvanced: boolean; truePlayerAdvanced: boolean };
  daily: { date: string; completed: number; total: number; setComplete: boolean } | null;
  achievements: UnlockedAchievement[];
  events: RewardEvent[];
}

export interface SessionView {
  id: string;
  game: GameId;
  difficulty: Difficulty;
  mode: GameMode;
  dailyDate: string | null;
  status: 'active' | 'completed';
  puzzle: unknown;
  startedAt: string;
  serverNow: string;
  completion: CompletionResult | null;
}

export interface ActResponse {
  view: SessionView;
  solved: boolean;
  message?: Msg;
  feedback?: unknown;
  completion: CompletionResult | null;
}
