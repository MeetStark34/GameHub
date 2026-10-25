'use client';

import React, { useState } from 'react';
import { Trophy, Flame, Crown, Sparkles, Medal, Clock, Shield } from 'lucide-react';

type LeaderboardTab = 'xp' | 'normal_streak' | 'true_player' | 'weekly';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('xp');

  // Demonstration rankings (Phase 17 connects to server-calculated views)
  const rankings = [
    { rank: 1, name: 'Mr. Stark', role: '🛠 Developer', level: 'Level 7 Elite III', score: '68,421 XP', streak: 42, trueStreak: 19 },
    { rank: 2, name: 'Axiom', role: '👑 Founder', level: 'Level 6 Expert II', score: '52,100 XP', streak: 35, trueStreak: 14 },
    { rank: 3, name: 'CipherByte', role: '🎮 Player', level: 'Level 6 Expert I', score: '44,890 XP', streak: 28, trueStreak: 12 },
    { rank: 4, name: 'LogicQueen', role: '🎮 Player', level: 'Level 5 Veteran III', score: '38,200 XP', streak: 21, trueStreak: 9 },
    { rank: 5, name: 'Enigma', role: '🎮 Player', level: 'Level 5 Veteran I', score: '31,450 XP', streak: 19, trueStreak: 7 },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-theme-accent/10 text-theme-accent text-xs font-bold uppercase mb-2">
            <Trophy className="w-3.5 h-3.5" />
            <span>Global Rankings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-theme-text">Leaderboards</h1>
          <p className="text-xs text-theme-muted mt-1 max-w-xl">
            Compete on lifetime XP, active streaks, and weekly puzzle volume. Server-side verified rankings.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-theme-muted bg-theme-elevated/40 border border-theme-border p-3 rounded-xl">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Anti-cheat verified calculations</span>
        </div>
      </div>

      {/* Leaderboard Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-theme-border text-xs font-semibold">
        <button
          onClick={() => setActiveTab('xp')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'xp'
              ? 'bg-theme-accent text-white shadow-sm'
              : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Lifetime XP</span>
        </button>

        <button
          onClick={() => setActiveTab('normal_streak')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'normal_streak'
              ? 'bg-theme-accent text-white shadow-sm'
              : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Normal Streak</span>
        </button>

        <button
          onClick={() => setActiveTab('true_player')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'true_player'
              ? 'bg-theme-accent text-white shadow-sm'
              : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface'
          }`}
        >
          <Crown className="w-3.5 h-3.5" />
          <span>True Player Streak</span>
        </button>

        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'weekly'
              ? 'bg-theme-accent text-white shadow-sm'
              : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>This Week</span>
        </button>
      </div>

      {/* Rankings Table */}
      <div className="rounded-2xl bg-theme-surface border border-theme-border overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-theme-muted border-b border-theme-border bg-theme-elevated/30">
          <div className="col-span-2 sm:col-span-1">Rank</div>
          <div className="col-span-6 sm:col-span-5">Player</div>
          <div className="hidden sm:block sm:col-span-3">Level & Rank</div>
          <div className="col-span-4 sm:col-span-3 text-right">
            {activeTab === 'xp' ? 'XP' : activeTab === 'normal_streak' ? 'Streak' : 'True Streak'}
          </div>
        </div>

        <div className="divide-y divide-theme-border/50">
          {rankings.map((user) => (
            <div
              key={user.rank}
              className={`grid grid-cols-12 px-5 py-3.5 items-center text-xs transition-colors hover:bg-theme-elevated/30 ${
                user.rank === 1 ? 'bg-amber-500/5' : ''
              }`}
            >
              {/* Rank Badge */}
              <div className="col-span-2 sm:col-span-1 font-bold flex items-center">
                {user.rank === 1 ? (
                  <span className="w-6 h-6 rounded-full bg-yellow-400/20 text-yellow-400 flex items-center justify-center font-black text-xs">
                    🥇
                  </span>
                ) : user.rank === 2 ? (
                  <span className="w-6 h-6 rounded-full bg-slate-300/20 text-slate-300 flex items-center justify-center font-black text-xs">
                    🥈
                  </span>
                ) : user.rank === 3 ? (
                  <span className="w-6 h-6 rounded-full bg-amber-600/20 text-amber-500 flex items-center justify-center font-black text-xs">
                    🥉
                  </span>
                ) : (
                  <span className="text-theme-muted font-mono font-bold pl-1.5">
                    #{user.rank}
                  </span>
                )}
              </div>

              {/* Player Name & Role */}
              <div className="col-span-6 sm:col-span-5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-theme-elevated border border-theme-border flex items-center justify-center font-bold text-xs text-theme-text">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <div className="font-extrabold text-theme-text flex items-center gap-1.5">
                    <span>{user.name}</span>
                    <span className="text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20">
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Level & Rank */}
              <div className="hidden sm:block sm:col-span-3 text-theme-muted font-medium">
                {user.level}
              </div>

              {/* Score / Streak */}
              <div className="col-span-4 sm:col-span-3 text-right font-mono font-bold text-theme-text">
                {activeTab === 'xp'
                  ? user.score
                  : activeTab === 'normal_streak'
                  ? `${user.streak} days 🔥`
                  : `${user.trueStreak} sets 👑`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
