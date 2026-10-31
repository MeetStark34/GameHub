import { XP_ECONOMY } from '@/config/economy';
import type { Difficulty, GameId, GameMode } from '@/games/types';

export interface CompletionXpInput {
  game: GameId;
  difficulty: Difficulty;
  mode: GameMode;
  score: number;
  perfect: boolean;
  /** Unlimited completions earlier the same UTC day. */
  unlimitedEarlierToday: number;
}

export interface CompletionXp {
  /** XP added to the player's total for the game itself. */
  xp: number;
  /** XP credited to this game's mastery (before same-day taper). */
  masteryXp: number;
  breakdown: { label: string; amount: number }[];
}

export function completionXp(input: CompletionXpInput): CompletionXp {
  const E = XP_ECONOMY;
  const base = E.baseByDifficulty[input.difficulty] * E.gameMultiplier[input.game];
  const modeMult = input.mode === 'daily' ? E.dailyMultiplier : 1;
  const perf = Math.max(0, (input.score - E.performanceBonus.from) / (1000 - E.performanceBonus.from)) * E.performanceBonus.max;

  const gameXp = Math.round(base * modeMult);
  const perfXp = Math.round(base * modeMult * perf);
  const perfectXp = input.perfect ? E.perfectBonus : 0;
  const raw = gameXp + perfXp + perfectXp;

  let taper = 1;
  if (input.mode === 'unlimited') for (const step of E.unlimitedTaper) if (input.unlimitedEarlierToday >= step.after) taper = step.multiplier;
  const xp = input.mode === 'unlimited' ? Math.max(E.unlimitedFloor, Math.round(raw * taper)) : raw;

  const breakdown = [{ label: input.mode === 'daily' ? 'Daily game' : 'Unlimited game', amount: gameXp }];
  if (perfXp) breakdown.push({ label: 'Performance', amount: perfXp });
  if (perfectXp) breakdown.push({ label: 'Perfect run', amount: perfectXp });
  if (xp !== raw) breakdown.push({ label: 'Same-day taper', amount: xp - raw });
  return { xp, masteryXp: raw, breakdown };
}

/** XP for reaching a streak length, or 0 if it is not a milestone. */
export function streakMilestoneXp(kind: 'normal' | 'truePlayer', length: number): number {
  return XP_ECONOMY.streakMilestones[kind][length] ?? 0;
}
