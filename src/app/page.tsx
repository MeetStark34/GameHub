import React from 'react';
import Link from 'next/link';
import { GAME_LIST, GameDefinition } from '@/config/games';
import {
  Sparkles,
  ArrowRight,
  Infinity as InfinityIcon,
  CalendarDays,
  Flame,
  Crown,
  Trophy,
  Award,
  Zap,
  CheckCircle2,
  Shield,
  Layers,
  Grid3X3,
  Hash,
  Route,
  FileText,
  Crosshair,
  TrendingUp,
  SunMoon,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Grid3X3,
  Hash,
  Route,
  FileText,
  Crosshair,
  TrendingUp,
  SunMoon,
  Crown,
};

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-theme-border/60">
        {/* Subtle background glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-theme-accent/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-theme-surface border border-theme-border text-xs font-semibold text-theme-accent mb-6 animate-fade-in shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The unlimited brain-training platform</span>
          </div>

          {/* Master Tagline & Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-theme-text mb-4 leading-[1.1]">
            GameHub
          </h1>

          <p className="text-xl sm:text-2xl font-medium text-theme-accent max-w-2xl mb-3">
            Your daily brain training, without the daily limit
          </p>

          <p className="text-base sm:text-lg font-bold tracking-widest uppercase text-theme-muted mb-8">
            Play. Progress. Master.
          </p>

          {/* Primary Call to Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 mb-12">
            <Link
              href="/daily"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-theme-accent text-white font-bold text-sm shadow-lg shadow-theme-accent/30 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Play Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/unlimited"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-theme-surface border border-theme-border hover:bg-theme-elevated text-theme-text font-bold text-sm transition-all shadow-sm"
            >
              <InfinityIcon className="w-4 h-4 text-theme-accent" />
              <span>Unlimited Mode</span>
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-theme-surface/50 border border-theme-border/60 hover:bg-theme-surface text-theme-muted hover:text-theme-text font-semibold text-sm transition-all"
            >
              <span>Sign In / Create Account</span>
            </Link>
          </div>

          {/* Key Pillars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-4xl text-left">
            <div className="p-3.5 rounded-xl bg-theme-surface border border-theme-border">
              <div className="flex items-center gap-2 text-xs font-bold text-theme-text mb-1">
                <InfinityIcon className="w-4 h-4 text-emerald-400" />
                <span>Unlimited Play</span>
              </div>
              <p className="text-[11px] text-theme-muted leading-relaxed">
                Zero artificial locks. Play as many generated puzzles as your mind desires.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-theme-surface border border-theme-border">
              <div className="flex items-center gap-2 text-xs font-bold text-theme-text mb-1">
                <CalendarDays className="w-4 h-4 text-sky-400" />
                <span>UTC Daily Set</span>
              </div>
              <p className="text-[11px] text-theme-muted leading-relaxed">
                8 curated daily games. Complete all 8 for the coveted True Player Streak.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-theme-surface border border-theme-border">
              <div className="flex items-center gap-2 text-xs font-bold text-theme-text mb-1">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Dual Streaks</span>
              </div>
              <p className="text-[11px] text-theme-muted leading-relaxed">
                Normal & True Player streaks protected by 10-punch Gold Streak Repair cards.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-theme-surface border border-theme-border">
              <div className="flex items-center gap-2 text-xs font-bold text-theme-text mb-1">
                <Crown className="w-4 h-4 text-purple-400" />
                <span>10 Ranks & Prestige</span>
              </div>
              <p className="text-[11px] text-theme-muted leading-relaxed">
                From Rookie to Legend III. Indefinite XP progression across all 8 games.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Eight Games Showcase */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-theme-surface border border-theme-border text-xs font-semibold text-theme-muted mb-3">
            <Layers className="w-3.5 h-3.5 text-theme-accent" />
            <span>Eight Signature Puzzles</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-theme-text mb-2">
            The GameHub Collection
          </h2>
          <p className="text-sm sm:text-base text-theme-muted max-w-xl mx-auto">
            Each game features distinct mechanics, visual identity, difficulty tuning, and dedicated mastery progression.
          </p>
        </div>

        {/* 8 Game Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {GAME_LIST.map((game: GameDefinition) => {
            const Icon = ICON_MAP[game.icon] || Grid3X3;
            return (
              <div
                key={game.id}
                className="group relative flex flex-col rounded-2xl bg-theme-surface border border-theme-border p-5 hover:border-theme-accent transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
              >
                {/* Top accent badge */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-md"
                    style={{ backgroundColor: game.accentColor }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-theme-elevated text-theme-muted border border-theme-border">
                    Game #{game.order}
                  </span>
                </div>

                {/* Title & Tagline */}
                <h3 className="text-lg font-extrabold text-theme-text group-hover:text-theme-accent transition-colors">
                  {game.name}
                </h3>
                <p className="text-xs font-medium text-theme-muted mb-4">
                  {game.tagline}
                </p>

                {/* Distinct Three-Line Punch */}
                <div className="bg-theme-elevated/40 border border-theme-border/60 rounded-xl p-3 mb-4 space-y-1">
                  {game.threeLinePunch.map((punch, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-theme-text">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: game.accentColor }} />
                      <span>{punch}</span>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <p className="text-xs text-theme-muted leading-relaxed mb-5 flex-1">
                  {game.description}
                </p>

                {/* Play Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-theme-border/60 mt-auto">
                  <Link
                    href={`/daily?game=${game.id}`}
                    className="flex-1 text-center py-2 px-3 rounded-lg bg-theme-accent text-white text-xs font-bold hover:opacity-90 transition-opacity"
                  >
                    Daily Set
                  </Link>
                  <Link
                    href={`/unlimited?game=${game.id}`}
                    className="flex-1 text-center py-2 px-3 rounded-lg bg-theme-elevated hover:bg-theme-border text-theme-text text-xs font-semibold transition-colors"
                  >
                    Unlimited
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section className="py-16 bg-theme-surface/50 border-t border-theme-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <CalendarDays className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-theme-text">Daily Set vs Unlimited</h3>
              <p className="text-xs text-theme-muted leading-relaxed">
                Enjoy today's unified 8-game challenge for maximum XP and streak progression. Then dive into Unlimited mode to play as many generated puzzles as you want.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-theme-text">Gold Streak Repair Cards</h3>
              <p className="text-xs text-theme-muted leading-relaxed">
                Earn 10 punches by completing 20 games in a day or completing two Daily Sets. Store up to 3 repair cards to protect your streak against life's busy days.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-theme-text">Rank & Game Mastery</h3>
              <p className="text-xs text-theme-muted leading-relaxed">
                Climb from Rookie to Legend with prestige tiers (I, II, III). Each of the eight games additionally tracks individual game mastery from Rookie to Legend.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
