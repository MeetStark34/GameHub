'use client';

import React from 'react';
import Link from 'next/link';
import { GAME_LIST } from '@/config/games';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Flame,
  Crown,
} from 'lucide-react';

export default function DailySetPage() {
  // Demonstration completion state (Phase 06 integrates live session records)
  const completedCount: number = 4;
  const isFullyComplete = completedCount === 8;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-theme-surface border border-theme-border">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-theme-accent/10 text-theme-accent text-xs font-bold uppercase mb-2">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>UTC Daily Challenge</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-theme-text">Daily Set</h1>
          <p className="text-xs text-theme-muted mt-1 max-w-xl">
            Complete all 8 games today to advance your True Player Streak and earn bonus Daily Set XP.
            Immutable for everyone on this UTC day.
          </p>
        </div>

        {/* Progress Display */}
        <div className="flex flex-col sm:items-end gap-1.5 bg-theme-elevated/40 border border-theme-border p-4 rounded-xl">
          <div className="text-xs font-semibold text-theme-muted">Daily Set Progress</div>
          <div className="text-2xl font-black text-theme-text flex items-center gap-2">
            <span>{completedCount} / 8</span>
            <span className="text-xs text-theme-accent font-bold">
              ({Math.round((completedCount / 8) * 100)}%)
            </span>
          </div>
          <div className="w-36 bg-theme-elevated h-2 rounded-full overflow-hidden">
            <div
              className="bg-theme-accent h-full rounded-full transition-all"
              style={{ width: `${(completedCount / 8) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {isFullyComplete && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-yellow-500/30 flex items-center gap-3">
          <Crown className="w-6 h-6 text-yellow-400" />
          <div>
            <div className="text-sm font-extrabold text-yellow-300">👑 DAILY SET COMPLETE</div>
            <div className="text-xs text-theme-muted">
              You’ve conquered today’s full set. True Player Streak +1 awarded!
            </div>
          </div>
        </div>
      )}

      {/* 8 Daily Game Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GAME_LIST.map((game, index) => {
          // Mock some completed for preview
          const isDone = index < completedCount;
          const completionTime = isDone ? '02:31' : null;

          return (
            <div
              key={game.id}
              className={`p-5 rounded-2xl border transition-all flex items-center justify-between ${
                isDone
                  ? 'bg-theme-surface/70 border-emerald-500/30'
                  : 'bg-theme-surface border-theme-border hover:border-theme-accent'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-md"
                  style={{ backgroundColor: game.accentColor }}
                >
                  <span className="text-sm font-black">#{game.order}</span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-theme-text">{game.name}</h3>
                    {isDone && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Done</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-theme-muted mt-0.5">{game.tagline}</p>
                  {isDone && (
                    <div className="text-[11px] text-theme-muted flex items-center gap-1 mt-1 font-mono">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>Completed in {completionTime}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <button
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                      : 'bg-theme-accent text-white hover:opacity-90 shadow-md shadow-theme-accent/20'
                  }`}
                >
                  {isDone ? 'Replay' : 'Play'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
