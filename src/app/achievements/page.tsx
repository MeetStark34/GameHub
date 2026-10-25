'use client';

import React, { useState } from 'react';
import { ACHIEVEMENTS, AchievementCategory } from '@/config/achievements';
import {
  Award,
  Sparkles,
  Lock,
  CheckCircle2,
  HelpCircle,
  Flame,
  Crown,
  Zap,
  Package,
  Calendar,
  Gem,
} from 'lucide-react';

const CATEGORIES: (AchievementCategory | 'All')[] = [
  'All',
  'Gameplay',
  'Streaks',
  'True Player',
  'Speed',
  'Game-Specific',
  'Rare',
  'Weird',
];

export default function AchievementsPage() {
  const [activeTab, setActiveTab] = useState<AchievementCategory | 'All'>('All');

  // Demonstration unlocked state (Phase 12 connects to database persistence)
  const unlockedIds = new Set(['first_step', 'week_warrior', 'night_owl']);

  const filteredAchievements = ACHIEVEMENTS.filter((ach) => {
    if (activeTab === 'All') return true;
    return ach.category === activeTab;
  });

  const totalUnlocked = ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id)).length;
  const totalCount = ACHIEVEMENTS.length;
  const progressPercent = Math.round((totalUnlocked / totalCount) * 100);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-theme-accent/10 text-theme-accent text-xs font-bold uppercase mb-2">
            <Award className="w-3.5 h-3.5" />
            <span>Badges & Milestones</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-theme-text">Achievements</h1>
          <p className="text-xs text-theme-muted mt-1 max-w-xl">
            Tackle skill challenges, streak records, and bizarre hidden feats to earn massive XP rewards.
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-1.5 bg-theme-elevated/40 border border-theme-border p-4 rounded-xl">
          <div className="text-xs font-semibold text-theme-muted">Unlocked Progress</div>
          <div className="text-2xl font-black text-theme-text">
            {totalUnlocked} / {totalCount}{' '}
            <span className="text-xs text-theme-accent font-bold">({progressPercent}%)</span>
          </div>
          <div className="w-36 bg-theme-elevated h-2 rounded-full overflow-hidden">
            <div
              className="bg-theme-accent h-full rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-theme-border text-xs font-semibold">
        {CATEGORIES.map((cat) => {
          const isActive = activeTab === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-theme-accent text-white shadow-sm'
                  : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface'
              }`}
            >
              {cat === 'Weird' ? '🌀 Weird' : cat}
            </button>
          );
        })}
      </div>

      {/* Weird Category Callout if active */}
      {activeTab === 'Weird' && (
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center gap-3">
          <span className="text-2xl">🌀</span>
          <div>
            <div className="font-bold text-sm text-purple-200">The Weird Collection</div>
            <div>
              These achievements reward playful curiosity, stubborn determination, and unconventional habits. Unlocked secret achievements reveal their true names and stories.
            </div>
          </div>
        </div>
      )}

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAchievements.map((ach) => {
          const isUnlocked = unlockedIds.has(ach.id);
          const isSecretLocked = ach.isSecret && !isUnlocked;

          return (
            <div
              key={ach.id}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                isUnlocked
                  ? 'bg-theme-surface border-theme-accent/40 shadow-sm'
                  : 'bg-theme-surface/50 border-theme-border opacity-75'
              }`}
            >
              {/* Icon Container */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                  isUnlocked
                    ? 'bg-theme-accent/20 border-theme-accent text-theme-accent'
                    : 'bg-theme-elevated border-theme-border text-theme-muted'
                }`}
              >
                {isSecretLocked ? (
                  <HelpCircle className="w-5 h-5 text-theme-muted" />
                ) : isUnlocked ? (
                  <Award className="w-5 h-5 text-theme-accent" />
                ) : (
                  <Lock className="w-5 h-5 text-theme-muted" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-extrabold text-sm text-theme-text truncate">
                    {isSecretLocked ? '???' : ach.name}
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-theme-elevated text-theme-muted border border-theme-border">
                      {ach.rarity}
                    </span>
                    <span className="text-xs font-mono font-bold text-theme-accent">
                      +{ach.xpReward} XP
                    </span>
                  </div>
                </div>

                <p className="text-xs text-theme-muted leading-relaxed">
                  {isSecretLocked ? 'Secret achievement. Solve puzzles to discover.' : ach.description}
                </p>

                {isUnlocked && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Unlocked</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
