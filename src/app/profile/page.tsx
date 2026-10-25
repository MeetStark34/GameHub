'use client';

import React from 'react';
import { GAME_LIST } from '@/config/games';
import { calculateRankFromXp } from '@/config/levels';
import {
  Flame,
  Crown,
  Sparkles,
  Award,
  Layers,
  Calendar,
  Shield,
  Gamepad2,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function ProfilePage() {
  const currentXp = 68421;
  const rankInfo = calculateRankFromXp(currentXp);

  const masteryMap: Record<string, string> = {
    patches: 'MASTER',
    sudoku: 'GRANDMASTER',
    zip: 'EXPERT',
    werd: 'VETERAN',
    pinpoint: 'PRO',
    crossclimb: 'EXPERT',
    tango: 'MASTER',
    queens: 'NOVICE',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-8 animate-fade-in">
      {/* Profile Gaming Identity Header */}
      <div className="p-8 rounded-3xl bg-theme-surface border border-theme-border shadow-xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-theme-accent/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-slate-900 font-black text-3xl shadow-xl shadow-amber-500/20">
              S
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-theme-text tracking-tight uppercase">
                  Mr. Stark
                </h1>
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  🛠 Developer
                </span>
              </div>
              <p className="text-xs text-theme-muted mt-1">
                @mrstark • Joined October 2026 • Infinite brain-training enthusiast
              </p>
            </div>
          </div>

          <div className="bg-theme-elevated/50 border border-theme-border p-4 rounded-2xl flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-wider text-theme-muted">
                Level {rankInfo.level}
              </div>
              <div className="text-xl font-black text-theme-text">
                {rankInfo.formattedRank}
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-theme-accent/20 border border-theme-accent text-theme-accent font-black text-lg flex items-center justify-center">
              L{rankInfo.level}
            </div>
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="mt-6 pt-6 border-t border-theme-border/60">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-theme-muted">
              {currentXp.toLocaleString()} XP
            </span>
            <span className="text-theme-accent font-mono">
              {rankInfo.nextLevelMinXp
                ? `${(rankInfo.nextLevelMinXp - currentXp).toLocaleString()} XP to Level ${rankInfo.level + 1}`
                : 'Highest official level achieved'}
            </span>
          </div>
          <div className="w-full bg-theme-elevated h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-theme-accent to-purple-400 h-full rounded-full transition-all"
              style={{ width: `${rankInfo.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Streaks & Key Stats Showcase */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border">
          <div className="text-xs font-bold text-theme-muted uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Normal Streak</span>
          </div>
          <div className="text-2xl font-black text-theme-text">42 Days</div>
          <div className="text-[11px] text-theme-muted mt-0.5">Best: 42 Days</div>
        </div>

        <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border">
          <div className="text-xs font-bold text-theme-muted uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Crown className="w-4 h-4 text-purple-400" />
            <span>True Player</span>
          </div>
          <div className="text-2xl font-black text-theme-text">19 Sets</div>
          <div className="text-[11px] text-theme-muted mt-0.5">All 8 completed</div>
        </div>

        <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border">
          <div className="text-xs font-bold text-theme-muted uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Gamepad2 className="w-4 h-4 text-emerald-400" />
            <span>Total Games</span>
          </div>
          <div className="text-2xl font-black text-theme-text">384</div>
          <div className="text-[11px] text-theme-muted mt-0.5">98.2% win rate</div>
        </div>

        <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border">
          <div className="text-xs font-bold text-theme-muted uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Award className="w-4 h-4 text-yellow-400" />
            <span>Achievements</span>
          </div>
          <div className="text-2xl font-black text-theme-text">14 / 22</div>
          <div className="text-[11px] text-theme-muted mt-0.5">3 Weird unlocked</div>
        </div>
      </div>

      {/* Game Mastery Grid (as specified in Master Spec Section 15) */}
      <div className="p-6 rounded-3xl bg-theme-surface border border-theme-border">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-theme-border">
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-theme-text flex items-center gap-2">
              <Layers className="w-5 h-5 text-theme-accent" />
              <span>Game Mastery</span>
            </h2>
            <p className="text-xs text-theme-muted mt-0.5">
              Individual skill progression across all eight puzzles
            </p>
          </div>
          <div className="px-3 py-1 rounded-xl bg-theme-elevated text-xs font-extrabold text-theme-accent border border-theme-border">
            Overall: ELITE
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GAME_LIST.map((game) => {
            const masteryRank = masteryMap[game.id] || 'ROOKIE';
            return (
              <div
                key={game.id}
                className="p-4 rounded-2xl bg-theme-elevated/40 border border-theme-border flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: game.accentColor }}
                  />
                  <div>
                    <div className="text-xs font-bold text-theme-text">{game.name}</div>
                    <div className="text-[10px] text-theme-muted">Game #{game.order}</div>
                  </div>
                </div>

                <span className="text-xs font-mono font-black text-theme-accent uppercase tracking-wider">
                  {masteryRank}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
