'use client';

import React, { useState } from 'react';
import { GAME_LIST, GameDifficulty, GameId } from '@/config/games';
import {
  Infinity as InfinityIcon,
  Sparkles,
  Play,
  RotateCcw,
  Sliders,
  Check,
} from 'lucide-react';

export default function UnlimitedPage() {
  const [selectedGame, setSelectedGame] = useState<GameId>('patches');
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty>('normal');

  const difficulties: { id: GameDifficulty; label: string; desc: string }[] = [
    { id: 'easy', label: 'Easy', desc: 'Gentle intro, relaxed logic' },
    { id: 'normal', label: 'Normal', desc: 'Standard balanced challenge' },
    { id: 'hard', label: 'Hard', desc: 'Deep deduction, fewer hints' },
    { id: 'expert', label: 'Expert', desc: 'Ultimate mastery test' },
  ];

  const activeGame = GAME_LIST.find((g) => g.id === selectedGame) || GAME_LIST[0];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-8 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase mb-2">
            <InfinityIcon className="w-3.5 h-3.5" />
            <span>Endless Generator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-theme-text">Unlimited Mode</h1>
          <p className="text-xs text-theme-muted mt-1 max-w-xl">
            Play generated puzzles as much as you want. Perfect your deduction, boost your game mastery rank, and collect achievements without limits.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-theme-elevated/40 border border-theme-border p-3 rounded-xl text-xs text-theme-muted font-mono">
          <Sparkles className="w-4 h-4 text-theme-accent" />
          <span>∞ Puzzles Ready</span>
        </div>
      </div>

      {/* Step 1: Select Game */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-theme-muted">
            1. Select a Game
          </h2>
          <span className="text-xs text-theme-muted font-mono">
            Selected: <strong className="text-theme-text">{activeGame.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {GAME_LIST.map((game) => {
            const isSelected = game.id === selectedGame;
            return (
              <button
                key={game.id}
                onClick={() => setSelectedGame(game.id)}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-theme-surface border-theme-accent shadow-lg shadow-theme-accent/10 ring-1 ring-theme-accent'
                    : 'bg-theme-surface/70 border-theme-border hover:bg-theme-surface hover:border-theme-border/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: game.accentColor }}
                  />
                  {isSelected && <Check className="w-3.5 h-3.5 text-theme-accent" />}
                </div>
                <div className="font-extrabold text-sm text-theme-text">{game.name}</div>
                <div className="text-[11px] text-theme-muted line-clamp-1 mt-0.5">
                  {game.tagline}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Select Difficulty */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-theme-muted">
          2. Select Difficulty
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {difficulties.map((diff) => {
            const isSelected = diff.id === selectedDifficulty;
            return (
              <button
                key={diff.id}
                onClick={() => setSelectedDifficulty(diff.id)}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-theme-surface border-theme-accent shadow-md ring-1 ring-theme-accent'
                    : 'bg-theme-surface/70 border-theme-border hover:bg-theme-surface hover:border-theme-border/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-theme-text">{diff.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-theme-accent" />}
                </div>
                <span className="text-xs text-theme-muted">{diff.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 3: Launch Puzzle Action */}
      <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-theme-text">
            Ready to solve {activeGame.name}?
          </h3>
          <p className="text-xs text-theme-muted mt-0.5">
            Difficulty: <span className="font-bold capitalize text-theme-text">{selectedDifficulty}</span> • Expected time: ~{Math.round(activeGame.avgDurationSec / 60)} mins
          </p>
        </div>

        <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-theme-accent hover:opacity-90 text-white font-extrabold text-sm shadow-lg shadow-theme-accent/25 transition-all active:scale-95">
          <Play className="w-4 h-4 fill-white" />
          <span>Generate Puzzle</span>
        </button>
      </div>
    </div>
  );
}
