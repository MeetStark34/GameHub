import React from 'react';
import Link from 'next/link';
import { Gamepad2, Shield, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-theme-border bg-theme-surface/40 mt-auto transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-theme-muted">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-theme-accent" />
          <span className="font-bold text-theme-text">GameHub</span>
          <span>•</span>
          <span>Your daily brain training, without the daily limit.</span>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/daily" className="hover:text-theme-text transition-colors">
            Daily Set
          </Link>
          <Link href="/unlimited" className="hover:text-theme-text transition-colors">
            Unlimited
          </Link>
          <Link href="/achievements" className="hover:text-theme-text transition-colors">
            Achievements
          </Link>
          <Link href="/leaderboard" className="hover:text-theme-text transition-colors">
            Leaderboard
          </Link>
          <Link href="/settings" className="hover:text-theme-text transition-colors">
            Settings
          </Link>
          <Link href="/admin" className="hover:text-theme-text transition-colors flex items-center gap-1">
            <Shield className="w-3 h-3 text-sky-400" />
            <span>Admin</span>
          </Link>
        </div>

        <div className="flex items-center gap-1 text-[11px]">
          <span>Built for focus and mastery</span>
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline mx-0.5" />
          <span>v0.1.0</span>
        </div>
      </div>
    </footer>
  );
}
