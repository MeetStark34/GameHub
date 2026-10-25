'use client';

import React from 'react';
import Link from 'next/link';
import { GAME_LIST } from '@/config/games';
import { calculateRankFromXp } from '@/config/levels';
import {
  Flame,
  Crown,
  Sparkles,
  Infinity as InfinityIcon,
  CalendarDays,
  Shield,
  Trophy,
  ArrowRight,
  Clock,
  CheckCircle2,
  Layers,
} from 'lucide-react';

export default function DashboardPage() {
  // Sample demonstration stats (backed by database in Phase 02+)
  const currentXp = 68421;
  const rankInfo = calculateRankFromXp(currentXp);
  const normalStreak = 42;
  const truePlayerStreak = 19;
  const punchesFilled = 7; // out of 10
  const goldCardsInInventory = 3; // max 3

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-8 animate-fade-in">
      {/* Welcome & Overall Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-theme-surface border border-theme-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-900 font-extrabold text-2xl shadow-md">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-theme-text">
                Welcome back, Mr. Stark
              </h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                🛠 Developer
              </span>
            </div>
            <p className="text-xs text-theme-muted mt-0.5">
              Ready for your daily brain training session?
            </p>
          </div>
        </div>

        {/* Level & Rank Pill */}
        <div className="flex items-center gap-4 bg-theme-elevated/40 border border-theme-border p-3 rounded-xl">
          <div className="text-right">
            <div className="text-xs font-semibold text-theme-muted">Rank Status</div>
            <div className="text-sm font-extrabold text-theme-text">
              Level {rankInfo.level} • {rankInfo.formattedRank}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-theme-accent/15 border border-theme-accent/30 flex items-center justify-center text-theme-accent font-black">
            L{rankInfo.level}
          </div>
        </div>
      </div>

      {/* Core Metrics: Streaks, XP, Punch Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Normal Streak */}
        <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-theme-muted mb-1 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Normal Streak</span>
            </div>
            <div className="text-3xl font-black text-theme-text">{normalStreak}</div>
            <div className="text-[11px] text-theme-muted mt-0.5">Days continuous play</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold">
            🔥
          </div>
        </div>

        {/* True Player Streak */}
        <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-theme-muted mb-1 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-purple-400" />
              <span>True Player Streak</span>
            </div>
            <div className="text-3xl font-black text-theme-text">{truePlayerStreak}</div>
            <div className="text-[11px] text-theme-muted mt-0.5">All 8 games solved</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
            👑
          </div>
        </div>

        {/* Total XP */}
        <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-theme-muted mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Total XP</span>
            </div>
            <div className="text-3xl font-black text-theme-text">
              {currentXp.toLocaleString()}
            </div>
            <div className="text-[11px] text-theme-muted mt-0.5">
              {rankInfo.progressPercent}% to next prestige
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
            ⭐
          </div>
        </div>

        {/* Gold Repair Cards & Punch Card */}
        <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-theme-muted flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-yellow-400" />
              <span>Gold Repair Cards</span>
            </div>
            <span className="text-xs font-mono font-bold text-yellow-400">
              {goldCardsInInventory}/3 🥊
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-center justify-between text-[11px] text-theme-muted mb-1">
              <span>Punch Card Progress</span>
              <span className="font-bold text-theme-text">{punchesFilled}/10</span>
            </div>
            {/* Visual 10-punch display */}
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-colors ${
                    i < punchesFilled ? 'bg-yellow-400' : 'bg-theme-elevated'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="text-[10px] text-theme-muted">
            Punch card fills via 20 games/day or 2 daily sets
          </div>
        </div>
      </div>

      {/* Today's Play: Daily Set vs Unlimited */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Set Card */}
        <div className="rounded-2xl bg-theme-surface border border-theme-border p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-theme-accent/10 text-theme-accent text-[11px] font-bold uppercase mb-2">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Today's Official Challenge</span>
              </div>
              <h2 className="text-2xl font-black text-theme-text">Daily Set</h2>
              <p className="text-xs text-theme-muted mt-1">
                Complete all 8 games for maximum XP and True Player streak advancement.
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-theme-accent/10 border border-theme-accent/20 flex items-center justify-center text-theme-accent">
              <CalendarDays className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-theme-elevated/40 border border-theme-border/60 rounded-xl p-3 mb-6">
            <div className="flex items-center justify-between text-xs font-semibold text-theme-text mb-2">
              <span>Daily Progress</span>
              <span className="text-theme-accent font-bold">4 / 8 Complete</span>
            </div>
            <div className="w-full bg-theme-elevated h-2 rounded-full overflow-hidden">
              <div className="bg-theme-accent h-full rounded-full w-1/2" />
            </div>
          </div>

          <Link
            href="/daily"
            className="w-full py-3 px-4 rounded-xl bg-theme-accent hover:opacity-90 text-white font-bold text-sm text-center flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <span>Continue Daily Set</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Unlimited Card */}
        <div className="rounded-2xl bg-theme-surface border border-theme-border p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold uppercase mb-2">
                <InfinityIcon className="w-3.5 h-3.5" />
                <span>Zero Limit</span>
              </div>
              <h2 className="text-2xl font-black text-theme-text">Unlimited Mode</h2>
              <p className="text-xs text-theme-muted mt-1">
                Endless procedural puzzles across Easy, Normal, Hard, and Expert difficulties.
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <InfinityIcon className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-theme-elevated/40 border border-theme-border/60 rounded-xl p-3 mb-6 text-xs text-theme-muted space-y-1">
            <div className="flex items-center justify-between">
              <span>Games available:</span>
              <span className="font-bold text-theme-text">All 8 games</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Earns:</span>
              <span className="font-bold text-theme-text">XP, Mastery, Achievements</span>
            </div>
          </div>

          <Link
            href="/unlimited"
            className="w-full py-3 px-4 rounded-xl bg-theme-surface border border-theme-border hover:bg-theme-elevated text-theme-text font-bold text-sm text-center flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>Play Unlimited Puzzles</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Game Mastery Overview */}
      <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-theme-accent" />
            <h3 className="text-lg font-bold text-theme-text">Game Mastery Progression</h3>
          </div>
          <span className="text-xs font-bold text-theme-muted">Overall: ELITE</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {GAME_LIST.map((game) => (
            <div
              key={game.id}
              className="p-3 rounded-xl bg-theme-elevated/40 border border-theme-border flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-theme-text truncate">{game.name}</span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: game.accentColor }}
                />
              </div>
              <span className="text-[11px] font-mono font-semibold text-theme-muted uppercase">
                {game.id === 'patches'
                  ? 'Master'
                  : game.id === 'sudoku'
                  ? 'Grandmaster'
                  : game.id === 'zip'
                  ? 'Expert'
                  : game.id === 'werd'
                  ? 'Veteran'
                  : game.id === 'pinpoint'
                  ? 'Pro'
                  : game.id === 'crossclimb'
                  ? 'Expert'
                  : game.id === 'tango'
                  ? 'Master'
                  : 'Novice'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
