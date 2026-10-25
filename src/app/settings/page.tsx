'use client';

import React, { useState } from 'react';
import { useTheme } from '@/components/theme/theme-provider';
import {
  Palette,
  Volume2,
  Bell,
  Eye,
  Shield,
  Download,
  Trash2,
  Check,
  Sparkles,
} from 'lucide-react';

export default function SettingsPage() {
  const { currentTheme, setTheme, availableThemes } = useTheme();

  // Settings states (stored in DB/preferences)
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [achievementSound, setAchievementSound] = useState(true);
  const [showOnLeaderboards, setShowOnLeaderboards] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-theme-text">Settings</h1>
        <p className="text-xs text-theme-muted mt-1">
          Customize themes, audio feedback, leaderboard privacy, and account security.
        </p>
      </div>

      {/* Theme & Appearance */}
      <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border flex flex-col gap-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-theme-border">
          <Palette className="w-5 h-5 text-theme-accent" />
          <h2 className="text-base font-extrabold text-theme-text">Themes & Appearance</h2>
        </div>

        <div>
          <p className="text-xs text-theme-muted mb-3">
            Choose from 11 hand-crafted color palettes. All themes are free and unlocked for all players.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {availableThemes.map((theme) => {
              const isSelected = theme.id === currentTheme;
              return (
                <button
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-theme-elevated border-theme-accent shadow-sm'
                      : 'bg-theme-elevated/40 border-theme-border hover:bg-theme-elevated'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/10 shrink-0"
                      style={{ backgroundColor: theme.colors.accent }}
                    />
                    <span className="text-xs font-bold text-theme-text">{theme.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-theme-accent" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Audio & Effects */}
      <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border flex flex-col gap-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-theme-border">
          <Volume2 className="w-5 h-5 text-theme-accent" />
          <h2 className="text-base font-extrabold text-theme-text">Sound Effects</h2>
        </div>

        <div className="flex items-center justify-between py-1">
          <div>
            <div className="text-xs font-bold text-theme-text">Sound Effects</div>
            <div className="text-[11px] text-theme-muted">
              Audio feedback for game interactions and puzzle completion
            </div>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              soundEnabled ? 'bg-theme-accent' : 'bg-theme-elevated'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                soundEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-1 border-t border-theme-border/60">
          <div>
            <div className="text-xs font-bold text-theme-text">Achievement Unlock Chime</div>
            <div className="text-[11px] text-theme-muted">
              Celebratory sound when unlocking an achievement
            </div>
          </div>
          <button
            onClick={() => setAchievementSound(!achievementSound)}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              achievementSound ? 'bg-theme-accent' : 'bg-theme-elevated'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                achievementSound ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Privacy & Leaderboards */}
      <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border flex flex-col gap-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-theme-border">
          <Eye className="w-5 h-5 text-theme-accent" />
          <h2 className="text-base font-extrabold text-theme-text">Privacy & Leaderboards</h2>
        </div>

        <div className="flex items-center justify-between py-1">
          <div>
            <div className="text-xs font-bold text-theme-text">Show Me on Leaderboards</div>
            <div className="text-[11px] text-theme-muted">
              Appear on global XP and streak leaderboards
            </div>
          </div>
          <button
            onClick={() => setShowOnLeaderboards(!showOnLeaderboards)}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              showOnLeaderboards ? 'bg-theme-accent' : 'bg-theme-elevated'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                showOnLeaderboards ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-1 border-t border-theme-border/60">
          <div>
            <div className="text-xs font-bold text-theme-text">Public Profile Visibility</div>
            <div className="text-[11px] text-theme-muted">
              Allow other players to view your profile and game mastery
            </div>
          </div>
          <button
            onClick={() => setPublicProfile(!publicProfile)}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              publicProfile ? 'bg-theme-accent' : 'bg-theme-elevated'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                publicProfile ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Data & Privacy Actions */}
      <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border flex flex-col gap-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-theme-border">
          <Shield className="w-5 h-5 text-theme-accent" />
          <h2 className="text-base font-extrabold text-theme-text">Data Privacy & Rights</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-theme-text">Export My Data</div>
            <div className="text-[11px] text-theme-muted">
              Download a complete JSON export of your sessions, XP ledger, and achievements
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-theme-elevated hover:bg-theme-border text-xs font-bold text-theme-text transition-colors">
            <Download className="w-3.5 h-3.5" />
            <span>Export Data</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-theme-border/60">
          <div>
            <div className="text-xs font-bold text-rose-400">Delete Account</div>
            <div className="text-[11px] text-theme-muted">
              Permanently delete your profile, stats, and streaks
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
